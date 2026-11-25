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
  | 'full_bleed'
  | 'cinematic_bottom'
  | 'editorial_card'
  | 'framed_poster'
  | 'split_hero';
export type DukeImageFrameStyle = 'none' | 'gold_double' | 'minimal_white' | 'neon_glow';
export type DukeImageMotif = 'rays' | 'grid' | 'waves' | 'orbs' | 'rings' | 'emblem';

export interface DukeImageDesignSpec {
  mode: 'create' | 'reformulate';
  title: string;
  aspectRatio: DukeImageAspectRatio;
  layout: DukeImageLayout;
  frameStyle: DukeImageFrameStyle;
  decorativeMotif: DukeImageMotif;
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
  const layoutRaw = typeof obj.layout === 'string' ? obj.layout.trim() : 'cinematic_bottom';
  const frameRaw = typeof obj.frameStyle === 'string' ? obj.frameStyle.trim() : 'gold_double';
  const motifRaw = typeof obj.decorativeMotif === 'string' ? obj.decorativeMotif.trim() : 'orbs';
  const emblemRaw = typeof obj.emblemType === 'string' ? obj.emblemType.trim() : 'spark';

  return {
    mode: hasPhoto ? 'reformulate' : 'create',
    title: clampString(obj.title, hasPhoto ? 'Imagem Reformulada' : 'Arte Criada pelo ConaeDuque', 90),
    aspectRatio: VALID_ASPECTS.has(aspectRaw as DukeImageAspectRatio)
      ? (aspectRaw as DukeImageAspectRatio)
      : '1:1',
    layout: VALID_LAYOUTS.has(layoutRaw as DukeImageLayout)
      ? (layoutRaw as DukeImageLayout)
      : hasPhoto
        ? 'cinematic_bottom'
        : 'full_bleed',
    frameStyle: VALID_FRAMES.has(frameRaw as DukeImageFrameStyle)
      ? (frameRaw as DukeImageFrameStyle)
      : 'gold_double',
    decorativeMotif: VALID_MOTIFS.has(motifRaw as DukeImageMotif)
      ? (motifRaw as DukeImageMotif)
      : 'orbs',
    bgStart: safeHex(obj.bgStart, '#04140d'),
    bgMid: safeHex(obj.bgMid, '#0a2d1e'),
    bgEnd: safeHex(obj.bgEnd, '#030a07'),
    accentColor: safeHex(obj.accentColor, '#f59e0b'),
    textPrimary: safeHex(obj.textPrimary, '#ffffff'),
    textMuted: safeHex(obj.textMuted, '#d1fae5'),
    badgeText: typeof obj.badgeText === 'string' ? obj.badgeText.trim().slice(0, 48) : '',
    headline: typeof obj.headline === 'string' ? obj.headline.trim().slice(0, 90) : '',
    subheadline: typeof obj.subheadline === 'string' ? obj.subheadline.trim().slice(0, 140) : '',
    footerText: typeof obj.footerText === 'string' ? obj.footerText.trim().slice(0, 84) : '',
    ctaText: typeof obj.ctaText === 'string' ? obj.ctaText.trim().slice(0, 40) : '',
    brightness: clampNum(obj.brightness, 1.06, 0.65, 1.5),
    contrast: clampNum(obj.contrast, 1.14, 0.75, 1.6),
    saturate: clampNum(obj.saturate, 1.16, 0, 1.9),
    sepia: clampNum(obj.sepia, 0, 0, 0.65),
    hueRotate: clampNum(obj.hueRotate, 0, -45, 45),
    vignette: clampNum(obj.vignette, 0.52, 0, 0.9),
    tintColor: safeHex(obj.tintColor, '#f59e0b'),
    tintOpacity: clampNum(obj.tintOpacity, 0.14, 0, 0.55),
    emblemType: VALID_EMBLEMS.has(emblemRaw)
      ? (emblemRaw as DukeImageDesignSpec['emblemType'])
      : 'spark',
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

  // Explicit image creation / photo reformulation intents
  const imageRegex =
    /\b(imagem|imagens|foto|banner|cartaz|flyer|poster|arte|logotipo|logo|capa|stories|story|post para|card visual|reformula|reformular|reformule|edita|editar|edite|melhora|melhorar|transforma|transformar|retoca|retocar|filtro|moldura|miniatura|thumbnail)\b/;
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

const DUKE_IMAGE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description:
        'Explicação calorosa e objetiva em português do que foi criado ou reformulado na imagem (cores, iluminação, enquadramento, textos e estilo visual).',
    },
    imageDesign: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        aspectRatio: { type: Type.STRING, enum: ['1:1', '16:9', '9:16', '4:5'] },
        layout: {
          type: Type.STRING,
          enum: ['full_bleed', 'cinematic_bottom', 'editorial_card', 'framed_poster', 'split_hero'],
        },
        frameStyle: {
          type: Type.STRING,
          enum: ['none', 'gold_double', 'minimal_white', 'neon_glow'],
        },
        decorativeMotif: {
          type: Type.STRING,
          enum: ['rays', 'grid', 'waves', 'orbs', 'rings', 'emblem'],
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
    },
  },
  required: ['reply', 'imageDesign'],
};

