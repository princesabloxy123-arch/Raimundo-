import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

export type DukeStudioMode = 'auto' | 'chat' | 'image' | 'event';

export type DukeEventTheme =
  | 'emerald_gold'
  | 'royal_blue'
  | 'crimson_gold'
  | 'midnight_violet'
  | 'ivory_gold';

export interface DukeEventMetric {
  label: string;
  value: string;
}

export interface DukeEventPanel {
  title: string;
  subtitle: string;
  description: string;
  badge: string;
}

export interface DukeEventScheduleItem {
  time: string;
  title: string;
  speaker: string;
  stage: string;
  description: string;
}

export interface DukeEventSpeaker {
  name: string;
  role: string;
  topic: string;
}

export interface DukeEventTicket {
  name: string;
  priceLabel: string;
  perks: string;
  highlighted?: boolean;
}

export interface DukeEventSpec {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  tagline: string;
  dateLabel: string;
  timeLabel: string;
  venueName: string;
  city: string;
  state: string;
  theme: DukeEventTheme;
  organizerName: string;
  whatsappPhone: string;
  registrationCta: string;
  heroSummary: string;
  bannerImageUrl?: string;
  highlights: string[];
  metrics: DukeEventMetric[];
  panels: DukeEventPanel[];
  schedule: DukeEventScheduleItem[];
  speakers: DukeEventSpeaker[];
  tickets: DukeEventTicket[];
}

export type DukeImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:5';
export type DukeImageLayout =
  | 'modern_backdrop'
  | 'glass_showcase'
  | 'luxury_frame'
  | 'full_bleed'
  | 'cinematic_bottom'
  | 'editorial_card'
  | 'framed_poster'
  | 'split_hero';
export type DukeImageFrameStyle =
  | 'none'
  | 'gold_double'
  | 'minimal_white'
  | 'neon_glow'
  | 'glass_modern'
  | 'luxury_bevel';
export type DukeImageMotif = 'rays' | 'grid' | 'waves' | 'orbs' | 'rings' | 'emblem';
export type DukePhotoStyle =
  | 'studio_relight'
  | 'neon_modern'
  | 'editorial_cover'
  | 'digital_art_pop'
  | 'golden_gala'
  | 'backdrop_3d';
export type DukeRelightPreset =
  | 'warm_gold'
  | 'cool_cyber'
  | 'emerald_royal'
  | 'sunset_cinema'
  | 'violet_aura'
  | 'noir_luxury';
export type DukeLightFx =
  | 'bokeh_orbs'
  | 'prism_beams'
  | 'neon_rings'
  | 'sun_flare'
  | 'studio_rim'
  | 'none';
export type DukeGraphicOverlay =
  | 'editorial_lines'
  | 'glass_cards'
  | 'cyber_hud'
  | 'luxury_crest'
  | 'clean';

export interface DukeImageDesignSpec {
  mode: 'create' | 'reformulate';
  title: string;
  aspectRatio: DukeImageAspectRatio;
  layout: DukeImageLayout;
  frameStyle: DukeImageFrameStyle;
  decorativeMotif: DukeImageMotif;
  photoStyle?: DukePhotoStyle;
  relightPreset?: DukeRelightPreset;
  bokehDepth?: number;
  hdrClarity?: number;
  lightFx?: DukeLightFx;
  graphicDesignOverlay?: DukeGraphicOverlay;
  bgStart: string;
  bgMid: string;
  bgEnd: string;
  accentColor: string;
  textPrimary: string;
  textMuted: string;
  badgeText?: string;
  headline?: string;
  subheadline?: string;
  footerText?: string;
  ctaText?: string;
  brightness?: number;
  contrast?: number;
  saturate?: number;
  sepia?: number;
  hueRotate?: number;
  vignette?: number;
  tintColor?: string;
  tintOpacity?: number;
  emblemType?: 'crown' | 'globe' | 'star' | 'cross' | 'spark' | 'shield' | 'none';
  textPosition?: 'top' | 'center' | 'bottom';
  fontStyle?: 'editorial' | 'modern' | 'impact';
  fontScale?: number;
}

export interface DukeWebSource {
  title: string;
  uri: string;
}

export interface DukeQuickOption {
  label: string;
  prompt: string;
  mode?: DukeStudioMode;
}

export interface DukeChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface DukeChatAttachment {
  name: string;
  mimeType: string;
  base64Data?: string;
  textContent?: string;
}

export interface DukeChatRequestBody {
  message: string;
  mode?: DukeStudioMode;
  webSearch?: boolean;
  deepThinking?: boolean;
  history?: DukeChatHistoryItem[];
  currentEvent?: Partial<DukeEventSpec> | null;
  attachment?: DukeChatAttachment | null;
}

export interface DukeChatResult {
  modeUsed: 'chat' | 'image' | 'event';
  reply: string;
  shouldPublish: boolean;
  event?: DukeEventSpec;
  imageDesign?: DukeImageDesignSpec;
  imageVariants?: DukeImageDesignSpec[];
  sources?: DukeWebSource[];
  quickOptions?: DukeQuickOption[];
}

const VALID_THEMES: ReadonlySet<DukeEventTheme> = new Set([
  'emerald_gold',
  'royal_blue',
  'crimson_gold',
  'midnight_violet',
  'ivory_gold',
]);

const VALID_ASPECTS: ReadonlySet<DukeImageAspectRatio> = new Set(['1:1', '16:9', '9:16', '4:5']);
const VALID_LAYOUTS: ReadonlySet<DukeImageLayout> = new Set([
  'modern_backdrop',
  'glass_showcase',
  'luxury_frame',
  'full_bleed',
  'cinematic_bottom',
  'editorial_card',
  'framed_poster',
  'split_hero',
]);
const VALID_FRAMES: ReadonlySet<DukeImageFrameStyle> = new Set([
  'none',
  'gold_double',
  'minimal_white',
  'neon_glow',
  'glass_modern',
  'luxury_bevel',
]);
const VALID_MOTIFS: ReadonlySet<DukeImageMotif> = new Set([
  'rays',
  'grid',
  'waves',
  'orbs',
  'rings',
  'emblem',
]);
const VALID_EMBLEMS = new Set(['crown', 'globe', 'star', 'cross', 'spark', 'shield', 'none']);
const VALID_PHOTO_STYLES: ReadonlySet<DukePhotoStyle> = new Set([
  'studio_relight',
  'neon_modern',
  'editorial_cover',
  'digital_art_pop',
  'golden_gala',
  'backdrop_3d',
]);
const VALID_RELIGHT_PRESETS: ReadonlySet<DukeRelightPreset> = new Set([
  'warm_gold',
  'cool_cyber',
  'emerald_royal',
  'sunset_cinema',
  'violet_aura',
  'noir_luxury',
]);
const VALID_LIGHT_FX: ReadonlySet<DukeLightFx> = new Set([
  'bokeh_orbs',
  'prism_beams',
  'neon_rings',
  'sun_flare',
  'studio_rim',
  'none',
]);
const VALID_GRAPHIC_OVERLAYS: ReadonlySet<DukeGraphicOverlay> = new Set([
  'editorial_lines',
  'glass_cards',
  'cyber_hud',
  'luxury_crest',
  'clean',
]);

export function slugifyEventTitle(raw: string): string {
  const base = (raw || 'evento-duque')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return base.length >= 3 ? base : 'evento-duque';
}

function clampString(value: unknown, fallback: string, maxLen: number): string {
  const str = typeof value === 'string' ? value.trim() : '';
  const finalStr = str.length >= 1 ? str : fallback;
  return finalStr.slice(0, maxLen);
}

function clampNum(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, n));
}

function safeHex(value: unknown, fallback: string): string {
  const s = typeof value === 'string' ? value.trim() : '';
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s) ? s : fallback;
}

