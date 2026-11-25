import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

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
  history?: DukeChatHistoryItem[];
  currentEvent?: Partial<DukeEventSpec> | null;
  attachment?: DukeChatAttachment | null;
}

export interface DukeChatResult {
  reply: string;
  shouldPublish: boolean;
  event: DukeEventSpec;
}

const VALID_THEMES: ReadonlySet<DukeEventTheme> = new Set([
  'emerald_gold',
  'royal_blue',
  'crimson_gold',
  'midnight_violet',
  'ivory_gold',
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
      'Uma experiência inesquecível projetada pelo Robô Duque Evento.',
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

const DUKE_EVENT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description:
        'Resposta amigável, direta e profissional em português do Robô Duque Evento explicando o que foi criado ou atualizado nos painéis, programação, preletores e ingressos.',
    },
    shouldPublish: {
      type: Type.BOOLEAN,
      description:
        'Defina como true APENAS quando o usuário pedir explicitamente para publicar, finalizar, salvar no banco ou gerar o link oficial do evento.',
    },
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

const SYSTEM_INSTRUCTION = `Você é o **ConaeDuque**, o robô 3D oficial com Inteligência Artificial da CONAE, pronto para servir todos os clientes, pastores, empresários e afiliados da CONAE.
Sua missão é conversar de forma natural, calorosa, ágil e objetiva (em Português do Brasil) e **construir em tempo real tudo o que a pessoa pedir** — seja um evento, congresso ministerial, convenção empresarial, culto especial, feira, workshop, lançamento, página de divulgação, convite VIP, catálogo de programação, curso ou campanha promocional — deixando tudo pronto para gerar o link fixo oficial.

Regras obrigatórias:
1. Sempre devolva o objeto "event" COMPLETO e atualizado preservando o que já foi combinado antes e aplicando exatamente tudo o que o cliente pediu na última mensagem.
2. Adapte os painéis (panels: 3 a 6 painéis sob medida), a programação/etapas (schedule: 4 a 8 horários ou fases), os destaques/convidados/equipe (speakers: 2 a 6 pessoas), indicadores (metrics: 3 a 4 números fortes), diferenciais (highlights: 3 a 5 tópicos) e opções de ingresso/planos/inscrição (tickets: 2 a 3 opções) para atender exatamente ao pedido do cliente.
3. Escolha a paleta de tema ("theme") mais adequada ao estilo solicitado:
   - "emerald_gold": padrão oficial CONAE, convenções, congressos, gala e liderança.
   - "royal_blue": negócios, empresas, tecnologia, seminários e feiras.
   - "crimson_gold": conferências de avivamento, música, grandes encontros e campanhas marcantes.
   - "midnight_violet": festivais, juventude, inovação e eventos noturnos.
   - "ivory_gold": cerimônias solenes, casamentos, jantares e formaturas.
4. Gere um "slug" curto e limpo em minúsculas com hífens (sem acentos, sem espaços), pronto para formar o link fixo /evento/{slug}.
5. Defina "shouldPublish": true quando o cliente pedir para publicar, finalizar, salvar ou gerar o link oficial (por exemplo: "publica", "gera o link", "pode gerar o link", "finaliza", "me dá o link"). Caso contrário, mantenha "shouldPublish": false e informe de forma simpática que quando estiver do jeito desejado basta pedir "gera o link" ou clicar em Gerar Link do Evento.
6. Nunca use HTML ou Markdown quebrado nos campos do objeto "event". Escreva em português claro, elegante e pronto para divulgação.`;

const VERCEL_AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const GATEWAY_MODELS = ['google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite'] as const;

const GATEWAY_JSON_CONTRACT = `
Responda EXCLUSIVAMENTE com um objeto JSON válido (sem texto antes ou depois, sem blocos markdown) contendo exatamente as chaves:
{
  "reply": "string",
  "shouldPublish": false,
  "event": {
    "slug": "string-com-hifens",
    "title": "string",
    "subtitle": "string",
    "category": "string",
    "tagline": "string",
    "dateLabel": "string",
    "timeLabel": "string",
    "venueName": "string",
    "city": "string",
    "state": "UF",
    "theme": "emerald_gold | royal_blue | crimson_gold | midnight_violet | ivory_gold",
    "organizerName": "string",
    "whatsappPhone": "string",
    "registrationCta": "string",
    "heroSummary": "string",
    "highlights": ["string"],
    "metrics": [{"label": "string", "value": "string"}],
    "panels": [{"title": "string", "subtitle": "string", "description": "string", "badge": "string"}],
    "schedule": [{"time": "string", "title": "string", "speaker": "string", "stage": "string", "description": "string"}],
    "speakers": [{"name": "string", "role": "string", "topic": "string"}],
    "tickets": [{"name": "string", "priceLabel": "string", "perks": "string", "highlighted": false}]
  }
}`;

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
    return 'Os servidores da Inteligência Artificial tiveram um pico momentâneo de acesso. Envie novamente em alguns segundos que o ConaeDuque já responde.';
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
  promptText: string;
  attachment: DukeChatAttachment | null;
}): Promise<string> {
  const { token, promptText, attachment } = params;
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
    const useJsonModeOptions = [true, false];

    for (const useJsonMode of useJsonModeOptions) {
      try {
        const payload: Record<string, unknown> = {
          model,
          messages: [
            { role: 'system', content: `${SYSTEM_INSTRUCTION}\n${GATEWAY_JSON_CONTRACT}` },
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
          return extractJsonObject(text);
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
    const err = new Error('Digite ou envie uma foto/arquivo para o ConaeDuque construir seu projeto.');
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  const safeHistory = Array.isArray(body.history) ? body.history.slice(-10) : [];
  const historyBlock = safeHistory
    .map((m) => `${m.role === 'user' ? 'CLIENTE' : 'CONAEDUQUE'}: ${String(m.content || '').slice(0, 1200)}`)
    .join('\n');

  const safeCurrentEvent = body.currentEvent
    ? { ...body.currentEvent, bannerImageUrl: body.currentEvent.bannerImageUrl ? '[IMAGEM_CAPA_ATIVA]' : undefined }
    : null;

  const currentEventJson = safeCurrentEvent
    ? JSON.stringify(safeCurrentEvent, null, 2)
    : 'Nenhum projeto criado ainda (crie o projeto completo do zero conforme o pedido do cliente).';

  const attachmentTextNote = attachment
    ? attachment.textContent
      ? `=== CONTEÚDO DO ARQUIVO ANEXADO (${attachment.name}) ===\n${attachment.textContent.slice(0, 8000)}`
      : `=== ARQUIVO ANEXADO PELO CLIENTE ===\nNome: ${attachment.name} (${attachment.mimeType}). Analise visualmente/integralmente este anexo e extraia títulos, datas, locais, horários, preletores, cores e detalhes para montar a página do evento!`
    : '';

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
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: DUKE_EVENT_RESPONSE_SCHEMA,
            ...(attempt.lowThinking
              ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
              : {}),
          },
        });
        if (response.text) {
          text = extractJsonObject(response.text);
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
        promptText,
        attachment,
      });
    } catch (err) {
      lastError = err;
    }
  }

  if (!text) {
    const friendlyMsg = lastError
      ? formatFriendlyAiError(lastError)
      : 'O ConaeDuque não retornou conteúdo da IA. Tente enviar seu pedido novamente.';
    const err = new Error(friendlyMsg);
    (err as Error & { statusCode?: number }).statusCode = 503;
    throw err;
  }

  let parsed: { reply?: unknown; shouldPublish?: unknown; event?: unknown };
  try {
    parsed = JSON.parse(text) as { reply?: unknown; shouldPublish?: unknown; event?: unknown };
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
        : 'Erro interno ao consultar a Inteligência Artificial do Robô Duque Evento.';
    res.status(statusCode).json({ error: message });
  }
}