const SYSTEM_INSTRUCTION_CHAT = `Você é o **Robô Duque (ConaeDuque)**, um assistente completo de Inteligência Artificial no estilo ChatGPT, pronto para servir todos os clientes, pastores, líderes, empresários e afiliados da CONAE.

Suas capacidades no modo Chat Livre & Código:
1. **Criação de Textos Profissionais:** redija mensagens de WhatsApp, legendas de Instagram, cartas oficiais, convites, sermões, esboços de pregação, roteiros de vídeo, campanhas de divulgação, contratos simples, resumos e traduções em Português do Brasil impecável.
2. **Programação e Códigos Completos:** quando o cliente pedir qualquer código (HTML, CSS, JavaScript, TypeScript, React, Python, SQL, automações, páginas web), entregue o código completo, limpo e pronto para copiar dentro de blocos markdown (\`\`\`html, \`\`\`tsx, \`\`\`python etc.) com explicação clara de como usar.
3. **Leitura de Fotos e Documentos Anexados:** quando o cliente enviar uma imagem, PDF ou texto, analise o conteúdo com atenção e responda exatamente ao que foi pedido.
4. **Proatividade Inteligente:** responda de forma calorosa, direta, bem organizada (com tópicos claros e negrito onde ajudar) e, quando fizer sentido, lembre que você também pode **criar/reformular artes e imagens** ou **montar um evento completo com link fixo** se a pessoa pedir.`;

const SYSTEM_INSTRUCTION_EVENT = `Você é o **Robô Duque (ConaeDuque)**, o robô oficial com Inteligência Artificial da CONAE, pronto para servir todos os clientes, pastores, empresários e afiliados da CONAE.
Sua missão neste modo é construir em tempo real páginas de eventos, congressos, convenções, cultos, workshops, feiras e campanhas prontas para gerar link fixo oficial.

Regras obrigatórias:
1. Sempre devolva o objeto "event" COMPLETO e atualizado preservando o que já foi combinado antes e aplicando exatamente tudo o que o cliente pediu.
2. Adapte os painéis (3 a 6), a programação (4 a 8 horários), preletores/convidados (2 a 6), métricas (3 a 4), destaques (3 a 5) e ingressos/inscrições (2 a 3).
3. Escolha o tema ("theme") mais adequado: emerald_gold, royal_blue, crimson_gold, midnight_violet ou ivory_gold.
4. Gere um "slug" curto e limpo em minúsculas com hífens para o link /evento/{slug}.
5. Defina "shouldPublish": true APENAS quando o cliente pedir explicitamente para publicar, salvar ou gerar o link oficial.
6. Nunca use HTML ou Markdown quebrado nos campos do objeto "event".`;