function sanitizeEventSpec(raw: unknown, fallback?: Partial<DukeEventSpec> | null): DukeEventSpec {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const fb = fallback ?? {};

  const title = clampString(obj.title ?? fb.title, 'Evento Especial CONAE', 140);
  const rawSlug = typeof obj.slug === 'string' && obj.slug.trim() ? obj.slug : fb.slug || title;
  const slug = slugifyEventTitle(rawSlug);
  const themeRaw = typeof obj.theme === 'string' ? obj.theme.trim() : fb.theme;
  const theme: DukeEventTheme = VALID_THEMES.has(themeRaw as DukeEventTheme)
    ? (themeRaw as DukeEventTheme)
    : 'emerald_gold';

  const highlights = Array.isArray(obj.highlights)
    ? obj.highlights
        .filter((h): h is string => typeof h === 'string' && h.trim().length > 0)
        .map((h) => h.trim().slice(0, 120))
        .slice(0, 8)
    : fb.highlights?.slice(0, 8) ?? [];

  const metrics = Array.isArray(obj.metrics)
    ? obj.metrics
        .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === 'object'))
        .map((m) => ({
          label: clampString(m.label, 'Destaque', 60),
          value: clampString(m.value, 'Confirmado', 40),
        }))
        .slice(0, 6)
    : fb.metrics?.slice(0, 6) ?? [];

  const panels = Array.isArray(obj.panels)
    ? obj.panels
        .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object'))
        .map((p) => ({
          title: clampString(p.title, 'Painel Oficial', 100),
          subtitle: clampString(p.subtitle, 'Destaque do evento', 120),
          description: clampString(p.description, 'Informações detalhadas deste painel.', 320),
          badge: clampString(p.badge, 'Painel', 40),
        }))
        .slice(0, 8)
    : fb.panels?.slice(0, 8) ?? [];

  const schedule = Array.isArray(obj.schedule)
    ? obj.schedule
        .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
        .map((s) => ({
          time: clampString(s.time, '19:00', 32),
          title: clampString(s.title, 'Sessão Principal', 120),
          speaker: clampString(s.speaker, 'Equipe Organizadora', 80),
          stage: clampString(s.stage, 'Auditório Principal', 80),
          description: clampString(s.description, 'Programação oficial do encontro.', 240),
        }))
        .slice(0, 16)
    : fb.schedule?.slice(0, 16) ?? [];

  const speakers = Array.isArray(obj.speakers)
    ? obj.speakers
        .filter((sp): sp is Record<string, unknown> => Boolean(sp && typeof sp === 'object'))
        .map((sp) => ({
          name: clampString(sp.name, 'Convidado Especial', 80),
          role: clampString(sp.role, 'Palestrante', 80),
          topic: clampString(sp.topic, 'Tema Principal', 140),
        }))
        .slice(0, 10)
    : fb.speakers?.slice(0, 10) ?? [];

  const tickets = Array.isArray(obj.tickets)
    ? obj.tickets
        .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object'))
        .map((t) => ({
          name: clampString(t.name, 'Ingresso Padrão', 80),
          priceLabel: clampString(t.priceLabel, 'Gratuito', 40),
          perks: clampString(t.perks, 'Acesso completo à programação oficial.', 200),
          highlighted: Boolean(t.highlighted),
        }))
        .slice(0, 6)
    : fb.tickets?.slice(0, 6) ?? [];

  return {
    slug,
    title: title.length >= 2 ? title : 'Evento Duque',
    subtitle: clampString(
      obj.subtitle ?? fb.subtitle,
      'Uma experiência inesquecível projetada pelo Robô Duque.',
      220
    ),
    category: clampString(obj.category ?? fb.category, 'Congresso & Evento', 80),
    tagline: clampString(obj.tagline ?? fb.tagline, 'Divulgação oficial com link pronto para compartilhar', 160),
    dateLabel: clampString(obj.dateLabel ?? fb.dateLabel, 'Data a definir', 80),
    timeLabel: clampString(obj.timeLabel ?? fb.timeLabel, '19h às 22h', 80),
    venueName: clampString(obj.venueName ?? fb.venueName, 'Centro de Convenções', 160),
    city: clampString(obj.city ?? fb.city, 'Goiânia', 80),
    state: clampString(obj.state ?? fb.state, 'GO', 4).toUpperCase(),
    theme,
    organizerName: clampString(obj.organizerName ?? fb.organizerName, 'Organização Oficial', 120),
    whatsappPhone: clampString(obj.whatsappPhone ?? fb.whatsappPhone, '', 32),
    registrationCta: clampString(obj.registrationCta ?? fb.registrationCta, 'Garantir Minha Vaga', 80),
    heroSummary: clampString(
      obj.heroSummary ?? fb.heroSummary,
      'Participe deste grande evento com painéis exclusivos, programação completa e credenciamento imediato.',
      600
    ),
    highlights,
    metrics,
    panels,
    schedule,
    speakers,
    tickets,
  };
}

function sanitizeImageDesignSpec(raw: unknown, hasPhoto: boolean): DukeImageDesignSpec {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const aspectRaw = typeof obj.aspectRatio === 'string' ? obj.aspectRatio.trim() : '1:1';
  const layoutRaw = typeof obj.layout === 'string' ? obj.layout.trim() : 'full_bleed';
  const frameRaw = typeof obj.frameStyle === 'string' ? obj.frameStyle.trim() : 'luxury_bevel';
  const motifRaw = typeof obj.decorativeMotif === 'string' ? obj.decorativeMotif.trim() : 'orbs';
  const emblemRaw = typeof obj.emblemType === 'string' ? obj.emblemType.trim() : 'spark';
  const photoStyleRaw = typeof obj.photoStyle === 'string' ? obj.photoStyle.trim() : 'studio_relight';
  const relightRaw = typeof obj.relightPreset === 'string' ? obj.relightPreset.trim() : 'emerald_royal';
  const lightFxRaw = typeof obj.lightFx === 'string' ? obj.lightFx.trim() : 'prism_beams';
  const overlayRaw =
    typeof obj.graphicDesignOverlay === 'string' ? obj.graphicDesignOverlay.trim() : 'editorial_lines';

  return {
    mode: hasPhoto ? 'reformulate' : 'create',
    title: clampString(obj.title, hasPhoto ? 'Redesign Moderno na Foto' : 'Arte Criada pelo ConaeDuque', 90),
    aspectRatio: VALID_ASPECTS.has(aspectRaw as DukeImageAspectRatio)
      ? (aspectRaw as DukeImageAspectRatio)
      : '1:1',
    layout: VALID_LAYOUTS.has(layoutRaw as DukeImageLayout)
      ? (layoutRaw as DukeImageLayout)
      : 'full_bleed',
    frameStyle: VALID_FRAMES.has(frameRaw as DukeImageFrameStyle)
      ? (frameRaw as DukeImageFrameStyle)
      : 'luxury_bevel',
    decorativeMotif: VALID_MOTIFS.has(motifRaw as DukeImageMotif)
      ? (motifRaw as DukeImageMotif)
      : 'orbs',
    photoStyle: VALID_PHOTO_STYLES.has(photoStyleRaw as DukePhotoStyle)
      ? (photoStyleRaw as DukePhotoStyle)
      : 'studio_relight',
    relightPreset: VALID_RELIGHT_PRESETS.has(relightRaw as DukeRelightPreset)
      ? (relightRaw as DukeRelightPreset)
      : 'emerald_royal',
    bokehDepth: clampNum(obj.bokehDepth, hasPhoto ? 0.46 : 0, 0, 1),
    hdrClarity: clampNum(obj.hdrClarity, 0.74, 0, 1),
    lightFx: VALID_LIGHT_FX.has(lightFxRaw as DukeLightFx)
      ? (lightFxRaw as DukeLightFx)
      : 'prism_beams',
    graphicDesignOverlay: VALID_GRAPHIC_OVERLAYS.has(overlayRaw as DukeGraphicOverlay)
      ? (overlayRaw as DukeGraphicOverlay)
      : 'editorial_lines',
    bgStart: safeHex(obj.bgStart, '#041710'),
    bgMid: safeHex(obj.bgMid, '#0b3524'),
    bgEnd: safeHex(obj.bgEnd, '#030b08'),
    accentColor: safeHex(obj.accentColor, '#f59e0b'),
    textPrimary: safeHex(obj.textPrimary, '#ffffff'),
    textMuted: safeHex(obj.textMuted, '#d1fae5'),
    badgeText: typeof obj.badgeText === 'string' ? obj.badgeText.trim().slice(0, 48) : '',
    headline: typeof obj.headline === 'string' ? obj.headline.trim().slice(0, 90) : '',
    subheadline: typeof obj.subheadline === 'string' ? obj.subheadline.trim().slice(0, 140) : '',
    footerText: typeof obj.footerText === 'string' ? obj.footerText.trim().slice(0, 84) : '',
    ctaText: typeof obj.ctaText === 'string' ? obj.ctaText.trim().slice(0, 40) : '',
    brightness: clampNum(obj.brightness, 1.07, 0.65, 1.5),
    contrast: clampNum(obj.contrast, 1.15, 0.75, 1.6),
    saturate: clampNum(obj.saturate, 1.18, 0, 1.9),
    sepia: clampNum(obj.sepia, 0, 0, 0.65),
    hueRotate: clampNum(obj.hueRotate, 0, -45, 45),
    vignette: clampNum(obj.vignette, hasPhoto ? 0.42 : 0.48, 0, 0.9),
    tintColor: safeHex(obj.tintColor, '#f59e0b'),
    tintOpacity: clampNum(obj.tintOpacity, hasPhoto ? 0.1 : 0.14, 0, 0.55),
    emblemType: VALID_EMBLEMS.has(emblemRaw)
      ? (emblemRaw as DukeImageDesignSpec['emblemType'])
      : 'spark',
    textPosition:
      obj.textPosition === 'top' || obj.textPosition === 'center' || obj.textPosition === 'bottom'
        ? obj.textPosition
        : hasPhoto
          ? 'bottom'
          : 'center',
    fontStyle:
      obj.fontStyle === 'editorial' || obj.fontStyle === 'modern' || obj.fontStyle === 'impact'
        ? obj.fontStyle
        : 'editorial',
    fontScale: clampNum(obj.fontScale, 1, 0.72, 1.45),
  };
}

