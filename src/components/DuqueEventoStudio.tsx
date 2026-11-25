import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUp,
  Brain,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
  Globe,
  Image as ImageIcon,
  ImagePlus,
  Link2,
  Loader2,
  LogIn,
  MessageCircle,
  MessageSquareText,
  Mic,
  MicOff,
  Palette,
  Paperclip,
  Plus,
  QrCode,
  RefreshCw,
  Rocket,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Type as TypeIcon,
  User as UserIcon,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../firebase';
import type {
  DukeChatMessage,
  DukeEventRecord,
  DukeEventSpec,
  DukeEventTheme,
  DukeGeneratedAsset,
  DukeImageAspectRatio,
  DukeImageDesignSpec,
  DukeImageFrameStyle,
  DukeStudioMode,
  DukeWebSource,
  UserProfile,
} from '../types';
import { compressDataUrlForFirestoreBanner, renderDukeImageStudio } from '../utils/dukeImageStudio';
import { DukeRichMessage } from './DukeRichMessage';
import { buildStandaloneEventHtml, PublicEventPage } from './PublicEventPage';

interface DuqueEventoStudioProps {
  firebaseUser: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  onGoogleLogin: () => Promise<void>;
  onBackToConae: () => void;
  onOpenPublishedEvent: (slug: string) => void;
}

const CONAE_DUQUE_ROBOT_3D = '/src/assets/images/conae_duque_robot_3d_1795637461401.jpg';
const CONAE_AI_BRAIN_3D = '/src/assets/images/conae_ai_brain_3d_1795638395875.jpg';

const STARTER_PROMPTS: Array<{ label: string; mode: DukeStudioMode; prompt: string }> = [
  {
    label: 'Criar Arte / Escrever na Foto HD',
    mode: 'image',
    prompt:
      'Crie um cartaz oficial elegante em verde esmeralda e dourado para o Grande Congresso CONAE 2026 em Goiânia, formato quadrado 1:1, com selo VIP e chamada para inscrição.',
  },
  {
    label: 'Escrever Texto & Legenda Profissional',
    mode: 'chat',
    prompt:
      'Escreva um texto impactante de divulgação para WhatsApp e Instagram convidando pastores, líderes e empresários para o nosso próximo encontro oficial da CONAE.',
  },
  {
    label: 'Gerar Código com Prévia Ao Vivo',
    mode: 'chat',
    prompt:
      'Gere um código HTML + CSS completo de um cartão de convite digital elegante em verde escuro e dourado com botão de confirmação no WhatsApp.',
  },
  {
    label: 'Montar Evento & Gerar Link Fixo',
    mode: 'event',
    prompt:
      'Monte um Congresso Ministerial Nacional com 3 dias de programação, 4 painéis principais, preletores confirmados e ingressos Gratuito e VIP em Goiânia-GO.',
  },
];

const MODE_OPTIONS: Array<{ id: DukeStudioMode; label: string }> = [
  { id: 'auto', label: 'Automático' },
  { id: 'chat', label: 'Texto & Código' },
  { id: 'image', label: 'Foto & Arte' },
  { id: 'event', label: 'Evento & Link' },
];

const IMAGE_QUICK_REFORMULATIONS = [
  { label: 'Ouro CONAE', prompt: 'Reformule esta imagem no estilo oficial CONAE verde esmeralda e dourado com moldura dupla dourada e contraste cinematográfico.' },
  { label: 'Stories 9:16', prompt: 'Reformule esta imagem para o formato vertical Stories 9:16 com iluminação profissional e acabamento limpo.' },
  { label: 'Capa 16:9', prompt: 'Reformule esta imagem para capa horizontal 16:9 em alta definição com vinheta suave e cores vibrantes.' },
  { label: 'Só Foto (Sem Texto)', prompt: 'Reformule apenas a fotografia melhorando brilho, nitidez, contraste cinematográfico e cores vivas, sem colocar nenhum texto sobre a imagem.' },
];

const THEME_OPTIONS: { id: DukeEventTheme; label: string; dot: string }[] = [
  { id: 'emerald_gold', label: 'Esmeralda & Ouro', dot: 'bg-amber-400' },
  { id: 'royal_blue', label: 'Azul Royal', dot: 'bg-sky-400' },
  { id: 'crimson_gold', label: 'Rubi & Ouro', dot: 'bg-rose-500' },
  { id: 'midnight_violet', label: 'Violeta Noite', dot: 'bg-violet-400' },
  { id: 'ivory_gold', label: 'Marfim & Ouro', dot: 'bg-amber-700' },
];

function sanitizeSlug(raw: string): string {
  const cleaned = (raw || 'evento-duque')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return cleaned.length >= 3 ? cleaned : `evento-duque-${Date.now().toString(36)}`;
}

function buildPublicEventUrl(slug: string): string {
  if (typeof window === 'undefined') return `/evento/${slug}`;
  return `${window.location.origin}/evento/${slug}`;
}

interface StagedAttachment {
  name: string;
  mimeType: string;
  base64Data?: string;
  dataUrl?: string;
  textContent?: string;
  isImage: boolean;
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<{ 0?: { transcript?: string }; isFinal?: boolean }> }) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

async function compressImageDataUrl(file: File): Promise<{ dataUrl: string; base64Data: string }> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Formato de imagem inválido.'));
    el.src = rawDataUrl;
  });

  const maxW = 920;
  const maxH = 540;
  const scale = Math.min(1, maxW / img.width, maxH / img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const b64 = rawDataUrl.split(',')[1] || '';
    return { dataUrl: rawDataUrl.slice(0, 56000), base64Data: b64 };
  }
  ctx.drawImage(img, 0, 0, w, h);

  let quality = 0.82;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > 54000 && quality > 0.35) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  const base64Data = dataUrl.split(',')[1] || '';
  return { dataUrl, base64Data };
}

const WELCOME_MESSAGE: DukeChatMessage = {
  id: 'welcome_duke',
  role: 'assistant',
  createdAt: new Date().toISOString(),
  content:
    'Olá! Sou o **Robô Duque da CONAE**, seu estúdio completo de Inteligência Artificial. Posso **pesquisar na web ao vivo**, **pensar em profundidade**, escrever **textos e códigos com prévia ao vivo**, **escrever na sua foto e modificar imagens em tempo real**, e montar **eventos completos com link fixo**. Como posso te ajudar agora?',
};

