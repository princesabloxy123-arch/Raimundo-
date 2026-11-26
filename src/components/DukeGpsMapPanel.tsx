import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
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
  Star,
  X,
} from 'lucide-react';
import { createMapsAppCheckTokenFetcher } from '../firebase';
import type { DukeGpsRequest, DukeGpsTravelMode } from '../types';

const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
const RECAPTCHA_ENTERPRISE_SITE_KEY = (import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || '').trim();
const GMP_ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';
const DEFAULT_GPS_CENTER = { lat: 0.0349, lng: -51.0694 };
const DEFAULT_GPS_ZOOM = 13;
const DEFAULT_PIN_PLACE: GpsPlaceResult = {
  id: 'default_pinned_point',
  displayName: 'Ponto no mapa',
  formattedAddress: '0.0349, -51.0694',
  location: DEFAULT_GPS_CENTER,
};

type GmpLatLngLike =
  | { lat: number; lng: number }
  | { lat: () => number; lng: () => number };

interface GmpPolylineLike {
  setMap: (map: unknown) => void;
  setOptions: (options: Record<string, unknown>) => void;
}

interface GmpPlaceLike {
  id?: string | null;
  displayName?: string | null;
  formattedAddress?: string | null;
  location?: GmpLatLngLike | null;
  viewport?: unknown;
  rating?: number | null;
  userRatingCount?: number | null;
  googleMapsURI?: string | null;
  businessStatus?: string | null;
  fetchFields: (opts: { fields: string[] }) => Promise<unknown>;
}

interface GpsPlaceResult {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: { lat: number; lng: number };
  rating?: number | null;
  userRatingCount?: number | null;
  googleMapsURI?: string | null;
  businessStatus?: string | null;
}

interface GpsRouteSummary {
  originLabel: string;
  destinationLabel: string;
  travelMode: DukeGpsTravelMode;
  distanceMeters: number;
  durationMillis: number;
  googleMapsDirUrl: string;
}

interface DukeGpsMapPanelProps {
  incomingRequest: DukeGpsRequest | null;
  onAskRobotAboutPlace?: (prompt: string) => void;
}

interface GpsWorkspaceInternalProps extends DukeGpsMapPanelProps {
  fetchAppCheckToken?: () => Promise<{ token: string }>;
}

function isQuotaError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  return (
    raw.includes('RESOURCE_EXHAUSTED') ||
    raw.includes('OVER_QUERY_LIMIT') ||
    raw.includes('OverQuotaMapError') ||
    raw.includes('QuotaExceededError') ||
    raw.includes('429')
  );
}

function triggerQuotaBannerIfNeeded(err: unknown): boolean {
  if (isQuotaError(err)) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    return true;
  }
  return false;
}

function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