function ensureThreeModernImageVariants(
  primary: DukeImageDesignSpec,
  rawVariants: unknown,
  hasPhoto: boolean
): DukeImageDesignSpec[] {
  const sanitizedList: DukeImageDesignSpec[] = [];
  if (Array.isArray(rawVariants)) {
    for (const item of rawVariants) {
      if (item && typeof item === 'object') {
        sanitizedList.push(sanitizeImageDesignSpec(item, hasPhoto));
      }
    }
  }

  const firstRaw = sanitizedList[0] ?? primary;
  const first: DukeImageDesignSpec = {
    ...firstRaw,
    layout: hasPhoto ? firstRaw.layout || 'full_bleed' : firstRaw.layout,
    photoStyle: firstRaw.photoStyle || 'studio_relight',
    relightPreset: firstRaw.relightPreset || 'emerald_royal',
    bokehDepth: firstRaw.bokehDepth ?? (hasPhoto ? 0.48 : 0),
    hdrClarity: firstRaw.hdrClarity ?? 0.78,
    lightFx: firstRaw.lightFx || 'prism_beams',
    graphicDesignOverlay: firstRaw.graphicDesignOverlay || 'editorial_lines',
  };

  const baseTitle = first.title.replace(/^Opção \d+\s*[—-]\s*/i, '').trim() || 'Design Moderno';

  const second: DukeImageDesignSpec = sanitizedList[1]
    ? sanitizedList[1]
    : {
        ...first,
        title: `Opção 2 — Arte Digital Neon (${baseTitle})`,
        layout: hasPhoto ? 'full_bleed' : 'editorial_card',
        photoStyle: hasPhoto ? 'digital_art_pop' : 'neon_modern',
        relightPreset: 'cool_cyber',
        bokehDepth: hasPhoto ? 0.56 : 0,
        hdrClarity: 0.88,
        lightFx: 'neon_rings',
        graphicDesignOverlay: 'glass_cards',
        frameStyle: 'glass_modern',
        decorativeMotif: 'waves',
        bgStart: '#071630',
        bgMid: '#0d2b57',
        bgEnd: '#040a18',
        accentColor: '#38bdf8',
        textMuted: '#bae6fd',
        fontStyle: 'modern',
        brightness: Math.min(1.4, (first.brightness ?? 1.07) + 0.04),
        contrast: Math.min(1.5, (first.contrast ?? 1.15) + 0.05),
      };

  const third: DukeImageDesignSpec = sanitizedList[2]
    ? sanitizedList[2]
    : {
        ...first,
        title: `Opção 3 — Estúdio 3D Gala Dourada (${baseTitle})`,
        layout: hasPhoto ? 'modern_backdrop' : 'framed_poster',
        photoStyle: 'golden_gala',
        relightPreset: 'warm_gold',
        bokehDepth: hasPhoto ? 0.42 : 0,
        hdrClarity: 0.8,
        lightFx: 'bokeh_orbs',
        graphicDesignOverlay: 'luxury_crest',
        frameStyle: 'luxury_bevel',
        decorativeMotif: 'rays',
        bgStart: '#1f0b1c',
        bgMid: '#3b102c',
        bgEnd: '#0b050a',
        accentColor: '#fbbf24',
        textMuted: '#fde68a',
        fontStyle: 'impact',
        saturate: Math.min(1.6, (first.saturate ?? 1.18) + 0.1),
      };

  return [first, second, third];
}

function extractQuickOptionsFromChat(rawText: string, userMessage: string): {
  cleanReply: string;
  quickOptions: DukeQuickOption[];
} {
  const match = rawText.match(/<<OPCOES>>([\s\S]*?)<<\/OPCOES>>/i);
  const cleanReply = match
    ? rawText.replace(/<<OPCOES>>[\s\S]*?<<\/OPCOES>>/i, '').trim()
    : rawText.trim();

  const parsedOptions: DukeQuickOption[] = [];
  if (match?.[1]) {
    try {
      const jsonStr = match[1].trim();
      const arr = JSON.parse(jsonStr);
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (item && typeof item === 'object') {
            const o = item as Record<string, unknown>;
            const label = clampString(o.label, '', 48);
            const prompt = clampString(o.prompt, '', 260);
            const mode =
              o.mode === 'chat' || o.mode === 'image' || o.mode === 'event' || o.mode === 'auto'
                ? o.mode
                : undefined;
            if (label && prompt) {
              parsedOptions.push({ label, prompt, mode });
            }
          }
        }
      }
    } catch {
      // ignore malformed tag and use smart defaults below
    }
  }

  if (parsedOptions.length >= 2) {
    return { cleanReply, quickOptions: parsedOptions.slice(0, 4) };
  }

  const topicHint = userMessage.trim().slice(0, 70) || 'este assunto';
  return {
    cleanReply,
    quickOptions: [
      {
        label: 'Aprofundar Opção 1',
        prompt: `Desenvolva e detalhe a Opção 1 sobre "${topicHint}" pronta para uso imediato.`,
        mode: 'chat',
      },
      {
        label: 'Mais 3 Opções Criativas',
        prompt: `Me dê mais 3 opções diferentes, modernas e criativas sobre "${topicHint}".`,
        mode: 'chat',
      },
      {
        label: 'Criar Arte HD disso',
        prompt: `Crie 3 opções modernas de arte visual em alta definição com fundo estilizado e bordas bonitas sobre: ${topicHint}`,
        mode: 'image',
      },
      {
        label: 'Versão Curta p/ WhatsApp',
        prompt: `Transforme isso em 3 opções curtas e prontas para enviar no WhatsApp agora.`,
        mode: 'chat',
      },
    ],
  };
}