const SYSTEM_INSTRUCTION_IMAGE = `Você é o **Diretor Criativo & Estúdio de Imagem IA do Robô Duque (ConaeDuque)**!
Sua missão é projetar artes gráficas profissionais em alta resolução OU reformular/transformar fotos enviadas pelo cliente (aplicando tratamento cinematográfico de cor, contraste, brilho, saturação, vinheta, tonalidade, moldura, enquadramento e tipografia profissional).

Regras obrigatórias:
1. Sempre devolva cores em hexadecimal válido (#RRGGBB) harmoniosas e de alto contraste (ex: esmeralda #04140d + dourado #f59e0b, azul royal #06132b + ciano #38bdf8, rubi #1e050b + ouro #fbbf24, violeta #120826 + lilás #c084fc, luxo claro #fdfaf2 + dourado #b45309).
2. Escolha o "aspectRatio" conforme o pedido:
   - "9:16" para Stories, Reels, Status WhatsApp ou cartaz vertical.
   - "16:9" para capa de evento, banner horizontal, YouTube ou TV.
   - "4:5" para post vertical de feed Instagram.
   - "1:1" (padrão) para post quadrado, logotipo, selo ou convite.
3. Quando o cliente enviar uma FOTO para reformular:
   - Analise a foto visualmente e ajuste "brightness" (0.7-1.35), "contrast" (0.9-1.45), "saturate" (0.0 para P&B até 1.6 vibrante), "sepia" (0-0.5), "hueRotate" (-35 a 35), "vignette" (0.2-0.8), "tintColor" e "tintOpacity" (0-0.38).
   - Se o cliente pedir "sem texto" ou apenas tratamento de foto/cores, deixe "headline", "subheadline", "badgeText", "ctaText" e "footerText" vazios ("").
   - Se o cliente pedir cartaz, banner, convite ou arte com texto sobre a foto, preencha textos curtos e impactantes e escolha o melhor "layout" ("cinematic_bottom", "framed_poster", "editorial_card" ou "split_hero").
4. Quando o cliente pedir para CRIAR uma arte/banner/cartaz/convite do zero (sem foto anexada):
   - Preencha "headline", "subheadline", "badgeText", "ctaText" e "footerText" com textos fortes e curtos prontos para divulgação, escolha "decorativeMotif" e "emblemType" adequados ao tema.`;

const VERCEL_AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const GATEWAY_MODELS = ['google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite'] as const;

const GATEWAY_EVENT_JSON_CONTRACT = `
Responda EXCLUSIVAMENTE com um objeto JSON válido (sem texto extra) contendo:
{"reply":"string","shouldPublish":false,"event":{"slug":"string","title":"string","subtitle":"string","category":"string","tagline":"string","dateLabel":"string","timeLabel":"string","venueName":"string","city":"string","state":"UF","theme":"emerald_gold","organizerName":"string","whatsappPhone":"string","registrationCta":"string","heroSummary":"string","highlights":["string"],"metrics":[{"label":"string","value":"string"}],"panels":[{"title":"string","subtitle":"string","description":"string","badge":"string"}],"schedule":[{"time":"string","title":"string","speaker":"string","stage":"string","description":"string"}],"speakers":[{"name":"string","role":"string","topic":"string"}],"tickets":[{"name":"string","priceLabel":"string","perks":"string","highlighted":false}]}}`;

