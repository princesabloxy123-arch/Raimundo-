import React, { useMemo, useState } from 'react';
import {
  BedDouble,
  Building,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  KeyRound,
  Lock,
  MapPin,
  Search,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { CONAE_ASSETS } from '../data/conaeSeed';
import { useLanguage } from '../i18n/LanguageContext';
import type { BookingPublicConfig, HotelBooking, PartnerHotel, UserProfile } from '../types';
import {
  addDaysToIsoDate,
  buildBookingComUrl,
  calculateNightsCount,
  DEFAULT_BOOKING_PUBLIC,
  formatIsoDateBR,
  generateHotelBookingToken,
  getFutureBookingIsoDate,
} from '../utils/bookingTokenHelper';

const POPULAR_BOOKING_DESTINATIONS = [
  'Goiânia, GO, Brasil',
  'Caldas Novas, GO, Brasil',
  'São Paulo, SP, Brasil',
  'Rio de Janeiro, RJ, Brasil',
  'Brasília, DF, Brasil',
  'Gramado, RS, Brasil',
  'Salvador, BA, Brasil',
  'Fortaleza, CE, Brasil',
];

interface HotelsTabProps {
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
  onGoToBenefits?: () => void;
}

export const HotelsTab: React.FC<HotelsTabProps> = ({
  hotels,
  bookings,
  bookingPublic,
  profile,
  onBookHotel,
  onRequireAuth,
  onGoToBenefits,
}) => {
  const { tr, translateDynamic, lang } = useLanguage();
  const [stateFilter, setStateFilter] = useState<string>('TODOS');
  const [starsFilter, setStarsFilter] = useState<number>(0);

  // Pre-filled Booking.com reservation form state (shared with cards & modal)
  const [destinationInput, setDestinationInput] = useState<string>('Goiânia, GO, Brasil');
  const [checkInDate, setCheckInDate] = useState<string>('2026-12-10');
  const [checkOutDate, setCheckOutDate] = useState<string>('2026-12-15');
  const [guests, setGuests] = useState<number>(2);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [roomsCount, setRoomsCount] = useState<number>(1);
  const [activePeriod, setActivePeriod] = useState<'december' | 'nextWeek' | 'january' | 'custom'>('december');

  const [bookingHotel, setBookingHotel] = useState<PartnerHotel | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    bookingUrl?: string;
    bookingToken?: string;
    hotelName?: string;
  } | null>(null);
  const [cardPhotoIndex, setCardPhotoIndex] = useState<Record<string, number>>({});
  const [copiedTokenKey, setCopiedTokenKey] = useState<string | null>(null);
  const [tokenLookup, setTokenLookup] = useState('');

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

  const searchBookingUrl = useMemo(
    () =>
      buildBookingComUrl({
        destination: destinationInput || 'Brasil',
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
      }),
    [
      destinationInput,
      checkInDate,
      checkOutDate,
      guests,
      childrenCount,
      roomsCount,
      bookingLang,
      bookingCfg,
    ]
  );

  const modalBookingUrl = useMemo(() => {
    if (!bookingHotel) return searchBookingUrl;
    return buildBookingComUrl({
      hotelName: bookingHotel.name,
      city: bookingHotel.city,
      state: bookingHotel.state,
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
    bookingHotel,
    searchBookingUrl,
    checkInDate,
    checkOutDate,
    guests,
    childrenCount,
    roomsCount,
    bookingLang,
    bookingCfg,
  ]);

  const matchedBooking = useMemo(() => {
    const q = tokenLookup.trim().toUpperCase();
    if (!q) return null;
    return (
      bookings.find((b) => {
        const tok = (
          b.bookingToken || generateHotelBookingToken(bookingCfg.tokenPrefix, b.state, b.id)
        ).toUpperCase();
        return tok === q || tok.includes(q);
      }) || null
    );
  }, [tokenLookup, bookings, bookingCfg.tokenPrefix]);

  const handleCopyToken = async (token: string, key: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedTokenKey(key);
      window.setTimeout(() => setCopiedTokenKey(null), 2200);
    } catch {
      // Ignore clipboard errors
    }
  };

  const statesList = ['TODOS', ...Array.from(new Set(hotels.map((h) => h.state))).sort()];
  const filteredHotels = useMemo(
    () =>
      hotels.filter((h) => {
        const matchState = stateFilter === 'TODOS' || h.state === stateFilter;
        const matchStars = starsFilter === 0 || h.stars === starsFilter;
        return matchState && matchStars && h.active;
      }),
    [hotels, stateFilter, starsFilter]
  );

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onRequireAuth();
      return;
    }
    if (!bookingHotel) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await onBookHotel({
        hotel: bookingHotel,
        checkInDate,
        checkOutDate,
        guests,
        children: childrenCount,
        rooms: roomsCount,
      });
      const finalUrl = result?.bookingUrl || modalBookingUrl;
      setFeedback({
        message: tr(
          `Reserva VIP registrada para "${bookingHotel.name}" (${bookingHotel.state}). Clique abaixo para abrir a Booking.com já preenchida e finalizar.`,
          `VIP stay registered for "${bookingHotel.name}" (${bookingHotel.state}). Click below to open Booking.com pre-filled and finish.`
        ),
        bookingUrl: finalUrl,
        bookingToken: result?.bookingToken,
        hotelName: bookingHotel.name,
      });
      setBookingHotel(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="conae-panel rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-medium text-amber-300">
            {tr('Rede Nacional de Hospedagem & Eventos · 2★ a 5★', 'National Lodging & Events Network · 2★ to 5★')}
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {tr('Hotéis & Clubes VIP · Reserva Pré-Preenchida Booking.com', 'VIP Hotels & Clubs · Pre-Filled Booking.com Search')}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/80">
            {tr(
              'Preencha destino, check-in, check-out, adultos, crianças e quartos aqui no app. Ao finalizar, você é redirecionado direto para a Booking.com já toda preenchida para concluir a reserva.',
              'Fill in destination, check-in, check-out, adults, children, and rooms right here in the app. When finalizing, you go straight to Booking.com already pre-filled to complete your reservation.'
            )}
          </p>
        </div>

        <div className="conae-panel-soft rounded-lg p-3 text-xs space-y-1 shrink-0">
          <p className="text-amber-300 font-semibold">{tr('Seu Critério de Acesso Atual', 'Your Current Access Level')}</p>
          <p className="text-white font-mono">
            {profile?.virtualCardActive
              ? tr(`Cartão Virtual Ativo · Nível ${translateDynamic(profile.vipTier)}`, `Virtual Card Active · ${translateDynamic(profile.vipTier)} Tier`)
              : tr('Ative um Pacote/Mensalidade para Desconto VIP', 'Activate a Package/Monthly Plan for VIP Discounts')}
          </p>
        </div>
      </div>

      {/* Compact Pre-Filled Booking.com Reservation Builder (same pattern as GOL & TAM) */}
      <div className="conae-panel rounded-xl p-4 border border-[#006CE4]/55 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#003580] border border-[#006CE4] text-white font-bold text-xs">
              <BedDouble className="w-3.5 h-3.5 text-sky-300" />
              <span>Booking.com</span>
            </span>
            <span className="text-xs font-semibold text-white">
              {tr('Preencha sua Reserva Aqui e Finalize na Booking.com', 'Fill Your Stay Here & Finalize on Booking.com')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyPeriodPreset('december')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                activePeriod === 'december'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'bg-black/50 border border-amber-400/35 text-amber-200 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3 inline mr-1" />
              {tr('Pacote Dezembro', 'December Package')}
            </button>
            <button
              type="button"
              onClick={() => applyPeriodPreset('nextWeek')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                activePeriod === 'nextWeek'
                  ? 'bg-[#006CE4] text-white'
                  : 'bg-black/50 border border-[#006CE4]/40 text-sky-200 hover:text-white'
              }`}
            >
              {tr('Próxima Semana', 'Next Week')}
            </button>
            <button
              type="button"
              onClick={() => applyPeriodPreset('january')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                activePeriod === 'january'
                  ? 'bg-[#006CE4] text-white'
                  : 'bg-black/50 border border-[#006CE4]/40 text-sky-200 hover:text-white'
              }`}
            >
              {tr('Férias Janeiro', 'January Holiday')}
            </button>
          </div>
        </div>

        {/* Quick Destination Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {POPULAR_BOOKING_DESTINATIONS.map((dest) => {
            const shortLabel = dest.replace(', Brasil', '');
            const isSelected = destinationInput.trim().toLowerCase() === dest.toLowerCase();
            return (
              <button
                key={dest}
                type="button"
                onClick={() => setDestinationInput(dest)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#003580] border border-[#006CE4] text-white font-semibold'
                    : 'bg-black/45 border border-white/10 text-emerald-100/80 hover:border-[#006CE4]/60 hover:text-white'
                }`}
              >
                {shortLabel}
              </button>
            );
          })}
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-[11px] text-sky-200/90 mb-1">
              {tr('Destino, Cidade ou Nome do Hotel', 'Destination, City or Hotel Name')}
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                placeholder={tr('Ex: Goiânia, Caldas Novas ou Hotel...', 'e.g. Goiânia, São Paulo or Hotel...')}
                className="w-full pl-8 pr-2.5 py-2 rounded-lg bg-black/60 border border-[#006CE4]/45 text-xs text-white focus:outline-none focus:border-[#006CE4]"
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] text-sky-200/90 mb-1">
              {tr('Check-in (Entrada)', 'Check-in')}
            </label>
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => handleCheckInChange(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg bg-black/60 border border-[#006CE4]/45 text-xs text-white font-mono tabular-nums focus:outline-none focus:border-[#006CE4]"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] text-sky-200/90 mb-1">
              {tr('Check-out (Saída)', 'Check-out')}
            </label>
            <input
              type="date"
              min={addDaysToIsoDate(checkInDate, 1)}
              value={checkOutDate}
              onChange={(e) => handleCheckOutChange(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg bg-black/60 border border-[#006CE4]/45 text-xs text-white font-mono tabular-nums focus:outline-none focus:border-[#006CE4]"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 sm:col-span-2 lg:col-span-4">
            <div>
              <label className="block text-[11px] text-sky-200/90 mb-1">
                {tr('Adultos', 'Adults')}
              </label>
              <select
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="w-full px-2 py-2 rounded-lg bg-black/60 border border-[#006CE4]/45 text-xs text-white font-mono tabular-nums"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-sky-200/90 mb-1">
                {tr('Crianças', 'Children')}
              </label>
              <select
                value={childrenCount}
                onChange={(e) => setChildrenCount(Number(e.target.value))}
                className="w-full px-2 py-2 rounded-lg bg-black/60 border border-[#006CE4]/45 text-xs text-white font-mono tabular-nums"
              >
                {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-sky-200/90 mb-1">
                {tr('Quartos', 'Rooms')}
              </label>
              <select
                value={roomsCount}
                onChange={(e) => setRoomsCount(Number(e.target.value))}
                className="w-full px-2 py-2 rounded-lg bg-black/60 border border-[#006CE4]/45 text-xs text-white font-mono tabular-nums"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Live Pre-Filled Summary + Direct Finalize CTA */}
        <div className="rounded-lg bg-[#003580]/30 border border-[#006CE4]/45 px-3 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="text-[11px] text-sky-100 space-y-0.5 min-w-0">
            <p className="font-semibold text-amber-300">
              {tr('Dados enviados já preenchidos para a Booking.com:', 'Data sent pre-filled to Booking.com:')}
            </p>
            <p className="font-mono tabular-nums text-white break-words">
              {destinationInput || 'Brasil'} · {formatIsoDateBR(checkInDate)} → {formatIsoDateBR(checkOutDate)} ({nightsCount}{' '}
              {nightsCount === 1 ? tr('noite', 'night') : tr('noites', 'nights')}) · {guests}{' '}
              {guests === 1 ? tr('adulto', 'adult') : tr('adultos', 'adults')}
              {childrenCount > 0 ? ` · ${childrenCount} ${childrenCount === 1 ? tr('criança', 'child') : tr('crianças', 'children')}` : ''} ·{' '}
              {roomsCount} {roomsCount === 1 ? tr('quarto', 'room') : tr('quartos', 'rooms')}
            </p>
          </div>

          <a
            href={searchBookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#003580] hover:bg-[#0048a8] border border-[#006CE4] text-white font-bold text-xs shadow-lg transition-colors whitespace-nowrap"
          >
            <span>{tr('Finalizar na Booking.com (Já Preenchido)', 'Finalize on Booking.com (Pre-Filled)')}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Booking.com Partner Token Integration & Verification Bar */}
      <div className="conae-panel rounded-xl p-4 border border-[#006CE4]/35 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-[#003580] border border-[#006CE4] text-white font-bold text-xs">
              Booking.com × CONAE
            </span>
            <span className="text-xs font-medium text-sky-200">
              {bookingCfg.connected
                ? tr(`Conexão Token Ativa · Partner AID ${bookingCfg.partnerAid}`, `Active Token Connection · Partner AID ${bookingCfg.partnerAid}`)
                : tr('Conexão Booking em preparação', 'Booking connection standby')}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-emerald-100/75">{tr('Token Mestre de Hospedagem:', 'Master Lodging Token:')}</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/55 border border-amber-400/40 font-mono font-bold text-amber-300">
              <KeyRound className="w-3.5 h-3.5 text-sky-300" />
              <span>{bookingCfg.activeBookingToken}</span>
              <button
                type="button"
                onClick={() => handleCopyToken(bookingCfg.activeBookingToken, 'master')}
                className="text-sky-200 hover:text-white cursor-pointer ml-1"
                aria-label={tr('Copiar token Booking mestre', 'Copy master Booking token')}
              >
                {copiedTokenKey === 'master' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={tokenLookup}
              onChange={(e) => setTokenLookup(e.target.value)}
              placeholder={tr('Validar token (ex: BKG-CNEC-...)', 'Verify token (e.g. BKG-CNEC-...)')}
              className="pl-8 pr-3 py-2 rounded-lg bg-black/55 border border-[#006CE4]/40 text-xs font-mono text-white w-full sm:w-60"
            />
          </div>
          {tokenLookup.trim().length > 0 && (
            <div className="text-xs px-3 py-1.5 rounded-lg bg-black/60 border border-amber-400/35">
              {matchedBooking ? (
                <span className="text-emerald-300 font-medium">
                  ✓ {matchedBooking.hotelName} ({matchedBooking.checkInDate}) · {matchedBooking.status === 'confirmed' ? tr('Confirmada', 'Confirmed') : matchedBooking.status === 'cancelled' ? tr('Cancelada', 'Cancelled') : tr('Pendente', 'Pending')}
                </span>
              ) : tokenLookup.trim().toUpperCase() === bookingCfg.activeBookingToken.toUpperCase() ? (
                <span className="text-sky-300 font-medium">
                  ✓ {tr('Token Mestre CONAE × Booking Válido', 'Valid CONAE × Booking Master Token')}
                </span>
              ) : (
                <span className="text-amber-300">
                  {tr('Token não encontrado nas suas reservas.', 'Token not found in your bookings.')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Banner with Immediate Pre-Filled Booking.com Finalize Button */}
      {feedback && (
        <div className="rounded-xl bg-emerald-950/75 border border-emerald-400/50 px-4 py-3.5 text-xs sm:text-sm text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-white">{feedback.message}</p>
              {feedback.bookingToken && (
                <p className="font-mono text-[11px] text-amber-300">
                  Token: {feedback.bookingToken}
                </p>
              )}
            </div>
          </div>
          {feedback.bookingUrl && (
            <a
              href={feedback.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#003580] hover:bg-[#0048a8] border border-[#006CE4] text-white font-bold text-xs shadow-lg whitespace-nowrap"
            >
              <span>{tr('Abrir Booking.com Já Preenchido', 'Open Pre-Filled Booking.com')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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

        <div className="flex items-center gap-1.5">
          {[0, 5, 4, 3, 2].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStarsFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                starsFilter === st
                  ? 'bg-emerald-700 text-white border border-amber-400/60'
                  : 'conae-panel-soft text-emerald-100/75 hover:text-white'
              }`}
            >
              {st === 0 ? tr('Todas Estrelas', 'All Stars') : `${st}★`}
            </button>
          ))}
        </div>
      </div>

      {/* Hotels & Clubs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredHotels.map((hotel) => {
          const allPhotos = [
            ...(hotel.photoUrl ? [hotel.photoUrl] : []),
            ...(Array.isArray(hotel.galleryPhotos) ? hotel.galleryPhotos.filter(Boolean) : []),
          ];
          const activePhotoIdx = (cardPhotoIndex[hotel.id] || 0) % Math.max(1, allPhotos.length);
          const displayedPhoto = allPhotos[activePhotoIdx] || CONAE_ASSETS.emblemHeart;

          const directCardBookingUrl = buildBookingComUrl({
            hotelName: hotel.name,
            city: hotel.city,
            state: hotel.state,
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

          return (
            <div
              key={hotel.id}
              className="conae-panel rounded-xl overflow-hidden flex flex-col justify-between"
            >
              <div className="relative h-40 bg-black/50 border-b border-amber-400/20 overflow-hidden">
                <img
                  src={displayedPhoto}
                  alt={hotel.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2 pointer-events-none">
                  <span className="px-2 py-0.5 rounded bg-black/75 border border-amber-400/50 text-[10px] font-mono font-bold text-amber-300">
                    {hotel.city} · {hotel.state}
                  </span>
                  {allPhotos.length > 1 && (
                    <span className="px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono text-white">
                      {activePhotoIdx + 1}/{allPhotos.length}
                    </span>
                  )}
                </div>
              </div>

              {allPhotos.length > 1 && (
                <div className="px-4 pt-2.5 flex items-center gap-1.5 overflow-x-auto">
                  {allPhotos.map((src, idx) => (
                    <button
                      key={`${hotel.id}_gal_${idx}`}
                      type="button"
                      onClick={() =>
                        setCardPhotoIndex((prev) => ({ ...prev, [hotel.id]: idx }))
                      }
                      className={`w-10 h-8 rounded overflow-hidden shrink-0 border cursor-pointer ${
                        idx === activePhotoIdx
                          ? 'border-amber-400 ring-1 ring-amber-400'
                          : 'border-amber-400/20 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={src}
                        alt={`${hotel.name} ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-amber-300 font-medium">{translateDynamic(hotel.category)}</span>
                    <span className="inline-flex items-center gap-0.5 text-amber-400 font-mono">
                      {Array.from({ length: hotel.stars }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white">{hotel.name}</h3>
                  <p className="text-xs text-emerald-200/80 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{hotel.city} · {hotel.state}</span>
                  </p>

                  <p className="text-xs text-emerald-100/75 leading-relaxed">{hotel.description}</p>
                  <p className="text-[11px] text-amber-200/85">
                    {hotel.hotelBenefits || tr('Inclui: Cursos CONAE, Investimento Bank CNEC, Clubes, Clínicas & Exames Laboratoriais.', 'Includes: CONAE Courses, CNEC Bank Investment, Clubs, Clinics & Lab Exams.')}
                  </p>
                  <p className="text-[10.5px] font-mono tabular-nums text-sky-200/90 bg-[#003580]/25 border border-[#006CE4]/30 rounded px-2 py-1">
                    {formatIsoDateBR(checkInDate)} → {formatIsoDateBR(checkOutDate)} ({nightsCount}n) · {guests} adt · {roomsCount} qto
                  </p>
                </div>

                <div className="pt-3 border-t border-amber-400/20 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] text-emerald-200/65 block">{tr('Desconto Conveniado', 'Member Discount')}</span>
                      <span className="text-sm font-bold font-mono text-emerald-300">
                        {tr(`Até ${hotel.discountPercent}% OFF`, `Up to ${hotel.discountPercent}% OFF`)}
                      </span>
                    </div>

                    {onGoToBenefits && (
                      <button
                        type="button"
                        onClick={onGoToBenefits}
                        className="px-2.5 py-1.5 rounded-lg conae-panel-soft text-amber-300 hover:text-white text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        {tr('Cartão Hotel', 'Hotel Card')}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <a
                      href={directCardBookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-2 rounded-lg bg-[#003580] hover:bg-[#0048a8] border border-[#006CE4]/70 text-white font-semibold text-[11px] transition-colors inline-flex items-center justify-center gap-1 whitespace-nowrap"
                    >
                      <span>Booking.com</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setDestinationInput(`${hotel.name}, ${hotel.city}, ${hotel.state}`);
                        setBookingHotel(hotel);
                      }}
                      className="px-2.5 py-2 rounded-lg bg-amber-500 text-neutral-950 font-semibold text-[11px] hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-1"
                    >
                      {!profile?.virtualCardActive && <Lock className="w-3 h-3 shrink-0" />}
                      <span>{tr('Reservar VIP', 'Book VIP')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* User Bookings List */}
      {bookings.length > 0 && (
        <div className="conae-panel rounded-xl p-5 space-y-3">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-amber-400" />
            <span>{tr('Minhas Reservas VIP & Tokens Booking', 'My VIP Bookings & Booking Tokens')}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bookings.map((b) => {
              const token =
                b.bookingToken || generateHotelBookingToken(bookingCfg.tokenPrefix, b.state, b.id);
              const hotelMatch = hotels.find((h) => h.id === b.hotelId);
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
                <div key={b.id} className="conae-panel-soft rounded-lg p-3.5 space-y-2 text-xs border border-[#006CE4]/35">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{b.hotelName}</p>
                      <p className="text-emerald-200/70">
                        {b.state} · {tr('Check-in', 'Check-in')}: {formatIsoDateBR(b.checkInDate)} · {b.guests} {tr('hóspede(s)', 'guest(s)')}
                      </p>
                    </div>
                    <span className="font-mono font-semibold text-amber-300 shrink-0">
                      {b.status === 'confirmed' ? tr('Confirmada', 'Confirmed') : b.status === 'cancelled' ? tr('Cancelada', 'Cancelled') : tr('Pendente', 'Pending')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-400/15">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#003580]/40 border border-[#006CE4]/50 font-mono text-[11px] font-bold text-amber-200">
                      <KeyRound className="w-3 h-3 text-sky-300" />
                      <span>{token}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyToken(token, b.id)}
                        aria-label={tr('Copiar token da reserva', 'Copy reservation token')}
                        className="text-sky-200 hover:text-white cursor-pointer"
                      >
                        {copiedTokenKey === b.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
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

      {/* Booking Modal */}
      {bookingHotel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleConfirmBooking} className="conae-panel max-w-md w-full rounded-xl p-5 sm:p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">{tr('Reservar Hospedagem VIP', 'Book VIP Stay')}</h3>
            <p className="text-xs text-emerald-100/80">
              {bookingHotel.name} ({bookingHotel.city} - {bookingHotel.state}) · {tr(`Desconto de até ${bookingHotel.discountPercent}% com Cartão Virtual CONAE.`, `Discount up to ${bookingHotel.discountPercent}% with CONAE Virtual Card.`)}
            </p>
            <div className="rounded-lg bg-[#003580]/30 border border-[#006CE4]/45 px-3 py-2 text-[11px] text-sky-100 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                {tr(
                  `Os dados abaixo vão já preenchidos para a Booking.com com o Token CONAE (AID ${bookingCfg.partnerAid}).`,
                  `The details below are sent pre-filled to Booking.com with your CONAE Token (AID ${bookingCfg.partnerAid}).`
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs text-emerald-100/80 mb-1">{tr('Check-in', 'Check-in')}</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={checkInDate}
                    onChange={(e) => handleCheckInChange(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 rounded-lg bg-black/55 border border-amber-400/30 text-xs text-white font-mono tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-emerald-100/80 mb-1">{tr('Check-out', 'Check-out')}</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    required
                    min={addDaysToIsoDate(checkInDate, 1)}
                    value={checkOutDate}
                    onChange={(e) => handleCheckOutChange(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 rounded-lg bg-black/55 border border-amber-400/30 text-xs text-white font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-emerald-100/80 mb-1">{tr('Adultos', 'Adults')}</label>
                <div className="relative">
                  <Users className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={guests}
                    onChange={(e) => setGuests(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                    className="w-full pl-8 pr-2 py-2 rounded-lg bg-black/55 border border-amber-400/30 text-xs text-white font-mono tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-emerald-100/80 mb-1">{tr('Crianças', 'Children')}</label>
                <input
                  type="number"
                  min={0}
                  max={6}
                  value={childrenCount}
                  onChange={(e) => setChildrenCount(Math.max(0, Math.min(6, Number(e.target.value) || 0)))}
                  className="w-full px-2.5 py-2 rounded-lg bg-black/55 border border-amber-400/30 text-xs text-white font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-emerald-100/80 mb-1">{tr('Quartos', 'Rooms')}</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={roomsCount}
                  onChange={(e) => setRoomsCount(Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
                  className="w-full px-2.5 py-2 rounded-lg bg-black/55 border border-amber-400/30 text-xs text-white font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="rounded-lg bg-black/50 border border-amber-400/25 px-3 py-2 text-[11px] font-mono tabular-nums text-sky-100">
              {bookingHotel.name} · {formatIsoDateBR(checkInDate)} → {formatIsoDateBR(checkOutDate)} ({nightsCount}n) · {guests} adt
              {childrenCount > 0 ? ` · ${childrenCount} cri` : ''} · {roomsCount} qto
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <a
                href={modalBookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-4 py-2.5 rounded-lg bg-[#003580] hover:bg-[#0048a8] border border-[#006CE4] text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-lg"
              >
                <span>{tr('Finalizar Agora na Booking.com (Já Preenchido)', 'Finalize Now on Booking.com (Pre-Filled)')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setBookingHotel(null)}
                  className="px-3 py-2 rounded-lg text-xs text-emerald-200 hover:text-white cursor-pointer"
                >
                  {tr('Cancelar', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-neutral-950 font-semibold text-xs hover:bg-amber-400 cursor-pointer"
                >
                  {submitting
                    ? tr('Salvando Token...', 'Saving Token...')
                    : profile
                      ? tr('Registrar Token VIP & Salvar', 'Save & Generate VIP Token')
                      : tr('Entrar para Gerar Token VIP', 'Sign In for VIP Token')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