function detectStudioMode(
  requestedMode: DukeStudioMode | undefined,
  message: string,
  hasImageAttachment: boolean,
  hasCurrentEvent: boolean
): 'chat' | 'image' | 'event' {
  if (requestedMode === 'chat' || requestedMode === 'image' || requestedMode === 'event') {
    return requestedMode;
  }

  const normalized = (message || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  // Explicit image creation / write-on-photo / photo reformulation intents
  const imageRegex =
    /\b(imagem|imagens|foto|banner|cartaz|flyer|poster|arte|logotipo|logo|capa|stories|story|post para|card visual|reformula|reformular|reformule|edita|editar|edite|modifica|modificar|modifique|escreve na foto|escrever na foto|escreva na foto|texto na foto|frase na foto|coloca texto|colocar texto|melhora|melhorar|transforma|transformar|retoca|retocar|filtro|moldura|miniatura|thumbnail)\b/;
  // Explicit event builder / link publishing intents
  const eventRegex =
    /\b(evento|eventos|congresso|convencao|culto|conferencia|workshop|seminario|palestra|programacao|paineis|painel|preletores|palestrantes|ingressos|credenciamento|gera o link|gerar link|publica|publicar|link do evento|pagina do evento|pagina de divulgacao)\b/;
  // Explicit free ChatGPT / text / code intents
  const codeOrTextRegex =
    /\b(codigo|html|css|javascript|typescript|react|python|sql|script|texto|redacao|artigo|sermao|pregacao|roteiro|legenda|copy|carta|contrato|email|e-mail|mensagem de whatsapp|explica|explique|como fazer|resuma|resumo|traduza|traducao|ideias|lista de)\b/;

  if (hasImageAttachment && !eventRegex.test(normalized)) {
    if (imageRegex.test(normalized) || !codeOrTextRegex.test(normalized)) {
      return 'image';
    }
  }

  if (imageRegex.test(normalized) && !eventRegex.test(normalized)) {
    return 'image';
  }

  if (codeOrTextRegex.test(normalized) && !eventRegex.test(normalized)) {
    return 'chat';
  }

  if (eventRegex.test(normalized)) {
    return 'event';
  }

  if (hasCurrentEvent && /\b(muda|mudar|altera|alterar|adiciona|adicionar|troca|trocar|atualiza|atualizar|tema|cor|data|horario|cidade|local|titulo|slug)\b/.test(normalized)) {
    return 'event';
  }

  return 'chat';
}

const DUKE_EVENT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING },
    shouldPublish: { type: Type.BOOLEAN },
    event: {
      type: Type.OBJECT,
      properties: {
        slug: { type: Type.STRING },
        title: { type: Type.STRING },
        subtitle: { type: Type.STRING },
        category: { type: Type.STRING },
        tagline: { type: Type.STRING },
        dateLabel: { type: Type.STRING },
        timeLabel: { type: Type.STRING },
        venueName: { type: Type.STRING },
        city: { type: Type.STRING },
        state: { type: Type.STRING },
        theme: {
          type: Type.STRING,
          enum: ['emerald_gold', 'royal_blue', 'crimson_gold', 'midnight_violet', 'ivory_gold'],
        },
        organizerName: { type: Type.STRING },
        whatsappPhone: { type: Type.STRING },
        registrationCta: { type: Type.STRING },
        heroSummary: { type: Type.STRING },
        highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
        metrics: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.STRING },
            },
            required: ['label', 'value'],
          },
        },
        panels: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              description: { type: Type.STRING },
              badge: { type: Type.STRING },
            },
            required: ['title', 'subtitle', 'description', 'badge'],
          },
        },
        schedule: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING },
              title: { type: Type.STRING },
              speaker: { type: Type.STRING },
              stage: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ['time', 'title', 'speaker', 'stage', 'description'],
          },
        },
        speakers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              role: { type: Type.STRING },
              topic: { type: Type.STRING },
            },
            required: ['name', 'role', 'topic'],
          },
        },
        tickets: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              priceLabel: { type: Type.STRING },
              perks: { type: Type.STRING },
              highlighted: { type: Type.BOOLEAN },
            },
            required: ['name', 'priceLabel', 'perks', 'highlighted'],
          },
        },
      },
      required: [
        'slug',
        'title',
        'subtitle',
        'category',
        'tagline',
        'dateLabel',
        'timeLabel',
        'venueName',
        'city',
        'state',
        'theme',
        'organizerName',
        'whatsappPhone',
        'registrationCta',
        'heroSummary',
        'highlights',
        'metrics',
        'panels',
        'schedule',
        'speakers',
        'tickets',
      ],
    },
  },
  required: ['reply', 'shouldPublish', 'event'],
};

const IMAGE_SPEC_SCHEMA_ITEM = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    aspectRatio: { type: Type.STRING, enum: ['1:1', '16:9', '9:16', '4:5'] },
    layout: {
      type: Type.STRING,
      enum: [
        'modern_backdrop',
        'glass_showcase',
        'luxury_frame',
        'framed_poster',
        'cinematic_bottom',
        'editorial_card',
        'split_hero',
        'full_bleed',
      ],
    },
    frameStyle: {
      type: Type.STRING,
      enum: ['luxury_bevel', 'glass_modern', 'gold_double', 'neon_glow', 'minimal_white', 'none'],
    },
    decorativeMotif: {
      type: Type.STRING,
      enum: ['rays', 'grid', 'waves', 'orbs', 'rings', 'emblem'],
    },
    photoStyle: {
      type: Type.STRING,
      enum: [
        'studio_relight',
        'neon_modern',
        'editorial_cover',
        'digital_art_pop',
        'golden_gala',
        'backdrop_3d',
      ],
    },
    relightPreset: {
      type: Type.STRING,
      enum: ['warm_gold', 'cool_cyber', 'emerald_royal', 'sunset_cinema', 'violet_aura', 'noir_luxury'],
    },
    bokehDepth: { type: Type.NUMBER },
    hdrClarity: { type: Type.NUMBER },
    lightFx: {
      type: Type.STRING,
      enum: ['bokeh_orbs', 'prism_beams', 'neon_rings', 'sun_flare', 'studio_rim', 'none'],
    },
    graphicDesignOverlay: {
      type: Type.STRING,
      enum: ['editorial_lines', 'glass_cards', 'cyber_hud', 'luxury_crest', 'clean'],
    },
    bgStart: { type: Type.STRING },
    bgMid: { type: Type.STRING },
    bgEnd: { type: Type.STRING },
    accentColor: { type: Type.STRING },
    textPrimary: { type: Type.STRING },
    textMuted: { type: Type.STRING },
    badgeText: { type: Type.STRING },
    headline: { type: Type.STRING },
    subheadline: { type: Type.STRING },
    footerText: { type: Type.STRING },
    ctaText: { type: Type.STRING },
    brightness: { type: Type.NUMBER },
    contrast: { type: Type.NUMBER },
    saturate: { type: Type.NUMBER },
    sepia: { type: Type.NUMBER },
    hueRotate: { type: Type.NUMBER },
    vignette: { type: Type.NUMBER },
    tintColor: { type: Type.STRING },
    tintOpacity: { type: Type.NUMBER },
    emblemType: {
      type: Type.STRING,
      enum: ['crown', 'globe', 'star', 'cross', 'spark', 'shield', 'none'],
    },
    textPosition: {
      type: Type.STRING,
      enum: ['top', 'center', 'bottom'],
    },
    fontStyle: {
      type: Type.STRING,
      enum: ['editorial', 'modern', 'impact'],
    },
    fontScale: { type: Type.NUMBER },
  },
  required: [
    'title',
    'aspectRatio',
    'layout',
    'frameStyle',
    'decorativeMotif',
    'bgStart',
    'bgMid',
    'bgEnd',
    'accentColor',
    'textPrimary',
    'textMuted',
  ],
};

