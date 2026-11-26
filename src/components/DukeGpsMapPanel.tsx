/// <reference types="google.maps" />
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  AlertCircle,
  Bike,
  Bus,
  Car,
  Compass,
  ExternalLink,
  Footprints,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react';
import { createMapsAppCheckTokenFetcher } from '../firebase';
import type { DukeGpsRequest, DukeGpsTravelMode } from '../types';

interface DukeGpsMapPanelProps {
  gpsRequest: DukeGpsRequest | null;
  onRequestChange?: (next: DukeGpsRequest) => void;
}

interface ResolvedPlaceInfo {
  id?: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  rating?: number;
  userRatingCount?: number;
  googleMapsURI?: string;
  websiteURI?: string;
  nationalPhoneNumber?: string;
}

interface ComputedRouteSummary {
  distanceMeters: number;
  durationMillis: number;
  originLabel: string;
  destinationLabel: string;
  travelMode: DukeGpsTravelMode;
}

const DEFAULT_CENTER = { lat: 0.0349, lng: -51.0694 }; // Macapá, AP
const DEFAULT_ZOOM = 13;
const DEFAULT_PLACE: ResolvedPlaceInfo = {
  name: 'Ponto no mapa — Macapá, AP',
  address: 'Macapá, Amapá, Brasil',
  location: DEFAULT_CENTER,
};

function isQuotaError(err: unknown): boolean {
  const text = err instanceof Error ? `${err.name} ${err.message}` : String(err ?? '');
  return (
    text.includes('RESOURCE_EXHAUSTED') ||
    text.includes('OVER_QUERY_LIMIT') ||
    text.includes('OverQuotaMapError') ||
    text.includes('QuotaExceededError') ||
    text.includes('429')
  );
}

function triggerQuotaNoticeIfNeeded(err: unknown): void {
  if (isQuotaError(err)) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
}

function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const totalMin = Math.max(1, Math.round(ms / 60000));
  if (totalMin < 60) return `${totalMin} min`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function extractLatLng(
  loc: google.maps.LatLng | google.maps.LatLngLiteral | null | undefined
): { lat: number; lng: number } | null {
  if (!loc) return null;
  if (typeof (loc as google.maps.LatLng).lat === 'function') {
    const ll = loc as google.maps.LatLng;
    return { lat: ll.lat(), lng: ll.lng() };
  }
  const lit = loc as google.maps.LatLngLiteral;
  if (typeof lit.lat === 'number' && typeof lit.lng === 'number') {
    return { lat: lit.lat, lng: lit.lng };
  }
  return null;
}

const TRAVEL_MODES: Array<{ id: DukeGpsTravelMode; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'DRIVING', label: 'Carro', Icon: Car },
  { id: 'WALKING', label: 'A pé', Icon: Footprints },
  { id: 'BICYCLING', label: 'Bike', Icon: Bike },
  { id: 'TRANSIT', label: 'Ônibus', Icon: Bus },
];

interface DukeGpsMapInnerProps {
  gpsRequest: DukeGpsRequest | null;
  recaptchaSiteKey: string;
}

