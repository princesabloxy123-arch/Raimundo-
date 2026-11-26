export type VisitAgentProvider = 'meta_cloud' | 'callmebot' | 'webhook' | 'none';
export type VisitAgentWhatsAppStatus = 'enviado' | 'aguardando_chave' | 'erro' | 'cooldown';
export type VisitAgentLocationSource =
  | 'gps_consented'
  | 'server_geo'
  | 'user_consented'
  | 'timezone_approx';
export type VisitAgentDeviceType = 'Celular' | 'Tablet' | 'Computador' | 'Desconhecido';
export type VisitAgentEventType = 'app_open' | 'tab_view' | 'route_view' | 'test_alert';

export interface VisitAgentRequestBody {
  action?: 'track' | 'test';
  consentAccepted?: boolean;
  sessionId?: string;
  eventType?: VisitAgentEventType;
  tabName?: string;
  routePath?: string;
  pageUrl?: string;
  deviceType?: VisitAgentDeviceType;
  deviceSpecs?: string;
  protocol?: string;
  visitorLabel?: string;
  timezone?: string;
  consentedCity?: string;
  consentedState?: string;
  consentedCountry?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracyM?: number;
}

export interface VisitAgentNormalizedEvent {
  sessionId: string;
  visitorLabel: string;
  city: string;
  state: string;
  country: string;
  locationSource: VisitAgentLocationSource;
  ipAddress: string;
  protocol: string;
  deviceSpecs: string;
  latitude?: number;
  longitude?: number;
  locationAccuracyM?: number;
  tabName: string;
  routePath: string;
  pageUrl: string;
  deviceType: VisitAgentDeviceType;
  eventType: VisitAgentEventType;
  consentAccepted: true;
  createdAtIso: string;
}

export interface VisitAgentResponse {
  ok: true;
  event: VisitAgentNormalizedEvent;
  whatsappStatus: VisitAgentWhatsAppStatus;
  whatsappProvider: VisitAgentProvider;
  destinationPhoneFormatted: string;
  messagePreview: string;
  detail?: string;
}

export interface VisitAgentStatusResponse {
  ok: true;
  service: 'conae-visit-agent';
  destinationPhoneFormatted: string;
  whatsappProvider: VisitAgentProvider;
  autoWhatsAppReady: boolean;
  totalHandledInMemory: number;
  dispatchedCountInMemory: number;
}

const DEFAULT_ADMIN_WHATSAPP = '5596981153517';

const BR_STATE_MAP: Record<string, string> = {
  AC: 'Acre (AC)',
  AL: 'Alagoas (AL)',
  AP: 'Amapá (AP)',
  AM: 'Amazonas (AM)',
  BA: 'Bahia (BA)',
  CE: 'Ceará (CE)',
  DF: 'Distrito Federal (DF)',
  ES: 'Espírito Santo (ES)',
  GO: 'Goiás (GO)',
  MA: 'Maranhão (MA)',
  MT: 'Mato Grosso (MT)',
  MS: 'Mato Grosso do Sul (MS)',
  MG: 'Minas Gerais (MG)',
  PA: 'Pará (PA)',
  PB: 'Paraíba (PB)',
  PR: 'Paraná (PR)',
  PE: 'Pernambuco (PE)',
  PI: 'Piauí (PI)',
  RJ: 'Rio de Janeiro (RJ)',
  RN: 'Rio Grande do Norte (RN)',
  RS: 'Rio Grande do Sul (RS)',
  RO: 'Rondônia (RO)',
  RR: 'Roraima (RR)',
  SC: 'Santa Catarina (SC)',
  SP: 'São Paulo (SP)',
  SE: 'Sergipe (SE)',
  TO: 'Tocantins (TO)',
};

