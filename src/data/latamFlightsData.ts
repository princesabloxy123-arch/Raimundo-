export interface LatamAirport {
  code: string;
  city: string;
  state: string;
  name: string;
}

export interface LatamPromoFlight {
  id: string;
  originCode: string;
  originCity: string;
  destCode: string;
  destCity: string;
  destState: string;
  region: 'Centro-Oeste' | 'Sudeste' | 'Nordeste' | 'Sul' | 'Norte';
  promoPriceBRL: number;
  regularPriceBRL: number;
  discountPercent: number;
  duration: string;
  stopsLabelPt: string;
  stopsLabelEn: string;
  cabinClass: 'Economy' | 'PremiumEconomy' | 'PremiumBusiness';
  cabinLabelPt: string;
  cabinLabelEn: string;
  flightNumber: string;
  baggageNotePt: string;
  baggageNoteEn: string;
  isDecemberPackage?: boolean;
  defaultDepartureDate: string;
  defaultReturnDate: string;
}

export const LATAM_OFFICIAL_URL = 'https://www.latamairlines.com/br/pt';
export const LATAM_OFFERS_URL = 'https://www.latamairlines.com/br/pt/ofertas';
export const LATAM_SEARCH_BASE_URL = 'https://www.latamairlines.com/br/pt/oferta-voos';

export const LATAM_AIRPORTS: LatamAirport[] = [
  { code: 'GYN', city: 'Goiânia', state: 'GO', name: 'Santa Genoveva' },
  { code: 'BSB', city: 'Brasília', state: 'DF', name: 'Pres. Juscelino Kubitschek' },
  { code: 'GRU', city: 'São Paulo', state: 'SP', name: 'Guarulhos Internacional' },
  { code: 'CGH', city: 'São Paulo', state: 'SP', name: 'Congonhas' },
  { code: 'SDU', city: 'Rio de Janeiro', state: 'RJ', name: 'Santos Dumont' },
  { code: 'GIG', city: 'Rio de Janeiro', state: 'RJ', name: 'Galeão Internacional' },
  { code: 'CNF', city: 'Belo Horizonte', state: 'MG', name: 'Confins' },
  { code: 'SSA', city: 'Salvador', state: 'BA', name: 'Dep. Luís Eduardo Magalhães' },
  { code: 'REC', city: 'Recife', state: 'PE', name: 'Guararapes' },
  { code: 'FOR', city: 'Fortaleza', state: 'CE', name: 'Pinto Martins' },
  { code: 'MCZ', city: 'Maceió', state: 'AL', name: 'Zumbi dos Palmares' },
  { code: 'CWB', city: 'Curitiba', state: 'PR', name: 'Afonso Pena' },
  { code: 'FLN', city: 'Florianópolis', state: 'SC', name: 'Hercílio Luz' },
  { code: 'POA', city: 'Porto Alegre', state: 'RS', name: 'Salgado Filho' },
  { code: 'MAO', city: 'Manaus', state: 'AM', name: 'Eduardo Gomes' },
  { code: 'BEL', city: 'Belém', state: 'PA', name: 'Val-de-Cans' },
];

