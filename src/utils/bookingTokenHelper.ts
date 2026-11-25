import type { BookingPublicConfig } from '../types';

export const DEFAULT_BOOKING_PUBLIC: BookingPublicConfig = {
  id: 'current',
  connected: true,
  partnerAid: '2408915',
  tokenPrefix: 'BKG-CNEC',
  activeBookingToken: 'BKG-CNEC-2026-VIP',
  bookingDomain: 'www.booking.com',
  defaultDiscountPercent: 35,
  updatedBy: 'Presidência CONAE',
};

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((isoDate || '').trim());
  const base = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : new Date();
  base.setUTCDate(base.getUTCDate() + days);
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, '0');
  const d = String(base.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getFutureBookingIsoDate(daysAhead: number): string {
  const now = new Date();
  const target = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead));
  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, '0');
  const d = String(target.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function calculateNightsCount(checkInDate?: string, checkOutDate?: string): number {
  if (!checkInDate || !checkOutDate) return 0;
  const inMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(checkInDate.trim());
  const outMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(checkOutDate.trim());
  if (!inMatch || !outMatch) return 0;
  const inMs = Date.UTC(Number(inMatch[1]), Number(inMatch[2]) - 1, Number(inMatch[3]));
  const outMs = Date.UTC(Number(outMatch[1]), Number(outMatch[2]) - 1, Number(outMatch[3]));
  return Math.max(0, Math.round((outMs - inMs) / 86400000));
}

export function formatIsoDateBR(isoDate?: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((isoDate || '').trim());
  if (!match) return isoDate || '';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function generateHotelBookingToken(
  tokenPrefix: string,
  stateUf: string,
  docId: string
): string {
  const cleanPrefix = (tokenPrefix || 'BKG-CNEC')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 14);
  const cleanState = (stateUf || 'BR')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
  const cleanSuffix = (docId || Date.now().toString(36))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(-6);
  return `${cleanPrefix}-${cleanState}-${cleanSuffix}`.slice(0, 48);
}

export function maskBookingToken(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}••••${trimmed.slice(-2)}`;
  return `${trimmed.slice(0, 6)}••••${trimmed.slice(-4)}`;
}

export function buildBookingComUrl(params: {
  destination?: string;
  hotelName?: string;
  city?: string;
  state?: string;
  checkInDate?: string;
  checkOutDate?: string;
  guests?: number;
  children?: number;
  rooms?: number;
  lang?: string;
  currency?: string;
  partnerAid?: string;
  bookingToken?: string;
  bookingDomain?: string;
}): string {
  const domain =
    (params.bookingDomain || 'www.booking.com')
      .replace(/^https?:\/\//i, '')
      .replace(/[^a-zA-Z0-9.-]/g, '') || 'www.booking.com';

  const rawQuery = params.destination?.trim()
    ? params.destination.trim()
    : [params.hotelName, params.city, params.state, 'Brasil']
        .map((part) => (part || '').trim())
        .filter(Boolean)
        .join(' ');
  const query = (rawQuery || 'Brasil').slice(0, 90);

  const aid =
    (params.partnerAid || DEFAULT_BOOKING_PUBLIC.partnerAid).replace(/[^0-9]/g, '') || '2408915';
  const label = (params.bookingToken || DEFAULT_BOOKING_PUBLIC.activeBookingToken)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 48);

  const validCheckIn =
    params.checkInDate && /^\d{4}-\d{2}-\d{2}$/.test(params.checkInDate)
      ? params.checkInDate
      : getFutureBookingIsoDate(7);

  let validCheckOut =
    params.checkOutDate && /^\d{4}-\d{2}-\d{2}$/.test(params.checkOutDate)
      ? params.checkOutDate
      : addDaysToIsoDate(validCheckIn, 3);

  if (validCheckOut <= validCheckIn) {
    validCheckOut = addDaysToIsoDate(validCheckIn, 2);
  }

  const adults = Math.max(1, Math.min(10, Math.round(params.guests ?? 2)));
  const children = Math.max(0, Math.min(6, Math.round(params.children ?? 0)));
  const rooms = Math.max(1, Math.min(5, Math.round(params.rooms ?? 1)));
  const lang = (params.lang || 'pt-br').toLowerCase();
  const currency = (params.currency || 'BRL').toUpperCase();

  const searchParams = new URLSearchParams({
    ss: query,
    checkin: validCheckIn,
    checkout: validCheckOut,
    group_adults: String(adults),
    group_children: String(children),
    no_rooms: String(rooms),
    selected_currency: currency,
    aid,
    label,
  });

  for (let i = 0; i < children; i += 1) {
    searchParams.append('age', '8');
  }

  const pagePath = lang === 'pt-br' ? 'searchresults.pt-br.html' : 'searchresults.html';
  return `https://${domain}/${pagePath}?${searchParams.toString()}`.slice(0, 390);
}