const DUKE_IMAGE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description:
        'Explicação calorosa e objetiva em português apresentando as 3 opções modernas criadas (fundo atrás da foto, bordas inteligentes, cores e estilo de cada opção).',
    },
    imageDesign: IMAGE_SPEC_SCHEMA_ITEM,
    imageVariants: {
      type: Type.ARRAY,
      description: 'Exatamente 3 opções visuais modernas e distintas para o cliente escolher diretamente na conversa.',
      items: IMAGE_SPEC_SCHEMA_ITEM,
    },
  },
  required: ['reply', 'imageDesign', 'imageVariants'],
};

const SYSTEM_INSTRUCTION_CHAT = `Você é o **Robô Duque (ConaeDuque)**, um assistente completo de Inteligência Artificial avançada pronto para servir todos os clientes, pastores, líderes, empresários e afiliados da CONAE.

Regras de ouro (SEMPRE siga rigorosamente):
1. **PESQUISA NO GOOGLE & PRECISÃO TOTAL:** sempre use os resultados atualizados da Pesquisa Google quando disponíveis para responder com dados reais, atuais e exatamente conforme o pedido do cliente.
2. **SEMPRE ENTREGUE MÚLTIPLAS OPÇÕES:** para TUDO o que o cliente pedir (textos, mensagens, convites, sermões, estratégias, nomes, ideias, códigos, respostas, vendas, planejamento ou soluções), apresente **3 opções distintas e prontas para escolher** organizadas com títulos claros:
   - ### Opção 1 — [Estilo Oficial / Elegante]
   - ### Opção 2 — [Estilo Moderno / Impactante]
   - ### Opção 3 — [Estilo Direto / Criativo]
   (Se o cliente pedir uma informação objetiva ou pesquisa do Google, responda primeiro de forma direta com os dados encontrados e logo em seguida ofereça 3 opções de aprofundamento ou aplicação prática.)
3. **Programação e Canvas de Código Ao Vivo:** quando o cliente pedir código (HTML, CSS, JS, TS, React, Python, SQL), entregue código completo e funcional dentro de blocos markdown (\`\`\`html, \`\`\`tsx etc.) pronto para visualizar ao vivo e copiar.
4. **Visão de Fotos e Leitura de PDFs/Arquivos:** analise imagens, documentos e links com atenção total.
5. **BOTÕES DE OPÇÕES RÁPIDAS NA TELA:** no final de TODA resposta, adicione obrigatoriamente um bloco oculto exatamente neste formato JSON válido com 3 ou 4 opções clicáveis relacionadas ao pedido atual:
<<OPCOES>>[{"label":"Texto curto do botão","prompt":"Pedido completo para o robô executar se o cliente clicar","mode":"chat"},{"label":"Criar Arte HD disso","prompt":"Crie 3 opções modernas de arte HD com fundo inteligente sobre este tema","mode":"image"}]<</OPCOES>>`;

const SYSTEM_INSTRUCTION_EVENT = `Você é o **Robô Duque (ConaeDuque)**, o robô oficial com Inteligência Artificial da CONAE, pronto para servir todos os clientes, pastores, empresários e afiliados da CONAE.
Sua missão neste modo é construir em tempo real páginas de eventos, congressos, convenções, cultos, workshops, feiras e campanhas prontas para gerar link fixo oficial.

Regras obrigatórias:
1. Sempre devolva o objeto "event" COMPLETO e atualizado preservando o que já foi combinado antes e aplicando exatamente tudo o que o cliente pediu.
2. Adapte os painéis (3 a 6), a programação (4 a 8 horários), preletores/convidados (2 a 6), métricas (3 a 4), destaques (3 a 5) e ingressos/inscrições (2 a 3).
3. Escolha o tema ("theme") mais adequado: emerald_gold, royal_blue, crimson_gold, midnight_violet ou ivory_gold.
4. Gere um "slug" curto e limpo em minúsculas com hífens para o link /evento/{slug}.
5. Defina "shouldPublish": true APENAS quando o cliente pedir explicitamente para publicar, salvar ou gerar o link oficial.
6. Nunca use HTML ou Markdown quebrado nos campos do objeto "event".`;

const SYSTEM_INSTRUCTION_IMAGE = `Você é o **Diretor Criativo & Estúdio de Transformação de Fotos IA do Robô Duque (ConaeDuque)**!
Sua missão SEMPRE que alguém enviar ou pedir para mudar uma foto é **fazer um design moderno DIRETO NA PRÓPRIA FOTO/IMAGEM** — transformando a iluminação (relighting HDR), desfoque bokeh DSLR de estúdio, estilização artística digital, efeitos luminosos modernos e elementos gráficos integrados à própria imagem — SEMPRE entregando **3 OPÇÕES VISUAIS RADICALMENTE DISTINTAS** em "imageVariants" (além da principal em "imageDesign") para o cliente escolher direto na conversa!

Regras obrigatórias:
1. **TRANSFORME A PRÓPRIA FOTO EM 3 ESTILOS MODERNOS DIFERENTES EM "imageVariants":**
   - **Opção 1 (Design Moderno na Própria Foto — Estúdio HDR):** use \`layout: "full_bleed"\`, \`photoStyle: "studio_relight"\` ou \`"editorial_cover"\`, \`bokehDepth: 0.45\`, \`hdrClarity: 0.8\`, \`lightFx: "prism_beams"\` ou \`"sun_flare"\`, \`graphicDesignOverlay: "editorial_lines"\` ou \`"glass_cards"\`, \`frameStyle: "luxury_bevel"\` ou \`"minimal_white"\` — modifica diretamente a foto inteira com visual de estúdio profissional moderno!
   - **Opção 2 (Arte Digital / Neon Futurista na Própria Foto):** use \`layout: "full_bleed"\` ou \`"editorial_card"\`, \`photoStyle: "digital_art_pop"\` ou \`"neon_modern"\`, \`relightPreset: "cool_cyber"\` ou \`"violet_aura"\` ou \`"sunset_cinema"\`, \`bokehDepth: 0.55\`, \`hdrClarity: 0.88\`, \`lightFx: "neon_rings"\`, \`graphicDesignOverlay: "cyber_hud"\` ou \`"glass_cards"\`, \`frameStyle: "neon_glow"\` ou \`"glass_modern"\` — transforma a própria foto em arte digital moderna estilizada e super atual!
   - **Opção 3 (Estúdio 3D com Fundo Moderno + Gala Dourada):** use \`layout: "modern_backdrop"\` ou \`"glass_showcase"\`, \`photoStyle: "golden_gala"\` ou \`"backdrop_3d"\`, \`relightPreset: "warm_gold"\` ou \`"emerald_royal"\`, \`bokehDepth: 0.42\`, \`hdrClarity: 0.78\`, \`lightFx: "bokeh_orbs"\`, \`graphicDesignOverlay: "luxury_crest"\`, \`frameStyle: "gold_double"\` ou \`"luxury_bevel"\` — aplica o design na foto e coloca fundo iluminado 3D moderno atrás com bordas de luxo!
2. **ESCREVER NA FOTO COM FIDELIDADE TOTAL:** quando o cliente pedir para escrever uma frase, nome, data, versículo ou telefone na foto, coloque o texto EXATO em "headline" (e complementos em "subheadline", "badgeText", "ctaText" ou "footerText") nas 3 opções! Se o cliente pedir apenas para modernizar/modificar a foto sem texto, deixe "headline", "subheadline", "badgeText", "ctaText" e "footerText" vazios ("").
3. **PALETAS DISTINTAS E HARMONIOSAS:** cada uma das 3 opções deve ter um \`relightPreset\` e paleta hexadecimal (#RRGGBB) diferente e impactante.
4. Escolha o "aspectRatio" conforme o pedido: "9:16" (Stories/Vertical), "16:9" (Capa/Horizontal), "4:5" (Feed vertical), "1:1" (Quadrado).
5. Ajuste "brightness", "contrast", "saturate", "bokehDepth", "hdrClarity", "vignette", "textPosition" e "fontStyle" de forma inteligente para deixar a própria foto irreconhecivelmente mais bonita e moderna.`;