export const LATAM_PROMO_FLIGHTS: LatamPromoFlight[] = [
  {
    id: 'tam_dez_gyn_gru',
    originCode: 'GYN',
    originCity: 'Goiânia',
    destCode: 'GRU',
    destCity: 'São Paulo',
    destState: 'SP',
    region: 'Sudeste',
    promoPriceBRL: 239.9,
    regularPriceBRL: 429.0,
    discountPercent: 44,
    duration: '1h 35m',
    stopsLabelPt: 'Voo Direto · Pacote Dezembro',
    stopsLabelEn: 'Nonstop · December Deal',
    cabinClass: 'Economy',
    cabinLabelPt: 'Light / Economy',
    cabinLabelEn: 'Light / Economy',
    flightNumber: 'LA 3541',
    baggageNotePt: '1 mala de mão 10kg + item pessoal · LATAM Pass',
    baggageNoteEn: '1 carry-on 10kg + personal item · LATAM Pass',
    isDecemberPackage: true,
    defaultDepartureDate: '2026-12-10',
    defaultReturnDate: '2026-12-15',
  },
  {
    id: 'tam_dez_cgh_sdu',
    originCode: 'CGH',
    originCity: 'São Paulo',
    destCode: 'SDU',
    destCity: 'Rio de Janeiro',
    destState: 'RJ',
    region: 'Sudeste',
    promoPriceBRL: 209.9,
    regularPriceBRL: 379.0,
    discountPercent: 45,
    duration: '1h 00m',
    stopsLabelPt: 'Ponte Aérea · Pacote Dezembro',
    stopsLabelEn: 'Air Shuttle · December Deal',
    cabinClass: 'Economy',
    cabinLabelPt: 'Light / Economy',
    cabinLabelEn: 'Light / Economy',
    flightNumber: 'LA 3910',
    baggageNotePt: '1 mala de mão 10kg + embarque rápido',
    baggageNoteEn: '1 carry-on 10kg + fast boarding',
    isDecemberPackage: true,
    defaultDepartureDate: '2026-12-12',
    defaultReturnDate: '2026-12-17',
  },
  {
    id: 'tam_dez_bsb_for',
    originCode: 'BSB',
    originCity: 'Brasília',
    destCode: 'FOR',
    destCity: 'Fortaleza',
    destState: 'CE',
    region: 'Nordeste',
    promoPriceBRL: 359.0,
    regularPriceBRL: 649.0,
    discountPercent: 45,
    duration: '2h 40m',
    stopsLabelPt: 'Voo Direto · Pacote Dezembro',
    stopsLabelEn: 'Nonstop · December Deal',
    cabinClass: 'Economy',
    cabinLabelPt: 'Plus / Economy',
    cabinLabelEn: 'Plus / Economy',
    flightNumber: 'LA 3722',
    baggageNotePt: 'Mala de mão 10kg + marcação de assento',
    baggageNoteEn: 'Carry-on 10kg + seat selection',
    isDecemberPackage: true,
    defaultDepartureDate: '2026-12-14',
    defaultReturnDate: '2026-12-20',
  },
  {
    id: 'tam_gyn_bsb',
    originCode: 'GYN',
    originCity: 'Goiânia',
    destCode: 'BSB',
    destCity: 'Brasília',
    destState: 'DF',
    region: 'Centro-Oeste',
    promoPriceBRL: 179.9,
    regularPriceBRL: 310.0,
    discountPercent: 42,
    duration: '0h 45m',
    stopsLabelPt: 'Voo Direto',
    stopsLabelEn: 'Nonstop',
    cabinClass: 'Economy',
    cabinLabelPt: 'Light / Economy',
    cabinLabelEn: 'Light / Economy',
    flightNumber: 'LA 3120',
    baggageNotePt: '1 mala de mão 10kg + check-in automático',
    baggageNoteEn: '1 carry-on 10kg + automatic check-in',
    defaultDepartureDate: '2026-12-08',
    defaultReturnDate: '2026-12-11',
  },
  {
    id: 'tam_dez_gru_ssa',
    originCode: 'GRU',
    originCity: 'São Paulo',
    destCode: 'SSA',
    destCity: 'Salvador',
    destState: 'BA',
    region: 'Nordeste',
    promoPriceBRL: 349.0,
    regularPriceBRL: 635.0,
    discountPercent: 45,
    duration: '2h 25m',
    stopsLabelPt: 'Voo Direto · Pacote Dezembro',
    stopsLabelEn: 'Nonstop · December Deal',
    cabinClass: 'Economy',
    cabinLabelPt: 'Plus / Economy',
    cabinLabelEn: 'Plus / Economy',
    flightNumber: 'LA 3318',
    baggageNotePt: '1 mala de mão 10kg + entretenimento LATAM Play',
    baggageNoteEn: '1 carry-on 10kg + LATAM Play entertainment',
    isDecemberPackage: true,
    defaultDepartureDate: '2026-12-18',
    defaultReturnDate: '2026-12-24',
  },
  {
    id: 'tam_cnf_rec',
    originCode: 'CNF',
    originCity: 'Belo Horizonte',
    destCode: 'REC',
    destCity: 'Recife',
    destState: 'PE',
    region: 'Nordeste',
    promoPriceBRL: 389.0,
    regularPriceBRL: 699.0,
    discountPercent: 44,
    duration: '2h 40m',
    stopsLabelPt: 'Voo Direto',
    stopsLabelEn: 'Nonstop',
    cabinClass: 'Economy',
    cabinLabelPt: 'Plus / Economy',
    cabinLabelEn: 'Plus / Economy',
    flightNumber: 'LA 3644',
    baggageNotePt: 'Mala de mão 10kg + pontos LATAM Pass',
    baggageNoteEn: 'Carry-on 10kg + LATAM Pass points',
    defaultDepartureDate: '2026-12-11',
    defaultReturnDate: '2026-12-16',
  },
  {
    id: 'tam_gru_poa',
    originCode: 'GRU',
    originCity: 'São Paulo',
    destCode: 'POA',
    destCity: 'Porto Alegre',
    destState: 'RS',
    region: 'Sul',
    promoPriceBRL: 269.0,
    regularPriceBRL: 489.0,
    discountPercent: 45,
    duration: '1h 40m',
    stopsLabelPt: 'Voo Direto',
    stopsLabelEn: 'Nonstop',
    cabinClass: 'Economy',
    cabinLabelPt: 'Light / Economy',
    cabinLabelEn: 'Light / Economy',
    flightNumber: 'LA 3412',
    baggageNotePt: '1 mala de mão 10kg + item pessoal',
    baggageNoteEn: '1 carry-on 10kg + personal item',
    defaultDepartureDate: '2026-12-06',
    defaultReturnDate: '2026-12-10',
  },
  {
    id: 'tam_bsb_mao',
    originCode: 'BSB',
    originCity: 'Brasília',
    destCode: 'MAO',
    destCity: 'Manaus',
    destState: 'AM',
    region: 'Norte',
    promoPriceBRL: 439.0,
    regularPriceBRL: 780.0,
    discountPercent: 44,
    duration: '2h 50m',
    stopsLabelPt: 'Voo Direto',
    stopsLabelEn: 'Nonstop',
    cabinClass: 'PremiumEconomy',
    cabinLabelPt: 'Premium Economy',
    cabinLabelEn: 'Premium Economy',
    flightNumber: 'LA 3788',
    baggageNotePt: 'Assento bloqueado central + embarque prioritário',
    baggageNoteEn: 'Blocked middle seat + priority boarding',
    defaultDepartureDate: '2026-12-15',
    defaultReturnDate: '2026-12-21',
  },
];