const TIMEZONE_REGION_MAP: Record<string, { city: string; state: string; country: string }> = {
  'America/Belem': { city: 'Região Macapá / Belém', state: 'Amapá / Pará (fuso)', country: 'BR' },
  'America/Santarem': { city: 'Região Oeste do Pará', state: 'Pará (fuso)', country: 'BR' },
  'America/Manaus': { city: 'Região Manaus', state: 'Amazonas (fuso)', country: 'BR' },
  'America/Boa_Vista': { city: 'Região Boa Vista', state: 'Roraima (fuso)', country: 'BR' },
  'America/Porto_Velho': { city: 'Região Porto Velho', state: 'Rondônia (fuso)', country: 'BR' },
  'America/Rio_Branco': { city: 'Região Rio Branco', state: 'Acre (fuso)', country: 'BR' },
  'America/Fortaleza': { city: 'Região Nordeste', state: 'Ceará / Nordeste (fuso)', country: 'BR' },
  'America/Recife': { city: 'Região Recife', state: 'Pernambuco (fuso)', country: 'BR' },
  'America/Bahia': { city: 'Região Salvador', state: 'Bahia (fuso)', country: 'BR' },
  'America/Maceio': { city: 'Região Maceió', state: 'Alagoas / Sergipe (fuso)', country: 'BR' },
  'America/Araguaina': { city: 'Região Palmas / Tocantins', state: 'Tocantins (fuso)', country: 'BR' },
  'America/Cuiaba': { city: 'Região Cuiabá', state: 'Mato Grosso (fuso)', country: 'BR' },
  'America/Campo_Grande': { city: 'Região Campo Grande', state: 'Mato Grosso do Sul (fuso)', country: 'BR' },
  'America/Sao_Paulo': { city: 'Região Brasília / Goiânia / SP', state: 'Brasil — Fuso de Brasília', country: 'BR' },
  'America/Noronha': { city: 'Fernando de Noronha', state: 'Pernambuco (fuso)', country: 'BR' },
};

// In-memory rate limiting & metrics (resets on cold start; persistent log is stored in Firestore)
const sessionLastRouteDispatch = new Map<string, number>();
const sessionWindowCount = new Map<string, { count: number; resetAt: number }>();
let totalHandledInMemory = 0;
let dispatchedCountInMemory = 0;