const VERCEL_AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const GATEWAY_MODELS = ['google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite'] as const;

const GATEWAY_EVENT_JSON_CONTRACT = `
Responda EXCLUSIVAMENTE com um objeto JSON válido (sem texto extra) contendo:
{"reply":"string","shouldPublish":false,"event":{"slug":"string","title":"string","subtitle":"string","category":"string","tagline":"string","dateLabel":"string","timeLabel":"string","venueName":"string","city":"string","state":"UF","theme":"emerald_gold","organizerName":"string","whatsappPhone":"string","registrationCta":"string","heroSummary":"string","highlights":["string"],"metrics":[{"label":"string","value":"string"}],"panels":[{"title":"string","subtitle":"string","description":"string","badge":"string"}],"schedule":[{"time":"string","title":"string","speaker":"string","stage":"string","description":"string"}],"speakers":[{"name":"string","role":"string","topic":"string"}],"tickets":[{"name":"string","priceLabel":"string","perks":"string","highlighted":false}]}}`;

const GATEWAY_IMAGE_JSON_CONTRACT = `
Responda EXCLUSIVAMENTE com um objeto JSON válido (sem texto extra) contendo "reply", "imageDesign" e "imageVariants" (array com 3 opções distintas modificando a própria foto):
{"reply":"string","imageDesign":{"title":"Opção 1 — Estúdio HDR na Foto","aspectRatio":"1:1","layout":"full_bleed","photoStyle":"studio_relight","relightPreset":"emerald_royal","bokehDepth":0.48,"hdrClarity":0.8,"lightFx":"prism_beams","graphicDesignOverlay":"editorial_lines","frameStyle":"luxury_bevel","decorativeMotif":"orbs","bgStart":"#041710","bgMid":"#0b3524","bgEnd":"#030b08","accentColor":"#f59e0b","textPrimary":"#ffffff","textMuted":"#d1fae5","badgeText":"","headline":"","subheadline":"","footerText":"","ctaText":"","brightness":1.08,"contrast":1.16,"saturate":1.2,"sepia":0,"hueRotate":0,"vignette":0.4,"tintColor":"#f59e0b","tintOpacity":0.09,"emblemType":"spark","textPosition":"bottom","fontStyle":"editorial","fontScale":1},"imageVariants":[...]}`;

function isAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return (
    msg.includes('API_KEY_INVALID') ||
    msg.includes('API key not valid') ||
    msg.includes('HTTP 401') ||
    msg.includes('HTTP 403') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('UNAUTHENTICATED')
  );
}

function formatFriendlyAiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand')) {
    return 'Os servidores da Inteligência Artificial tiveram um pico momentâneo de acesso. Envie novamente em alguns segundos que o Robô Duque já responde.';
  }
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return 'Limite temporário de requisições da IA atingido. Aguarde alguns instantes e tente enviar novamente.';
  }
  if (isAuthError(err)) {
    return 'Chave de API inválida ou sem permissão no servidor. Verifique GEMINI_API_KEY ou AI_GATEWAY_API_KEY em Settings → Environment Variables na Vercel e faça um Redeploy.';
  }
  return raw.length > 260 ? 'Não foi possível concluir a resposta da IA agora. Tente enviar seu pedido novamente.' : raw;
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const unfenced = trimmed.startsWith('```')
    ? trimmed
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
    : trimmed;

  const firstBrace = unfenced.indexOf('{');
  const lastBrace = unfenced.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return unfenced.slice(firstBrace, lastBrace + 1);
  }
  return unfenced;
}

function resolveAiCredentials(): { geminiKey: string; gatewayToken: string } {
  const candidates = [
    process.env.GEMINI_API_KEY?.trim() || '',
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || '',
    process.env.GOOGLE_API_KEY?.trim() || '',
  ].filter(Boolean);

  const rawGemini = candidates.find((k) => !k.startsWith('vck_')) || '';
  const gatewayFromGeminiVar = candidates.find((k) => k.startsWith('vck_')) || '';

  const gatewayToken =
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.VERCEL_AI_GATEWAY_API_KEY?.trim() ||
    gatewayFromGeminiVar ||
    process.env.VERCEL_OIDC_TOKEN?.trim() ||
    '';

  return { geminiKey: rawGemini, gatewayToken };
}

async function runViaVercelAiGateway(params: {
  token: string;
  systemPrompt: string;
  promptText: string;
  attachment: DukeChatAttachment | null;
  expectJson: boolean;
}): Promise<string> {
  const { token, systemPrompt, promptText, attachment, expectJson } = params;
  const userContent =
    attachment?.base64Data && attachment.mimeType?.startsWith('image/')
      ? [
          { type: 'text', text: promptText },
          {
            type: 'image_url',
            image_url: { url: `data:${attachment.mimeType};base64,${attachment.base64Data}` },
          },
        ]
      : promptText;

  let lastError: unknown = null;

  for (let i = 0; i < GATEWAY_MODELS.length; i += 1) {
    const model = GATEWAY_MODELS[i];
    const jsonModeOptions = expectJson ? [true, false] : [false];

    for (const useJsonMode of jsonModeOptions) {
      try {
        const payload: Record<string, unknown> = {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          temperature: 0.7,
        };
        if (useJsonMode) {
          payload.response_format = { type: 'json_object' };
        }

        const response = await fetch(VERCEL_AI_GATEWAY_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          const httpErr = new Error(`Vercel AI Gateway HTTP ${response.status}: ${errBody.slice(0, 200)}`);
          lastError = httpErr;
          if (response.status === 400 && useJsonMode) {
            continue;
          }
          throw httpErr;
        }

        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
        };
        const content = data?.choices?.[0]?.message?.content;
        const text =
          typeof content === 'string'
            ? content
            : Array.isArray(content)
              ? content.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('\n')
              : '';

        if (text.trim()) {
          return expectJson ? extractJsonObject(text) : text.trim();
        }
        throw new Error('Resposta vazia recebida do Vercel AI Gateway.');
      } catch (err) {
        lastError = err;
        if (isAuthError(err)) {
          throw err;
        }
        break;
      }
    }

    if (i < GATEWAY_MODELS.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 450));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Não foi possível conectar ao Vercel AI Gateway.');
}