function toLatamIsoNoon(isoDate?: string, fallbackOffsetDays = 14): string {
  if (isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return `${isoDate}T12:00:00.000Z`;
  }
  const d = new Date();
  d.setDate(d.getDate() + fallbackOffsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T12:00:00.000Z`;
}

/**
 * Builds the official LATAM (TAM) Brasil flight search URL pre-filled with
 * origin, destination, outbound/inbound ISO timestamps, trip type (RT/OW),
 * passenger counts (adt/chd/inf), and cabin class so LATAM opens straight on live fares.
 */
export function buildLatamOfficialCheckoutUrl(params?: {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  tripType?: 'roundtrip' | 'oneway';
  passengers?: number;
  children?: number;
  infants?: number;
  cabin?: 'Economy' | 'PremiumEconomy' | 'PremiumBusiness';
}): string {
  const origin = (params?.origin || 'GYN').toUpperCase();
  const destination = (params?.destination || 'GRU').toUpperCase();
  const isRoundTrip = params?.tripType
    ? params.tripType === 'roundtrip'
    : Boolean(params?.returnDate);

  const outbound = toLatamIsoNoon(params?.departureDate, 14);
  const inbound = isRoundTrip ? toLatamIsoNoon(params?.returnDate, 19) : undefined;
  const adt = Math.max(1, Math.min(9, params?.passengers ?? 1));
  const chd = Math.max(0, Math.min(8, params?.children ?? 0));
  const inf = Math.max(0, Math.min(adt, params?.infants ?? 0));
  const cabin = params?.cabin || 'Economy';

  const search = new URLSearchParams();
  search.set('origin', origin);
  search.set('destination', destination);
  search.set('outbound', outbound);
  if (inbound) {
    search.set('inbound', inbound);
  }
  search.set('adt', String(adt));
  search.set('chd', String(chd));
  search.set('inf', String(inf));
  search.set('trip', isRoundTrip ? 'RT' : 'OW');
  search.set('cabin', cabin);
  search.set('redemption', 'false');
  search.set('sort', 'RECOMMENDED');

  return `${LATAM_SEARCH_BASE_URL}?${search.toString()}`;
}