const DukeGpsMapInner: React.FC<DukeGpsMapInnerProps> = ({ gpsRequest, recaptchaSiteKey }) => {
  const map = useMap();
  const coreLib = useMapsLibrary('core');
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');

  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [originInput, setOriginInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [travelMode, setTravelMode] = useState<DukeGpsTravelMode>('DRIVING');
  const [showRouteBar, setShowRouteBar] = useState(false);

  const [placesList, setPlacesList] = useState<ResolvedPlaceInfo[]>([DEFAULT_PLACE]);
  const [selectedPlace, setSelectedPlace] = useState<ResolvedPlaceInfo | null>(DEFAULT_PLACE);
  const [infoWindowOpen, setInfoWindowOpen] = useState(false);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);

  const [routeSummary, setRouteSummary] = useState<ComputedRouteSummary | null>(null);
  const [searching, setSearching] = useState(false);
  const [computingRoute, setComputingRoute] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [appCheckActive, setAppCheckActive] = useState(false);

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const lastHandledRequestRef = useRef<string>('');

  // Bind Firebase App Check token fetcher to Google Maps Settings when site key is available
  useEffect(() => {
    if (!coreLib || !recaptchaSiteKey) return;
    try {
      const fetcher = createMapsAppCheckTokenFetcher(recaptchaSiteKey);
      const settingsClass = (
        coreLib as unknown as {
          Settings?: {
            getInstance: () => { fetchAppCheckToken?: () => Promise<{ token: string }> };
          };
        }
      ).Settings;
      if (fetcher && settingsClass?.getInstance) {
        settingsClass.getInstance().fetchAppCheckToken = fetcher;
        setAppCheckActive(true);
      }
    } catch (err) {
      console.warn('[DukeGpsMapPanel] App Check Settings binding skipped:', err);
    }
  }, [coreLib, recaptchaSiteKey]);

  const clearPolylines = useCallback(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearPolylines();
    };
  }, [clearPolylines]);

  // Modern Places API (New) AutocompleteSuggestion with AutocompleteSessionToken
  useEffect(() => {
    if (!placesLib || !showSuggestions) return;
    const trimmed = searchInput.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }
        setLoadingSuggestions(true);
        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: sessionTokenRef.current,
          language: 'pt-BR',
          region: 'br',
        });
        if (!cancelled) {
          setSuggestions(res.suggestions || []);
        }
      } catch (err) {
        triggerQuotaNoticeIfNeeded(err);
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingSuggestions(false);
        }
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [placesLib, searchInput, showSuggestions]);

  const resetAutocompleteSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const focusMapOnPlace = useCallback(
    (place: ResolvedPlaceInfo, viewport?: google.maps.LatLngBounds | null) => {
      if (!map) return;
      if (viewport) {
        map.fitBounds(viewport);
      } else {
        map.panTo(place.location);
        map.setZoom(15);
      }
    },
    [map]
  );

  // Compute Route using modern Routes API (`Route.computeRoutes`)
  const runComputeRoute = useCallback(
    async (
      originVal: string | { lat: number; lng: number },
      destinationVal: string | { lat: number; lng: number },
      modeVal: DukeGpsTravelMode,
      originLabelText: string,
      destinationLabelText: string
    ) => {
      if (!routesLib || !map) return;
      clearPolylines();
      setRouteSummary(null);
      setErrorMessage(null);
      setComputingRoute(true);
      setStatusMessage(`Calculando rota para ${destinationLabelText}...`);

      try {
        const routeApi = (routesLib as unknown as {
          Route?: {
            computeRoutes: (req: Record<string, unknown>) => Promise<{
              routes?: Array<{
                distanceMeters?: number;
                durationMillis?: number;
                viewport?: google.maps.LatLngBounds;
                createPolylines: () => google.maps.Polyline[];
              }>;
            }>;
          };
        }).Route;

        if (!routeApi?.computeRoutes) {
          throw new Error('Biblioteca de Rotas do Google Maps ainda não disponível.');
        }

        const response = await routeApi.computeRoutes({
          origin: originVal,
          destination: destinationVal,
          travelMode: modeVal,
          fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
        });

        const primaryRoute = response?.routes?.[0];
        if (!primaryRoute) {
          setErrorMessage('Nenhuma rota encontrada entre os pontos informados.');
          setStatusMessage(null);
          return;
        }

        const newPolylines = primaryRoute.createPolylines();
        newPolylines.forEach((polyline) => {
          polyline.setOptions({
            strokeColor: '#fbbf24',
            strokeOpacity: 0.95,
            strokeWeight: 6,
          });
          polyline.setMap(map);
        });
        polylinesRef.current = newPolylines;

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport);
        }

        setRouteSummary({
          distanceMeters: primaryRoute.distanceMeters ?? 0,
          durationMillis: primaryRoute.durationMillis ?? 0,
          originLabel: originLabelText,
          destinationLabel: destinationLabelText,
          travelMode: modeVal,
        });
        setStatusMessage(null);
      } catch (err) {
        triggerQuotaNoticeIfNeeded(err);
        setErrorMessage(
          'Não foi possível calcular a rota agora. Verifique os endereços ou tente outro modo de transporte.'
        );
        setStatusMessage(null);
      } finally {
        setComputingRoute(false);
      }
    },
    [routesLib, map, clearPolylines]
  );

  // Search places via modern Places API (New): Place.searchByText
  const runTextSearch = useCallback(
    async (rawQuery: string, placeId?: string) => {
      if (!placesLib || !map) return;
      const trimmed = rawQuery.trim();
      if (!trimmed && !placeId) return;

      clearPolylines();
      setRouteSummary(null);
      setErrorMessage(null);
      setSearching(true);
      setStatusMessage(`Buscando "${trimmed || placeId}" no Google Maps...`);

      try {
        const { Place } = placesLib;

        if (placeId) {
          const place = new Place({ id: placeId });
          await place.fetchFields({
            fields: [
              'id',
              'displayName',
              'formattedAddress',
              'location',
              'viewport',
              'rating',
              'userRatingCount',
              'googleMapsURI',
              'websiteURI',
              'nationalPhoneNumber',
            ],
          });
          const loc = extractLatLng(place.location);
          if (loc) {
            const resolved: ResolvedPlaceInfo = {
              id: place.id,
              name: place.displayName || trimmed || 'Local encontrado',
              address: place.formattedAddress || '',
              location: loc,
              rating: place.rating ?? undefined,
              userRatingCount: place.userRatingCount ?? undefined,
              googleMapsURI: place.googleMapsURI ?? undefined,
              websiteURI: place.websiteURI ?? undefined,
              nationalPhoneNumber: place.nationalPhoneNumber ?? undefined,
            };
            setPlacesList([resolved]);
            setSelectedPlace(resolved);
            setInfoWindowOpen(true);
            setDestinationInput(resolved.address || resolved.name);
            focusMapOnPlace(resolved, place.viewport);
            setStatusMessage(null);
            return;
          }
        }

        const { places } = await Place.searchByText({
          textQuery: trimmed,
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'viewport',
            'rating',
            'userRatingCount',
            'googleMapsURI',
            'websiteURI',
            'nationalPhoneNumber',
          ],
          language: 'pt-BR',
          region: 'br',
          maxResultCount: 8,
        });

        const resolvedList: ResolvedPlaceInfo[] = (places || [])
          .map((p): ResolvedPlaceInfo | null => {
            const loc = extractLatLng(p.location);
            if (!loc) return null;
            return {
              id: p.id,
              name: p.displayName || trimmed,
              address: p.formattedAddress || '',
              location: loc,
              rating: p.rating ?? undefined,
              userRatingCount: p.userRatingCount ?? undefined,
              googleMapsURI: p.googleMapsURI ?? undefined,
              websiteURI: p.websiteURI ?? undefined,
              nationalPhoneNumber: p.nationalPhoneNumber ?? undefined,
            };
          })
          .filter((item): item is ResolvedPlaceInfo => item !== null);

        if (resolvedList.length === 0) {
          setErrorMessage(`Nenhum local encontrado para "${trimmed}". Tente informar cidade ou endereço.`);
          setStatusMessage(null);
          return;
        }

        setPlacesList(resolvedList);
        const primary = resolvedList[0];
        setSelectedPlace(primary);
        setInfoWindowOpen(true);
        setDestinationInput(primary.address || primary.name);
        focusMapOnPlace(primary, places?.[0]?.viewport ?? null);
        setStatusMessage(null);
      } catch (err) {
        triggerQuotaNoticeIfNeeded(err);
        setErrorMessage('Não foi possível consultar o local no Google Maps agora. Tente novamente.');
        setStatusMessage(null);
      } finally {
        setSearching(false);
      }
    },
    [placesLib, map, clearPolylines, focusMapOnPlace]
  );

  // Select autocomplete suggestion (Place.fetchFields + resetSession)
  const handleSelectSuggestion = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      if (!placesLib || !suggestion.placePrediction) return;
      setErrorMessage(null);
      setSearching(true);
      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'viewport',
            'rating',
            'userRatingCount',
            'googleMapsURI',
            'websiteURI',
            'nationalPhoneNumber',
          ],
        });
        const loc = extractLatLng(place.location);
        if (loc) {
          const resolved: ResolvedPlaceInfo = {
            id: place.id,
            name: place.displayName || suggestion.placePrediction.text.text,
            address: place.formattedAddress || '',
            location: loc,
            rating: place.rating ?? undefined,
            userRatingCount: place.userRatingCount ?? undefined,
            googleMapsURI: place.googleMapsURI ?? undefined,
            websiteURI: place.websiteURI ?? undefined,
            nationalPhoneNumber: place.nationalPhoneNumber ?? undefined,
          };
          clearPolylines();
          setRouteSummary(null);
          setPlacesList([resolved]);
          setSelectedPlace(resolved);
          setInfoWindowOpen(true);
          setSearchInput(resolved.name);
          setDestinationInput(resolved.address || resolved.name);
          focusMapOnPlace(resolved, place.viewport);
        }
        resetAutocompleteSession();
      } catch (err) {
        triggerQuotaNoticeIfNeeded(err);
        setErrorMessage('Não foi possível carregar os detalhes deste local.');
      } finally {
        setSearching(false);
      }
    },
    [placesLib, clearPolylines, focusMapOnPlace, resetAutocompleteSession]
  );

  const handleLocateMe = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErrorMessage('Seu navegador não suporta geolocalização GPS.');
      return;
    }
    setErrorMessage(null);
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setOriginInput('Minha localização GPS');
        if (map) {
          map.panTo(coords);
          map.setZoom(15);
        }
        setLocatingUser(false);
      },
      () => {
        setErrorMessage('Permissão de GPS negada ou indisponível neste dispositivo.');
        setLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [map]);

  // Execute incoming chat GPS request from Robô Duque
  useEffect(() => {
    if (!gpsRequest || !map || !placesLib) return;
    const signature = `${gpsRequest.intent}|${gpsRequest.query}|${gpsRequest.origin || ''}|${gpsRequest.destination || ''}|${gpsRequest.travelMode || ''}|${gpsRequest.requestedAt || ''}`;
    if (lastHandledRequestRef.current === signature) return;
    lastHandledRequestRef.current = signature;

    const nextMode = gpsRequest.travelMode || 'DRIVING';
    setTravelMode(nextMode);

    if (gpsRequest.intent === 'route') {
      const destText = (gpsRequest.destination || gpsRequest.query || '').trim();
      const origText = (gpsRequest.origin || '').trim();
      setShowRouteBar(true);
      setDestinationInput(destText);
      if (origText) setOriginInput(origText);

      if (routesLib && destText) {
        if (origText) {
          void runComputeRoute(origText, destText, nextMode, origText, destText);
        } else if (userLocation) {
          void runComputeRoute(userLocation, destText, nextMode, 'Minha localização GPS', destText);
        } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
          setStatusMessage('Obtendo sua localização GPS para traçar a rota...');
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setUserLocation(coords);
              setOriginInput('Minha localização GPS');
              void runComputeRoute(coords, destText, nextMode, 'Minha localização GPS', destText);
            },
            () => {
              // Fallback: locate the destination place on the map so the user sees it immediately
              void runTextSearch(destText, gpsRequest.placeId);
            },
            { enableHighAccuracy: true, timeout: 7000 }
          );
        } else {
          void runTextSearch(destText, gpsRequest.placeId);
        }
      } else {
        void runTextSearch(destText || gpsRequest.query, gpsRequest.placeId);
      }
    } else {
      setSearchInput(gpsRequest.query);
      void runTextSearch(gpsRequest.query, gpsRequest.placeId);
    }
  }, [gpsRequest, map, placesLib, routesLib, userLocation, runComputeRoute, runTextSearch]);

  const handleSubmitRouteForm = (e: React.FormEvent) => {
    e.preventDefault();
    const dest = destinationInput.trim() || selectedPlace?.address || selectedPlace?.name || '';
    if (!dest) {
      setErrorMessage('Informe um destino para traçar a rota no GPS.');
      return;
    }
    const orig = originInput.trim();
    if (!orig || orig === 'Minha localização GPS') {
      if (userLocation) {
        void runComputeRoute(userLocation, dest, travelMode, 'Minha localização GPS', dest);
      } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
        setLocatingUser(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(coords);
            setOriginInput('Minha localização GPS');
            setLocatingUser(false);
            void runComputeRoute(coords, dest, travelMode, 'Minha localização GPS', dest);
          },
          () => {
            setLocatingUser(false);
            setErrorMessage('Ative o GPS do navegador ou digite o endereço de origem.');
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      } else {
        setErrorMessage('Digite o endereço de origem para traçar a rota.');
      }
      return;
    }
    void runComputeRoute(orig, dest, travelMode, orig, dest);
  };

  const googleMapsExternalUrl = useMemo(() => {
    if (routeSummary) {
      const originParam = encodeURIComponent(
        routeSummary.originLabel === 'Minha localização GPS' && userLocation
          ? `${userLocation.lat},${userLocation.lng}`
          : routeSummary.originLabel
      );
      const destParam = encodeURIComponent(routeSummary.destinationLabel);
      const modeMap: Record<DukeGpsTravelMode, string> = {
        DRIVING: 'driving',
        WALKING: 'walking',
        BICYCLING: 'bicycling',
        TRANSIT: 'transit',
      };
      return `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=${modeMap[routeSummary.travelMode]}`;
    }
    if (selectedPlace?.googleMapsURI) return selectedPlace.googleMapsURI;
    if (selectedPlace) {
      return `https://www.google.com/maps/search/?api=1&query=${selectedPlace.location.lat},${selectedPlace.location.lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${DEFAULT_CENTER.lat},${DEFAULT_CENTER.lng}`;
  }, [routeSummary, selectedPlace, userLocation]);

  return (
    <div className="space-y-3">
      {/* Top GPS Search & Controls Bar */}
      <div className="rounded-2xl bg-[#07150f] border border-amber-400/35 p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/45 flex items-center justify-center text-amber-300 shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                <span>GPS Google Maps — Robô Duque</span>
                {appCheckActive && (
                  <span
                    title="Firebase App Check ativo"
                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-300"
                  >
                    <ShieldCheck className="w-3 h-3" />
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-emerald-200/75 truncate">
                Peça qualquer localização no chat ou pesquise endereços, locais e rotas ao vivo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={locatingUser}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              {locatingUser ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LocateFixed className="w-3.5 h-3.5" />
              )}
              <span>Meu GPS</span>
            </button>
            <button
              type="button"
              onClick={() => setShowRouteBar((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                showRouteBar
                  ? 'bg-amber-400 text-neutral-950 border-amber-300'
                  : 'bg-black/50 text-amber-200 border-amber-400/35 hover:border-amber-400'
              }`}
            >
              <RouteIcon className="w-3.5 h-3.5" />
              <span>Traçar Rota</span>
            </button>
            <a
              href={googleMapsExternalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/50 hover:bg-black/75 border border-amber-400/30 text-emerald-100 hover:text-amber-200 text-xs font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
              <span>Abrir no Maps</span>
            </a>
          </div>
        </div>

        {/* Search Input with Places API (New) Autocomplete */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setShowSuggestions(false);
            void runTextSearch(searchInput);
          }}
          className="relative"
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-amber-300/80 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (searchInput.trim().length >= 2) setShowSuggestions(true);
                }}
                placeholder="Buscar cidade, endereço, hotel, igreja, hospital ou ponto turístico..."
                className="w-full rounded-xl bg-black/60 border border-amber-400/30 focus:border-amber-400 pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder:text-emerald-200/45 focus:outline-none"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    resetAutocompleteSession();
                  }}
                  aria-label="Limpar busca GPS"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-200/65 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={searching || !searchInput.trim()}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0"
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
              <span>Localizar</span>
            </button>
          </div>

          {showSuggestions && (loadingSuggestions || suggestions.length > 0) && (
            <div className="absolute left-0 right-0 mt-1.5 z-30 rounded-xl bg-[#071811] border border-amber-400/45 shadow-2xl overflow-hidden max-h-64 overflow-y-auto conae-scroll">
              {loadingSuggestions && suggestions.length === 0 ? (
                <div className="px-3 py-2.5 text-xs text-emerald-200/75 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                  <span>Buscando sugestões no Google Maps...</span>
                </div>
              ) : (
                suggestions.map((suggestion, idx) => (
                  <button
                    key={suggestion.placePrediction?.placeId || idx}
                    type="button"
                    onClick={() => void handleSelectSuggestion(suggestion)}
                    className="w-full text-left px-3 py-2 hover:bg-amber-400/15 border-b border-white/5 last:border-b-0 flex items-start gap-2 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                    <span className="text-xs text-emerald-50">
                      {suggestion.placePrediction?.text.text}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </form>

        {/* Expandable Routes Panel */}
        {showRouteBar && (
          <form
            onSubmit={handleSubmitRouteForm}
            className="rounded-xl bg-black/45 border border-amber-400/25 p-3 space-y-2.5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={originInput}
                onChange={(e) => setOriginInput(e.target.value)}
                placeholder="Origem (vazio = Meu GPS atual)"
                className="w-full rounded-lg bg-[#081711] border border-amber-400/25 focus:border-amber-400 px-3 py-1.5 text-xs text-white placeholder:text-emerald-200/45 focus:outline-none"
              />
              <input
                type="text"
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                placeholder="Destino (ex: Aeroporto de Goiânia)"
                className="w-full rounded-lg bg-[#081711] border border-amber-400/25 focus:border-amber-400 px-3 py-1.5 text-xs text-white placeholder:text-emerald-200/45 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 flex-wrap">
                {TRAVEL_MODES.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTravelMode(id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      travelMode === id
                        ? 'bg-amber-400 text-neutral-950'
                        : 'bg-[#081711] text-emerald-100 border border-white/15 hover:border-amber-400/50'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={computingRoute}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {computingRoute ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
                <span>Calcular Rota</span>
              </button>
            </div>
          </form>
        )}

        {statusMessage && (
          <div className="text-xs text-amber-200 flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl bg-red-950/70 border border-red-400/45 px-3 py-2 text-xs text-red-100 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {routeSummary && (
          <div className="rounded-xl bg-emerald-950/70 border border-emerald-400/40 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <p className="text-xs font-bold text-amber-300 truncate">
                {routeSummary.originLabel} → {routeSummary.destinationLabel}
              </p>
              <p className="text-xs text-emerald-100">
                Distância: <strong>{formatDistance(routeSummary.distanceMeters)}</strong> · Tempo estimado:{' '}
                <strong>{formatDuration(routeSummary.durationMillis)}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                clearPolylines();
                setRouteSummary(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-black/50 hover:bg-black/80 text-emerald-200 text-[11px] font-semibold cursor-pointer"
            >
              Limpar Rota
            </button>
          </div>
        )}
      </div>

      {/* Interactive Google Map Container (explicit height per CF2, mapId per CF9, attribution ID per ToS) */}
      <div className="w-full min-h-[420px] h-[52vh] lg:h-[58vh] rounded-2xl overflow-hidden border border-amber-400/35 bg-[#06130d] shadow-2xl relative">
        <GoogleMap
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          mapId="DEMO_MAP_ID"
          gestureHandling="greedy"
          streetViewControl
          mapTypeControl
          fullscreenControl
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          className="w-full h-full"
        >
          {placesList.map((place, idx) => {
            const isSelected = selectedPlace?.location.lat === place.location.lat &&
              selectedPlace?.location.lng === place.location.lng &&
              selectedPlace?.name === place.name;
            return (
              <AdvancedMarker
                key={place.id || `${place.location.lat}_${place.location.lng}_${idx}`}
                position={place.location}
                title={place.name}
                onClick={() => {
                  setSelectedPlace(place);
                  setInfoWindowOpen(true);
                  setDestinationInput(place.address || place.name);
                }}
              >
                <Pin
                  background={isSelected ? '#fbbf24' : '#10b981'}
                  borderColor={isSelected ? '#78350f' : '#064e3b'}
                  glyphColor={isSelected ? '#09090b' : '#ffffff'}
                />
              </AdvancedMarker>
            );
          })}

          {userLocation && (
            <AdvancedMarker position={userLocation} title="Sua localização atual">
              <div className="w-4 h-4 rounded-full bg-sky-400 border-2 border-white shadow-[0_0_12px_rgba(56,189,248,0.9)]" />
            </AdvancedMarker>
          )}

          {selectedPlace && infoWindowOpen && (
            <InfoWindow
              position={selectedPlace.location}
              onCloseClick={() => setInfoWindowOpen(false)}
            >
              <div className="max-w-[240px] text-neutral-900 space-y-1.5 p-0.5">
                <p className="font-bold text-sm leading-tight">{selectedPlace.name}</p>
                {selectedPlace.address && (
                  <p className="text-xs text-neutral-700 leading-snug">{selectedPlace.address}</p>
                )}
                {typeof selectedPlace.rating === 'number' && (
                  <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>
                      {selectedPlace.rating.toFixed(1)}
                      {selectedPlace.userRatingCount ? ` (${selectedPlace.userRatingCount})` : ''}
                    </span>
                  </p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRouteBar(true);
                      setDestinationInput(selectedPlace.address || selectedPlace.name);
                      if (userLocation) {
                        void runComputeRoute(
                          userLocation,
                          selectedPlace.location,
                          travelMode,
                          'Minha localização GPS',
                          selectedPlace.name
                        );
                      }
                    }}
                    className="px-2 py-1 rounded bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Ir até aqui
                  </button>
                  <a
                    href={googleMapsExternalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-blue-700 underline"
                  >
                    Google Maps
                  </a>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {/* Places Results Strip */}
      {placesList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {placesList.map((place, idx) => {
            const isSelected = selectedPlace?.name === place.name &&
              selectedPlace?.location.lat === place.location.lat;
            return (
              <div
                key={place.id || `card_${idx}`}
                className={`rounded-xl p-3 border transition-colors flex items-start justify-between gap-2 ${
                  isSelected
                    ? 'bg-emerald-950/75 border-amber-400/60'
                    : 'bg-[#07150f] border-amber-400/20 hover:border-amber-400/45'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlace(place);
                    setInfoWindowOpen(true);
                    setDestinationInput(place.address || place.name);
                    focusMapOnPlace(place);
                  }}
                  className="text-left min-w-0 flex-1 space-y-0.5 cursor-pointer"
                >
                  <p className="text-xs font-bold text-white truncate">{place.name}</p>
                  <p className="text-[11px] text-emerald-200/75 line-clamp-2">
                    {place.address || `${place.location.lat.toFixed(4)}, ${place.location.lng.toFixed(4)}`}
                  </p>
                  {typeof place.rating === 'number' && (
                    <p className="text-[10px] text-amber-300 font-semibold flex items-center gap-1 pt-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>
                        {place.rating.toFixed(1)}
                        {place.userRatingCount ? ` (${place.userRatingCount} avaliações)` : ''}
                      </span>
                    </p>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlace(place);
                    setShowRouteBar(true);
                    setDestinationInput(place.address || place.name);
                    if (userLocation) {
                      void runComputeRoute(
                        userLocation,
                        place.location,
                        travelMode,
                        'Minha localização GPS',
                        place.name
                      );
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-[10px] cursor-pointer shrink-0 inline-flex items-center gap-1"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Rota</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const DukeGpsMapPanel: React.FC<DukeGpsMapPanelProps> = ({ gpsRequest }) => {
  const buildTimeKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  const buildTimeRecaptcha = (import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || '').trim();

  const [apiKey, setApiKey] = useState<string>(buildTimeKey);
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState<string>(buildTimeRecaptcha);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(!buildTimeKey);

  useEffect(() => {
    if (buildTimeKey) {
      setApiKey(buildTimeKey);
      setLoadingConfig(false);
    }
    let cancelled = false;
    fetch('/api/maps-config', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { apiKey?: string; recaptchaSiteKey?: string } | null) => {
        if (cancelled || !data) return;
        if (!buildTimeKey && data.apiKey) {
          setApiKey(data.apiKey.trim());
        }
        if (!buildTimeRecaptcha && data.recaptchaSiteKey) {
          setRecaptchaSiteKey(data.recaptchaSiteKey.trim());
        }
      })
      .catch(() => {
        // Fallback to build-time key only
      })
      .finally(() => {
        if (!cancelled) setLoadingConfig(false);
      });
    return () => {
      cancelled = true;
    };
  }, [buildTimeKey, buildTimeRecaptcha]);

  if (loadingConfig) {
    return (
      <div className="min-h-[420px] rounded-2xl bg-[#07150f] border border-amber-400/30 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Loader2 className="w-7 h-7 animate-spin text-amber-300" />
        <p className="text-sm font-semibold text-amber-200">Carregando GPS Google Maps...</p>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="min-h-[420px] rounded-2xl bg-[#07150f] border border-amber-400/35 flex flex-col items-center justify-center gap-3 p-6 text-center max-w-xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center">
          <MapPin className="w-6 h-6" />
        </div>
        <h3 className="font-display text-lg font-bold text-white">
          Configure a chave do Google Maps no servidor
        </h3>
        <p className="text-xs text-emerald-200/80 leading-relaxed">
          Para ativar o mapa GPS fora do AI Studio (como na Vercel), adicione a variável de ambiente{' '}
          <code className="px-1.5 py-0.5 rounded bg-black/60 text-amber-300">
            VITE_GOOGLE_MAPS_API_KEY
          </code>{' '}
          em <strong>Settings → Environment Variables</strong> e faça um novo Redeploy.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} language="pt-BR" region="BR" libraries={['places', 'routes', 'core']}>
      <DukeGpsMapInner gpsRequest={gpsRequest} recaptchaSiteKey={recaptchaSiteKey} />
    </APIProvider>
  );
};
