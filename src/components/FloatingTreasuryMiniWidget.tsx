import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  KeyRound,
  Maximize2,
  Minimize2,
  Plane,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { BrazilStateFlag } from './BrazilStateFlag';
import type {
  ShareholderValuationRecord,
  StateTreasuryStat,
} from '../utils/treasuryStateStats';
import { useLanguage } from '../i18n/LanguageContext';
import type { BookingPublicConfig, HotelBooking, PartnerHotel } from '../types';
import {
  buildBookingComUrl,
  DEFAULT_BOOKING_PUBLIC,
  generateHotelBookingToken,
} from '../utils/bookingTokenHelper';
import {
  buildGolOfficialCheckoutUrl,
  GOL_PROMO_FLIGHTS,
} from '../data/golFlightsData';
import {
  buildLatamOfficialCheckoutUrl,
  LATAM_PROMO_FLIGHTS,
} from '../data/latamFlightsData';

interface FloatingTreasuryMiniWidgetProps {
  stateStats: StateTreasuryStat[];
  totalSalesCount: number;
  valuationBoostPercent?: number;
  shareholderValuations?: ShareholderValuationRecord[];
  onOpenTreasury: () => void;
  bookingPublic?: BookingPublicConfig | null;
  userBookings?: HotelBooking[];
  hotels?: PartnerHotel[];
  onOpenHotels?: () => void;
  onOpenGolFlights?: () => void;
  onOpenTamFlights?: () => void;
  onOpenDuqueEvento?: () => void;
}

const CONAE_DUQUE_ROBOT_3D = '/src/assets/images/conae_duque_robot_3d_1795637461401.jpg';
const BASE_SPARK = [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0];

