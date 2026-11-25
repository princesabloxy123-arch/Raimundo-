export interface GolAirport {
  code: string;
  city: string;
  state: string;
  name: string;
}

export interface GolPromoFlight {
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
  fareClass: 'Promo Light' | 'Plus' | 'Max';
  departureWindowPt: string;
  departureWindowEn: string;
  flightNumber: string;
  baggageNotePt: string;
  baggageNoteEn: string;
  isDecemberPackage?: boolean;
  defaultDepartureDate?: string;
  defaultReturnDate?: string;
}

export const GOL_OFFICIAL_URL = 'https://www.voegol.com.br';
export const GOL_OFFERS_URL = 'https://www.voegol.com.br/ofertas';
export const GOL_SEARCH_BASE_URL = 'https://b2c.voegol.com.br/compra/busca-parceiros';

export const GOL_AIRPORTS: GolAirport[] = [
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

export const GOL_PROMO_FLIGHTS: GolPromoFlight[] = [
  {
    id: 'gol_dez_gyn_gru',
    originCode: 'GYN',
    originCity: 'Goiânia',
    destCode: 'GRU',
    destCity: 'São Paulo',
    destState: 'SP',
    region: 'Sudeste',
    promoPriceBRL: 249.9,
    regularPriceBRL: 439.0,
    discountPercent: 43,
    duration: '1h 40m',
    stopsLabelPt: 'Voo Direto · Pacote Dezembro',
    stopsLabelEn: 'Nonstop · December Deal',
    fareClass: 'Promo Light',
    departureWindowPt: 'Pacote Dezembro · Saídas diárias',
    departureWindowEn: 'December Package · Daily departures',
    flightNumber: 'G3 1451',
    baggageNotePt: '1 mala de mão 10kg + item pessoal',
    baggageNoteEn: '1 carry-on 10kg + personal item',
    isDecemberPackage: true,
    defaultDepartureDate: '2026-12-10',
    defaultReturnDate: '2026-12-15',
  },
  {
    id: 'gol_dez_cgh_sdu',
    originCode: 'CGH',
    originCity: 'São Paulo',
    destCode: 'SDU',
    destCity: 'Rio de Janeiro',
    destState: 'RJ',
    region: 'Sudeste',
    promoPriceBRL: 219.9,
    regularPriceBRL: 389.0,
    discountPercent: 43,
    duration: '1h 05m',
    stopsLabelPt: 'Ponte Aérea · Pacote Dezembro',
    stopsLabelEn: 'Air Shuttle · December Deal',
    fareClass: 'Promo Light',
    departureWindowPt: 'Pacote Dezembro · A cada 40 min',
    departureWindowEn: 'December Package · Every 40 min',
    flightNumber: 'G3 1024',
    baggageNotePt: '1 mala de mão 10kg + acúmulo Smiles',
    baggageNoteEn: '1 carry-on 10kg + Smiles miles',
    isDecemberPackage: true,
    defaultDepartureDate: '2026-12-12',
    defaultReturnDate: '2026-12-17',
  },
  {
    id: 'gol_dez_bsb_ssa',
    originCode: 'BSB',
    originCity: 'Brasília',
    destCode: 'SSA',
    destCity: 'Salvador',
    destState: 'BA',
    region: 'Nordeste',
    promoPriceBRL: 329.0,
    regularPriceBRL: 590.0,
    discountPercent: 44,
    duration: '2h 00m',
    stopsLabelPt: 'Voo Direto · Pacote Dezembro',
    stopsLabelEn: 'Nonstop · December Deal',
    fareClass: 'Plus',
    departureWindowPt: 'Pacote Dezembro Convenção · Ida/Volta',
    departureWindowEn: 'December Convention Deal · Round-Trip',
    flightNumber: 'G3 1712',
    baggageNotePt: 'Mala de mão 10kg + marcação de assento',
    baggageNoteEn: 'Carry-on 10kg + seat selection',
    isDecemberPackage: true,
    defaultDepartureDate: '2026-12-14',
    defaultReturnDate: '2026-12-20',
  },
  {
    id: 'gol_gyn_bsb',
    originCode: 'GYN',
    originCity: 'Goiânia',
    destCode: 'BSB',
    destCity: 'Brasília',
    destState: 'DF',
    region: 'Centro-Oeste',
    promoPriceBRL: 189.9,
    regularPriceBRL: 320.0,
    discountPercent: 41,
    duration: '0h 50m',
    stopsLabelPt: 'Voo Direto',
    stopsLabelEn: 'Nonstop',
    fareClass: 'Promo Light',
    departureWindowPt: 'Rota Executiva Sede CONAE',
    departureWindowEn: 'CONAE HQ Executive Route',
    flightNumber: 'G3 1418',
    baggageNotePt: '1 mala de mão 10kg + check-in digital',
    baggageNoteEn: '1 carry-on 10kg + digital check-in',
    defaultDepartureDate: '2026-12-08',
    defaultReturnDate: '2026-12-11',
  },
  {
    id: 'gol_dez_gru_rec',
    originCode: 'GRU',
    originCity: 'São Paulo',
    destCode: 'REC',
    destCity: 'Recife',
    destState: 'PE',
    region: 'Nordeste',
    promoPriceBRL: 398.5,
    regularPriceBRL: 720.0,
    discountPercent: 45,
    duration: '3h 10m',
    stopsLabelPt: 'Voo Direto · Pacote Dezembro',
    stopsLabelEn: 'Nonstop · December Deal',
    fareClass: 'Promo Light',
    departureWindowPt: 'Pacote Dezembro Relâmpago GOL',
    departureWindowEn: 'December Flash Fare GOL',
    flightNumber: 'G3 1608',
    baggageNotePt: '1 mala de mão 10kg + Wi-Fi a bordo',
    baggageNoteEn: '1 carry-on 10kg + onboard Wi-Fi',
    isDecemberPackage: true,
    defaultDepartureDate: '2026-12-18',
    defaultReturnDate: '2026-12-24',
  },
  {
    id: 'gol_cnf_for',
    originCode: 'CNF',
    originCity: 'Belo Horizonte',
    destCode: 'FOR',
    destCity: 'Fortaleza',
    destState: 'CE',
    region: 'Nordeste',
    promoPriceBRL: 419.0,
    regularPriceBRL: 749.0,
    discountPercent: 44,
    duration: '2h 55m',
    stopsLabelPt: 'Voo Direto',
    stopsLabelEn: 'Nonstop',
    fareClass: 'Plus',
    departureWindowPt: 'Ofertas de Temporada GOL',
    departureWindowEn: 'GOL Seasonal Deals',
    flightNumber: 'G3 1584',
    baggageNotePt: 'Mala de mão 10kg + 1 bagagem despachada',
    baggageNoteEn: 'Carry-on 10kg + 1 checked bag',
    defaultDepartureDate: '2026-12-11',
    defaultReturnDate: '2026-12-16',
  },
  {
    id: 'gol_gru_fln',
    originCode: 'GRU',
    originCity: 'São Paulo',
    destCode: 'FLN',
    destCity: 'Florianópolis',
    destState: 'SC',
    region: 'Sul',
    promoPriceBRL: 259.0,
    regularPriceBRL: 470.0,
    discountPercent: 45,
    duration: '1h 15m',
    stopsLabelPt: 'Voo Direto',
    stopsLabelEn: 'Nonstop',
    fareClass: 'Promo Light',
    departureWindowPt: 'Fim de Semana Promocional',
    departureWindowEn: 'Weekend Promo Deal',
    flightNumber: 'G3 1280',
    baggageNotePt: '1 mala de mão 10kg + item pessoal',
    baggageNoteEn: '1 carry-on 10kg + personal item',
    defaultDepartureDate: '2026-12-05',
    defaultReturnDate: '2026-12-08',
  },
  {
    id: 'gol_bsb_mao',
    originCode: 'BSB',
    originCity: 'Brasília',
    destCode: 'MAO',
    destCity: 'Manaus',
    destState: 'AM',
    region: 'Norte',
    promoPriceBRL: 449.0,
    regularPriceBRL: 790.0,
    discountPercent: 43,
    duration: '2h 55m',
    stopsLabelPt: 'Voo Direto',
    stopsLabelEn: 'Nonstop',
    fareClass: 'Max',
    departureWindowPt: 'Missões & Convenções Norte',
    departureWindowEn: 'North Missions & Conventions',
    flightNumber: 'G3 1766',
    baggageNotePt: '2 bagagens despachadas + assento GOL+ Conforto',
    baggageNoteEn: '2 checked bags + GOL+ Comfort seat',
    defaultDepartureDate: '2026-12-15',
    defaultReturnDate: '2026-12-21',
  },
];

function toGolDateDDMMYYYY(isoDate?: string, fallbackOffsetDays = 14): string {
  if (isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [yyyy, mm, dd] = isoDate.split('-');
    return `${dd}-${mm}-${yyyy}`;
  }
  const d = new Date();
  d.setDate(d.getDate() + fallbackOffsetDays);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Builds the official GOL B2C deep-link URL pre-filled with origin, destination,
 * departure/return dates (DD-MM-YYYY), trip type (DF = roundtrip, SO = oneway),
 * and passenger counts (ADT, CHD, INF) so GOL opens directly on the flight results screen.
 */
export function buildGolOfficialCheckoutUrl(params?: {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  tripType?: 'roundtrip' | 'oneway';
  passengers?: number;
  children?: number;
  infants?: number;
  isOffers?: boolean;
}): string {
  const origin = (params?.origin || 'GYN').toUpperCase();
  const destination = (params?.destination || 'GRU').toUpperCase();
  const isRoundTrip = params?.tripType
    ? params.tripType === 'roundtrip'
    : Boolean(params?.returnDate);

  const ida = toGolDateDDMMYYYY(params?.departureDate, 14);
  const volta = isRoundTrip ? toGolDateDDMMYYYY(params?.returnDate, 19) : undefined;
  const adt = Math.max(1, Math.min(9, params?.passengers ?? 1));
  const chd = Math.max(0, Math.min(8, params?.children ?? 0));
  const inf = Math.max(0, Math.min(adt, params?.infants ?? 0));

  const search = new URLSearchParams();
  search.set('pv', 'br');
  search.set('tipo', isRoundTrip ? 'DF' : 'SO');
  search.set('de', origin);
  search.set('para', destination);
  search.set('ida', ida);
  if (volta) {
    search.set('volta', volta);
  }
  search.set('ADT', String(adt));
  search.set('CHD', String(chd));
  search.set('INF', String(inf));

  return `${GOL_SEARCH_BASE_URL}?${search.toString()}`;
}