function formatDuration(millis: number): string {
  if (!Number.isFinite(millis) || millis <= 0) return '—';
  const totalMinutes = Math.max(1, Math.round(millis / 60000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function mapTravelModeToGoogleMapsParam(mode: DukeGpsTravelMode): string {
  switch (mode) {
    case 'WALKING':
      return 'walking';
    case 'BICYCLING':
      return 'bicycling';
    case 'TRANSIT':
      return 'transit';
    default:
      return 'driving';
  }
}

function extractLatLng(loc: GmpLatLngLike | null | undefined): { lat: number; lng: number } | null {
  if (!loc) return null;
  const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
  const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
  if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  return null;
}

const TRAVEL_MODES: Array<{ id: DukeGpsTravelMode; label: string; icon: React.ReactNode }> = [
  { id: 'DRIVING', label: 'Carro', icon: <Car className="w-3.5 h-3.5" /> },
  { id: 'WALKING', label: 'A pé', icon: <Footprints className="w-3.5 h-3.5" /> },
  { id: 'TRANSIT', label: 'Transporte', icon: <Bus className="w-3.5 h-3.5" /> },
  { id: 'BICYCLING', label: 'Bike', icon: <Bike className="w-3.5 h-3.5" /> },
];

const GpsInteractiveWorkspace: React.FC<GpsWorkspaceInternalProps> = ({
  incomingRequest,
  onAskRobotAboutPlace,
  fetchAppCheckToken,
}) => {
  const map = useMap('duke-gps-map');
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const coreLib = useMapsLibrary('core');

  // Bind Firebase App Check token provider onto google.maps.Settings singleton when configured
  useEffect(() => {
    if (!coreLib || !fetchAppCheckToken) return;
    const SettingsCtor = (
      coreLib as unknown as {
        Settings?: {
          getInstance: () => {
            fetchAppCheckToken?: () => Promise<{ token: string }>;
          };
        };
      }
    ).Settings;
    if (SettingsCtor?.getInstance) {
      SettingsCtor.getInstance().fetchAppCheckToken = fetchAppCheckToken;
    }
  }, [coreLib, fetchAppCheckToken]);

  const autocompleteContainerRef = useRef<HTMLDivElement | null>(null);
  const routePolylinesRef = useRef<GmpPolylineLike[]>([]);
  const lastHandledReqIdRef = useRef<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [computingRoute, setComputingRoute] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusInfo, setStatusInfo] = useState<string | null>(null);

  const [places, setPlaces] = useState<GpsPlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<GpsPlaceResult | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [showRouteForm, setShowRouteForm] = useState(false);
  const [originInput, setOriginInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [travelMode, setTravelMode] = useState<DukeGpsTravelMode>('DRIVING');
  const [routeSummary, setRouteSummary] = useState<GpsRouteSummary | null>(null);

  const clearRoutePolylines = useCallback(() => {
    routePolylinesRef.current.forEach((p) => p.setMap(null));
    routePolylinesRef.current = [];
    setRouteSummary(null);
  }, []);

  useEffect(() => {
    return () => {
      routePolylinesRef.current.forEach((p) => p.setMap(null));
      routePolylinesRef.current = [];
    };
  }, []);

  // Imperatively mount modern PlaceAutocompleteElement (CF8 compliant)
  useEffect(() => {
    if (!placesLib || !autocompleteContainerRef.current) return;
    const container = autocompleteContainerRef.current;
    container.innerHTML = '';

    const PlaceAutocompleteCtor = (
      placesLib as unknown as {
        PlaceAutocompleteElement?: new (opts?: Record<string, unknown>) => HTMLElement;
      }
    ).PlaceAutocompleteElement;

    if (!PlaceAutocompleteCtor) return;

    const autocomplete = new PlaceAutocompleteCtor({
      requestedLanguage: 'pt-BR',
      requestedRegion: 'BR',
    });
    autocomplete.style.width = '100%';
    autocomplete.style.colorScheme = 'dark';
    container.appendChild(autocomplete);

    const onSelect = (ev: Event) => {
      const customEv = ev as unknown as {
        placePrediction?: { toPlace: () => GmpPlaceLike };
      };
      const place = customEv.placePrediction?.toPlace();
      if (!place) return;

      setStatusError(null);
      setSearching(true);
      void place
        .fetchFields({
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'viewport',
            'rating',
            'userRatingCount',
            'googleMapsURI',
            'businessStatus',
          ],
        })
        .then(() => {
          const coords = extractLatLng(place.location);
          if (!coords) {
            setStatusError('Local encontrado sem coordenadas no mapa.');
            return;
          }
          const result: GpsPlaceResult = {
            id: place.id || `place_${Date.now()}`,
            displayName: place.displayName || 'Local selecionado',
            formattedAddress: place.formattedAddress || '',
            location: coords,
            rating: place.rating,
            userRatingCount: place.userRatingCount,
            googleMapsURI: place.googleMapsURI,
            businessStatus: place.businessStatus,
          };
          clearRoutePolylines();
          setPlaces([result]);
          setSelectedPlace(result);
          setDestinationInput(result.formattedAddress || result.displayName);
          setStatusInfo(`Localizado: ${result.displayName}`);
          if (map) {
            if (place.viewport) {
              map.fitBounds(place.viewport as Parameters<typeof map.fitBounds>[0]);
            } else {
              map.panTo(coords);
              map.setZoom(16);
            }
          }
        })
        .catch((err: unknown) => {
          if (!triggerQuotaBannerIfNeeded(err)) {
            setStatusError('Não foi possível carregar os detalhes deste local agora.');
          }
        })
        .finally(() => {
          setSearching(false);
        });
    };

    autocomplete.addEventListener('gmp-select', onSelect);

    return () => {
      autocomplete.removeEventListener('gmp-select', onSelect);
      container.innerHTML = '';
    };
  }, [placesLib, map, clearRoutePolylines]);

  // Modern Places API (New): Place.searchByText
  const executeTextSearch = useCallback(
    async (queryText: string) => {
      const cleanQuery = queryText.trim();
      if (!cleanQuery || !placesLib) return;

      setSearching(true);
      setStatusError(null);
      setStatusInfo(null);
      clearRoutePolylines();

      try {
        const request: Record<string, unknown> = {
          textQuery: cleanQuery,
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'viewport',
            'rating',
            'userRatingCount',
            'googleMapsURI',
            'businessStatus',
          ],
          language: 'pt-BR',
          region: 'BR',
          maxResultCount: 8,
          internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
        };
        if (userLocation) {
          request.locationBias = userLocation;
        }

        const PlaceClass = placesLib.Place as unknown as {
          searchByText: (req: Record<string, unknown>) => Promise<{ places?: GmpPlaceLike[] }>;
        };
        const response = await PlaceClass.searchByText(request);
        const found = response?.places || [];

        const mapped: GpsPlaceResult[] = found
          .map((p, idx): GpsPlaceResult | null => {
            const coords = extractLatLng(p.location);
            if (!coords) return null;
            return {
              id: p.id || `found_${idx}_${Date.now()}`,
              displayName: p.displayName || cleanQuery,
              formattedAddress: p.formattedAddress || '',
              location: coords,
              rating: p.rating,
              userRatingCount: p.userRatingCount,
              googleMapsURI: p.googleMapsURI,
              businessStatus: p.businessStatus,
            };
          })
          .filter((item): item is GpsPlaceResult => item !== null);

        setPlaces(mapped);
        if (mapped.length === 0) {
          setSelectedPlace(null);
          setStatusInfo(`Nenhum resultado encontrado no Google Maps para "${cleanQuery}". Tente informar cidade ou estado.`);
          return;
        }

        const first = mapped[0];
        setSelectedPlace(first);
        setDestinationInput(first.formattedAddress || first.displayName);
        setStatusInfo(
          mapped.length === 1
            ? `1 local encontrado no Google Maps para "${cleanQuery}".`
            : `${mapped.length} locais encontrados no Google Maps para "${cleanQuery}".`
        );

        if (map) {
          if (mapped.length === 1) {
            map.panTo(first.location);
            map.setZoom(16);
          } else if (coreLib?.LatLngBounds) {
            const bounds = new coreLib.LatLngBounds();
            mapped.forEach((m) => bounds.extend(m.location));
            map.fitBounds(bounds, 60);
          } else {
            map.panTo(first.location);
            map.setZoom(13);
          }
        }
      } catch (err) {
        if (!triggerQuotaBannerIfNeeded(err)) {
          setStatusError('Não foi possível pesquisar este endereço no Google Maps agora. Tente novamente.');
        }
      } finally {
        setSearching(false);
      }
    },
    [placesLib, userLocation, map, coreLib, clearRoutePolylines]
  );

  // Browser GPS current location (strictly user-initiated opt-in)
  const locateCurrentGps = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setStatusError('Seu navegador não possui suporte a GPS neste dispositivo.');
        resolve(null);
        return;
      }

      setLocatingGps(true);
      setStatusError(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserLocation(coords);
          setStatusInfo(
            `GPS ativo (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}) — localização em tempo real captada.`
          );
          if (map) {
            map.panTo(coords);
            map.setZoom(16);
          }
          setLocatingGps(false);
          resolve(coords);
        },
        (geoErr) => {
          setLocatingGps(false);
          if (geoErr.code === geoErr.PERMISSION_DENIED) {
            setStatusError(
              'Permissão de GPS bloqueada no navegador. Libere o acesso à localização ou digite sua cidade/endereço de origem.'
            );
          } else {
            setStatusError('Não foi possível obter o sinal GPS agora. Tente novamente ou digite o endereço.');
          }
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  }, [map]);

  // Modern Routes API: Route.computeRoutes via useMapsLibrary('routes')
  const computeGpsRoute = useCallback(
    async (
      originParam: string | { lat: number; lng: number },
      destinationParam: string | { lat: number; lng: number },
      mode: DukeGpsTravelMode
    ) => {
      if (!routesLib || !map) return;

      setComputingRoute(true);
      setStatusError(null);
      setStatusInfo(null);
      clearRoutePolylines();

      try {
        const RouteClass = (
          routesLib as unknown as {
            Route?: {
              computeRoutes: (req: Record<string, unknown>) => Promise<{
                routes?: Array<{
                  distanceMeters?: number;
                  durationMillis?: number;
                  viewport?: unknown;
                  createPolylines?: () => GmpPolylineLike[];
                }>;
              }>;
            };
          }
        ).Route;

        if (!RouteClass?.computeRoutes) {
          setStatusError('Serviço de rotas Google Maps ainda carregando. Tente novamente em instantes.');
          return;
        }

        const request = {
          origin: originParam,
          destination: destinationParam,
          travelMode: mode,
          fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
        };

        const response = await RouteClass.computeRoutes(request);
        const primaryRoute = response?.routes?.[0];
        if (!primaryRoute) {
          setStatusInfo('Nenhuma rota disponível para este trajeto e meio de transporte.');
          return;
        }

        if (typeof primaryRoute.createPolylines === 'function') {
          const newPolylines = primaryRoute.createPolylines();
          newPolylines.forEach((polyline) => {
            polyline.setOptions({
              strokeColor: '#f59e0b',
              strokeWeight: 6,
              strokeOpacity: 0.92,
            });
            polyline.setMap(map);
          });
          routePolylinesRef.current = newPolylines;
        }

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport as Parameters<typeof map.fitBounds>[0], 64);
        }

        const originText =
          typeof originParam === 'string'
            ? originParam
            : `${originParam.lat.toFixed(5)},${originParam.lng.toFixed(5)}`;
        const destText =
          typeof destinationParam === 'string'
            ? destinationParam
            : `${destinationParam.lat.toFixed(5)},${destinationParam.lng.toFixed(5)}`;

        const googleMapsDirUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
          originText
        )}&destination=${encodeURIComponent(destText)}&travelmode=${mapTravelModeToGoogleMapsParam(mode)}`;

        setRouteSummary({
          originLabel: typeof originParam === 'string' ? originParam : 'Minha Localização GPS',
          destinationLabel: typeof destinationParam === 'string' ? destinationParam : 'Destino no Mapa',
          travelMode: mode,
          distanceMeters: primaryRoute.distanceMeters ?? 0,
          durationMillis: primaryRoute.durationMillis ?? 0,
          googleMapsDirUrl,
        });
        setShowRouteForm(true);
      } catch (err) {
        if (!triggerQuotaBannerIfNeeded(err)) {
          setStatusError('Não foi possível calcular esta rota agora. Verifique a origem e o destino informados.');
        }
      } finally {
        setComputingRoute(false);
      }
    },
    [routesLib, map, clearRoutePolylines]
  );

  // Execute incoming GPS requests dispatched directly from the Robô Duque chat
  useEffect(() => {
    if (!incomingRequest || !placesLib || !map) return;
    const reqKey = incomingRequest.requestId || `${incomingRequest.action}:${incomingRequest.query}`;
    if (lastHandledReqIdRef.current === reqKey) return;
    lastHandledReqIdRef.current = reqKey;

    if (incomingRequest.action === 'my_location') {
      void locateCurrentGps();
      return;
    }

    if (incomingRequest.action === 'route') {
      const dest = incomingRequest.destinationQuery || incomingRequest.query;
      const mode = incomingRequest.travelMode || 'DRIVING';
      setTravelMode(mode);
      setDestinationInput(dest);
      setShowRouteForm(true);

      if (incomingRequest.originQuery) {
        setOriginInput(incomingRequest.originQuery);
        if (routesLib) {
          void computeGpsRoute(incomingRequest.originQuery, dest, mode);
        }
      } else if (userLocation && routesLib) {
        setOriginInput('');
        void computeGpsRoute(userLocation, dest, mode);
      } else {
        // Attempt opt-in geolocation if user requested route from current position, fallback to place search
        void locateCurrentGps().then((coords) => {
          if (coords && routesLib) {
            void computeGpsRoute(coords, dest, mode);
          } else {
            void executeTextSearch(dest);
          }
        });
      }
      return;
    }

    setSearchInput(incomingRequest.query);
    void executeTextSearch(incomingRequest.query);
  }, [
    incomingRequest,
    placesLib,
    routesLib,
    map,
    userLocation,
    locateCurrentGps,
    computeGpsRoute,
    executeTextSearch,
  ]);

  const handleSubmitRouteForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const dest = destinationInput.trim();
    if (!dest) {
      setStatusError('Informe o destino para traçar a rota no GPS.');
      return;
    }
    const originText = originInput.trim();
    if (originText) {
      await computeGpsRoute(originText, dest, travelMode);
    } else if (userLocation) {
      await computeGpsRoute(userLocation, dest, travelMode);
    } else {
      const coords = await locateCurrentGps();
      if (coords) {
        await computeGpsRoute(coords, dest, travelMode);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Top GPS Control Card */}
      <div className="rounded-2xl bg-[#07150f] border border-amber-400/35 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-white leading-tight">
                GPS Google Maps ao Vivo — Robô Duque
              </h2>
              <p className="text-[11px] text-emerald-200/75">
                Busque qualquer endereço, cidade, hotel ou peça no chat para localizar e traçar rotas pelo Google Maps.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedPlace(DEFAULT_PIN_PLACE);
                if (map) {
                  map.panTo(DEFAULT_GPS_CENTER);
                  map.setZoom(DEFAULT_GPS_ZOOM);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 hover:bg-black/75 border border-amber-400/35 text-amber-200 font-bold text-xs cursor-pointer whitespace-nowrap"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Ponto no Mapa</span>
            </button>

            <button
              type="button"
              onClick={() => void locateCurrentGps()}
              disabled={locatingGps}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs cursor-pointer whitespace-nowrap disabled:opacity-55"
            >
              {locatingGps ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LocateFixed className="w-3.5 h-3.5" />
              )}
              <span>{locatingGps ? 'Localizando...' : 'Minha Localização GPS'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRouteForm((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer whitespace-nowrap ${
                showRouteForm
                  ? 'bg-amber-400 border-amber-300 text-neutral-950'
                  : 'bg-black/50 border-amber-400/35 text-amber-200 hover:bg-black/75'
              }`}
            >
              <RouteIcon className="w-3.5 h-3.5" />
              <span>Traçar Rota</span>
            </button>
          </div>
        </div>

        {/* Search Bars: Free Text Search + Official Google Places Autocomplete */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void executeTextSearch(searchInput);
            }}
            className="flex items-center gap-1.5"
          >
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-amber-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar local, rua, hotel, igreja, cidade..."
                className="w-full rounded-xl bg-black/55 border border-amber-400/30 focus:border-amber-400 pl-9 pr-3 py-2 text-xs text-white placeholder:text-emerald-200/45 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !searchInput.trim()}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs cursor-pointer whitespace-nowrap disabled:opacity-45 inline-flex items-center gap-1"
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Buscar</span>
            </button>
          </form>

          <div className="space-y-1">
            <div
              ref={autocompleteContainerRef}
              className="w-full min-h-[36px] rounded-xl overflow-hidden border border-amber-400/25 bg-black/45"
            />
          </div>
        </div>

        {/* Route Planner Panel */}
        {showRouteForm && (
          <form
            onSubmit={(e) => void handleSubmitRouteForm(e)}
            className="rounded-xl bg-black/45 border border-amber-400/25 p-3 space-y-2.5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={originInput}
                onChange={(e) => setOriginInput(e.target.value)}
                placeholder={
                  userLocation
                    ? 'Origem: Minha Localização GPS (ou digite outro endereço)'
                    : 'Origem (deixe vazio para usar seu GPS atual)'
                }
                className="w-full rounded-lg bg-[#081711] border border-amber-400/25 px-3 py-2 text-xs text-white placeholder:text-emerald-200/45 focus:outline-none focus:border-amber-400"
              />
              <input
                type="text"
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                placeholder="Destino (ex: Aeroporto de Goiânia, Avenida Paulista...)"
                className="w-full rounded-lg bg-[#081711] border border-amber-400/25 px-3 py-2 text-xs text-white placeholder:text-emerald-200/45 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {TRAVEL_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTravelMode(m.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                      travelMode === m.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#081711] text-emerald-100/80 border border-white/15 hover:border-amber-400/50'
                    }`}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {routeSummary && (
                  <button
                    type="button"
                    onClick={clearRoutePolylines}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-[11px] text-emerald-200 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Limpar Rota</span>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={computingRoute || !destinationInput.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs cursor-pointer disabled:opacity-45"
                >
                  {computingRoute ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5" />
                  )}
                  <span>{computingRoute ? 'Calculando...' : 'Calcular Rota GPS'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Status / Route Summary Feedback */}
        {statusError && (
          <div className="rounded-xl bg-red-950/70 border border-red-400/45 px-3 py-2 text-xs text-red-100">
            {statusError}
          </div>
        )}
        {statusInfo && !statusError && (
          <div className="rounded-xl bg-emerald-950/65 border border-emerald-400/35 px-3 py-2 text-xs text-emerald-100 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>{statusInfo}</span>
          </div>
        )}

        {routeSummary && (
          <div className="rounded-xl bg-amber-400/12 border border-amber-400/45 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                Rota Calculada pelo Google Maps
              </p>
              <p className="text-xs font-semibold text-white truncate">
                {routeSummary.originLabel} → {routeSummary.destinationLabel}
              </p>
              <div className="flex items-center gap-3 text-xs font-mono text-emerald-200 pt-0.5">
                <span>Distância: {formatDistance(routeSummary.distanceMeters)}</span>
                <span>Tempo estimado: {formatDuration(routeSummary.durationMillis)}</span>
              </div>
            </div>
            <a
              href={routeSummary.googleMapsDirUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs whitespace-nowrap"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Abrir GPS Passo a Passo</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Interactive Google Map Container (explicit CSS height per CF2) */}
      <div className="w-full h-[380px] sm:h-[440px] rounded-2xl overflow-hidden border border-amber-400/40 bg-[#05100c] relative shadow-2xl">
        <GoogleMap
          id="duke-gps-map"
          mapId="DEMO_MAP_ID"
          defaultCenter={DEFAULT_GPS_CENTER}
          defaultZoom={DEFAULT_GPS_ZOOM}
          gestureHandling="greedy"
          streetViewControl
          mapTypeControl
          fullscreenControl
          internalUsageAttributionIds={[GMP_ATTRIBUTION_ID]}
          className="w-full h-full"
        >
          {/* Default Pinned Location Marker (Modern AdvancedMarker replacing legacy google.maps.Marker) */}
          <AdvancedMarker
            position={DEFAULT_GPS_CENTER}
            title="Ponto no mapa"
            zIndex={selectedPlace?.id === DEFAULT_PIN_PLACE.id ? 60 : 20}
            onClick={() => {
              setSelectedPlace(DEFAULT_PIN_PLACE);
              if (map) {
                map.panTo(DEFAULT_GPS_CENTER);
                map.setZoom(DEFAULT_GPS_ZOOM);
              }
            }}
          >
            <Pin
              background="#f59e0b"
              borderColor="#fef3c7"
              glyphColor="#09090b"
              scale={1.15}
            />
          </AdvancedMarker>

          {/* User Live GPS Marker */}
          {userLocation && (
            <AdvancedMarker position={userLocation} title="Minha Localização GPS Atual">
              <Pin background="#0284c7" borderColor="#e0f2fe" glyphColor="#ffffff" />
            </AdvancedMarker>
          )}

          {/* Real Places API (New) Results Markers */}
          {places.map((place, idx) => {
            const isSelected = selectedPlace?.id === place.id;
            return (
              <AdvancedMarker
                key={place.id}
                position={place.location}
                title={place.displayName}
                zIndex={isSelected ? 50 : 10 + idx}
                onClick={() => {
                  setSelectedPlace(place);
                  if (map) {
                    map.panTo(place.location);
                    if ((map.getZoom() ?? 10) < 14) {
                      map.setZoom(15);
                    }
                  }
                }}
              >
                <Pin
                  background={isSelected ? '#f59e0b' : '#059669'}
                  borderColor={isSelected ? '#fef3c7' : '#d1fae5'}
                  glyphColor={isSelected ? '#09090b' : '#ffffff'}
                  scale={isSelected ? 1.2 : 1}
                />
              </AdvancedMarker>
            );
          })}

          {/* Selected Place InfoWindow */}
          {selectedPlace && (
            <InfoWindow
              position={selectedPlace.location}
              onCloseClick={() => setSelectedPlace(null)}
            >
              <div className="text-neutral-900 max-w-[240px] space-y-1.5 p-0.5">
                <p className="font-bold text-xs leading-snug">{selectedPlace.displayName}</p>
                {selectedPlace.formattedAddress && (
                  <p className="text-[11px] text-neutral-700 leading-snug">
                    {selectedPlace.formattedAddress}
                  </p>
                )}
                {typeof selectedPlace.rating === 'number' && (
                  <p className="text-[11px] font-semibold text-amber-700">
                    ★ {selectedPlace.rating.toFixed(1)}
                    {selectedPlace.userRatingCount
                      ? ` (${selectedPlace.userRatingCount.toLocaleString('pt-BR')} avaliações)`
                      : ''}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedPlace.formattedAddress || selectedPlace.displayName;
                      setDestinationInput(target);
                      setShowRouteForm(true);
                      if (userLocation) {
                        void computeGpsRoute(userLocation, selectedPlace.location, travelMode);
                      } else {
                        void locateCurrentGps().then((coords) => {
                          if (coords) {
                            void computeGpsRoute(coords, selectedPlace.location, travelMode);
                          }
                        });
                      }
                    }}
                    className="px-2 py-1 rounded bg-emerald-700 text-white text-[10px] font-bold cursor-pointer"
                  >
                    Traçar Rota GPS
                  </button>
                  <a
                    href={
                      selectedPlace.googleMapsURI ||
                      `https://www.google.com/maps/search/?api=1&query=${selectedPlace.location.lat},${selectedPlace.location.lng}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded bg-amber-500 text-neutral-950 text-[10px] font-bold"
                  >
                    Abrir Google Maps
                  </a>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {/* Real Places List Returned by Google Places API (New) */}
      {places.length > 0 && (
        <div className="rounded-2xl bg-[#07150f] border border-amber-400/30 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Locais Encontrados no Google Maps ({places.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {places.map((place) => {
              const isSelected = selectedPlace?.id === place.id;
              return (
                <div
                  key={place.id}
                  onClick={() => {
                    setSelectedPlace(place);
                    if (map) {
                      map.panTo(place.location);
                      map.setZoom(16);
                    }
                  }}
                  className={`rounded-xl p-3 border transition-colors cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-amber-400/12 border-amber-400'
                      : 'bg-black/45 border-amber-400/20 hover:border-amber-400/55'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-white truncate">{place.displayName}</h3>
                      {place.formattedAddress && (
                        <p className="text-[11px] text-emerald-200/75 leading-snug mt-0.5">
                          {place.formattedAddress}
                        </p>
                      )}
                    </div>
                    {typeof place.rating === 'number' && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 text-[10px] font-bold shrink-0">
                        <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                        {place.rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setDestinationInput(place.formattedAddress || place.displayName);
                        setShowRouteForm(true);
                        if (userLocation) {
                          void computeGpsRoute(userLocation, place.location, travelMode);
                        } else {
                          void locateCurrentGps().then((coords) => {
                            if (coords) {
                              void computeGpsRoute(coords, place.location, travelMode);
                            }
                          });
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700/85 hover:bg-emerald-600 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Rota GPS</span>
                    </button>

                    <a
                      href={
                        place.googleMapsURI ||
                        `https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(ev) => ev.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 text-[11px] font-bold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Google Maps</span>
                    </a>

                    {onAskRobotAboutPlace && (
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onAskRobotAboutPlace(
                            `Me dê dicas práticas, informações úteis e opções de roteiro para visitar "${place.displayName}" (${place.formattedAddress || 'local selecionado no mapa'}).`
                          );
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 border border-amber-400/30 text-amber-200 text-[11px] font-semibold cursor-pointer"
                      >
                        <span>Perguntar ao Robô</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const DukeGpsMapPanel: React.FC<DukeGpsMapPanelProps> = ({
  incomingRequest,
  onAskRobotAboutPlace,
}) => {
  const [resolvedApiKey, setResolvedApiKey] = useState<string>(GOOGLE_MAPS_API_KEY);
  const [resolvedRecaptchaKey, setResolvedRecaptchaKey] = useState<string>(RECAPTCHA_ENTERPRISE_SITE_KEY);
  const [checkingKey, setCheckingKey] = useState<boolean>(!GOOGLE_MAPS_API_KEY);

  useEffect(() => {
    if (GOOGLE_MAPS_API_KEY && RECAPTCHA_ENTERPRISE_SITE_KEY) {
      setResolvedApiKey(GOOGLE_MAPS_API_KEY);
      setResolvedRecaptchaKey(RECAPTCHA_ENTERPRISE_SITE_KEY);
      setCheckingKey(false);
      return;
    }

    let cancelled = false;
    if (!GOOGLE_MAPS_API_KEY) {
      setCheckingKey(true);
    }

    fetch('/api/maps-config', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { apiKey?: string; recaptchaSiteKey?: string } | null) => {
        if (cancelled || !data) return;
        if (!GOOGLE_MAPS_API_KEY && data.apiKey && typeof data.apiKey === 'string') {
          setResolvedApiKey(data.apiKey.trim());
        }
        if (
          !RECAPTCHA_ENTERPRISE_SITE_KEY &&
          data.recaptchaSiteKey &&
          typeof data.recaptchaSiteKey === 'string'
        ) {
          setResolvedRecaptchaKey(data.recaptchaSiteKey.trim());
        }
      })
      .catch(() => {
        // Fallback to setup instructions if runtime config endpoint is unavailable
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingKey(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchAppCheckToken = useMemo(
    () => createMapsAppCheckTokenFetcher(resolvedRecaptchaKey),
    [resolvedRecaptchaKey]
  );

  if (checkingKey) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl bg-[#07150f] border border-amber-400/35 p-6 text-center space-y-3">
        <Loader2 className="w-7 h-7 text-amber-300 animate-spin mx-auto" />
        <p className="text-xs text-emerald-200/80">Conectando ao GPS Google Maps...</p>
      </div>
    );
  }

  if (!resolvedApiKey) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl bg-[#07150f] border border-amber-400/35 p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center mx-auto">
          <MapPin className="w-6 h-6" />
        </div>
        <h2 className="font-display text-lg font-bold text-white">GPS Google Maps</h2>
        <p className="text-xs text-emerald-200/80 leading-relaxed">
          Para usar o GPS fora do ambiente de teste, adicione a variável de ambiente{' '}
          <code className="font-mono text-amber-300">VITE_GOOGLE_MAPS_API_KEY</code> nas configurações da sua hospedagem (ex.: Vercel → Settings → Environment Variables) com sua chave do Google Maps Platform e faça um novo deploy.
        </p>
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={resolvedApiKey}
      language="pt-BR"
      region="BR"
      fetchAppCheckToken={fetchAppCheckToken}
    >
      <GpsInteractiveWorkspace
        incomingRequest={incomingRequest}
        onAskRobotAboutPlace={onAskRobotAboutPlace}
        fetchAppCheckToken={fetchAppCheckToken}
      />
    </APIProvider>
  );
};
