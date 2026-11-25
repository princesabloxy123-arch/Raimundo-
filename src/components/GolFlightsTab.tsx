import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Luggage,
  Plane,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  buildGolOfficialCheckoutUrl,
  GOL_AIRPORTS,
  GOL_OFFICIAL_URL,
  GOL_PROMO_FLIGHTS,
  type GolPromoFlight,
} from '../data/golFlightsData';
import { useLanguage } from '../i18n/LanguageContext';

interface GolFlightsTabProps {
  onGoToHotels?: () => void;
  onGoToTam?: () => void;
}

type RegionFilter = 'Todas' | 'Pacote Dezembro' | 'Centro-Oeste' | 'Sudeste' | 'Nordeste' | 'Sul' | 'Norte';

function formatBrDate(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export const GolFlightsTab: React.FC<GolFlightsTabProps> = ({
  onGoToHotels,
  onGoToTam,
}) => {
  const { isEn, tr } = useLanguage();
  const numLocale = isEn ? 'en-US' : 'pt-BR';

  const [tripType, setTripType] = useState<'roundtrip' | 'oneway'>('roundtrip');
  const [origin, setOrigin] = useState('GYN');
  const [destination, setDestination] = useState('GRU');
  const [departureDate, setDepartureDate] = useState('2026-12-10');
  const [returnDate, setReturnDate] = useState('2026-12-15');
  const [passengers, setPassengers] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('Todas');
  const [selectedPromo, setSelectedPromo] = useState<GolPromoFlight>(GOL_PROMO_FLIGHTS[0]);
  const [checkoutReady, setCheckoutReady] = useState(false);

  const fmtBRL = (v: number) =>
    v.toLocaleString(numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const filteredPromos = useMemo(() => {
    if (regionFilter === 'Todas') return GOL_PROMO_FLIGHTS;
    if (regionFilter === 'Pacote Dezembro') {
      return GOL_PROMO_FLIGHTS.filter((f) => f.isDecemberPackage);
    }
    return GOL_PROMO_FLIGHTS.filter((f) => f.region === regionFilter);
  }, [regionFilter]);

  const applyPeriodPreset = (preset: 'dezembro' | 'semana' | 'janeiro') => {
    if (preset === 'dezembro') {
      setDepartureDate('2026-12-10');
      setReturnDate('2026-12-17');
      setTripType('roundtrip');
    } else if (preset === 'janeiro') {
      setDepartureDate('2027-01-12');
      setReturnDate('2027-01-19');
      setTripType('roundtrip');
    } else {
      const d1 = new Date();
      d1.setDate(d1.getDate() + 7);
      const d2 = new Date();
      d2.setDate(d2.getDate() + 12);
      setDepartureDate(d1.toISOString().slice(0, 10));
      setReturnDate(d2.toISOString().slice(0, 10));
    }
    setCheckoutReady(true);
  };

  const handleSelectPromo = (promo: GolPromoFlight) => {
    setSelectedPromo(promo);
    setOrigin(promo.originCode);
    setDestination(promo.destCode);
    if (promo.defaultDepartureDate) {
      setDepartureDate(promo.defaultDepartureDate);
    }
    if (promo.defaultReturnDate) {
      setReturnDate(promo.defaultReturnDate);
    }
    setCheckoutReady(true);
  };

  const handleSwapAirports = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const tripMultiplier = tripType === 'roundtrip' ? 2 : 1;
  const totalTravellers = passengers + childrenCount;

  const matchedPromo = useMemo(
    () =>
      GOL_PROMO_FLIGHTS.find(
        (f) => f.originCode === origin && f.destCode === destination
      ) || selectedPromo,
    [origin, destination, selectedPromo]
  );

  const estimatedTotalBRL = Number(
    (matchedPromo.promoPriceBRL * totalTravellers * tripMultiplier).toFixed(2)
  );

  // Official pre-filled GOL B2C deep link using EXACT user-selected parameters
  const officialRedirectUrl = useMemo(
    () =>
      buildGolOfficialCheckoutUrl({
        origin,
        destination,
        departureDate,
        returnDate: tripType === 'roundtrip' ? returnDate : undefined,
        tripType,
        passengers,
        children: childrenCount,
      }),
    [origin, destination, departureDate, returnDate, tripType, passengers, childrenCount]
  );

  const originObj = GOL_AIRPORTS.find((a) => a.code === origin);
  const destObj = GOL_AIRPORTS.find((a) => a.code === destination);

  return (
    <div className="space-y-4">
      {/* Compact Top Banner */}
      <section className="conae-panel rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-[#FF5A00]/45">
        <div className="space-y-1 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-bold text-[#FF7A2F]">
              <Plane className="w-4 h-4 animate-plane-takeoff" />
              {tr('Promoções & Pacotes GOL · voegol.com.br', 'GOL Deals & Packages · voegol.com.br')}
            </span>
            <span className="text-emerald-200/60" aria-hidden="true">·</span>
            <span className="text-emerald-200/80">
              {tr('Abre já preenchido na busca oficial da GOL', 'Opens pre-filled on GOL’s official booking engine')}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
            {tr(
              'Passagens Aéreas & Pacote Dezembro — GOL Linhas Aéreas',
              'Flight Deals & December Packages — GOL Airlines'
            )}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
            {tr(
              'Escolha a origem, destino, datas e passageiros aqui na aba. Ao clicar em qualquer pacote ou botão de compra, o site oficial da GOL abre automaticamente preenchido com exatamente o que você procurou.',
              'Choose your origin, destination, dates, and passengers here. Clicking any package or buy button opens GOL’s official booking page automatically pre-filled with your exact search.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onGoToTam && (
            <button
              type="button"
              onClick={onGoToTam}
              className="px-3.5 py-2 rounded-lg bg-[#E8114B] hover:bg-[#ff2560] text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plane className="w-3.5 h-3.5" />
              <span>{tr('Comparar na TAM (LATAM)', 'Compare on TAM (LATAM)')}</span>
            </button>
          )}
          <a
            href={officialRedirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-lg bg-[#FF5A00] hover:bg-[#ff6d1f] text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <span>{tr('Abrir Busca Preenchida GOL', 'Open Pre-Filled GOL Search')}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          {onGoToHotels && (
            <button
              type="button"
              onClick={onGoToHotels}
              className="px-3 py-2 rounded-lg conae-panel-soft hover:bg-emerald-900/50 text-amber-200 border border-amber-400/35 text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              {tr('Hotel VIP', 'VIP Hotel')}
            </button>
          )}
        </div>
      </section>

      {/* Main Grid: Left Pre-Filled Flight Builder (5 cols) + Right Scrollable Packages & Promos (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT: Compact Flight Builder & Official Pre-Filled Redirect */}
        <div className="lg:col-span-5 conae-panel rounded-xl p-4 space-y-3.5 border border-[#FF5A00]/35">
          <div className="flex items-center justify-between gap-2 border-b border-amber-400/20 pb-2.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Search className="w-4 h-4 text-[#FF7A2F]" />
              <span>{tr('Montar Viagem & Abrir na GOL', 'Build Trip & Open on GOL')}</span>
            </h3>
            <div className="flex items-center gap-1 bg-black/50 p-0.5 rounded-md border border-white/10 text-[11px]">
              <button
                type="button"
                onClick={() => setTripType('roundtrip')}
                className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                  tripType === 'roundtrip' ? 'bg-[#FF5A00] text-white' : 'text-emerald-100/75'
                }`}
              >
                {tr('Ida e Volta', 'Round-Trip')}
              </button>
              <button
                type="button"
                onClick={() => setTripType('oneway')}
                className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                  tripType === 'oneway' ? 'bg-[#FF5A00] text-white' : 'text-emerald-100/75'
                }`}
              >
                {tr('Só Ida', 'One-Way')}
              </button>
            </div>
          </div>

          {/* Quick Date Presets including Pacote Dezembro */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => applyPeriodPreset('dezembro')}
              className="px-2.5 py-1 rounded-md bg-[#FF5A00]/20 hover:bg-[#FF5A00]/35 border border-[#FF5A00]/55 text-amber-200 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-[#FF8C42]" />
              <span>{tr('Pacote Dezembro', 'December Package')}</span>
            </button>
            <button
              type="button"
              onClick={() => applyPeriodPreset('semana')}
              className="px-2 py-1 rounded-md bg-black/45 hover:bg-emerald-900/50 border border-amber-400/25 text-emerald-100/85 cursor-pointer"
            >
              {tr('Próxima Semana', 'Next Week')}
            </button>
            <button
              type="button"
              onClick={() => applyPeriodPreset('janeiro')}
              className="px-2 py-1 rounded-md bg-black/45 hover:bg-emerald-900/50 border border-amber-400/25 text-emerald-100/85 cursor-pointer"
            >
              {tr('Férias Janeiro', 'January')}
            </button>
          </div>

          {/* Origin / Swap / Destination */}
          <div className="grid grid-cols-11 gap-1.5 items-end text-xs">
            <div className="col-span-5">
              <label className="block text-[11px] text-emerald-100/80 mb-1">
                {tr('Origem', 'Origin')}
              </label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full rounded-lg bg-black/55 border border-[#FF5A00]/35 px-2.5 py-2 text-white text-xs focus:outline-none focus:border-[#FF5A00]"
              >
                {GOL_AIRPORTS.map((ap) => (
                  <option key={`orig_${ap.code}`} value={ap.code} className="bg-[#061610]">
                    {ap.code} · {ap.city} ({ap.state})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1 flex justify-center pb-1">
              <button
                type="button"
                onClick={handleSwapAirports}
                aria-label={tr('Inverter origem e destino', 'Swap origin and destination')}
                className="p-1.5 rounded-lg bg-black/55 border border-amber-400/30 text-amber-300 hover:text-white cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="col-span-5">
              <label className="block text-[11px] text-emerald-100/80 mb-1">
                {tr('Destino', 'Destination')}
              </label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full rounded-lg bg-black/55 border border-[#FF5A00]/35 px-2.5 py-2 text-white text-xs focus:outline-none focus:border-[#FF5A00]"
              >
                {GOL_AIRPORTS.map((ap) => (
                  <option key={`dest_${ap.code}`} value={ap.code} className="bg-[#061610]">
                    {ap.code} · {ap.city} ({ap.state})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates & Passengers */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[11px] text-emerald-100/80 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" />
                {tr('Data de Ida', 'Departure Date')}
              </label>
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-2 py-1.5 text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] text-emerald-100/80 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" />
                {tr('Data de Volta', 'Return Date')}
              </label>
              <input
                type="date"
                disabled={tripType === 'oneway'}
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-2 py-1.5 text-white font-mono text-xs disabled:opacity-40"
              />
            </div>

            <div>
              <label className="block text-[11px] text-emerald-100/80 mb-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-amber-400" />
                {tr('Adultos (12+)', 'Adults (12+)')}
              </label>
              <select
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value) || 1)}
                className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-2 py-1.5 text-white font-mono text-xs"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <option key={n} value={n} className="bg-[#061610]">
                    {n} {n === 1 ? tr('Adulto', 'Adult') : tr('Adultos', 'Adults')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-emerald-100/80 mb-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-emerald-400" />
                {tr('Crianças (2–11)', 'Children (2–11)')}
              </label>
              <select
                value={childrenCount}
                onChange={(e) => setChildrenCount(Number(e.target.value) || 0)}
                className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-2 py-1.5 text-white font-mono text-xs"
              >
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n} className="bg-[#061610]">
                    {n} {n === 1 ? tr('Criança', 'Child') : tr('Crianças', 'Children')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pre-Filled Summary Box */}
          <div className="rounded-lg bg-black/50 border border-[#FF5A00]/45 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-[#FF7A2F]" />
                <span>
                  {origin} ({originObj?.city || origin}) → {destination} ({destObj?.city || destination})
                </span>
              </span>
              <span className="font-mono text-[11px] text-[#FF8C42] font-semibold">
                {matchedPromo.flightNumber}
              </span>
            </div>

            <div className="rounded bg-[#FF5A00]/10 border border-[#FF5A00]/30 px-2.5 py-1.5 text-[11px] font-mono text-amber-200 space-y-0.5 tabular-nums">
              <p className="text-[10px] text-emerald-200/80 font-sans">
                {tr('Dados enviados preenchidos para a GOL:', 'Pre-filled data sent to GOL:')}
              </p>
              <p className="truncate">
                {origin}→{destination} · {tr('Ida', 'Dep')}: {formatBrDate(departureDate)}
                {tripType === 'roundtrip' ? ` · ${tr('Volta', 'Ret')}: ${formatBrDate(returnDate)}` : ` · ${tr('Só Ida', 'One-Way')}`}
              </p>
              <p>
                {passengers} ADT {childrenCount > 0 ? `+ ${childrenCount} CHD` : ''} · {tr('Ref.:', 'Est.:')}{' '}
                <strong className="text-amber-300">R$ {fmtBRL(estimatedTotalBRL)}</strong>
              </p>
            </div>

            <p className="text-[11px] text-emerald-200/75 flex items-start gap-1.5 leading-snug">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                {tr(
                  'Abre diretamente no motor oficial b2c.voegol.com.br já preenchido com origem, destino, datas e passageiros escolhidos acima.',
                  'Opens directly on GOL’s official b2c.voegol.com.br search engine pre-filled with your chosen origin, destination, dates, and passengers.'
                )}
              </span>
            </p>

            {checkoutReady && (
              <div className="rounded bg-emerald-950/70 border border-emerald-400/35 px-2.5 py-1.5 text-[11px] text-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  {tr(
                    `Busca ${origin} → ${destination} (${formatBrDate(departureDate)}) pronta para abrir na GOL!`,
                    `Search ${origin} → ${destination} (${formatBrDate(departureDate)}) ready for GOL!`
                  )}
                </span>
              </div>
            )}

            <a
              href={officialRedirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-lg bg-[#FF5A00] hover:bg-[#ff6d1f] text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors text-center"
            >
              <span>{tr('Fechar Compra Preenchida na GOL', 'Open Pre-Filled Checkout on GOL')}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          </div>
        </div>

        {/* RIGHT: Compact Scrollable Promotional Fares & December Packages */}
        <div className="lg:col-span-7 conae-panel rounded-xl p-4 space-y-3 border border-amber-400/30">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/20 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-white">
                {tr('Pacote Dezembro & Promoções GOL', 'December Packages & GOL Deals')}
              </h3>
              <p className="text-[11px] text-emerald-100/70">
                {tr(
                  'Clique em "Comprar na GOL" para abrir o site da GOL já preenchido com este trecho e suas datas',
                  'Click "Buy on GOL" to open GOL’s site pre-filled with this route and your selected dates'
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              {(
                ['Todas', 'Pacote Dezembro', 'Centro-Oeste', 'Sudeste', 'Nordeste', 'Sul', 'Norte'] as RegionFilter[]
              ).map((reg) => (
                <button
                  key={reg}
                  type="button"
                  onClick={() => setRegionFilter(reg)}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                    regionFilter === reg
                      ? 'bg-[#FF5A00] text-white'
                      : 'conae-panel-soft text-emerald-100/80 hover:text-white'
                  }`}
                >
                  {reg === 'Todas'
                    ? tr('Todas', 'All')
                    : reg === 'Pacote Dezembro'
                      ? tr('Dezembro', 'December')
                      : reg}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[450px] overflow-y-auto conae-scroll pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredPromos.map((promo) => {
              const isSelected =
                origin === promo.originCode && destination === promo.destCode;
              const cardDep = isSelected ? departureDate : promo.defaultDepartureDate || departureDate;
              const cardRet = isSelected ? returnDate : promo.defaultReturnDate || returnDate;
              const directUrl = buildGolOfficialCheckoutUrl({
                origin: promo.originCode,
                destination: promo.destCode,
                departureDate: cardDep,
                returnDate: tripType === 'roundtrip' ? cardRet : undefined,
                tripType,
                passengers,
                children: childrenCount,
              });

              return (
                <div
                  key={promo.id}
                  className={`rounded-lg p-3 space-y-2 border transition-colors ${
                    isSelected
                      ? 'bg-[#FF5A00]/15 border-[#FF5A00]/75'
                      : 'conae-panel-soft border-amber-400/25 hover:border-[#FF5A00]/55'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="font-mono text-[#FF8C42]">{promo.originCode}</span>
                        <Plane className="w-3 h-3 text-amber-300 shrink-0" />
                        <span className="font-mono text-[#FF8C42]">{promo.destCode}</span>
                        {promo.isDecemberPackage && (
                          <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[#FF5A00]/25 text-amber-200 font-semibold">
                            {tr('Dez', 'Dec')}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-emerald-100/85 truncate">
                        {promo.originCity} → {promo.destCity} ({promo.destState})
                      </p>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-emerald-300 shrink-0 tabular-nums">
                      -{promo.discountPercent}% OFF
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <span className="text-[10px] line-through text-emerald-200/50 font-mono tabular-nums block">
                        R$ {fmtBRL(promo.regularPriceBRL)}
                      </span>
                      <span className="text-base font-extrabold text-amber-300 font-mono tabular-nums">
                        R$ {fmtBRL(promo.promoPriceBRL)}
                      </span>
                      <span className="text-[10px] text-emerald-200/70 ml-1">
                        {tr('/ trecho', '/ leg')}
                      </span>
                    </div>
                    <div className="text-right text-[10px] text-emerald-100/75">
                      <p className="font-mono text-white">
                        {formatBrDate(cardDep)}
                        {tripType === 'roundtrip' ? ` – ${formatBrDate(cardRet).slice(0, 5)}` : ''}
                      </p>
                      <p className="text-[#FF8C42] font-semibold">
                        {promo.duration} · {promo.fareClass}
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-emerald-200/75 flex items-center gap-1 truncate">
                    <Luggage className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">
                      {isEn ? promo.baggageNoteEn : promo.baggageNotePt}
                    </span>
                  </p>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSelectPromo(promo)}
                      className="py-1.5 px-2 rounded bg-emerald-800/80 hover:bg-emerald-700 text-white font-semibold text-[11px] cursor-pointer transition-colors"
                    >
                      {tr('Ajustar Datas', 'Edit Dates')}
                    </button>
                    <a
                      href={directUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-2 rounded bg-[#FF5A00] hover:bg-[#ff6d1f] text-white font-bold text-[11px] inline-flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>{tr('Comprar na GOL', 'Buy on GOL')}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-400/15 text-[11px] text-emerald-200/75">
            <span>
              {tr(
                'Valores de referência promocionais; tarifas ao vivo carregadas automaticamente em b2c.voegol.com.br.',
                'Reference promotional fares; live fares load automatically on b2c.voegol.com.br.'
              )}
            </span>
            <a
              href={GOL_OFFICIAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FF8C42] hover:underline font-semibold inline-flex items-center gap-1"
            >
              <span>voegol.com.br</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