async function generateWithConfiguredAi(params: {
  geminiKey: string;
  gatewayToken: string;
  systemInstruction: string;
  gatewaySystemPrompt: string;
  promptText: string;
  attachment: DukeChatAttachment | null;
  responseSchema?: Record<string, unknown>;
  expectJson: boolean;
  useWebSearch?: boolean;
  useUrlContext?: boolean;
  deepThinking?: boolean;
}): Promise<{ text: string; sources: DukeWebSource[] }> {
  const {
    geminiKey,
    gatewayToken,
    systemInstruction,
    gatewaySystemPrompt,
    promptText,
    attachment,
    responseSchema,
    expectJson,
    useWebSearch,
    useUrlContext,
    deepThinking,
  } = params;

  let text: string | undefined;
  let sources: DukeWebSource[] = [];
  let lastError: unknown = null;

  if (geminiKey) {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const contentsParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: promptText },
    ];

    if (
      attachment?.base64Data &&
      attachment.mimeType &&
      (attachment.mimeType.startsWith('image/') || attachment.mimeType === 'application/pdf')
    ) {
      contentsParts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.base64Data,
        },
      });
    }

    const builtInTools: Array<Record<string, unknown>> = [];
    if (!expectJson && useWebSearch) builtInTools.push({ googleSearch: {} });
    if (!expectJson && useUrlContext) builtInTools.push({ urlContext: {} });

    const attemptConfigs: Array<{ model: string; supportsThinking: boolean; useTools: boolean }> =
      builtInTools.length > 0
        ? [
            { model: 'gemini-4-hydrogen', supportsThinking: true, useTools: true },
            { model: 'gemini-2.5-flash', supportsThinking: false, useTools: true },
            { model: 'gemini-4-hydrogen', supportsThinking: true, useTools: false },
            { model: 'gemini-3.1-flash-lite', supportsThinking: false, useTools: false },
          ]
        : [
            { model: 'gemini-4-hydrogen', supportsThinking: true, useTools: false },
            { model: 'gemini-3.1-flash-lite', supportsThinking: false, useTools: false },
            { model: 'gemini-2.5-flash', supportsThinking: false, useTools: false },
          ];

    for (let i = 0; i < attemptConfigs.length; i += 1) {
      const attempt = attemptConfigs[i];
      try {
        const response = await ai.models.generateContent({
          model: attempt.model,
          contents: contentsParts,
          config: {
            systemInstruction,
            ...(expectJson ? { responseMimeType: 'application/json' } : {}),
            ...(responseSchema ? { responseSchema } : {}),
            ...(attempt.supportsThinking
              ? {
                  thinkingConfig: {
                    thinkingLevel: deepThinking ? ThinkingLevel.HIGH : ThinkingLevel.LOW,
                  },
                }
              : {}),
            ...(attempt.useTools && builtInTools.length > 0 ? { tools: builtInTools } : {}),
          },
        });
        if (response.text) {
          text = expectJson ? extractJsonObject(response.text) : response.text.trim();
          const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (Array.isArray(chunks)) {
            const seen = new Set<string>();
            sources = chunks
              .map((c) => {
                const web = (c as { web?: { uri?: string; title?: string } })?.web;
                if (!web?.uri || seen.has(web.uri)) return null;
                seen.add(web.uri);
                return {
                  uri: web.uri,
                  title: (web.title || web.uri).slice(0, 120),
                };
              })
              .filter((item): item is DukeWebSource => Boolean(item))
              .slice(0, 6);
          }
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(
          `[duke-ai] attempt ${attempt.model} (tools=${attempt.useTools}) failed:`,
          err instanceof Error ? err.message : String(err)
        );
        if (isAuthError(err)) {
          break;
        }
        if (i < attemptConfigs.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
      }
    }
  }

  if (!text && gatewayToken) {
    try {
      text = await runViaVercelAiGateway({
        token: gatewayToken,
        systemPrompt: gatewaySystemPrompt,
        promptText,
        attachment,
        expectJson,
      });
    } catch (err) {
      lastError = err;
    }
  }

  if (!text) {
    const friendlyMsg = lastError
      ? formatFriendlyAiError(lastError)
      : 'O Robô Duque não retornou conteúdo da IA. Tente enviar seu pedido novamente.';
    const err = new Error(friendlyMsg);
    (err as Error & { statusCode?: number }).statusCode = 503;
    throw err;
  }

  return { text, sources };
}