const GATEWAY_IMAGE_JSON_CONTRACT = `
Responda EXCLUSIVAMENTE com um objeto JSON válido (sem texto extra) contendo:
{"reply":"string","imageDesign":{"title":"string","aspectRatio":"1:1","layout":"cinematic_bottom","frameStyle":"gold_double","decorativeMotif":"orbs","bgStart":"#04140d","bgMid":"#0a2d1e","bgEnd":"#030a07","accentColor":"#f59e0b","textPrimary":"#ffffff","textMuted":"#d1fae5","badgeText":"","headline":"","subheadline":"","footerText":"","ctaText":"","brightness":1.08,"contrast":1.15,"saturate":1.15,"sepia":0,"hueRotate":0,"vignette":0.5,"tintColor":"#f59e0b","tintOpacity":0.14,"emblemType":"spark"}}`;

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
}): Promise<string> {
  const {
    geminiKey,
    gatewayToken,
    systemInstruction,
    gatewaySystemPrompt,
    promptText,
    attachment,
    responseSchema,
    expectJson,
  } = params;

  let text: string | undefined;
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

    const modelAttempts: Array<{ model: string; lowThinking: boolean }> = [
      { model: 'gemini-4-hydrogen', lowThinking: true },
      { model: 'gemini-3.1-flash-lite', lowThinking: false },
      { model: 'gemini-2.5-flash', lowThinking: false },
    ];

    for (let i = 0; i < modelAttempts.length; i += 1) {
      const attempt = modelAttempts[i];
      try {
        const response = await ai.models.generateContent({
          model: attempt.model,
          contents: contentsParts,
          config: {
            systemInstruction,
            ...(expectJson ? { responseMimeType: 'application/json' } : {}),
            ...(responseSchema ? { responseSchema } : {}),
            ...(attempt.lowThinking
              ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
              : {}),
          },
        });
        if (response.text) {
          text = expectJson ? extractJsonObject(response.text) : response.text.trim();
          break;
        }
      } catch (err) {
        lastError = err;
        if (isAuthError(err)) {
          break;
        }
        if (i < modelAttempts.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 400));
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

  return text;
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

  // MODE 1: FREE CHATGPT (TEXT + CODE + MULTIMODAL ANALYSIS)
  if (resolvedMode === 'chat') {
    const promptText = [
      historyBlock ? `=== HISTÓRICO DA CONVERSA ===\n${historyBlock}\n` : '',
      attachmentTextNote ? `${attachmentTextNote}\n` : '',
      '=== PEDIDO ATUAL DO CLIENTE ===',
      (userMessage || 'Analise o arquivo/foto anexado e ajude o cliente com clareza.').slice(0, 4000),
    ]
      .filter(Boolean)
      .join('\n');

    const replyText = await generateWithConfiguredAi({
      geminiKey,
      gatewayToken,
      systemInstruction: SYSTEM_INSTRUCTION_CHAT,
      gatewaySystemPrompt: SYSTEM_INSTRUCTION_CHAT,
      promptText,
      attachment,
      expectJson: false,
    });

    return {
      modeUsed: 'chat',
      reply: clampString(replyText, 'Pronto! Como posso continuar te ajudando?', 12000),
      shouldPublish: false,
    };
  }

  // MODE 2: AI IMAGE CREATION & PHOTO REFORMULATION STUDIO
  if (resolvedMode === 'image') {
    const promptText = [
      hasImageAttachment
        ? '=== MODO: REFORMULAR FOTO ENVIADA PELO CLIENTE ===\nAnalise visualmente a foto anexada e gere um projeto completo de reformulação visual (cor, iluminação, enquadramento, moldura e textos se solicitados).'
        : '=== MODO: CRIAR ARTE / IMAGEM DO ZERO ===\nCrie uma arte visual profissional em alta resolução com cores, emblema, moldura e tipografia exatamente como o cliente pediu.',
      '',
      historyBlock ? `=== HISTÓRICO RECENTE ===\n${historyBlock}\n` : '',
      attachmentTextNote ? `${attachmentTextNote}\n` : '',
      '=== PEDIDO VISUAL DO CLIENTE ===',
      (
        userMessage ||
        (hasImageAttachment
          ? 'Reformule esta imagem com acabamento profissional de estúdio, iluminação valorizada, contraste equilibrado e moldura elegante.'
          : 'Crie uma arte oficial CONAE profissional em verde esmeralda e dourado.')
      ).slice(0, 2500),
    ]
      .filter(Boolean)
      .join('\n');

    const rawJson = await generateWithConfiguredAi({
      geminiKey,
      gatewayToken,
      systemInstruction: SYSTEM_INSTRUCTION_IMAGE,
      gatewaySystemPrompt: `${SYSTEM_INSTRUCTION_IMAGE}\n${GATEWAY_IMAGE_JSON_CONTRACT}`,
      promptText,
      attachment,
      responseSchema: DUKE_IMAGE_RESPONSE_SCHEMA,
      expectJson: true,
    });

    let parsed: { reply?: unknown; imageDesign?: unknown };
    try {
      parsed = JSON.parse(rawJson) as { reply?: unknown; imageDesign?: unknown };
    } catch {
      const err = new Error('Não foi possível montar os parâmetros visuais da imagem. Tente reformular seu pedido.');
      (err as Error & { statusCode?: number }).statusCode = 502;
      throw err;
    }

    const imageDesign = sanitizeImageDesignSpec(parsed.imageDesign, hasImageAttachment);
    const reply = clampString(
      parsed.reply,
      hasImageAttachment
        ? `Pronto! Reformulei sua imagem no estilo "${imageDesign.title}". Você pode comparar Antes/Depois, baixar em PNG HD ou pedir novos ajustes!`
        : `Pronto! Criei a arte "${imageDesign.title}" em alta resolução. Você pode baixar em PNG HD, usar como capa de evento ou pedir mudanças nas cores e textos!`,
      2500
    );

    return {
      modeUsed: 'image',
      reply,
      shouldPublish: false,
      imageDesign,
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

  const rawJson = await generateWithConfiguredAi({
    geminiKey,
    gatewayToken,
    systemInstruction: SYSTEM_INSTRUCTION_EVENT,
    gatewaySystemPrompt: `${SYSTEM_INSTRUCTION_EVENT}\n${GATEWAY_EVENT_JSON_CONTRACT}`,
    promptText,
    attachment,
    responseSchema: DUKE_EVENT_RESPONSE_SCHEMA,
    expectJson: true,
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