export const FloatingTreasuryMiniWidget: React.FC<FloatingTreasuryMiniWidgetProps> = ({
  stateStats,
  totalSalesCount,
  valuationBoostPercent = 0,
  shareholderValuations = [],
  onOpenTreasury,
  bookingPublic,
  userBookings = [],
  hotels = [],
  onOpenHotels,
  onOpenGolFlights,
  onOpenTamFlights,
  onOpenDuqueEvento,
}) => {
  const { isEn, tr } = useLanguage();
  const [minimized, setMinimized] = useState(false);
  const [tick, setTick] = useState(0);
  const [copiedToken, setCopiedToken] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [airlineView, setAirlineView] = useState<'GOL' | 'TAM'>('GOL');
  const [golIndex, setGolIndex] = useState(0);
  const [tamIndex, setTamIndex] = useState(0);

  const fmt = (val: number, decimals: number) =>
    isEn ? val.toFixed(decimals) : val.toFixed(decimals).replace('.', ',');

  useEffect(() => {
    const id = window.setInterval(() => {
      setGolIndex((prev) => (prev + 1) % GOL_PROMO_FLIGHTS.length);
      setTamIndex((prev) => (prev + 1) % LATAM_PROMO_FLIGHTS.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  const currentGolPromo = GOL_PROMO_FLIGHTS[golIndex % GOL_PROMO_FLIGHTS.length];
  const currentGolUrl = buildGolOfficialCheckoutUrl({
    origin: currentGolPromo.originCode,
    destination: currentGolPromo.destCode,
    departureDate: currentGolPromo.defaultDepartureDate,
    returnDate: currentGolPromo.defaultReturnDate,
    tripType: 'roundtrip',
    passengers: 1,
  });

  const currentTamPromo = LATAM_PROMO_FLIGHTS[tamIndex % LATAM_PROMO_FLIGHTS.length];
  const currentTamUrl = buildLatamOfficialCheckoutUrl({
    origin: currentTamPromo.originCode,
    destination: currentTamPromo.destCode,
    departureDate: currentTamPromo.defaultDepartureDate,
    returnDate: currentTamPromo.defaultReturnDate,
    tripType: 'roundtrip',
    passengers: 1,
    cabin: currentTamPromo.cabinClass,
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => (t + 1) % 360);
    }, 900);
    return () => window.clearInterval(id);
  }, []);

  const livePoints = useMemo(() => {
    const multiplier = 1 + valuationBoostPercent / 100;
    return BASE_SPARK.map((val, idx) => {
      if (valuationBoostPercent === 0) return 5.0;
      const progress = idx / Math.max(1, BASE_SPARK.length - 1);
      const scaled = val * (1 + (multiplier - 1) * progress);
      return Number(scaled.toFixed(3));
    });
  }, [valuationBoostPercent]);

  const currentPrice = livePoints[livePoints.length - 1];

  const { linePath, areaPath, lastPt } = useMemo(() => {
    const w = 164;
    const h = 42;
    const padX = 5;
    const padY = 6;
    const min = Math.min(...livePoints) * 0.985;
    const max = Math.max(...livePoints) * 1.015;
    const span = max - min || 1;
    const coords = livePoints.map((v, i) => ({
      x: padX + (i / (livePoints.length - 1)) * (w - padX * 2),
      y: padY + (1 - (v - min) / span) * (h - padY * 2),
    }));
    const d = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area = `${d} L ${coords[coords.length - 1].x.toFixed(1)} ${h} L ${coords[0].x.toFixed(1)} ${h} Z`;

    return {
      linePath: d,
      areaPath: area,
      lastPt: coords[coords.length - 1],
    };
  }, [livePoints]);

  const marqueeStats = useMemo(() => {
    const active = stateStats.filter((s) => s.percent > 0).sort((a, b) => b.percent - a.percent);
    const waiting = stateStats.filter((s) => s.percent <= 0);
    return [...active, ...waiting];
  }, [stateStats]);

  // Booking.com Token Integration inside the Floating Tab
  const bookingCfg = bookingPublic || DEFAULT_BOOKING_PUBLIC;
  const activeHotels = useMemo(() => hotels.filter((h) => h.active), [hotels]);
  const hasUserBookings = userBookings.length > 0;
  const bookingItemCount = hasUserBookings ? userBookings.length : activeHotels.length;

  useEffect(() => {
    if (hasUserBookings || activeHotels.length <= 1) return;
    const id = window.setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % activeHotels.length);
    }, 8000);
    return () => window.clearInterval(id);
  }, [hasUserBookings, activeHotels.length]);

  const safeIndex = bookingItemCount > 0 ? selectedIndex % bookingItemCount : 0;
  const activeBooking = hasUserBookings ? userBookings[safeIndex] : null;
  const activeHotel = hasUserBookings
    ? activeHotels.find((h) => h.id === activeBooking?.hotelId) || activeHotels[0] || null
    : activeHotels[safeIndex] || null;

  const displayToken = activeBooking
    ? activeBooking.bookingToken ||
      generateHotelBookingToken(bookingCfg.tokenPrefix, activeBooking.state, activeBooking.id)
    : bookingCfg.activeBookingToken;

  const bookingExternalUrl = useMemo(() => {
    if (activeBooking?.bookingUrl && activeBooking.bookingUrl.includes('checkout=')) {
      return activeBooking.bookingUrl;
    }
    return buildBookingComUrl({
      hotelName: activeBooking?.hotelName || activeHotel?.name || 'Hotel CONAE Conveniado',
      city: activeHotel?.city || '',
      state: activeBooking?.state || activeHotel?.state || 'BR',
      checkInDate: activeBooking?.checkInDate,
      guests: activeBooking?.guests || 2,
      children: 0,
      rooms: 1,
      partnerAid: bookingCfg.partnerAid,
      bookingToken: displayToken,
      bookingDomain: bookingCfg.bookingDomain,
    });
  }, [activeBooking, activeHotel, bookingCfg, displayToken]);

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(displayToken);
      setCopiedToken(true);
      window.setTimeout(() => setCopiedToken(false), 2200);
    } catch {
      // Ignore clipboard errors in restricted frames
    }
  };

  const robotFloatingLauncher = onOpenDuqueEvento ? (
    <button
      type="button"
      onClick={onOpenDuqueEvento}
      aria-label={tr('Abrir Robô Duque IA', 'Open Robô Duque AI')}
      title={tr('Clique para abrir o Robô Duque IA', 'Click to open Robô Duque AI')}
      className="group w-[184px] sm:w-[210px] rounded-xl bg-gradient-to-r from-[#062318]/96 via-[#081a13]/96 to-[#231804]/96 backdrop-blur-md border border-amber-400/80 hover:border-amber-300 shadow-[0_12px_28px_rgba(0,0,0,0.72)] px-2 py-1.5 flex items-center gap-2 text-left transition-transform hover:scale-[1.03] active:scale-95 cursor-pointer"
    >
      <span className="conae-robot-3d-stage shrink-0">
        <span aria-hidden="true" className="conae-robot-3d-aura" />
        <span className="conae-robot-3d-figure w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden border-2 border-amber-400/95 bg-[#040e0a] block">
          <img
            src={CONAE_DUQUE_ROBOT_3D}
            alt={tr('Robô Duque 3D', '3D Robô Duque')}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <span aria-hidden="true" className="conae-robot-3d-shine" />
        </span>
      </span>

      <span className="min-w-0 flex-1 leading-tight">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="font-display text-[11px] sm:text-xs font-bold conae-gold-text truncate">
            {tr('Robô Duque', 'Robô Duque')}
          </span>
        </span>
        <span className="text-[10px] text-emerald-200/90 flex items-center gap-1 mt-0.5 truncate">
          <Sparkles className="w-2.5 h-2.5 text-amber-300 shrink-0" />
          <span className="truncate">{tr('Toque para abrir', 'Tap to open')}</span>
        </span>
      </span>

      <ChevronRight className="w-3.5 h-3.5 text-amber-300 group-hover:translate-x-0.5 transition-transform shrink-0" />
    </button>
  ) : null;

  if (minimized) {
    return (
      <div className="fixed right-2 sm:right-3 top-24 z-40 flex flex-col items-end gap-2 animate-float-top-to-bottom">
        {robotFloatingLauncher}
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="conae-panel rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 shadow-xl cursor-pointer"
          title={tr(
            'Abrir aba flutuante Tesouro CNEC, Token Booking & Promo GOL',
            'Open floating CNEC Treasury, Booking Token & GOL Deals tab'
          )}
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono">CNEC R$ {fmt(currentPrice, 2)}</span>
          <span className="text-[9px] px-1 py-0.5 rounded bg-[#003580] text-white font-bold border border-[#006CE4]">
            B.
          </span>
          <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-[#FF5A00] text-white">
            <Plane className="w-2.5 h-2.5 animate-plane-takeoff" />
          </span>
          <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-[#E8114B] text-white">
            <Plane className="w-2.5 h-2.5 animate-plane-takeoff" />
          </span>
          <Maximize2 className="w-3 h-3 text-amber-300" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed right-2 sm:right-3 top-24 sm:top-28 z-40 flex flex-col items-end gap-2 animate-float-top-to-bottom">
      {robotFloatingLauncher}
      <aside
        aria-label={tr(
          'Aba flutuante Tesouro CONAE e Token de Reserva Booking.com',
          'Floating CONAE Treasury and Booking.com Reservation Token tab'
        )}
        className="w-[184px] sm:w-[210px] conae-panel rounded-xl p-2.5 space-y-1.5 shadow-2xl border border-amber-400/55"
      >
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={onOpenTreasury}
          className="flex items-center gap-1 text-[10px] font-bold text-amber-300 hover:text-amber-200 cursor-pointer truncate"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="truncate">{tr('Tesouro CNEC', 'CNEC Treasury')}</span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] font-mono font-bold text-white tabular-nums">
            R$ {fmt(currentPrice, 2)}
          </span>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label={tr('Minimizar aba flutuante', 'Minimize floating tab')}
            className="p-0.5 text-emerald-200/75 hover:text-white cursor-pointer"
          >
            <Minimize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Mini Moving Chart Copy */}
      <button
        type="button"
        onClick={onOpenTreasury}
        className="w-full block rounded-md bg-black/50 border border-emerald-500/25 p-1 cursor-pointer"
        title={tr(
          'Clique para abrir o Tesouro Patrimonial completo',
          'Click to open the full Equity Treasury'
        )}
      >
        <svg viewBox="0 0 164 42" className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="miniTesouroGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#050907" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#miniTesouroGrad)" className="transition-all duration-700" />
          <path
            d={linePath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-700"
          />
          {linePath && (
            <circle r="2.4" fill="#fef08a">
              <animateMotion dur="3s" repeatCount="indefinite" path={linePath} />
            </circle>
          )}
          {lastPt && (
            <circle cx={lastPt.x} cy={lastPt.y} r="2.8" fill="#10b981" stroke="#fef08a" strokeWidth="1" />
          )}
        </svg>
      </button>

      {/* Moving Mini Shareholders + State Flags & Percentages Inside Floating Copy */}
      <div className="marquee-wrapper overflow-hidden rounded bg-black/45 border border-amber-400/25 py-1 px-1">
        <div className="animate-marquee-flags flex items-center gap-2">
          {shareholderValuations.length > 0 &&
            [...shareholderValuations, ...shareholderValuations].map((h, idx) => (
              <div
                key={`mini_sh_${h.id}_${idx}`}
                className="inline-flex items-center gap-1 text-[9.5px] font-mono shrink-0"
              >
                <img
                  src={h.photoUrl}
                  alt={h.name}
                  referrerPolicy="no-referrer"
                  className="w-3.5 h-3.5 rounded-full object-cover border border-amber-400/75 shrink-0"
                />
                <span className="font-sans font-semibold text-white whitespace-nowrap">{h.name}</span>
                <span className="text-amber-300 whitespace-nowrap">
                  R${h.currentEquityBRL.toFixed(0)}
                </span>
                <span
                  className={`font-bold whitespace-nowrap ${
                    h.equityStatus === 'up'
                      ? 'text-emerald-300'
                      : h.equityStatus === 'down'
                      ? 'text-red-300'
                      : 'text-amber-200/80'
                  }`}
                >
                  {h.totalDeltaPercent > 0 ? `+${fmt(h.totalDeltaPercent, 1)}%` : `${fmt(h.totalDeltaPercent, 1)}%`}
                </span>
              </div>
            ))}
          {[...marqueeStats, ...marqueeStats].map((st, idx) => (
            <div
              key={`mini_${st.uf}_${idx}`}
              className="inline-flex items-center gap-1 text-[10px] font-mono shrink-0"
            >
              <BrazilStateFlag uf={st.uf} size="xs" />
              <span className="font-bold text-white">{st.uf}</span>
              <span
                className={`tabular-nums font-semibold ${
                  st.percent > 0 ? 'text-amber-300' : 'text-emerald-300/75'
                }`}
              >
                {fmt(st.percent, 1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Connected Booking.com Lodging Reservation Token Inside the Floating Tab */}
      <div className="rounded-lg bg-black/55 border border-[#006CE4]/50 p-1.5 space-y-1">
        <div className="flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={onOpenHotels}
            className="flex items-center gap-1 text-[10px] font-bold text-white hover:text-amber-300 cursor-pointer min-w-0"
          >
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded bg-[#003580] text-white font-bold text-[8px] border border-[#006CE4] shrink-0">
              B.
            </span>
            <span className="truncate">{tr('Token Booking', 'Booking Token')}</span>
          </button>

          <div className="flex items-center gap-0.5 shrink-0">
            <span className="text-[9px] font-mono text-sky-200 tabular-nums mr-0.5">
              AID {bookingCfg.partnerAid}
            </span>
            {bookingItemCount > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIndex((prev) => (prev - 1 + bookingItemCount) % bookingItemCount)
                  }
                  aria-label={tr('Hotel ou reserva anterior', 'Previous hotel or booking')}
                  className="p-0.5 text-emerald-200/75 hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-2.5 h-2.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIndex((prev) => (prev + 1) % bookingItemCount)}
                  aria-label={tr('Próximo hotel ou reserva', 'Next hotel or booking')}
                  className="p-0.5 text-emerald-200/75 hover:text-white cursor-pointer"
                >
                  <ChevronRight className="w-2.5 h-2.5" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-1 bg-[#003580]/40 border border-[#006CE4]/45 rounded px-1.5 py-0.5">
          <span className="inline-flex items-center gap-1 min-w-0">
            <KeyRound className="w-2.5 h-2.5 text-sky-300 shrink-0" />
            <span className="font-mono text-[10px] font-bold text-amber-200 truncate tabular-nums">
              {displayToken}
            </span>
          </span>
          <button
            type="button"
            onClick={handleCopyToken}
            title={tr('Copiar token de reserva', 'Copy booking token')}
            aria-label={tr('Copiar token de reserva', 'Copy booking token')}
            className="text-sky-200 hover:text-white cursor-pointer shrink-0"
          >
            {copiedToken ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>

        {(activeBooking || activeHotel) && (
          <div className="flex items-center justify-between gap-1 text-[9px] text-emerald-100/90 leading-tight">
            <span className="inline-flex items-center gap-1 min-w-0 truncate">
              <Building2 className="w-2.5 h-2.5 text-amber-300 shrink-0" />
              <span className="truncate">
                {activeBooking
                  ? `${activeBooking.hotelName} · ${activeBooking.checkInDate}`
                  : `${activeHotel?.name} (${activeHotel?.state})`}
              </span>
            </span>
            <span className="font-mono font-bold text-emerald-300 shrink-0">
              {activeBooking
                ? activeBooking.status === 'confirmed'
                  ? tr('OK', 'OK')
                  : activeBooking.status === 'cancelled'
                  ? tr('Canc', 'Canc')
                  : tr('Pend', 'Pend')
                : `-${activeHotel?.discountPercent ?? bookingCfg.defaultDiscountPercent}%`}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-1 pt-0.5">
          {onOpenHotels && (
            <button
              type="button"
              onClick={onOpenHotels}
              className="px-1.5 py-1 rounded bg-amber-500 text-neutral-950 font-bold text-[10px] hover:bg-amber-400 transition-colors cursor-pointer truncate"
            >
              {tr('Reservar', 'Book Stay')}
            </button>
          )}
          <a
            href={bookingExternalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${onOpenHotels ? '' : 'col-span-2'} px-1.5 py-1 rounded bg-[#003580] border border-[#006CE4]/70 text-white font-semibold text-[10px] hover:bg-[#0048a8] transition-colors inline-flex items-center justify-center gap-1 truncate`}
            title={tr('Abrir na Booking.com com token CONAE', 'Open on Booking.com with CONAE token')}
          >
            <span className="truncate">Booking</span>
            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
          </a>
        </div>
      </div>

      {/* Coupled Compact GOL & TAM (LATAM) Airfare Promotions Section at the Bottom */}
      <div
        className={`rounded-lg bg-black/60 border p-1.5 space-y-1 ${
          airlineView === 'GOL' ? 'border-[#FF5A00]/55' : 'border-[#E8114B]/60'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="inline-flex items-center gap-0.5 bg-black/60 rounded p-0.5 border border-white/10">
            <button
              type="button"
              onClick={() => setAirlineView('GOL')}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold inline-flex items-center gap-0.5 cursor-pointer transition-colors ${
                airlineView === 'GOL' ? 'bg-[#FF5A00] text-white' : 'text-emerald-100/75 hover:text-white'
              }`}
            >
              <Plane className="w-2.5 h-2.5" />
              <span>GOL</span>
            </button>
            <button
              type="button"
              onClick={() => setAirlineView('TAM')}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold inline-flex items-center gap-0.5 cursor-pointer transition-colors ${
                airlineView === 'TAM' ? 'bg-[#E8114B] text-white' : 'text-emerald-100/75 hover:text-white'
              }`}
            >
              <Plane className="w-2.5 h-2.5" />
              <span>TAM</span>
            </button>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <span
              className={`text-[9px] font-mono font-bold tabular-nums mr-0.5 ${
                airlineView === 'GOL' ? 'text-[#FF8C42]' : 'text-[#ff6f96]'
              }`}
            >
              -{airlineView === 'GOL' ? currentGolPromo.discountPercent : currentTamPromo.discountPercent}%
            </span>
            <button
              type="button"
              onClick={() =>
                airlineView === 'GOL'
                  ? setGolIndex((prev) => (prev - 1 + GOL_PROMO_FLIGHTS.length) % GOL_PROMO_FLIGHTS.length)
                  : setTamIndex((prev) => (prev - 1 + LATAM_PROMO_FLIGHTS.length) % LATAM_PROMO_FLIGHTS.length)
              }
              aria-label={tr('Voo anterior', 'Previous flight')}
              className="p-0.5 text-emerald-200/75 hover:text-white cursor-pointer"
            >
              <ChevronLeft className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                airlineView === 'GOL'
                  ? setGolIndex((prev) => (prev + 1) % GOL_PROMO_FLIGHTS.length)
                  : setTamIndex((prev) => (prev + 1) % LATAM_PROMO_FLIGHTS.length)
              }
              aria-label={tr('Próximo voo', 'Next flight')}
              className="p-0.5 text-emerald-200/75 hover:text-white cursor-pointer"
            >
              <ChevronRight className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        <div
          className={`flex items-center justify-between gap-1 rounded px-1.5 py-0.5 border ${
            airlineView === 'GOL'
              ? 'bg-[#FF5A00]/15 border-[#FF5A00]/35'
              : 'bg-[#E8114B]/15 border-[#E8114B]/40'
          }`}
        >
          <span className="font-mono text-[10px] font-bold text-white truncate">
            {airlineView === 'GOL'
              ? `${currentGolPromo.originCode} → ${currentGolPromo.destCode}`
              : `${currentTamPromo.originCode} → ${currentTamPromo.destCode}`}
          </span>
          <span className="font-mono text-[10px] font-extrabold text-amber-300 tabular-nums shrink-0">
            R$ {fmt(airlineView === 'GOL' ? currentGolPromo.promoPriceBRL : currentTamPromo.promoPriceBRL, 2)}
          </span>
        </div>

        <p className="text-[9px] text-emerald-100/80 truncate leading-tight">
          {airlineView === 'GOL'
            ? `${currentGolPromo.originCity} → ${currentGolPromo.destCity} (${currentGolPromo.destState})`
            : `${currentTamPromo.originCity} → ${currentTamPromo.destCity} (${currentTamPromo.destState})`}
        </p>

        <div className="grid grid-cols-2 gap-1 pt-0.5">
          {airlineView === 'GOL' && onOpenGolFlights && (
            <button
              type="button"
              onClick={onOpenGolFlights}
              className="px-1.5 py-1 rounded bg-amber-500 text-neutral-950 font-bold text-[10px] hover:bg-amber-400 transition-colors cursor-pointer truncate"
            >
              {tr('Aba GOL', 'GOL Tab')}
            </button>
          )}
          {airlineView === 'TAM' && onOpenTamFlights && (
            <button
              type="button"
              onClick={onOpenTamFlights}
              className="px-1.5 py-1 rounded bg-amber-500 text-neutral-950 font-bold text-[10px] hover:bg-amber-400 transition-colors cursor-pointer truncate"
            >
              {tr('Aba TAM', 'TAM Tab')}
            </button>
          )}
          <a
            href={airlineView === 'GOL' ? currentGolUrl : currentTamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-1.5 py-1 rounded text-white font-semibold text-[10px] transition-colors inline-flex items-center justify-center gap-1 truncate ${
              airlineView === 'GOL'
                ? 'bg-[#FF5A00] hover:bg-[#ff6d1f]'
                : 'bg-[#E8114B] hover:bg-[#ff2560]'
            }`}
            title={
              airlineView === 'GOL'
                ? tr('Abrir preenchido em b2c.voegol.com.br', 'Open pre-filled on b2c.voegol.com.br')
                : tr('Abrir preenchido em latamairlines.com', 'Open pre-filled on latamairlines.com')
            }
          >
            <span className="truncate">{airlineView === 'GOL' ? 'voegol' : 'latam'}</span>
            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
          </a>
        </div>
      </div>
      </aside>
    </div>
  );
};