function stripControlChars(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function safeDecodeHeader(value: string): string {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string {
  const lower = name.toLowerCase();
  const raw = headers[lower] ?? headers[name];
  if (Array.isArray(raw)) return stripControlChars(safeDecodeHeader(raw[0] || ''), 120);
  if (typeof raw === 'string') return stripControlChars(safeDecodeHeader(raw), 120);
  return '';
}

function getTargetWhatsAppDigits(): string {
  const envVal = (process.env.WHATSAPP_ADMIN_PHONE || DEFAULT_ADMIN_WHATSAPP).replace(/\D/g, '');
  if (envVal.length >= 10 && envVal.length <= 15) return envVal;
  return DEFAULT_ADMIN_WHATSAPP;
}

function formatBrPhone(digits: string): string {
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return `+${digits}`;
}

function detectConfiguredProvider(): VisitAgentProvider {
  const metaToken = (process.env.WHATSAPP_CLOUD_TOKEN || '').trim();
  const metaPhoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  if (metaToken && metaPhoneId) return 'meta_cloud';

  const callMeBotKey = (process.env.CALLMEBOT_API_KEY || '').trim();
  if (callMeBotKey) return 'callmebot';

  const webhookUrl = (process.env.WHATSAPP_WEBHOOK_URL || '').trim();
  if (webhookUrl && isSafeHttpsWebhookUrl(webhookUrl)) return 'webhook';

  return 'none';
}

/**
 * SSRF protection for custom WhatsApp webhook URLs:
 * - Only allows https://
 * - Blocks localhost, .local, .internal, loopback, RFC1918, link-local/metadata, and IPv6 private ranges
 */
export function isSafeHttpsWebhookUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;

    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
      return false;
    }

    // Reject IPv4 private / loopback / link-local / metadata / unspecified
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      const parts = host.split('.').map(Number);
      if (parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
      const [a, b] = parts;
      if (a === 0 || a === 10 || a === 127) return false;
      if (a === 169 && b === 254) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
      if (a === 100 && b >= 64 && b <= 127) return false;
    }

    // Reject IPv6 loopback, link-local, or unique local addresses
    if (host.includes(':')) {
      if (
        host === '::1' ||
        host === '::' ||
        host.startsWith('fe80:') ||
        host.startsWith('fc') ||
        host.startsWith('fd') ||
        host.startsWith('::ffff:127.') ||
        host.startsWith('::ffff:10.') ||
        host.startsWith('::ffff:169.254.') ||
        host.startsWith('::ffff:192.168.')
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

function sanitizePageUrl(rawUrl: string, fallbackRoute: string): string {
  const cleaned = stripControlChars(rawUrl, 350);
  if (!cleaned) return fallbackRoute || '/';
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return `${parsed.origin}${parsed.pathname}${parsed.search}`.slice(0, 350);
    }
  } catch {
    // Allow relative path fallback
  }
  return fallbackRoute.startsWith('/') ? fallbackRoute : `/${fallbackRoute}`;
}

function normalizeStateName(rawRegion: string, country: string): string {
  const cleaned = stripControlChars(rawRegion, 80);
  if (!cleaned) return '';
  const upper = cleaned.toUpperCase();
  if (country === 'BR' && BR_STATE_MAP[upper]) {
    return BR_STATE_MAP[upper];
  }
  if (BR_STATE_MAP[upper]) {
    return BR_STATE_MAP[upper];
  }
  return cleaned;
}

function resolveApproximateLocation(
  headers: Record<string, string | string[] | undefined>,
  body: VisitAgentRequestBody
): { city: string; state: string; country: string; locationSource: VisitAgentLocationSource } {
  const userCity = stripControlChars(body.consentedCity, 80);
  const userState = stripControlChars(body.consentedState, 80);
  const userCountry = stripControlChars(body.consentedCountry, 40) || 'BR';

  if (userCity || userState) {
    return {
      city: userCity || 'Cidade não informada',
      state: normalizeStateName(userState, userCountry) || 'Estado não informado',
      country: userCountry.toUpperCase().slice(0, 40),
      locationSource: 'user_consented',
    };
  }

  const headerCountry = (
    readHeader(headers, 'x-vercel-ip-country') ||
    readHeader(headers, 'x-appengine-country') ||
    readHeader(headers, 'cf-ipcountry') ||
    ''
  ).toUpperCase();

  const headerRegion =
    readHeader(headers, 'x-vercel-ip-country-region') ||
    readHeader(headers, 'x-appengine-region') ||
    readHeader(headers, 'cf-region-code') ||
    readHeader(headers, 'x-geo-region');

  const headerCity =
    readHeader(headers, 'x-vercel-ip-city') ||
    readHeader(headers, 'x-appengine-city') ||
    readHeader(headers, 'cf-ipcity');

  if (headerRegion || headerCity) {
    const resolvedCountry = headerCountry || 'BR';
    return {
      city: headerCity || 'Cidade aproximada',
      state: normalizeStateName(headerRegion, resolvedCountry) || resolvedCountry,
      country: resolvedCountry.slice(0, 40),
      locationSource: 'server_geo',
    };
  }

  const tz = stripControlChars(body.timezone, 64);
  if (tz && TIMEZONE_REGION_MAP[tz]) {
    const mapped = TIMEZONE_REGION_MAP[tz];
    return {
      city: mapped.city,
      state: mapped.state,
      country: mapped.country,
      locationSource: 'timezone_approx',
    };
  }

  return {
    city: tz ? `Fuso ${tz}` : 'Região não identificada',
    state: headerCountry ? `País ${headerCountry}` : 'Brasil (aproximado)',
    country: (headerCountry || 'BR').slice(0, 40),
    locationSource: 'timezone_approx',
  };
}

function formatBrasiliaTimestamp(date: Date): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function extractClientIp(headers: Record<string, string | string[] | undefined>): string {
  const cfIp = readHeader(headers, 'cf-connecting-ip');
  if (cfIp) return cfIp.slice(0, 64);

  const realIp = readHeader(headers, 'x-real-ip');
  if (realIp) return realIp.slice(0, 64);

  const forwarded = readHeader(headers, 'x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }

  return 'IP local/proxy';
}

function extractProtocol(
  headers: Record<string, string | string[] | undefined>,
  body: VisitAgentRequestBody
): string {
  const fromHeader = readHeader(headers, 'x-forwarded-proto').toUpperCase();
  if (fromHeader === 'HTTPS' || fromHeader === 'HTTP') return fromHeader;
  const fromBody = stripControlChars(body.protocol, 32).replace(/:$/, '').toUpperCase();
  if (fromBody === 'HTTPS' || fromBody === 'HTTP') return fromBody;
  return 'HTTPS';
}

function summarizeUserAgent(headers: Record<string, string | string[] | undefined>): string {
  const ua = readHeader(headers, 'user-agent');
  if (!ua) return 'Navegador padrão';
  const os = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad|iOS/i.test(ua)
      ? 'iOS'
      : /Windows/i.test(ua)
        ? 'Windows'
        : /Mac OS X/i.test(ua)
          ? 'macOS'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Outro SO';
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /Chrome\//i.test(ua)
      ? 'Chrome'
      : /Safari\//i.test(ua) && !/Chrome\//i.test(ua)
        ? 'Safari'
        : /Firefox\//i.test(ua)
          ? 'Firefox'
          : 'Browser';
  return `${os} · ${browser}`;
}

function sanitizeCoordinates(body: VisitAgentRequestBody): {
  latitude?: number;
  longitude?: number;
  locationAccuracyM?: number;
} {
  const lat = typeof body.latitude === 'number' && Number.isFinite(body.latitude) ? body.latitude : null;
  const lng = typeof body.longitude === 'number' && Number.isFinite(body.longitude) ? body.longitude : null;
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return {};
  }
  const acc =
    typeof body.locationAccuracyM === 'number' &&
    Number.isFinite(body.locationAccuracyM) &&
    body.locationAccuracyM >= 0 &&
    body.locationAccuracyM <= 1000000
      ? Math.round(body.locationAccuracyM)
      : undefined;
  return {
    latitude: Number(lat.toFixed(5)),
    longitude: Number(lng.toFixed(5)),
    ...(acc !== undefined ? { locationAccuracyM: acc } : {}),
  };
}

function buildWhatsAppAlertText(event: VisitAgentNormalizedEvent): string {
  const when = formatBrasiliaTimestamp(new Date(event.createdAtIso));
  const title =
    event.eventType === 'test_alert'
      ? 'TESTE DO AGENTE CONAE'
      : event.eventType === 'app_open'
        ? 'NOVO ACESSO NO APP CONAE'
        : 'NAVEGAÇÃO NO APP CONAE';

  const lines = [
    `📍 *${title}*`,
    `👤 Visitante: ${event.visitorLabel}`,
    `🗺️ Local: ${event.city} — ${event.state} (${event.country})`,
    `🌐 IP / Protocolo: ${event.ipAddress} · ${event.protocol}`,
    `📱 Dispositivo: ${event.deviceType} (${event.deviceSpecs})`,
    `🧭 Tela/Aba: ${event.tabName}`,
    `🔗 Link: ${event.pageUrl}`,
    `🕒 Horário (Brasília): ${when}`,
  ];

  if (typeof event.latitude === 'number' && typeof event.longitude === 'number') {
    lines.splice(
      3,
      0,
      `📌 GPS Autorizado: ${event.latitude}, ${event.longitude} (https://maps.google.com/?q=${event.latitude},${event.longitude})`
    );
  }

  return lines.join('\n');
}

function checkRateLimit(sessionId: string, dedupeKey: string, isTest: boolean): boolean {
  const now = Date.now();
  const cooldownMs = isTest ? 4000 : 20000;
  const lastAt = sessionLastRouteDispatch.get(dedupeKey) || 0;
  if (now - lastAt < cooldownMs) return false;

  const win = sessionWindowCount.get(sessionId);
  if (!win || now > win.resetAt) {
    sessionWindowCount.set(sessionId, { count: 1, resetAt: now + 30 * 60 * 1000 });
  } else {
    if (win.count >= (isTest ? 25 : 15)) return false;
    win.count += 1;
  }

  sessionLastRouteDispatch.set(dedupeKey, now);

  // Prevent unbounded Map growth
  if (sessionLastRouteDispatch.size > 1000) {
    const oldestKey = sessionLastRouteDispatch.keys().next().value;
    if (oldestKey) sessionLastRouteDispatch.delete(oldestKey);
  }
  if (sessionWindowCount.size > 1000) {
    const oldestKey = sessionWindowCount.keys().next().value;
    if (oldestKey) sessionWindowCount.delete(oldestKey);
  }

  return true;
}

async function dispatchWhatsAppAlert(
  provider: VisitAgentProvider,
  phoneDigits: string,
  message: string,
  event: VisitAgentNormalizedEvent
): Promise<{ status: VisitAgentWhatsAppStatus; detail?: string }> {
  if (provider === 'none') {
    return {
      status: 'aguardando_chave',
      detail: 'Configure CALLMEBOT_API_KEY, WHATSAPP_CLOUD_TOKEN ou WHATSAPP_WEBHOOK_URL no servidor.',
    };
  }

  try {
    if (provider === 'meta_cloud') {
      const token = (process.env.WHATSAPP_CLOUD_TOKEN || '').trim();
      const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
      const resp = await fetch(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phoneDigits,
            type: 'text',
            text: { preview_url: false, body: message },
          }),
          signal: AbortSignal.timeout(7000),
        }
      );
      if (!resp.ok) {
        return { status: 'erro', detail: `Meta Cloud HTTP ${resp.status}` };
      }
      dispatchedCountInMemory += 1;
      return { status: 'enviado' };
    }

    if (provider === 'callmebot') {
      const apiKey = (process.env.CALLMEBOT_API_KEY || '').trim();
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
        phoneDigits
      )}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apiKey)}`;
      const resp = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(7000),
      });
      if (!resp.ok) {
        return { status: 'erro', detail: `CallMeBot HTTP ${resp.status}` };
      }
      dispatchedCountInMemory += 1;
      return { status: 'enviado' };
    }

    if (provider === 'webhook') {
      const webhookUrl = (process.env.WHATSAPP_WEBHOOK_URL || '').trim();
      if (!isSafeHttpsWebhookUrl(webhookUrl)) {
        return { status: 'erro', detail: 'WHATSAPP_WEBHOOK_URL inválida (use HTTPS público).' };
      }
      const webhookSecret = (process.env.WHATSAPP_WEBHOOK_SECRET || '').trim();
      const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (webhookSecret) {
        reqHeaders.Authorization = `Bearer ${webhookSecret}`;
      }
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          phone: phoneDigits,
          message,
          event,
        }),
        signal: AbortSignal.timeout(7000),
      });
      if (!resp.ok) {
        return { status: 'erro', detail: `Webhook HTTP ${resp.status}` };
      }
      dispatchedCountInMemory += 1;
      return { status: 'enviado' };
    }

    return { status: 'aguardando_chave' };
  } catch (err) {
    const detail = err instanceof Error ? err.message.slice(0, 120) : 'Falha na conexão externa';
    return { status: 'erro', detail };
  }
}

export function getVisitAgentStatus(): VisitAgentStatusResponse {
  const provider = detectConfiguredProvider();
  const phoneDigits = getTargetWhatsAppDigits();
  return {
    ok: true,
    service: 'conae-visit-agent',
    destinationPhoneFormatted: formatBrPhone(phoneDigits),
    whatsappProvider: provider,
    autoWhatsAppReady: provider !== 'none',
    totalHandledInMemory,
    dispatchedCountInMemory,
  };
}

export async function processVisitAgentEvent(
  headers: Record<string, string | string[] | undefined>,
  rawBody: unknown
): Promise<VisitAgentResponse> {
  const body: VisitAgentRequestBody =
    rawBody && typeof rawBody === 'object' ? (rawBody as VisitAgentRequestBody) : {};

  const isTest = body.action === 'test';
  if (!isTest && body.consentAccepted !== true) {
    const err = new Error('Consentimento explícito do visitante é obrigatório para registrar visitas.') as Error & {
      statusCode?: number;
    };
    err.statusCode = 400;
    throw err;
  }

  const rawSession = stripControlChars(body.sessionId, 64).replace(/[^a-zA-Z0-9_-]/g, '');
  const sessionId = rawSession.length >= 4 ? rawSession : `sess_${Date.now()}`;

  const allowedDevices: VisitAgentDeviceType[] = ['Celular', 'Tablet', 'Computador', 'Desconhecido'];
  const deviceType: VisitAgentDeviceType = allowedDevices.includes(body.deviceType as VisitAgentDeviceType)
    ? (body.deviceType as VisitAgentDeviceType)
    : 'Desconhecido';

  const allowedEvents: VisitAgentEventType[] = ['app_open', 'tab_view', 'route_view', 'test_alert'];
  const eventType: VisitAgentEventType = isTest
    ? 'test_alert'
    : allowedEvents.includes(body.eventType as VisitAgentEventType)
      ? (body.eventType as VisitAgentEventType)
      : 'tab_view';

  const routePath = stripControlChars(body.routePath, 200) || '/';
  const tabName = stripControlChars(body.tabName, 80) || (isTest ? 'Teste do Painel Admin' : 'Início');
  const pageUrl = sanitizePageUrl(body.pageUrl || '', routePath);
  const visitorLabel = stripControlChars(body.visitorLabel, 80) || (isTest ? 'Administrador CONAE' : 'Visitante');

  const geo = resolveApproximateLocation(headers, body);
  const coords = sanitizeCoordinates(body);
  const ipAddress = extractClientIp(headers);
  const protocol = extractProtocol(headers, body);
  const deviceSpecs =
    stripControlChars(body.deviceSpecs, 160) || summarizeUserAgent(headers);

  const event: VisitAgentNormalizedEvent = {
    sessionId,
    visitorLabel,
    city: geo.city,
    state: geo.state,
    country: geo.country,
    locationSource:
      typeof coords.latitude === 'number' && typeof coords.longitude === 'number'
        ? 'gps_consented'
        : geo.locationSource,
    ipAddress,
    protocol,
    deviceSpecs,
    ...(typeof coords.latitude === 'number' && typeof coords.longitude === 'number'
      ? {
          latitude: coords.latitude,
          longitude: coords.longitude,
          ...(coords.locationAccuracyM !== undefined
            ? { locationAccuracyM: coords.locationAccuracyM }
            : {}),
        }
      : {}),
    tabName,
    routePath,
    pageUrl,
    deviceType,
    eventType,
    consentAccepted: true,
    createdAtIso: new Date().toISOString(),
  };

  totalHandledInMemory += 1;

  const provider = detectConfiguredProvider();
  const phoneDigits = getTargetWhatsAppDigits();
  const messagePreview = buildWhatsAppAlertText(event);

  const dedupeKey = `${sessionId}:${eventType}:${tabName}:${routePath}`;
  const allowedToSend = checkRateLimit(sessionId, dedupeKey, isTest);

  let whatsappStatus: VisitAgentWhatsAppStatus = 'aguardando_chave';
  let detail: string | undefined;

  if (!allowedToSend) {
    whatsappStatus = 'cooldown';
    detail = 'Evento registrado; envio ao WhatsApp em pausa curta para evitar mensagens repetidas.';
  } else {
    const dispatch = await dispatchWhatsAppAlert(provider, phoneDigits, messagePreview, event);
    whatsappStatus = dispatch.status;
    detail = dispatch.detail;
  }

  return {
    ok: true,
    event,
    whatsappStatus,
    whatsappProvider: provider,
    destinationPhoneFormatted: formatBrPhone(phoneDigits),
    messagePreview,
    detail,
  };
}

interface VercelLikeRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface VercelLikeResponse {
  status: (code: number) => VercelLikeResponse;
  json: (payload: unknown) => void;
  setHeader?: (name: string, value: string) => void;
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  res.setHeader?.('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json(getVisitAgentStatus());
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await processVisitAgentEvent(req.headers || {}, req.body);
    return res.status(200).json(result);
  } catch (err) {
    const statusCode =
      err && typeof err === 'object' && 'statusCode' in err && typeof err.statusCode === 'number'
        ? err.statusCode
        : 500;
    const message =
      err instanceof Error ? err.message : 'Erro interno no Agente Servidor de Visitas.';
    return res.status(statusCode).json({ error: message });
  }
}
