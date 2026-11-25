import React, { useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  Lock,
  MapPin,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { CONAE_ASSETS } from '../data/conaeSeed';
import { useLanguage } from '../i18n/LanguageContext';
import type {
  BookingPublicConfig,
  HotelBooking,
  PartnerHotel,
  UserProfile,
} from '../types';
import {
  addDaysToIsoDate,
  buildBookingComUrl,
  calculateNightsCount,
  DEFAULT_BOOKING_PUBLIC,
  formatIsoDateBR,
  generateHotelBookingToken,
  getFutureBookingIsoDate,
} from '../utils/bookingTokenHelper';

interface InlineHotelBookingBoardProps {
  hotels: PartnerHotel[];
  bookings: HotelBooking[];
  bookingPublic?: BookingPublicConfig | null;
  profile: UserProfile | null;
  onBookHotel: (params: {
    hotel: PartnerHotel;
    checkInDate: string;
    checkOutDate?: string;
    guests: number;
    children?: number;
    rooms?: number;
  }) => Promise<{ bookingToken: string; bookingUrl: string } | void>;
  onRequireAuth: () => void;
  onOpenAllHotels: () => void;
}

export const InlineHotelBookingBoard: React.FC<InlineHotelBookingBoardProps> = ({
  hotels,
  bookings,
  bookingPublic,
  profile,
  onBookHotel,
  onRequireAuth,
  onOpenAllHotels,
}) => {
  const { tr, translateDynamic, lang } = useLanguage();
  const activeHotels = useMemo(() => hotels.filter((h) => h.active), [hotels]);

  const [stateFilter, setStateFilter] = useState<string>('TODOS');
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const [checkInDate, setCheckInDate] = useState<string>('2026-12-10');
  const [checkOutDate, setCheckOutDate] = useState<string>('2026-12-15');
  const [guests, setGuests] = useState<number>(2);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [roomsCount, setRoomsCount] = useState<number>(1);
  const [activePeriod, setActivePeriod] = useState<'december' | 'nextWeek' | 'january' | 'custom'>('december');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    bookingUrl?: string;
    bookingToken?: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const bookingCfg = bookingPublic || DEFAULT_BOOKING_PUBLIC;
  const bookingLang = lang === 'en' ? 'en-us' : 'pt-br';

  const handleCheckInChange = (nextCheckIn: string) => {
    setCheckInDate(nextCheckIn);
    setActivePeriod('custom');
    if (nextCheckIn && (!checkOutDate || checkOutDate <= nextCheckIn)) {
      setCheckOutDate(addDaysToIsoDate(nextCheckIn, 3));
    }
  };

  const handleCheckOutChange = (nextCheckOut: string) => {
    setCheckOutDate(nextCheckOut);
    setActivePeriod('custom');
  };

  const applyPeriodPreset = (preset: 'december' | 'nextWeek' | 'january') => {
    setActivePeriod(preset);
    if (preset === 'december') {
      setCheckInDate('2026-12-10');
      setCheckOutDate('2026-12-15');
    } else if (preset === 'nextWeek') {
      const start = getFutureBookingIsoDate(7);
      setCheckInDate(start);
      setCheckOutDate(addDaysToIsoDate(start, 3));
    } else {
      setCheckInDate('2027-01-12');
      setCheckOutDate('2027-01-17');
    }
  };

  const nightsCount = useMemo(
    () => Math.max(1, calculateNightsCount(checkInDate, checkOutDate) || 3),
    [checkInDate, checkOutDate]
  );

  const statesList = useMemo(
    () => ['TODOS', ...Array.from(new Set(activeHotels.map((h) => h.state))).sort()],
    [activeHotels]
  );

  const filteredHotels = useMemo(
    () =>
      activeHotels.filter((h) => stateFilter === 'TODOS' || h.state === stateFilter),
    [activeHotels, stateFilter]
  );

  const selectedHotel =
    filteredHotels.find((h) => h.id === selectedHotelId) ||
    filteredHotels[0] ||
    activeHotels[0] ||
    null;

  const previewBookingUrl = useMemo(() => {
    if (!selectedHotel) return 'https://www.booking.com';
    return buildBookingComUrl({
      hotelName: selectedHotel.name,
      city: selectedHotel.city,
      state: selectedHotel.state,
      checkInDate,
      checkOutDate,
      guests,
      children: childrenCount,
      rooms: roomsCount,
      lang: bookingLang,
      currency: 'BRL',
      partnerAid: bookingCfg.partnerAid,
      bookingToken: bookingCfg.activeBookingToken,
      bookingDomain: bookingCfg.bookingDomain,
    });
  }, [
    selectedHotel,
    checkInDate,
    checkOutDate,
    guests,
    childrenCount,
    roomsCount,
    bookingLang,
    bookingCfg,
  ]);

  const handleCopyToken = async (token: string, key: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2200);
    } catch {
      // Ignore clipboard errors in restricted frames
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onRequireAuth();
      return;
    }
    if (!selectedHotel) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await onBookHotel({
        hotel: selectedHotel,
        checkInDate,
        checkOutDate,
        guests,
        children: childrenCount,
        rooms: roomsCount,
      });
      setFeedback({
        message: tr(
          `Reserva VIP registrada para "${selectedHotel.name}" (${selectedHotel.city}/${selectedHotel.state}). Clique no botão ao lado para abrir a Booking.com já preenchida e finalizar.`,
          `VIP reservation registered for "${selectedHotel.name}" (${selectedHotel.city}/${selectedHotel.state}). Click the button to open Booking.com pre-filled and finish.`
        ),
        bookingUrl: result?.bookingUrl || previewBookingUrl,
        bookingToken: result?.bookingToken,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (activeHotels.length === 0) return null;

  return (
    <section
      aria-label={tr(
        'Central de Reserva de Hospedagem VIP CONAE',
        'CONAE VIP Lodging Reservation Center'
      )}
      className="conae-panel rounded-xl p-5 sm:p-6 space-y-5 border border-amber-400/40"
    >
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-amber-400/20 pb-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-amber-300">
            {tr(
              'Reserva Direta Pré-Preenchida · Rede Booking.com × CONAE (2★ a 5★)',
              'Direct Pre-Filled Booking · Booking.com × CONAE Network (2★ to 5★)'
            )}
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              {tr(
                'Preencha sua Reserva Aqui e Finalize na Booking.com',
                'Fill Your Stay Here & Finalize on Booking.com'
              )}
            </span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#003580]/55 border border-[#006CE4]/60 text-xs font-mono text-sky-100">
            <KeyRound className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="font-bold text-amber-200">{bookingCfg.activeBookingToken}</span>
            <button
              type="button"
              onClick={() => handleCopyToken(bookingCfg.activeBookingToken, 'board_master')}
              aria-label={tr('Copiar token Booking mestre', 'Copy master Booking token')}
              className="text-sky-200 hover:text-white cursor-pointer ml-0.5"
            >
              {copiedKey === 'board_master' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </span>

          <button
            type="button"
            onClick={onOpenAllHotels}
            className="px-3 py-1.5 rounded-lg conae-panel-soft text-xs font-semibold text-amber-300 hover:text-white cursor-pointer whitespace-nowrap"
          >
            {tr('Ver Catálogo Completo', 'View Full Catalog')}
          </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl bg-emerald-950/75 border border-emerald-400/50 px-4 py-3 text-xs sm:text-sm text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-white font-medium">{feedback.message}</p>
              {feedback.bookingToken && (
                <p className="font-mono text-[11px] text-amber-300">Token: {feedback.bookingToken}</p>
              )}
            </div>
          </div>
          {feedback.bookingUrl && (
            <a
              href={feedback.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#003580] hover:bg-[#0048a8] border border-[#006CE4] text-white font-bold text-xs whitespace-nowrap"
            >
              <span>{tr('Abrir Booking.com Já Preenchido', 'Open Pre-Filled Booking.com')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* State Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {statesList.map((uf) => (
          <button
            key={uf}
            type="button"
            onClick={() => setStateFilter(uf)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
              stateFilter === uf
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'conae-panel-soft text-emerald-100/80 hover:text-white'
            }`}
          >
            {translateDynamic(uf)}
          </button>
        ))}
      </div>

      {/* Main Split: Select Hotel (Left) + Pre-Filled Reserve Form (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* Selectable Partner Hotels Grid */}
        <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
          {filteredHotels.map((hotel) => {
            const isSelected = selectedHotel?.id === hotel.id;
            return (
              <button
                key={hotel.id}
                type="button"
                onClick={() => setSelectedHotelId(hotel.id)}
                className={`text-left rounded-xl overflow-hidden border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/80'
                    : 'conae-panel-soft border-amber-400/20 hover:border-amber-400/55'
                }`}
              >
                <div className="relative h-28 bg-black/50 overflow-hidden">
                  <img
                    src={hotel.photoUrl || CONAE_ASSETS.emblemHeart}
                    alt={hotel.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-mono font-bold text-amber-300">
                      {hotel.city} · {hotel.state}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-400/40 font-mono font-bold text-emerald-300">
                      -{hotel.discountPercent}% OFF
                    </span>
                  </div>
                </div>

                <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-amber-300 truncate">
                        {translateDynamic(hotel.category)}
                      </span>
                      <span className="inline-flex items-center gap-0.5 shrink-0">
                        {Array.from({ length: hotel.stars }).map((_, idx) => (
                          <Star
                            key={idx}
                            className="w-3 h-3 fill-amber-400 text-amber-400"
                          />
                        ))}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white leading-snug line-clamp-1">
                      {hotel.name}
                    </h3>
                    <p className="text-[11px] text-emerald-100/75 line-clamp-2 leading-relaxed">
                      {hotel.description}
                    </p>
                  </div>

                  <p className="text-[10px] font-mono text-amber-200 pt-1 border-t border-amber-400/15">
                    {isSelected
                      ? tr('✓ Hotel Selecionado para Reserva', '✓ Selected for Booking')
                      : tr('Clique para selecionar', 'Click to select')}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Pre-Filled Reservation Checkout Form */}
        {selectedHotel && (
          <form
            onSubmit={handleSubmit}
            className="xl:col-span-5 conae-panel-soft rounded-xl p-4 sm:p-5 border border-[#006CE4]/50 flex flex-col justify-between space-y-3.5"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-sky-300">
                    {tr('Hospedagem Selecionada', 'Selected Stay')}
                  </span>
                  <h3 className="text-base font-bold text-white leading-snug">
                    {selectedHotel.name}
                  </h3>
                  <p className="text-xs text-emerald-200/80 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>
                      {selectedHotel.city} · {selectedHotel.state}
                    </span>
                  </p>
                </div>
                <span className="px-2 py-1 rounded bg-emerald-900/70 border border-emerald-400/40 font-mono text-xs font-bold text-emerald-200 shrink-0">
                  {tr(`Até ${selectedHotel.discountPercent}% OFF`, `Up to ${selectedHotel.discountPercent}% OFF`)}
                </span>
              </div>

              {/* Quick Period Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPeriodPreset('december')}
                  className={`px-2 py-1 rounded text-[10.5px] font-semibold cursor-pointer ${
                    activePeriod === 'december'
                      ? 'bg-amber-500 text-neutral-950'
                      : 'bg-black/50 border border-amber-400/30 text-amber-200 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  {tr('Dezembro', 'December')}
                </button>
                <button
                  type="button"
                  onClick={() => applyPeriodPreset('nextWeek')}
                  className={`px-2 py-1 rounded text-[10.5px] font-semibold cursor-pointer ${
                    activePeriod === 'nextWeek'
                      ? 'bg-[#006CE4] text-white'
                      : 'bg-black/50 border border-[#006CE4]/35 text-sky-200 hover:text-white'
                  }`}
                >
                  {tr('Próx. Semana', 'Next Week')}
                </button>
                <button
                  type="button"
                  onClick={() => applyPeriodPreset('january')}
                  className={`px-2 py-1 rounded text-[10.5px] font-semibold cursor-pointer ${
                    activePeriod === 'january'
                      ? 'bg-[#006CE4] text-white'
                      : 'bg-black/50 border border-[#006CE4]/35 text-sky-200 hover:text-white'
                  }`}
                >
                  {tr('Janeiro', 'January')}
                </button>
              </div>

              {/* Check-in & Check-out */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-emerald-100/85 mb-1">
                    {tr('Check-in', 'Check-in')}
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={checkInDate}
                      onChange={(e) => handleCheckInChange(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-black/60 border border-amber-400/35 text-xs text-white font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-emerald-100/85 mb-1">
                    {tr('Check-out', 'Check-out')}
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      required
                      min={addDaysToIsoDate(checkInDate, 1)}
                      value={checkOutDate}
                      onChange={(e) => handleCheckOutChange(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-black/60 border border-amber-400/35 text-xs text-white font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Adults, Children, Rooms */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-emerald-100/85 mb-1">
                    {tr('Adultos', 'Adults')}
                  </label>
                  <div className="relative">
                    <Users className="w-3.5 h-3.5 text-amber-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={guests}
                      onChange={(e) => setGuests(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                      className="w-full pl-7 pr-1.5 py-1.5 rounded-lg bg-black/60 border border-amber-400/35 text-xs text-white font-mono tabular-nums"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-emerald-100/85 mb-1">
                    {tr('Crianças', 'Children')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={6}
                    value={childrenCount}
                    onChange={(e) => setChildrenCount(Math.max(0, Math.min(6, Number(e.target.value) || 0)))}
                    className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-amber-400/35 text-xs text-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-emerald-100/85 mb-1">
                    {tr('Quartos', 'Rooms')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={roomsCount}
                    onChange={(e) => setRoomsCount(Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
                    className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-amber-400/35 text-xs text-white font-mono tabular-nums"
                  />
                </div>
              </div>

              {/* Pre-filled Booking Summary */}
              <div className="rounded-lg bg-[#003580]/35 border border-[#006CE4]/45 p-2.5 text-[11px] text-sky-100 space-y-1">
                <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                  <span>{tr('Vai já preenchido para a Booking.com:', 'Sent pre-filled to Booking.com:')}</span>
                </p>
                <p className="font-mono tabular-nums text-white leading-snug">
                  {formatIsoDateBR(checkInDate)} → {formatIsoDateBR(checkOutDate)} ({nightsCount}n) · {guests} adt
                  {childrenCount > 0 ? ` · ${childrenCount} cri` : ''} · {roomsCount} qto
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-amber-400/20">
              <a
                href={previewBookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-lg bg-[#003580] hover:bg-[#0048a8] border border-[#006CE4] text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 shadow-lg transition-colors"
              >
                <span>{tr('Finalizar na Booking.com (Já Preenchido)', 'Finalize on Booking.com (Pre-Filled)')}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-bold text-xs hover:from-amber-400 hover:to-amber-300 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {!profile?.virtualCardActive && <Lock className="w-3.5 h-3.5 shrink-0" />}
                <span>
                  {submitting
                    ? tr('Salvando Token VIP...', 'Saving VIP Token...')
                    : profile
                    ? tr('Registrar Token VIP no Painel CONAE', 'Save VIP Token to CONAE Dashboard')
                    : tr('Entrar para Salvar Token VIP', 'Sign In to Save VIP Token')}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* User Recent Bookings & Tokens Strip */}
      {bookings.length > 0 && (
        <div className="pt-3 border-t border-amber-400/20 space-y-2.5">
          <h3 className="text-sm font-bold text-amber-300">
            {tr('Minhas Reservas de Hospedagem & Tokens Ativos', 'My Lodging Bookings & Active Tokens')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bookings.map((b) => {
              const token =
                b.bookingToken ||
                generateHotelBookingToken(bookingCfg.tokenPrefix, b.state, b.id);
              const hotelMatch = activeHotels.find((h) => h.id === b.hotelId);
              const url =
                b.bookingUrl && b.bookingUrl.includes('checkout=')
                  ? b.bookingUrl
                  : buildBookingComUrl({
                      hotelName: b.hotelName,
                      city: hotelMatch?.city || '',
                      state: b.state,
                      checkInDate: b.checkInDate,
                      checkOutDate: addDaysToIsoDate(b.checkInDate, 3),
                      guests: b.guests,
                      children: 0,
                      rooms: 1,
                      lang: bookingLang,
                      currency: 'BRL',
                      partnerAid: bookingCfg.partnerAid,
                      bookingToken: token,
                      bookingDomain: bookingCfg.bookingDomain,
                    });

              return (
                <div
                  key={b.id}
                  className="conae-panel-soft rounded-lg p-3 space-y-2 text-xs border border-[#006CE4]/35"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{b.hotelName}</p>
                      <p className="text-emerald-200/75">
                        {b.state} · Check-in: {formatIsoDateBR(b.checkInDate)} · {b.guests} {tr('hóspede(s)', 'guest(s)')}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-amber-300 shrink-0">
                      {b.status === 'confirmed'
                        ? tr('Confirmada', 'Confirmed')
                        : b.status === 'cancelled'
                        ? tr('Cancelada', 'Cancelled')
                        : tr('Pendente', 'Pending')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-amber-400/15">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#003580]/40 border border-[#006CE4]/50 font-mono text-[11px] font-bold text-amber-200">
                      <KeyRound className="w-3 h-3 text-sky-300" />
                      <span>{token}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyToken(token, `inline_${b.id}`)}
                        aria-label={tr('Copiar token da reserva', 'Copy booking token')}
                        className="text-sky-200 hover:text-white cursor-pointer"
                      >
                        {copiedKey === `inline_${b.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </span>

                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#003580] hover:bg-[#0048a8] border border-[#006CE4]/60 text-white font-semibold text-[11px]"
                    >
                      <span>{tr('Finalizar na Booking.com', 'Finalize on Booking.com')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