export async function runDukeEventChat(body: DukeChatRequestBody): Promise<DukeChatResult> {
  const { geminiKey, gatewayToken } = resolveAiCredentials();

  if (!geminiKey && !gatewayToken) {
    const err = new Error(
      'Nenhuma chave de IA configurada no servidor. Na Vercel, adicione GEMINI_API_KEY ou AI_GATEWAY_API_KEY em Settings → Environment Variables e faça um Redeploy.'
    );
    (err as Error & { statusCode?: number }).statusCode = 503;
    throw err;
  }

  const userMessage = typeof body.message === 'string' ? body.message.trim() : '';
  const attachment = body.attachment ?? null;
  if (!userMessage && !attachment) {
    const err = new Error('Digite ou envie uma foto/arquivo para o Robô Duque trabalhar.');
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  const hasImageAttachment = Boolean(
    attachment?.base64Data && attachment.mimeType?.startsWith('image/')
  );
  const resolvedMode = detectStudioMode(
    body.mode,
    userMessage,
    hasImageAttachment,
    Boolean(body.currentEvent)
  );

  const safeHistory = Array.isArray(body.history) ? body.history.slice(-10) : [];
  const historyBlock = safeHistory
    .map((m) => `${m.role === 'user' ? 'CLIENTE' : 'ROBO DUQUE'}: ${String(m.content || '').slice(0, 1200)}`)
    .join('\n');

  const attachmentTextNote = attachment
    ? attachment.textContent
      ? `=== CONTEÚDO DO ARQUIVO ANEXADO (${attachment.name}) ===\n${attachment.textContent.slice(0, 8000)}`
      : `=== ARQUIVO ANEXADO PELO CLIENTE ===\nNome: ${attachment.name} (${attachment.mimeType}).`
    : '';

  // MODE 1: FREE CHAT + LIVE GOOGLE SEARCH + URL READER + MULTIPLE OPTIONS
  if (resolvedMode === 'chat') {
    const hasUrlInMessage = /https?:\/\/[^\s]+/i.test(userMessage);
    // Search Google automatically by default unless explicitly disabled by user toggle
    const useWebSearch = body.webSearch !== false;
    const useUrlContext = hasUrlInMessage;

    const promptText = [
      historyBlock ? `=== HISTÓRICO DA CONVERSA ===\n${historyBlock}\n` : '',
      attachmentTextNote ? `${attachmentTextNote}\n` : '',
      '=== PEDIDO ATUAL DO CLIENTE ===',
      (userMessage || 'Analise o arquivo/foto anexado e ajude o cliente com várias opções práticas.').slice(0, 4000),
    ]
      .filter(Boolean)
      .join('\n');

    const { text: rawReplyText, sources } = await generateWithConfiguredAi({
      geminiKey,
      gatewayToken,
      systemInstruction: SYSTEM_INSTRUCTION_CHAT,
      gatewaySystemPrompt: SYSTEM_INSTRUCTION_CHAT,
      promptText,
      attachment,
      expectJson: false,
      useWebSearch,
      useUrlContext,
      deepThinking: Boolean(body.deepThinking),
    });

    const { cleanReply, quickOptions } = extractQuickOptionsFromChat(rawReplyText, userMessage);

    return {
      modeUsed: 'chat',
      reply: clampString(cleanReply, 'Pronto! Veja as opções preparadas para você acima.', 12000),
      shouldPublish: false,
      sources: sources.length > 0 ? sources : undefined,
      quickOptions,
    };
  }

  // MODE 2: AI MODERN PHOTO STUDIO (3 DISTINCT MODERN OPTIONS WITH BACKDROPS & SMART BORDERS)
  if (resolvedMode === 'image') {
    const promptText = [
      hasImageAttachment
        ? '=== MODO: TRANSFORMAR FOTO EM 3 OPÇÕES MODERNAS COM FUNDO ATRÁS DA FOTO + BORDAS INTELIGENTES ===\nAnalise visualmente a foto anexada. Crie 3 opções visuais distintas e modernas (modern_backdrop, glass_showcase e luxury_frame) com fundos modernos atrás da foto, bordas bonitas e design inteligente, escrevendo exatamente o texto solicitado se o cliente pediu texto.'
        : '=== MODO: CRIAR 3 OPÇÕES MODERNAS DE ARTE / IMAGEM HD ===\nCrie 3 opções visuais modernas, elegantes e distintas em alta resolução com fundos de estúdio, bordas inteligentes e tipografia forte.',
      '',
      historyBlock ? `=== HISTÓRICO RECENTE ===\n${historyBlock}\n` : '',
      attachmentTextNote ? `${attachmentTextNote}\n` : '',
      '=== PEDIDO VISUAL DO CLIENTE ===',
      (
        userMessage ||
        (hasImageAttachment
          ? 'Deixe esta foto bem moderna com fundo inteligente atrás da foto, bordas bonitas e 3 opções de estilo para escolher.'
          : 'Crie 3 opções modernas de arte oficial CONAE profissional em alta definição.')
      ).slice(0, 2500),
    ]
      .filter(Boolean)
      .join('\n');

    const { text: rawJson } = await generateWithConfiguredAi({
      geminiKey,
      gatewayToken,
      systemInstruction: SYSTEM_INSTRUCTION_IMAGE,
      gatewaySystemPrompt: `${SYSTEM_INSTRUCTION_IMAGE}\n${GATEWAY_IMAGE_JSON_CONTRACT}`,
      promptText,
      attachment,
      responseSchema: DUKE_IMAGE_RESPONSE_SCHEMA,
      expectJson: true,
      deepThinking: Boolean(body.deepThinking),
    });

    let parsed: { reply?: unknown; imageDesign?: unknown; imageVariants?: unknown };
    try {
      parsed = JSON.parse(rawJson) as {
        reply?: unknown;
        imageDesign?: unknown;
        imageVariants?: unknown;
      };
    } catch {
      const err = new Error('Não foi possível montar os parâmetros visuais da imagem. Tente reformular seu pedido.');
      (err as Error & { statusCode?: number }).statusCode = 502;
      throw err;
    }

    const primaryDesign = sanitizeImageDesignSpec(parsed.imageDesign, hasImageAttachment);
    const imageVariants = ensureThreeModernImageVariants(
      primaryDesign,
      parsed.imageVariants,
      hasImageAttachment
    );
    const imageDesign = imageVariants[0];

    const reply = clampString(
      parsed.reply,
      hasImageAttachment
        ? `Pronto! Preparei **3 opções modernas** para sua foto com fundos estilizados atrás da imagem e bordas inteligentes! Toque em cada opção abaixo para comparar, baixar em PNG HD ou editar texto e filtros ao vivo.`
        : `Pronto! Criei **3 opções modernas** da arte "${imageDesign.title}" em alta definição! Toque em qualquer opção abaixo para escolher, baixar em PNG HD ou ajustar ao vivo.`,
      2500
    );

    const imageQuickOptions: DukeQuickOption[] = [
      {
        label: 'Mais 3 Fundos Modernos',
        prompt: 'Gere mais 3 opções com fundos modernos diferentes (Azul Safira, Dourado Imperial e Neon Futurista) e bordas elegantes mantendo minha foto.',
        mode: 'image',
      },
      {
        label: 'Estilo Vidro + Luxo',
        prompt: 'Crie 3 opções com efeito vidro fosco moderno, fundo degradê iluminado atrás da foto e bordas douradas chanfradas.',
        mode: 'image',
      },
      {
        label: 'Formato Stories 9:16',
        prompt: 'Adapte esta foto para 3 opções verticais formato Stories 9:16 com fundo moderno atrás e bordas bonitas.',
        mode: 'image',
      },
      {
        label: 'Escrever Frase na Foto',
        prompt: 'Escreva um título de destaque elegante sobre esta foto mantendo o fundo moderno e as bordas bonitas.',
        mode: 'image',
      },
    ];

    return {
      modeUsed: 'image',
      reply,
      shouldPublish: false,
      imageDesign,
      imageVariants,
      quickOptions: imageQuickOptions,
    };
  }

  // MODE 3: FULL EVENT BUILDER + FIXED LINK
  const safeCurrentEvent = body.currentEvent
    ? { ...body.currentEvent, bannerImageUrl: body.currentEvent.bannerImageUrl ? '[IMAGEM_CAPA_ATIVA]' : undefined }
    : null;

  const currentEventJson = safeCurrentEvent
    ? JSON.stringify(safeCurrentEvent, null, 2)
    : 'Nenhum projeto criado ainda (crie o projeto completo do zero conforme o pedido do cliente).';

  const promptText = [
    '=== ESTADO ATUAL DO PROJETO ===',
    currentEventJson,
    '',
    historyBlock ? `=== HISTÓRICO RECENTE ===\n${historyBlock}\n` : '',
    attachmentTextNote ? `${attachmentTextNote}\n` : '',
    '=== NOVO PEDIDO DO CLIENTE ===',
    (userMessage || 'Use o arquivo/foto anexado para montar toda a página completa de divulgação do evento.').slice(
      0,
      2500
    ),
  ]
    .filter(Boolean)
    .join('\n');

  const { text: rawJson } = await generateWithConfiguredAi({
    geminiKey,
    gatewayToken,
    systemInstruction: SYSTEM_INSTRUCTION_EVENT,
    gatewaySystemPrompt: `${SYSTEM_INSTRUCTION_EVENT}\n${GATEWAY_EVENT_JSON_CONTRACT}`,
    promptText,
    attachment,
    responseSchema: DUKE_EVENT_RESPONSE_SCHEMA,
    expectJson: true,
    deepThinking: Boolean(body.deepThinking),
  });

  let parsed: { reply?: unknown; shouldPublish?: unknown; event?: unknown };
  try {
    parsed = JSON.parse(rawJson) as { reply?: unknown; shouldPublish?: unknown; event?: unknown };
  } catch {
    const err = new Error('Resposta estruturada inválida recebida da IA. Tente reformular seu pedido.');
    (err as Error & { statusCode?: number }).statusCode = 502;
    throw err;
  }

  const sanitizedEvent = sanitizeEventSpec(parsed.event, body.currentEvent);
  if (body.currentEvent?.bannerImageUrl) {
    sanitizedEvent.bannerImageUrl = body.currentEvent.bannerImageUrl;
  }
  const reply = clampString(
    parsed.reply,
    `Pronto! Construí "${sanitizedEvent.title}" com os painéis e programação solicitados!`,
    2500
  );

  return {
    modeUsed: 'event',
    reply,
    shouldPublish: Boolean(parsed.shouldPublish),
    event: sanitizedEvent,
    quickOptions: [
      {
        label: 'Publicar & Gerar Link Oficial',
        prompt: 'Publique este evento agora e gere o link fixo oficial.',
        mode: 'event',
      },
      {
        label: 'Criar 3 Cartazes p/ Este Evento',
        prompt: `Crie 3 opções modernas de cartaz oficial em alta definição para divulgar "${sanitizedEvent.title}" com fundo elegante e bordas douradas.`,
        mode: 'image',
      },
      {
        label: '3 Textos de Convite WhatsApp',
        prompt: `Escreva 3 opções de convite impactante para WhatsApp divulgando "${sanitizedEvent.title}".`,
        mode: 'chat',
      },
    ],
  };
}

interface VercelRequestLike {
  method?: string;
  body?: unknown;
}

interface VercelResponseLike {
  status: (code: number) => VercelResponseLike;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const { geminiKey, gatewayToken } = resolveAiCredentials();
    res.status(200).json({
      ok: true,
      service: 'conae-duque-evento',
      aiConfigured: Boolean(geminiKey || gatewayToken),
      modes: ['auto', 'chat', 'image', 'event'],
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    const rawBody =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as DukeChatRequestBody)
        : ((req.body || {}) as DukeChatRequestBody);
    const result = await runDukeEventChat(rawBody);
    res.status(200).json(result);
  } catch (err) {
    const statusCode =
      err && typeof err === 'object' && 'statusCode' in err && typeof err.statusCode === 'number'
        ? err.statusCode
        : 500;
    const message =
      err instanceof Error
        ? err.message
        : 'Erro interno ao consultar a Inteligência Artificial do Robô Duque.';
    res.status(statusCode).json({ error: message });
  }
}