export const DuqueEventoStudio: React.FC<DuqueEventoStudioProps> = ({
  firebaseUser,
  profile,
  isAdmin,
  onGoogleLogin,
  onBackToConae,
  onOpenPublishedEvent,
}) => {
  const [messages, setMessages] = useState<DukeChatMessage[]>([WELCOME_MESSAGE]);

  const [studioMode, setStudioMode] = useState<DukeStudioMode>('auto');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [deepThinkingEnabled, setDeepThinkingEnabled] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [currentEvent, setCurrentEvent] = useState<DukeEventSpec | null>(null);
  const [customSlug, setCustomSlug] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedRecord, setPublishedRecord] = useState<{ slug: string; url: string } | null>(null);
  const [pendingPublishAfterLogin, setPendingPublishAfterLogin] = useState(false);

  const [generatedImages, setGeneratedImages] = useState<DukeGeneratedAsset[]>([]);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [showOriginalCompare, setShowOriginalCompare] = useState(false);
  const [updatingLiveImage, setUpdatingLiveImage] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [appliedBannerId, setAppliedBannerId] = useState<string | null>(null);

  const [myEvents, setMyEvents] = useState<DukeEventRecord[]>([]);
  const [rightTab, setRightTab] = useState<'preview' | 'image' | 'publish' | 'saved'>('preview');
  const [mobilePane, setMobilePane] = useState<'chat' | 'workspace'>('chat');
  const [copiedLink, setCopiedLink] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const [stagedAttachment, setStagedAttachment] = useState<StagedAttachment | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const activeImageAsset = useMemo(
    () => generatedImages.find((img) => img.id === activeImageId) || generatedImages[0] || null,
    [generatedImages, activeImageId]
  );

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const liveRenderSeqRef = useRef(0);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore cleanup
      }
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // ignore cleanup
      }
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Listen to authenticated user's own published events in Firestore
  useEffect(() => {
    if (!firebaseUser) {
      setMyEvents([]);
      return;
    }

    const q = isAdmin
      ? query(collection(db, 'duke_events'))
      : query(collection(db, 'duke_events'), where('ownerUid', '==', firebaseUser.uid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as DukeEventRecord)
          .sort((a, b) => String(b.slug || '').localeCompare(String(a.slug || '')));
        setMyEvents(list);
      },
      (err) => {
        console.warn('[duke_events] snapshot error:', err.message);
      }
    );

    return () => unsub();
  }, [firebaseUser, isAdmin]);

  const activeOrigin = useMemo(() => {
    if (typeof window === 'undefined') return 'https://seu-dominio.vercel.app';
    return window.location.origin;
  }, []);

  const persistEventToFirestore = async (
    spec: DukeEventSpec,
    preferredSlug?: string
  ): Promise<{ slug: string; url: string } | null> => {
    if (!firebaseUser) {
      setPendingPublishAfterLogin(true);
      setRightTab('publish');
      setPublishError(
        'Entre com sua conta Google abaixo para salvar este evento no banco Firebase e gerar o link fixo oficial.'
      );
      return null;
    }

    setPublishing(true);
    setPublishError(null);

    try {
      const baseSlug = sanitizeSlug(preferredSlug || customSlug || spec.slug || spec.title);
      const existingOwner = myEvents.find((ev) => ev.id === baseSlug);
      const finalSlug =
        existingOwner && existingOwner.ownerUid !== firebaseUser.uid
          ? sanitizeSlug(`${baseSlug}-${Date.now().toString(36).slice(-4)}`)
          : baseSlug;

      const safeOwnerName = (
        profile?.displayName ||
        firebaseUser.displayName ||
        firebaseUser.email?.split('@')[0] ||
        'Organizador CONAE'
      )
        .trim()
        .slice(0, 100);

      const docPayload = {
        id: finalSlug,
        slug: finalSlug,
        ownerUid: firebaseUser.uid,
        ownerName: safeOwnerName.length >= 2 ? safeOwnerName : 'Organizador CONAE',
        status: 'published' as const,
        title: (spec.title || 'Evento Duque').trim().slice(0, 140),
        subtitle: (spec.subtitle || '').trim().slice(0, 220),
        category: (spec.category || 'Evento').trim().slice(0, 80),
        tagline: (spec.tagline || '').trim().slice(0, 160),
        dateLabel: (spec.dateLabel || 'Data a definir').trim().slice(0, 80),
        timeLabel: (spec.timeLabel || '').trim().slice(0, 80),
        venueName: (spec.venueName || 'Local a definir').trim().slice(0, 160),
        city: (spec.city || 'Goiânia').trim().slice(0, 80),
        state: (spec.state || 'GO').trim().slice(0, 4).toUpperCase(),
        theme: spec.theme || 'emerald_gold',
        organizerName: (spec.organizerName || safeOwnerName).trim().slice(0, 120),
        whatsappPhone: (spec.whatsappPhone || '').trim().slice(0, 32),
        registrationCta: (spec.registrationCta || 'Garantir Minha Vaga').trim().slice(0, 80),
        heroSummary: (spec.heroSummary || spec.subtitle || 'Evento oficial projetado pelo Robô Duque Evento.')
          .trim()
          .slice(0, 600),
        highlights: (spec.highlights || []).slice(0, 8),
        metrics: (spec.metrics || []).slice(0, 6),
        panels: (spec.panels || []).slice(0, 8),
        schedule: (spec.schedule || []).slice(0, 16),
        speakers: (spec.speakers || []).slice(0, 10),
        tickets: (spec.tickets || []).slice(0, 6),
        ...(spec.bannerImageUrl && spec.bannerImageUrl.length <= 60000
          ? { bannerImageUrl: spec.bannerImageUrl }
          : {}),
        publishedOrigin: activeOrigin.slice(0, 200),
        createdAt: existingOwner?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'duke_events', finalSlug), docPayload);

      const url = buildPublicEventUrl(finalSlug);
      setCustomSlug(finalSlug);
      setPublishedRecord({ slug: finalSlug, url });
      setCurrentEvent({ ...spec, slug: finalSlug });
      setRightTab('publish');
      setPendingPublishAfterLogin(false);
      return { slug: finalSlug, url };
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao salvar no banco Firebase. Verifique sua conexão e tente novamente.';
      setPublishError(msg);
      return null;
    } finally {
      setPublishing(false);
    }
  };

  // If user just signed in to complete a pending publish, execute it automatically
  useEffect(() => {
    if (firebaseUser && pendingPublishAfterLogin && currentEvent && !publishing) {
      void persistEventToFirestore(currentEvent, customSlug).then((published) => {
        if (published) {
          setMessages((prev) => [
            ...prev,
            {
              id: `pub_${Date.now()}`,
              role: 'assistant',
              createdAt: new Date().toISOString(),
              content: `Evento publicado no banco Firebase com sucesso! Seu link fixo já está ativo e pronto para compartilhar:`,
              publishedUrl: published.url,
            },
          ]);
        }
      });
    }
  }, [firebaseUser, pendingPublishAfterLogin]);

  const handleSelectFile = async (file: File | undefined) => {
    if (!file) return;
    setApiError(null);
    setVoiceNotice(null);
    setUploadingFile(true);
    try {
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        const { dataUrl, base64Data } = await compressImageDataUrl(file);
        setStagedAttachment({
          name: file.name,
          mimeType: 'image/jpeg',
          base64Data,
          dataUrl,
          isImage: true,
        });
      } else if (file.type === 'application/pdf') {
        if (file.size > 4.5 * 1024 * 1024) {
          setApiError('O arquivo PDF deve ter no máximo 4,5 MB.');
          return;
        }
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Não foi possível ler o PDF selecionado.'));
          reader.readAsDataURL(file);
        });
        const base64Data = dataUrl.split(',')[1] || '';
        setStagedAttachment({
          name: file.name,
          mimeType: 'application/pdf',
          base64Data,
          isImage: false,
        });
      } else {
        const textContent = (await file.text()).slice(0, 10000);
        setStagedAttachment({
          name: file.name,
          mimeType: file.type || 'text/plain',
          textContent,
          isImage: false,
        });
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Erro ao carregar o arquivo selecionado.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleToggleMicrophone = () => {
    setVoiceNotice(null);
    if (isRecordingVoice) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore stop error
      }
      setIsRecordingVoice(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceNotice('Microfone por voz não suportado neste navegador. Use Chrome ou Edge ou digite seu pedido.');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const chunks: string[] = [];
        for (let i = 0; i < event.results.length; i += 1) {
          const transcript = event.results[i]?.[0]?.transcript?.trim();
          if (transcript) chunks.push(transcript);
        }
        const spoken = chunks.join(' ').trim();
        if (spoken) {
          setInputValue((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken));
        }
      };

      recognition.onerror = (ev) => {
        setIsRecordingVoice(false);
        if (ev.error === 'not-allowed') {
          setVoiceNotice('Permissão do microfone bloqueada. Libere o microfone no navegador para falar com o ConaeDuque.');
        } else if (ev.error !== 'aborted') {
          setVoiceNotice('Não foi possível captar sua voz agora. Tente tocar no microfone novamente.');
        }
      };

      recognition.onend = () => {
        setIsRecordingVoice(false);
      };

      recognitionRef.current = recognition;
      setIsRecordingVoice(true);
      recognition.start();
    } catch {
      setIsRecordingVoice(false);
      setVoiceNotice('Não foi possível iniciar o microfone neste dispositivo.');
    }
  };

  const handleSendMessage = async (
    overrideText?: string,
    overrideMode?: DukeStudioMode,
    overrideSourceImage?: { name: string; dataUrl: string }
  ) => {
    const text = (overrideText ?? inputValue).trim();
    const effectiveMode = overrideMode ?? studioMode;
    const activeAttachment: StagedAttachment | null = overrideSourceImage
      ? {
          name: overrideSourceImage.name,
          mimeType: 'image/jpeg',
          base64Data: overrideSourceImage.dataUrl.split(',')[1] || '',
          dataUrl: overrideSourceImage.dataUrl,
          isImage: true,
        }
      : overrideText
        ? stagedAttachment
        : stagedAttachment;

    if ((!text && !activeAttachment) || sending) return;

    if (isRecordingVoice) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsRecordingVoice(false);
    }

    setApiError(null);
    setPublishError(null);
    setVoiceNotice(null);
    if (!overrideText) setInputValue('');
    setStagedAttachment(null);

    const displayContent =
      text ||
      (activeAttachment?.isImage
        ? `Enviei a imagem "${activeAttachment.name}" para reformular com IA.`
        : `Enviei o arquivo "${activeAttachment?.name}" para análise da IA.`);

    const userMsg: DukeChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: displayContent,
      createdAt: new Date().toISOString(),
      attachmentPreview: activeAttachment?.isImage ? activeAttachment.dataUrl : undefined,
      attachmentName: activeAttachment?.name,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setSending(true);

    try {
      const response = await fetch('/api/duke-evento/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          mode: effectiveMode,
          webSearch: webSearchEnabled,
          deepThinking: deepThinkingEnabled,
          history: nextHistory.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          currentEvent,
          attachment: activeAttachment
            ? {
                name: activeAttachment.name,
                mimeType: activeAttachment.mimeType,
                base64Data: activeAttachment.base64Data,
                textContent: activeAttachment.textContent,
              }
            : null,
        }),
      });

      const rawText = await response.text();
      let payload: {
        error?: string;
        modeUsed?: 'chat' | 'image' | 'event';
        reply?: string;
        shouldPublish?: boolean;
        event?: DukeEventSpec;
        imageDesign?: DukeImageDesignSpec;
        sources?: DukeWebSource[];
      };
      try {
        payload = JSON.parse(rawText) as {
          error?: string;
          modeUsed?: 'chat' | 'image' | 'event';
          reply?: string;
          shouldPublish?: boolean;
          event?: DukeEventSpec;
          imageDesign?: DukeImageDesignSpec;
          sources?: DukeWebSource[];
        };
      } catch {
        throw new Error(
          response.ok
            ? 'Resposta inesperada do servidor.'
            : `Falha no servidor de IA (HTTP ${response.status}). Verifique se o servidor /api/duke-evento/chat está ativo.`
        );
      }

      if (!response.ok || (!payload.reply && !payload.event && !payload.imageDesign)) {
        throw new Error(
          payload.error || `Não foi possível processar seu pedido (HTTP ${response.status}).`
        );
      }

      const modeUsed = payload.modeUsed || (payload.imageDesign ? 'image' : payload.event ? 'event' : 'chat');
      let publishedUrl: string | undefined;
      let generatedImage: DukeGeneratedAsset | undefined;

      if (modeUsed === 'image' && payload.imageDesign) {
        const renderedPng = await renderDukeImageStudio(
          payload.imageDesign,
          activeAttachment?.isImage ? activeAttachment.dataUrl : undefined
        );
        generatedImage = {
          id: `img_${Date.now()}`,
          title: payload.imageDesign.title || 'Arte Robô Duque',
          mode: payload.imageDesign.mode,
          aspectRatio: payload.imageDesign.aspectRatio,
          resultDataUrl: renderedPng,
          originalDataUrl: activeAttachment?.isImage ? activeAttachment.dataUrl : undefined,
          designSpec: payload.imageDesign,
          createdAt: new Date().toISOString(),
        };
        setGeneratedImages((prev) => [generatedImage!, ...prev].slice(0, 12));
        setActiveImageId(generatedImage.id);
        setShowOriginalCompare(false);
        setRightTab('image');
      } else if (modeUsed === 'event' && payload.event) {
        const updatedEvent: DukeEventSpec = {
          ...payload.event,
          bannerImageUrl:
            activeAttachment?.isImage && activeAttachment.dataUrl
              ? activeAttachment.dataUrl
              : payload.event.bannerImageUrl || currentEvent?.bannerImageUrl,
        };
        setCurrentEvent(updatedEvent);
        setCustomSlug((prev) => prev || updatedEvent.slug);

        if (payload.shouldPublish) {
          const result = await persistEventToFirestore(updatedEvent, customSlug || updatedEvent.slug);
          if (result) {
            publishedUrl = result.url;
          }
        } else {
          setRightTab('preview');
        }
      }

      const aiMsg: DukeChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        modeUsed,
        content:
          payload.reply ||
          (modeUsed === 'image'
            ? 'Pronto! Criei sua imagem em alta definição.'
            : 'Pronto! Veja o resultado abaixo.'),
        createdAt: new Date().toISOString(),
        publishedUrl,
        generatedImage,
        sources: Array.isArray(payload.sources) && payload.sources.length > 0 ? payload.sources : undefined,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao conectar com a Inteligência Artificial do ConaeDuque.';
      setApiError(msg);
    } finally {
      setSending(false);
    }
  };

  const handleDownloadGeneratedImage = (asset: DukeGeneratedAsset) => {
    const a = document.createElement('a');
    a.href = asset.resultDataUrl;
    a.download = `${sanitizeSlug(asset.title)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleApplyImageToEventBanner = async (asset: DukeGeneratedAsset) => {
    const compressed = await compressDataUrlForFirestoreBanner(asset.resultDataUrl);
    if (currentEvent) {
      setCurrentEvent({ ...currentEvent, bannerImageUrl: compressed });
    } else {
      setCurrentEvent({
        slug: sanitizeSlug(asset.title),
        title: asset.designSpec.headline || asset.title,
        subtitle: asset.designSpec.subheadline || 'Divulgação oficial projetada pelo Robô Duque.',
        category: 'Evento Oficial',
        tagline: asset.designSpec.badgeText || 'CONAE Oficial',
        dateLabel: 'Data a definir',
        timeLabel: '19h às 22h',
        venueName: 'Centro de Convenções',
        city: 'Goiânia',
        state: 'GO',
        theme: 'emerald_gold',
        organizerName: 'CONAE',
        whatsappPhone: '',
        registrationCta: asset.designSpec.ctaText || 'Garantir Minha Vaga',
        heroSummary: 'Evento com arte visual criada e personalizada no Estúdio de Imagem do Robô Duque.',
        highlights: ['Credenciamento online rápido', 'Programação completa ao vivo'],
        metrics: [
          { label: 'Formato', value: 'Presencial & Online' },
          { label: 'Acesso', value: 'Confirmado' },
        ],
        panels: [
          {
            title: 'Abertura Oficial',
            subtitle: 'Boas-vindas e visão geral',
            description: 'Peça no chat para o Robô Duque detalhar todos os painéis e horários.',
            badge: 'Painel 01',
          },
        ],
        schedule: [
          {
            time: '19:00',
            title: 'Recepção e Abertura',
            speaker: 'Equipe Organizadora',
            stage: 'Auditório Principal',
            description: 'Início das atividades oficiais do evento.',
          },
        ],
        speakers: [
          {
            name: 'Convidado Especial',
            role: 'Preletor',
            topic: 'Palavra Principal',
          },
        ],
        tickets: [
          {
            name: 'Ingresso Padrão',
            priceLabel: 'Gratuito',
            perks: 'Acesso completo à programação oficial.',
            highlighted: true,
          },
        ],
        bannerImageUrl: compressed,
      });
    }
    setAppliedBannerId(asset.id);
    setRightTab('preview');
    window.setTimeout(() => setAppliedBannerId(null), 2600);
  };

  const handleStageGeneratedImageForEdit = async (asset: DukeGeneratedAsset) => {
    const sourceUrl = asset.originalDataUrl || asset.resultDataUrl;
    const compressed = await compressDataUrlForFirestoreBanner(sourceUrl);
    setStagedAttachment({
      name: `${sanitizeSlug(asset.title)}.jpg`,
      mimeType: 'image/jpeg',
      base64Data: compressed.split(',')[1] || '',
      dataUrl: compressed,
      isImage: true,
    });
    setStudioMode('image');
    setMobilePane('chat');
  };

  const handleCopyMessageText = async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(msgId);
      window.setTimeout(() => setCopiedMsgId(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleToggleSpeakMessage = (msgId: string, rawText: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceNotice('Seu navegador não suporta leitura por voz neste dispositivo.');
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const plain = rawText
        .replace(/```[\s\S]*?```/g, ' Código disponível na tela. ')
        .replace(/[#*_`>~]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!plain) return;
      const utterance = new SpeechSynthesisUtterance(plain);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.03;
      utterance.onend = () => setSpeakingMsgId(null);
      utterance.onerror = () => setSpeakingMsgId(null);
      setSpeakingMsgId(msgId);
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeakingMsgId(null);
    }
  };

  const handleNewChat = () => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setSpeakingMsgId(null);
    setIsRecordingVoice(false);
    setApiError(null);
    setVoiceNotice(null);
    setStagedAttachment(null);
    setInputValue('');
    setMessages([
      {
        ...WELCOME_MESSAGE,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleLiveUpdateImageSpec = async (patch: Partial<DukeImageDesignSpec>) => {
    if (!activeImageAsset) return;
    const targetId = activeImageAsset.id;
    const nextSpec: DukeImageDesignSpec = {
      ...activeImageAsset.designSpec,
      ...patch,
    };

    const seq = ++liveRenderSeqRef.current;
    setUpdatingLiveImage(true);
    setShowOriginalCompare(false);
    setGeneratedImages((prev) =>
      prev.map((img) =>
        img.id === targetId
          ? {
              ...img,
              aspectRatio: nextSpec.aspectRatio,
              title: nextSpec.headline?.trim() || nextSpec.title || img.title,
              designSpec: nextSpec,
            }
          : img
      )
    );

    try {
      const renderedPng = await renderDukeImageStudio(nextSpec, activeImageAsset.originalDataUrl);
      if (liveRenderSeqRef.current !== seq) return;
      setGeneratedImages((prev) =>
        prev.map((img) =>
          img.id === targetId
            ? {
                ...img,
                resultDataUrl: renderedPng,
                aspectRatio: nextSpec.aspectRatio,
                designSpec: nextSpec,
              }
            : img
        )
      );
    } finally {
      if (liveRenderSeqRef.current === seq) {
        setUpdatingLiveImage(false);
      }
    }
  };

  const handleManualPublish = async () => {
    if (!currentEvent) return;
    const result = await persistEventToFirestore(currentEvent, customSlug || currentEvent.slug);
    if (result) {
      setMessages((prev) => [
        ...prev,
        {
          id: `pub_btn_${Date.now()}`,
          role: 'assistant',
          createdAt: new Date().toISOString(),
          content: `Pronto! Salvei "${currentEvent.title}" e gerei o link oficial do evento:`,
          publishedUrl: result.url,
        },
      ]);
    }
  };

  const handleDeleteSavedEvent = async (ev: DukeEventRecord) => {
    try {
      await deleteDoc(doc(db, 'duke_events', ev.id));
      if (publishedRecord?.slug === ev.id) {
        setPublishedRecord(null);
      }
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Não foi possível excluir o evento.');
    }
  };

  const handleLoadSavedEvent = (ev: DukeEventRecord) => {
    setCurrentEvent(ev);
    setCustomSlug(ev.slug);
    setPublishedRecord({ slug: ev.slug, url: buildPublicEventUrl(ev.slug) });
    setRightTab('preview');
    setMessages((prev) => [
      ...prev,
      {
        id: `load_${Date.now()}`,
        role: 'assistant',
        createdAt: new Date().toISOString(),
        content: `Carreguei o evento "${ev.title}" salvo no banco. Pode me dizer qualquer alteração nos painéis, programação, cores ou ingressos que eu atualizo agora!`,
        publishedUrl: buildPublicEventUrl(ev.slug),
      },
    ]);
  };

  const handleCopyPublishedLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2400);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleDownloadEventHtml = () => {
    if (!currentEvent) return;
    const html = buildStandaloneEventHtml(
      currentEvent,
      publishedRecord?.url || buildPublicEventUrl(customSlug || currentEvent.slug)
    );
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeSlug(customSlug || currentEvent.slug)}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleSignInClick = async () => {
    setSigningIn(true);
    setPublishError(null);
    try {
      await onGoogleLogin();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Falha ao entrar com Google.');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#040a07] text-emerald-50 flex flex-col relative">
      {/* CENTERED MOVING 3D AI BRAIN OVERLAY WHILE WORKING ON A REQUEST */}
      {(sending || publishing) && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#020805]/74 backdrop-blur-sm p-6"
        >
          <div className="flex flex-col items-center text-center gap-5 max-w-sm">
            <div className="conae-brain-3d-stage">
              <span aria-hidden="true" className="conae-brain-3d-aura" />
              <span aria-hidden="true" className="conae-brain-3d-ring" />
              <span aria-hidden="true" className="conae-brain-3d-ring-reverse" />
              <div className="conae-brain-3d-core w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden border-2 border-amber-400/85 bg-[#030b08] shadow-[0_0_50px_rgba(245,158,11,0.45)]">
                <img
                  src={CONAE_AI_BRAIN_3D}
                  alt="Cérebro IA em movimento processando seu pedido"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover scale-105"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-[#06160f]/92 border border-amber-400/45 px-5 py-3 shadow-2xl space-y-1">
              <p className="font-display text-base sm:text-lg font-bold conae-gold-text">
                {publishing
                  ? 'Salvando e gerando seu link oficial...'
                  : 'Construindo seu pedido agora...'}
              </p>
              <p className="text-xs text-emerald-100/85">
                {publishing
                  ? 'Gravando no banco Firebase e ativando o endereço do seu evento.'
                  : 'Montando painéis, programação e estrutura sob medida para você.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE-ROW STUDIO HEADER */}
      <header className="h-14 shrink-0 border-b border-amber-400/25 bg-[#06130d]/95 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToConae}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/45 hover:bg-black/70 border border-amber-400/25 text-xs font-semibold text-emerald-100 cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Voltar ao CONAE</span>
          </button>

          <div className="flex items-center gap-3 min-w-0">
            <div className="conae-robot-3d-stage shrink-0">
              <span aria-hidden="true" className="conae-robot-3d-aura" />
              <div className="conae-robot-3d-figure w-10 h-10 rounded-xl overflow-hidden border border-amber-400/85 bg-[#040e0a]">
                <img
                  src={CONAE_DUQUE_ROBOT_3D}
                  alt="Robô CONAE em movimento 3D"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <span aria-hidden="true" className="conae-robot-3d-shine" />
              </div>
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-xs sm:text-sm font-bold text-amber-200 truncate">
                Pronto para servir nossos clientes da CONAE
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleNewChat}
            title="Iniciar nova conversa limpa"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border bg-black/40 border-amber-400/25 text-emerald-100 hover:bg-black/65 hover:border-amber-400/55 text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Novo Chat</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRightTab('saved');
              setMobilePane('workspace');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap ${
              rightTab === 'saved'
                ? 'bg-amber-400/15 border-amber-400/60 text-amber-200'
                : 'bg-black/40 border-amber-400/25 text-emerald-100 hover:bg-black/65'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden md:inline">Meus Eventos</span>
            <span className="font-mono text-[11px] text-amber-300">({myEvents.length})</span>
          </button>

          {!firebaseUser && (
            <button
              type="button"
              onClick={handleSignInClick}
              disabled={signingIn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800/70 hover:bg-emerald-700 border border-emerald-400/40 text-xs font-semibold text-white cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{signingIn ? 'Entrando...' : 'Entrar Google'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setMobilePane('workspace');
              if (currentEvent) {
                void handleManualPublish();
              } else {
                setRightTab('publish');
              }
            }}
            disabled={!currentEvent || publishing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-xs cursor-pointer whitespace-nowrap disabled:opacity-45"
          >
            {publishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Rocket className="w-3.5 h-3.5" />
            )}
            <span>{publishing ? 'Publicando...' : 'Publicar & Gerar Link'}</span>
          </button>
        </div>
      </header>

      {/* MOBILE VIEW SWITCHER */}
      <div className="lg:hidden grid grid-cols-2 border-b border-amber-400/20 bg-[#06120c]">
        <button
          type="button"
          onClick={() => setMobilePane('chat')}
          className={`py-2.5 text-xs font-bold cursor-pointer ${
            mobilePane === 'chat'
              ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-400/10'
              : 'text-emerald-200/70'
          }`}
        >
          Conversa Robô Duque
        </button>
        <button
          type="button"
          onClick={() => setMobilePane('workspace')}
          className={`py-2.5 text-xs font-bold cursor-pointer ${
            mobilePane === 'workspace'
              ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-400/10'
              : 'text-emerald-200/70'
          }`}
        >
          Prévia & Link Fixo {currentEvent ? '✓' : ''}
        </button>
      </div>

      {/* MAIN SPLIT-PANE WORKSPACE */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT PANE: CHATGPT-STYLE CONVERSATION */}
        <section
          className={`${
            mobilePane === 'chat' ? 'flex' : 'hidden lg:flex'
          } lg:col-span-5 xl:col-span-4 flex-col min-h-0 border-r border-amber-400/20 bg-[#050e0a]`}
        >
          {/* Chat Thread */}
          <div className="flex-1 overflow-y-auto conae-scroll p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="w-8 h-8 rounded-xl overflow-hidden border border-amber-400/65 bg-[#040e0a] shrink-0 mt-0.5">
                    <img
                      src={CONAE_DUQUE_ROBOT_3D}
                      alt="ConaeDuque 3D"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-200">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed space-y-2 ${
                    msg.role === 'user'
                      ? 'bg-emerald-800/65 border border-emerald-400/35 text-white'
                      : 'bg-[#091a12] border border-amber-400/25 text-emerald-50'
                  }`}
                >
                  {msg.attachmentPreview && (
                    <div className="rounded-xl overflow-hidden border border-amber-400/35 bg-black/40">
                      <img
                        src={msg.attachmentPreview}
                        alt={msg.attachmentName || 'Foto anexada'}
                        referrerPolicy="no-referrer"
                        className="w-full max-h-44 object-cover block"
                      />
                    </div>
                  )}

                  {!msg.attachmentPreview && msg.attachmentName && (
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-black/40 border border-amber-400/30 px-2.5 py-1 text-xs text-amber-200">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[200px]">{msg.attachmentName}</span>
                    </div>
                  )}

                  {msg.role === 'assistant' ? (
                    <DukeRichMessage content={msg.content} sources={msg.sources} />
                  ) : (
                    <p className="whitespace-pre-line">{msg.content}</p>
                  )}

                  {msg.generatedImage && (
                    <div className="rounded-xl overflow-hidden border border-amber-400/45 bg-black/55 space-y-2 p-2">
                      <div className="rounded-lg overflow-hidden bg-black/60">
                        <img
                          src={msg.generatedImage.resultDataUrl}
                          alt={msg.generatedImage.title}
                          referrerPolicy="no-referrer"
                          className="w-full max-h-64 object-contain block mx-auto"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 px-0.5">
                        <button
                          type="button"
                          onClick={() => handleDownloadGeneratedImage(msg.generatedImage!)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-[11px] cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Baixar PNG</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveImageId(msg.generatedImage!.id);
                            setRightTab('image');
                            setMobilePane('workspace');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-700/80 hover:bg-emerald-600 text-white font-semibold text-[11px] cursor-pointer"
                        >
                          <Wand2 className="w-3 h-3" />
                          <span>Abrir Estúdio</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleApplyImageToEventBanner(msg.generatedImage!)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/60 hover:bg-black/80 border border-amber-400/35 text-amber-200 font-semibold text-[11px] cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>Capa do Evento</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {msg.role === 'assistant' && msg.id !== 'welcome_duke' && (
                    <div className="flex items-center justify-end gap-3 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSpeakMessage(msg.id, msg.content)}
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold cursor-pointer ${
                          speakingMsgId === msg.id
                            ? 'text-amber-300'
                            : 'text-emerald-200/70 hover:text-amber-300'
                        }`}
                      >
                        {speakingMsgId === msg.id ? (
                          <VolumeX className="w-3 h-3 text-amber-300" />
                        ) : (
                          <Volume2 className="w-3 h-3" />
                        )}
                        <span>{speakingMsgId === msg.id ? 'Parar áudio' : 'Ouvir'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCopyMessageText(msg.id, msg.content)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-200/70 hover:text-amber-300 cursor-pointer"
                      >
                        {copiedMsgId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-300" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedMsgId === msg.id ? 'Copiado' : 'Copiar texto'}</span>
                      </button>
                    </div>
                  )}

                  {msg.publishedUrl && (
                    <div className="rounded-xl bg-black/50 border border-amber-400/40 p-2.5 space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                        <Link2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Link Oficial Publicado</span>
                      </div>
                      <p className="text-xs font-mono text-emerald-200 break-all">
                        {msg.publishedUrl}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyPublishedLink(msg.publishedUrl!)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-[11px] cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copiar Link</span>
                        </button>
                        <a
                          href={msg.publishedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-700/80 hover:bg-emerald-600 text-white font-semibold text-[11px]"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Abrir Página</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Quick Starter Prompts covering ChatGPT Text, Code, Image Studio & Event Builder */}
            {messages.length <= 1 && !sending && (
              <div className="pt-2 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/80">
                  Comece com 1 clique ou envie foto/pedido abaixo
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {STARTER_PROMPTS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setStudioMode(item.mode);
                        void handleSendMessage(item.prompt, item.mode);
                      }}
                      className="text-left rounded-xl bg-[#081711] hover:bg-[#0d241b] border border-amber-400/25 hover:border-amber-400/55 px-3.5 py-2.5 transition-colors cursor-pointer space-y-0.5"
                    >
                      <span className="block text-xs font-bold text-amber-200">{item.label}</span>
                      <span className="block text-[11px] text-emerald-200/75 line-clamp-2">
                        {item.prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sending && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl overflow-hidden border border-amber-400/65 bg-[#040e0a] shrink-0">
                  <img
                    src={CONAE_DUQUE_ROBOT_3D}
                    alt="ConaeDuque 3D"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="rounded-2xl bg-[#091a12] border border-amber-400/25 px-3.5 py-2.5 text-xs text-amber-200 inline-flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                  <span>ConaeDuque está construindo seu projeto...</span>
                </div>
              </div>
            )}

            {apiError && (
              <div
                role="alert"
                className="rounded-xl bg-red-950/75 border border-red-400/50 p-3 text-xs text-red-100 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                <span>{apiError}</span>
              </div>
            )}

            {voiceNotice && (
              <div className="rounded-xl bg-amber-950/70 border border-amber-400/45 p-2.5 text-xs text-amber-100 flex items-start gap-2">
                <Mic className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <span>{voiceNotice}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Mode Switcher Bar: Automático, Texto & Código, Imagem / Reformular, Evento & Link */}
          <div className="px-3 pt-2.5 pb-1.5 border-t border-amber-400/20 bg-[#040b08] flex items-center gap-1.5 overflow-x-auto conae-scroll">
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStudioMode(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  studioMode === opt.id
                    ? 'bg-amber-400 text-neutral-950'
                    : 'bg-[#081711] text-emerald-100/80 hover:text-white border border-amber-400/20'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Chat Composer with Photo Upload, File Upload, Live Voice Microphone & Clean Empty Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendMessage();
            }}
            className="px-3 pb-3 pt-1 bg-[#040b08]"
          >
            {/* Hidden file inputs */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                void handleSelectFile(file);
                e.target.value = '';
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.csv,.md"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                void handleSelectFile(file);
                e.target.value = '';
              }}
            />

            <div className="rounded-2xl bg-[#081711] border border-amber-400/40 focus-within:border-amber-400 p-2.5 space-y-2 shadow-inner">
              {/* Staged Photo / File Preview Chip */}
              {stagedAttachment && (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-black/50 border border-amber-400/35 px-2.5 py-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {stagedAttachment.isImage && stagedAttachment.dataUrl ? (
                      <img
                        src={stagedAttachment.dataUrl}
                        alt={stagedAttachment.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover border border-amber-400/50 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-amber-400/15 border border-amber-400/35 flex items-center justify-center text-amber-300 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{stagedAttachment.name}</p>
                      <p className="text-[10px] text-emerald-300/80">
                        {stagedAttachment.isImage ? 'Foto pronta para capa e leitura da IA' : 'Arquivo pronto para leitura da IA'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStagedAttachment(null)}
                    aria-label="Remover anexo"
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-red-950/70 text-emerald-200 hover:text-red-200 cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Clean Empty Textarea */}
              <textarea
                rows={2}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendMessage();
                  }
                }}
                disabled={sending}
                aria-label="Caixa de mensagem do ConaeDuque"
                className="w-full resize-none bg-transparent text-sm text-white focus:outline-none px-1.5 py-0.5 max-h-36"
              />

              {/* Bottom Controls Row: Foto, Upload, Web Search, Deep Think, Voz & Enviar */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    disabled={sending || uploadingFile}
                    onClick={() => photoInputRef.current?.click()}
                    title="Inserir Foto para escrever ou modificar"
                    aria-label="Inserir foto"
                    className="h-8 px-2 rounded-xl bg-black/45 hover:bg-black/75 border border-amber-400/25 hover:border-amber-400/55 text-emerald-100 hover:text-amber-200 inline-flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <ImagePlus className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span className="hidden sm:inline">Foto</span>
                  </button>

                  <button
                    type="button"
                    disabled={sending || uploadingFile}
                    onClick={() => fileInputRef.current?.click()}
                    title="Fazer Upload de Arquivo (PDF, Texto ou Imagem)"
                    aria-label="Fazer upload de arquivo"
                    className="h-8 px-2 rounded-xl bg-black/45 hover:bg-black/75 border border-amber-400/25 hover:border-amber-400/55 text-emerald-100 hover:text-amber-200 inline-flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {uploadingFile ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300 shrink-0" />
                    ) : (
                      <Paperclip className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    )}
                    <span className="hidden sm:inline">Arquivo</span>
                  </button>

                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => setWebSearchEnabled((prev) => !prev)}
                    title="Ativar Pesquisa Web em tempo real com fontes clicáveis"
                    aria-pressed={webSearchEnabled}
                    className={`h-8 px-2 rounded-xl border inline-flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                      webSearchEnabled
                        ? 'bg-emerald-600/80 border-emerald-300 text-white'
                        : 'bg-black/45 hover:bg-black/75 border-amber-400/25 hover:border-amber-400/55 text-emerald-100 hover:text-amber-200'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Web</span>
                  </button>

                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => setDeepThinkingEnabled((prev) => !prev)}
                    title="Ativar Raciocínio Profundo para códigos, contratos e análises complexas"
                    aria-pressed={deepThinkingEnabled}
                    className={`h-8 px-2 rounded-xl border inline-flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                      deepThinkingEnabled
                        ? 'bg-amber-400 border-amber-300 text-neutral-950'
                        : 'bg-black/45 hover:bg-black/75 border-amber-400/25 hover:border-amber-400/55 text-emerald-100 hover:text-amber-200'
                    }`}
                  >
                    <Brain className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Pensar</span>
                  </button>

                  <button
                    type="button"
                    disabled={sending}
                    onClick={handleToggleMicrophone}
                    title={isRecordingVoice ? 'Parar gravação de voz' : 'Falar no microfone'}
                    aria-label={isRecordingVoice ? 'Parar gravação de voz' : 'Falar no microfone'}
                    className={`h-8 px-2 rounded-xl border inline-flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                      isRecordingVoice
                        ? 'bg-red-600/85 border-red-300 text-white'
                        : 'bg-black/45 hover:bg-black/75 border-amber-400/25 hover:border-amber-400/55 text-emerald-100 hover:text-amber-200'
                    }`}
                  >
                    {isRecordingVoice ? (
                      <>
                        <MicOff className="w-3.5 h-3.5 shrink-0" />
                        <span>Ouvindo...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                        <span className="hidden sm:inline">Voz</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={sending || (!inputValue.trim() && !stagedAttachment)}
                  aria-label="Enviar mensagem para ConaeDuque"
                  className="w-9 h-9 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 transition-colors"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4.5 h-4.5 stroke-[2.5]" />}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* RIGHT PANE: LIVE PREVIEW + LINK GENERATOR + SAVED EVENTS */}
        <section
          className={`${
            mobilePane === 'workspace' ? 'flex' : 'hidden lg:flex'
          } lg:col-span-7 xl:col-span-8 flex-col min-h-0 bg-[#030806]`}
        >
          {/* Workspace Sub-toolbar */}
          <div className="shrink-0 px-4 py-2.5 border-b border-amber-400/20 bg-[#06130d]/85 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setRightTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  rightTab === 'preview'
                    ? 'bg-amber-400 text-neutral-950'
                    : 'bg-black/45 text-emerald-100 hover:bg-black/70 border border-amber-400/20'
                }`}
              >
                Prévia Evento
              </button>
              <button
                type="button"
                onClick={() => setRightTab('image')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                  rightTab === 'image'
                    ? 'bg-amber-400 text-neutral-950'
                    : 'bg-black/45 text-emerald-100 hover:bg-black/70 border border-amber-400/20'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Estúdio Imagem ({generatedImages.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setRightTab('publish')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                  rightTab === 'publish'
                    ? 'bg-amber-400 text-neutral-950'
                    : 'bg-black/45 text-emerald-100 hover:bg-black/70 border border-amber-400/20'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Gerar Link do Evento</span>
              </button>
              <button
                type="button"
                onClick={() => setRightTab('saved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  rightTab === 'saved'
                    ? 'bg-amber-400 text-neutral-950'
                    : 'bg-black/45 text-emerald-100 hover:bg-black/70 border border-amber-400/20'
                }`}
              >
                Salvos ({myEvents.length})
              </button>
            </div>

            {/* Quick Theme Switcher */}
            {currentEvent && rightTab === 'preview' && (
              <div className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                {THEME_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    title={t.label}
                    onClick={() => setCurrentEvent({ ...currentEvent, theme: t.id })}
                    className={`w-5 h-5 rounded-full ${t.dot} cursor-pointer transition-transform ${
                      currentEvent.theme === t.id
                        ? 'ring-2 ring-white scale-110'
                        : 'opacity-65 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Workspace Scrollable Area */}
          <div className="flex-1 overflow-y-auto conae-scroll p-4 sm:p-6">
            {rightTab === 'preview' && (
              <>
                {currentEvent ? (
                  <div className="space-y-4">
                    {publishedRecord && (
                      <div className="rounded-xl bg-emerald-950/70 border border-emerald-400/45 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-emerald-200">
                              Evento publicado no banco Firebase · Link ativo
                            </p>
                            <p className="text-xs font-mono text-amber-200 truncate">
                              {publishedRecord.url}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyPublishedLink(publishedRecord.url)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs cursor-pointer whitespace-nowrap"
                          >
                            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedLink ? 'Copiado' : 'Copiar Link'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenPublishedEvent(publishedRecord.slug)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs cursor-pointer whitespace-nowrap"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Abrir Link</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <PublicEventPage
                      previewEvent={currentEvent}
                      embedded
                      publishedUrl={publishedRecord?.url}
                    />
                  </div>
                ) : (
                  <div className="h-full min-h-[420px] flex items-center justify-center">
                    <div className="max-w-lg w-full rounded-2xl bg-[#07140e] border border-amber-400/25 p-6 sm:p-8 text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center mx-auto">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h2 className="font-display text-2xl font-bold text-white">
                        Seu Evento Aparece Aqui Ao Vivo
                      </h2>
                      <p className="text-sm text-emerald-200/80 leading-relaxed">
                        Converse com nosso robô no painel ao lado. A cada pedido, ele projeta
                        automaticamente os painéis, programação completa, preletores, ingressos e
                        gera o link do seu evento na hora.
                      </p>
                      <div className="grid grid-cols-3 gap-2.5 pt-2 text-left text-xs">
                        <div className="rounded-xl bg-black/40 border border-amber-400/20 p-3 space-y-1">
                          <span className="font-bold text-amber-300 flex items-center gap-1">
                            <MessageSquareText className="w-3.5 h-3.5" /> Texto & Código
                          </span>
                          <span className="text-emerald-200/75 block">
                            Peça textos, legendas, roteiros ou códigos HTML/React prontos.
                          </span>
                        </div>
                        <div className="rounded-xl bg-black/40 border border-amber-400/20 p-3 space-y-1">
                          <span className="font-bold text-amber-300 flex items-center gap-1">
                            <Wand2 className="w-3.5 h-3.5" /> Criar & Reformular
                          </span>
                          <span className="text-emerald-200/75 block">
                            Crie artes HD ou envie uma foto para reformular na hora.
                          </span>
                        </div>
                        <div className="rounded-xl bg-black/40 border border-amber-400/20 p-3 space-y-1">
                          <span className="font-bold text-amber-300 flex items-center gap-1">
                            <Code2 className="w-3.5 h-3.5" /> Evento & Link
                          </span>
                          <span className="text-emerald-200/75 block">
                            Monte painéis, programação e gere o link fixo oficial.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {rightTab === 'image' && (
              <div className="max-w-4xl mx-auto space-y-5">
                {activeImageAsset ? (
                  <div className="rounded-2xl bg-[#07150f] border border-amber-400/35 p-4 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                          {activeImageAsset.mode === 'reformulate'
                            ? 'Foto Reformulada pela IA'
                            : 'Arte Criada pela IA'} · {activeImageAsset.aspectRatio}
                        </p>
                        <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                          {activeImageAsset.title}
                        </h2>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {activeImageAsset.originalDataUrl && (
                          <button
                            type="button"
                            onClick={() => setShowOriginalCompare((prev) => !prev)}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer whitespace-nowrap ${
                              showOriginalCompare
                                ? 'bg-emerald-700 border-emerald-400 text-white'
                                : 'bg-black/50 border-amber-400/35 text-amber-200 hover:bg-black/75'
                            }`}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>{showOriginalCompare ? 'Vendo Original (Antes)' : 'Ver Antes / Depois'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDownloadGeneratedImage(activeImageAsset)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs cursor-pointer whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar PNG HD</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleApplyImageToEventBanner(activeImageAsset)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs cursor-pointer whitespace-nowrap"
                        >
                          {appliedBannerId === activeImageAsset.id ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {appliedBannerId === activeImageAsset.id ? 'Aplicada na Capa!' : 'Usar na Capa do Evento'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleStageGeneratedImageForEdit(activeImageAsset)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/50 hover:bg-black/75 border border-amber-400/30 text-emerald-100 font-semibold text-xs cursor-pointer whitespace-nowrap"
                        >
                          <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                          <span>Reformular no Chat</span>
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl overflow-hidden bg-black/65 border border-amber-400/25 p-3 flex items-center justify-center">
                      <img
                        src={
                          showOriginalCompare && activeImageAsset.originalDataUrl
                            ? activeImageAsset.originalDataUrl
                            : activeImageAsset.resultDataUrl
                        }
                        alt={activeImageAsset.title}
                        referrerPolicy="no-referrer"
                        className="max-h-[480px] w-auto object-contain rounded-lg shadow-2xl"
                      />
                    </div>

                    {/* Live Interactive Text-on-Photo & Photo Modification Editor */}
                    <div className="rounded-xl bg-black/45 border border-amber-400/25 p-4 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <SlidersHorizontal className="w-4 h-4 text-amber-300" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-200">
                            Escrever na Foto & Modificar em Tempo Real
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {updatingLiveImage && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Atualizando...
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              void handleLiveUpdateImageSpec({
                                brightness: 1,
                                contrast: 1,
                                saturate: 1,
                                sepia: 0,
                                hueRotate: 0,
                                vignette: 0.25,
                                tintColor: '#000000',
                                tintOpacity: 0,
                                fontScale: 1,
                              })
                            }
                            className="px-2.5 py-1 rounded-md bg-black/60 hover:bg-black/80 border border-white/15 text-[11px] font-semibold text-emerald-200 cursor-pointer"
                          >
                            Resetar Filtros
                          </button>
                        </div>
                      </div>

                      {/* Text Inputs directly drawn on the photo */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="space-y-1 sm:col-span-2">
                          <span className="text-[11px] font-semibold text-emerald-200/80 flex items-center gap-1">
                            <TypeIcon className="w-3 h-3 text-amber-300" />
                            Texto Principal na Foto (Título)
                          </span>
                          <input
                            type="text"
                            value={activeImageAsset.designSpec.headline || ''}
                            onChange={(e) => void handleLiveUpdateImageSpec({ headline: e.target.value })}
                            placeholder="Digite a frase para aparecer escrita na foto..."
                            className="w-full rounded-lg bg-[#081711] border border-amber-400/30 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-[11px] font-semibold text-emerald-200/80 block">
                            Subtítulo / Mensagem
                          </span>
                          <input
                            type="text"
                            value={activeImageAsset.designSpec.subheadline || ''}
                            onChange={(e) => void handleLiveUpdateImageSpec({ subheadline: e.target.value })}
                            placeholder="Opcional"
                            className="w-full rounded-lg bg-[#081711] border border-amber-400/25 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-[11px] font-semibold text-emerald-200/80 block">
                            Selo Superior / Etiqueta
                          </span>
                          <input
                            type="text"
                            value={activeImageAsset.designSpec.badgeText || ''}
                            onChange={(e) => void handleLiveUpdateImageSpec({ badgeText: e.target.value })}
                            placeholder="Ex: CONAE OFICIAL"
                            className="w-full rounded-lg bg-[#081711] border border-amber-400/25 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-[11px] font-semibold text-emerald-200/80 block">
                            Botão / Chamada (CTA)
                          </span>
                          <input
                            type="text"
                            value={activeImageAsset.designSpec.ctaText || ''}
                            onChange={(e) => void handleLiveUpdateImageSpec({ ctaText: e.target.value })}
                            placeholder="Ex: INSCREVA-SE AGORA"
                            className="w-full rounded-lg bg-[#081711] border border-amber-400/25 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-[11px] font-semibold text-emerald-200/80 block">
                            Rodapé / Data / WhatsApp
                          </span>
                          <input
                            type="text"
                            value={activeImageAsset.designSpec.footerText || ''}
                            onChange={(e) => void handleLiveUpdateImageSpec({ footerText: e.target.value })}
                            placeholder="Ex: Goiânia-GO · 2026"
                            className="w-full rounded-lg bg-[#081711] border border-amber-400/25 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </label>
                      </div>

                      {/* Position, Font Style, Aspect Ratio, Frame & Colors */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-emerald-200/80 block">
                            Posição do Texto
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(
                              [
                                { id: 'top', label: 'Topo' },
                                { id: 'center', label: 'Centro' },
                                { id: 'bottom', label: 'Rodapé' },
                              ] as const
                            ).map((pos) => (
                              <button
                                key={pos.id}
                                type="button"
                                onClick={() => void handleLiveUpdateImageSpec({ textPosition: pos.id })}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                                  (activeImageAsset.designSpec.textPosition || 'bottom') === pos.id
                                    ? 'bg-amber-400 text-neutral-950'
                                    : 'bg-[#081711] text-emerald-100 border border-white/15 hover:border-amber-400/50'
                                }`}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-emerald-200/80 block">
                            Estilo da Letra
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(
                              [
                                { id: 'editorial', label: 'Editorial' },
                                { id: 'modern', label: 'Moderno' },
                                { id: 'impact', label: 'Impacto' },
                              ] as const
                            ).map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => void handleLiveUpdateImageSpec({ fontStyle: f.id })}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                                  (activeImageAsset.designSpec.fontStyle || 'editorial') === f.id
                                    ? 'bg-amber-400 text-neutral-950'
                                    : 'bg-[#081711] text-emerald-100 border border-white/15 hover:border-amber-400/50'
                                }`}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-emerald-200/80 block">
                            Formato / Proporção
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(['1:1', '16:9', '9:16', '4:5'] as DukeImageAspectRatio[]).map((ratio) => (
                              <button
                                key={ratio}
                                type="button"
                                onClick={() => void handleLiveUpdateImageSpec({ aspectRatio: ratio })}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                                  activeImageAsset.designSpec.aspectRatio === ratio
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-[#081711] text-emerald-100 border border-white/15 hover:border-amber-400/50'
                                }`}
                              >
                                {ratio}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-emerald-200/80 block">
                            Moldura
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(
                              [
                                { id: 'gold_double', label: 'Ouro Duplo' },
                                { id: 'minimal_white', label: 'Branco Clean' },
                                { id: 'neon_glow', label: 'Brilho Neon' },
                                { id: 'none', label: 'Sem Moldura' },
                              ] as Array<{ id: DukeImageFrameStyle; label: string }>
                            ).map((fr) => (
                              <button
                                key={fr.id}
                                type="button"
                                onClick={() => void handleLiveUpdateImageSpec({ frameStyle: fr.id })}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                                  activeImageAsset.designSpec.frameStyle === fr.id
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-[#081711] text-emerald-100 border border-white/15 hover:border-amber-400/50'
                                }`}
                              >
                                {fr.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Text & Accent Color Swatches */}
                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-emerald-200/80">Cor do Texto:</span>
                          {['#ffffff', '#fde68a', '#fbbf24', '#34d399', '#38bdf8', '#fb7185'].map((color) => (
                            <button
                              key={color}
                              type="button"
                              aria-label={`Cor do texto ${color}`}
                              onClick={() => void handleLiveUpdateImageSpec({ textPrimary: color })}
                              className={`w-5 h-5 rounded-full border cursor-pointer ${
                                activeImageAsset.designSpec.textPrimary?.toLowerCase() === color
                                  ? 'border-white scale-110 ring-2 ring-amber-400'
                                  : 'border-white/30'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-emerald-200/80">Destaque:</span>
                          {['#f59e0b', '#10b981', '#3b82f6', '#e11d48', '#8b5cf6', '#f8fafc'].map((color) => (
                            <button
                              key={color}
                              type="button"
                              aria-label={`Cor de destaque ${color}`}
                              onClick={() => void handleLiveUpdateImageSpec({ accentColor: color })}
                              className={`w-5 h-5 rounded-full border cursor-pointer ${
                                activeImageAsset.designSpec.accentColor?.toLowerCase() === color
                                  ? 'border-white scale-110 ring-2 ring-amber-400'
                                  : 'border-white/30'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Real-time Photo Enhancement Sliders */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-white/10">
                        <label className="space-y-1">
                          <div className="flex justify-between text-[11px] text-emerald-200/80">
                            <span>Brilho</span>
                            <span className="font-mono text-amber-300">
                              {Math.round((activeImageAsset.designSpec.brightness ?? 1) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.65}
                            max={1.5}
                            step={0.05}
                            value={activeImageAsset.designSpec.brightness ?? 1}
                            onChange={(e) =>
                              void handleLiveUpdateImageSpec({ brightness: Number(e.target.value) })
                            }
                            className="w-full accent-amber-400 cursor-pointer"
                          />
                        </label>

                        <label className="space-y-1">
                          <div className="flex justify-between text-[11px] text-emerald-200/80">
                            <span>Contraste</span>
                            <span className="font-mono text-amber-300">
                              {Math.round((activeImageAsset.designSpec.contrast ?? 1) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.75}
                            max={1.6}
                            step={0.05}
                            value={activeImageAsset.designSpec.contrast ?? 1}
                            onChange={(e) =>
                              void handleLiveUpdateImageSpec({ contrast: Number(e.target.value) })
                            }
                            className="w-full accent-amber-400 cursor-pointer"
                          />
                        </label>

                        <label className="space-y-1">
                          <div className="flex justify-between text-[11px] text-emerald-200/80">
                            <span>Saturação / Cor</span>
                            <span className="font-mono text-amber-300">
                              {Math.round((activeImageAsset.designSpec.saturate ?? 1) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={1.9}
                            step={0.05}
                            value={activeImageAsset.designSpec.saturate ?? 1}
                            onChange={(e) =>
                              void handleLiveUpdateImageSpec({ saturate: Number(e.target.value) })
                            }
                            className="w-full accent-amber-400 cursor-pointer"
                          />
                        </label>

                        <label className="space-y-1">
                          <div className="flex justify-between text-[11px] text-emerald-200/80">
                            <span>Vinheta / Sombra</span>
                            <span className="font-mono text-amber-300">
                              {Math.round((activeImageAsset.designSpec.vignette ?? 0.25) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={0.9}
                            step={0.05}
                            value={activeImageAsset.designSpec.vignette ?? 0.25}
                            onChange={(e) =>
                              void handleLiveUpdateImageSpec({ vignette: Number(e.target.value) })
                            }
                            className="w-full accent-amber-400 cursor-pointer"
                          />
                        </label>

                        <label className="space-y-1">
                          <div className="flex justify-between text-[11px] text-emerald-200/80">
                            <span>Tom Quente / Sépia</span>
                            <span className="font-mono text-amber-300">
                              {Math.round((activeImageAsset.designSpec.sepia ?? 0) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={0.65}
                            step={0.05}
                            value={activeImageAsset.designSpec.sepia ?? 0}
                            onChange={(e) =>
                              void handleLiveUpdateImageSpec({ sepia: Number(e.target.value) })
                            }
                            className="w-full accent-amber-400 cursor-pointer"
                          />
                        </label>

                        <label className="space-y-1">
                          <div className="flex justify-between text-[11px] text-emerald-200/80">
                            <span>Tamanho da Letra</span>
                            <span className="font-mono text-amber-300">
                              {Math.round((activeImageAsset.designSpec.fontScale ?? 1) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.75}
                            max={1.4}
                            step={0.05}
                            value={activeImageAsset.designSpec.fontScale ?? 1}
                            onChange={(e) =>
                              void handleLiveUpdateImageSpec({
                                fontScale: Number(e.target.value),
                              })
                            }
                            className="w-full accent-amber-400 cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>

                    {/* 1-Click Instant Reformulation Styles */}
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200/75">
                        Reformular novamente com 1 clique
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {IMAGE_QUICK_REFORMULATIONS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            disabled={sending}
                            onClick={() => {
                              const basePhoto =
                                activeImageAsset.originalDataUrl || activeImageAsset.resultDataUrl;
                              void handleSendMessage(preset.prompt, 'image', {
                                name: `${sanitizeSlug(activeImageAsset.title)}.jpg`,
                                dataUrl: basePhoto,
                              });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-black/50 hover:bg-amber-400/15 border border-amber-400/30 hover:border-amber-400 text-xs font-semibold text-amber-200 cursor-pointer disabled:opacity-50"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {generatedImages.length > 1 && (
                      <div className="pt-3 border-t border-amber-400/20 space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200/75">
                          Histórico de Imagens Criadas ({generatedImages.length})
                        </p>
                        <div className="flex items-center gap-2.5 overflow-x-auto conae-scroll pb-1">
                          {generatedImages.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setActiveImageId(item.id);
                                setShowOriginalCompare(false);
                              }}
                              className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                                activeImageAsset.id === item.id
                                  ? 'border-amber-400 scale-105'
                                  : 'border-white/15 opacity-70 hover:opacity-100'
                              }`}
                            >
                              <img
                                src={item.resultDataUrl}
                                alt={item.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full min-h-[420px] flex items-center justify-center">
                    <div className="max-w-lg w-full rounded-2xl bg-[#07140e] border border-amber-400/25 p-6 sm:p-8 text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center mx-auto">
                        <Wand2 className="w-6 h-6" />
                      </div>
                      <h2 className="font-display text-2xl font-bold text-white">
                        Estúdio de Criação & Reformulação de Imagens
                      </h2>
                      <p className="text-sm text-emerald-200/80 leading-relaxed">
                        Peça no chat para criar qualquer banner, cartaz, convite ou arte em alta definição — ou clique em <strong>Foto</strong> para enviar uma imagem sua e pedir ao Robô Duque para reformular cores, iluminação, moldura, formato e textos!
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setStudioMode('image');
                            setMobilePane('chat');
                            photoInputRef.current?.click();
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs cursor-pointer"
                        >
                          <ImagePlus className="w-4 h-4" />
                          <span>Enviar Foto para Reformular</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {rightTab === 'publish' && (
              <div className="max-w-2xl mx-auto space-y-5">
                <div className="rounded-2xl bg-[#07150f] border border-amber-400/35 p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-5 h-5 text-amber-300 shrink-0" />
                    <h2 className="font-display text-xl font-bold text-white">
                      Gerar Link do Evento
                    </h2>
                  </div>

                  {!firebaseUser && (
                    <div className="rounded-xl bg-amber-950/45 border border-amber-400/45 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-amber-200">
                          Conecte sua conta Google para publicar no Firebase
                        </p>
                        <p className="text-xs text-emerald-100/80">
                          A publicação exige login para proteger seus eventos e manter o link sob seu controle.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleSignInClick}
                        disabled={signingIn}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>{signingIn ? 'Conectando...' : 'Entrar com Google'}</span>
                      </button>
                    </div>
                  )}

                  {publishError && (
                    <div
                      role="alert"
                      className="rounded-xl bg-red-950/75 border border-red-400/50 p-3 text-xs text-red-100 flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                      <span>{publishError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label htmlFor="duke-event-slug" className="block text-xs font-semibold text-amber-200">
                      Endereço personalizado do link (slug)
                    </label>
                    <div className="flex items-center rounded-xl bg-black/55 border border-amber-400/35 overflow-hidden focus-within:border-amber-400">
                      <span className="px-3 py-2.5 text-xs font-mono text-emerald-200/65 bg-black/40 border-r border-amber-400/20 truncate max-w-[55%]">
                        {activeOrigin}/evento/
                      </span>
                      <input
                        id="duke-event-slug"
                        type="text"
                        value={customSlug}
                        onChange={(e) => setCustomSlug(e.target.value)}
                        placeholder={currentEvent?.slug || 'meu-evento-2026'}
                        className="flex-1 bg-transparent px-3 py-2.5 text-xs font-mono text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => void handleManualPublish()}
                      disabled={!currentEvent || publishing}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-xs cursor-pointer whitespace-nowrap disabled:opacity-45"
                    >
                      {publishing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Rocket className="w-4 h-4" />
                      )}
                      <span>
                        {publishing
                          ? 'Salvando e ativando link...'
                          : publishedRecord
                          ? 'Atualizar Evento Publicado'
                          : 'Publicar Evento & Gerar Link Agora'}
                      </span>
                    </button>

                    {currentEvent && (
                      <button
                        type="button"
                        onClick={handleDownloadEventHtml}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-black/50 hover:bg-black/75 border border-amber-400/30 text-xs font-semibold text-emerald-100 cursor-pointer whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-300" />
                        <span>Baixar HTML Pronto</span>
                      </button>
                    )}
                  </div>

                  {publishedRecord && (
                    <div className="pt-4 border-t border-amber-400/20 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                      <div className="sm:col-span-4 flex justify-center">
                        <div className="p-3 rounded-2xl bg-white">
                          <QRCodeSVG value={publishedRecord.url} size={136} />
                        </div>
                      </div>
                      <div className="sm:col-span-8 space-y-3">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                            <QrCode className="w-3.5 h-3.5" />
                            Link Fixo Gerado com Sucesso
                          </span>
                          <p className="mt-1 text-xs font-mono text-amber-200 break-all bg-black/50 border border-amber-400/25 rounded-lg p-2.5">
                            {publishedRecord.url}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyPublishedLink(publishedRecord.url)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs cursor-pointer whitespace-nowrap"
                          >
                            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedLink ? 'Link Copiado' : 'Copiar Link'}</span>
                          </button>

                          <a
                            href={publishedRecord.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs whitespace-nowrap"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Abrir em Nova Aba</span>
                          </a>

                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(
                              `Confira a programação oficial de "${currentEvent?.title || 'nosso evento'}": ${publishedRecord.url}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/50 hover:bg-black/75 border border-emerald-400/35 text-emerald-200 font-semibold text-xs whitespace-nowrap"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Divulgar no Zap</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {rightTab === 'saved' && (
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-xl font-bold text-white">
                      Eventos Publicados no Banco Firebase
                    </h2>
                    <p className="text-xs text-emerald-200/75">
                      Clique para editar novamente com o Robô Duque ou copie o link fixo para entrega.
                    </p>
                  </div>
                </div>

                {!firebaseUser ? (
                  <div className="rounded-2xl bg-[#07150f] border border-amber-400/30 p-6 text-center space-y-3">
                    <p className="text-sm text-emerald-100">
                      Entre com sua conta Google para visualizar e gerenciar seus eventos publicados.
                    </p>
                    <button
                      type="button"
                      onClick={handleSignInClick}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Entrar com Google</span>
                    </button>
                  </div>
                ) : myEvents.length === 0 ? (
                  <div className="rounded-2xl bg-[#07150f] border border-amber-400/25 p-6 text-center space-y-2">
                    <p className="text-sm font-semibold text-white">Nenhum evento publicado ainda</p>
                    <p className="text-xs text-emerald-200/75">
                      Converse com o Robô Duque no painel ao lado e clique em Publicar & Gerar Link.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myEvents.map((ev) => {
                      const evUrl = buildPublicEventUrl(ev.slug);
                      return (
                        <div
                          key={ev.id}
                          className="rounded-xl bg-[#07150f] border border-amber-400/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white truncate">{ev.title}</h3>
                              <span className="text-[10px] font-mono text-emerald-300">
                                {ev.city}/{ev.state}
                              </span>
                            </div>
                            <p className="text-xs text-emerald-200/75 truncate">
                              {ev.dateLabel} · {ev.panels?.length || 0} painéis · {ev.schedule?.length || 0} horários
                            </p>
                            <p className="text-[11px] font-mono text-amber-300/90 truncate">{evUrl}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleLoadSavedEvent(ev)}
                              className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs cursor-pointer whitespace-nowrap"
                            >
                              Editar no Chat
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyPublishedLink(evUrl)}
                              className="px-2.5 py-1.5 rounded-lg bg-black/50 hover:bg-black/75 border border-amber-400/30 text-emerald-100 text-xs font-semibold cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                            >
                              <Copy className="w-3 h-3 text-amber-300" />
                              <span>Link</span>
                            </button>
                            <a
                              href={evUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Abrir</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => void handleDeleteSavedEvent(ev)}
                              aria-label={`Excluir evento ${ev.title}`}
                              className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-400/35 text-red-200 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
