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
  Film,
  FolderKanban,
  Globe,
  Image as ImageIcon,
  ImagePlus,
  Link2,
  Loader2,
  LogIn,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Mic,
  MicOff,
  Music,
  Palette,
  Paperclip,
  Play,
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
  Video,
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
  DukeGeneratedVideo,
  DukeGpsRequest,
  DukeGraphicOverlay,
  DukeImageAspectRatio,
  DukeImageDesignSpec,
  DukeImageFrameStyle,
  DukeImageLayout,
  DukeLightFx,
  DukePhotoStyle,
  DukeQuickOption,
  DukeRelightPreset,
  DukeStudioMode,
  DukeVideoAspectRatio,
  DukeVideoMusicMood,
  DukeVideoSpec,
  DukeVideoVisualStyle,
  DukeWebSource,
  UserProfile,
} from '../types';
import {
  DUKE_10000_OPTIONS,
  DUKE_OPTION_CATEGORIES,
  DUKE_VIDEO_OPTIONS_COUNT,
  type DukeCatalogOption,
  type DukeOptionCategory,
} from '../data/duke200Options';
import { compressDataUrlForFirestoreBanner, renderDukeImageStudio } from '../utils/dukeImageStudio';
import { renderDukeVideoStudio } from '../utils/dukeVideoStudio';
import { DukeRichMessage } from './DukeRichMessage';
import { DukeGpsMapPanel } from './DukeGpsMapPanel';
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

const MODE_OPTIONS: Array<{ id: DukeStudioMode; label: string }> = [
  { id: 'auto', label: 'Automático' },
  { id: 'chat', label: 'Texto & Código' },
  { id: 'image', label: 'Foto & Arte' },
  { id: 'video', label: 'Vídeo IA' },
  { id: 'gps', label: 'GPS Maps' },
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
    'Olá! Sou o **Robô Duque da CONAE**. Busco no **Google automaticamente**, crio **Vídeos IA em HD prontos para assistir e baixar** (com **500 opções de vídeo** + conversão de qualquer uma das **10.000 opções**), tenho **GPS Google Maps ao vivo** para localizar qualquer endereço ou rota, e transformo suas fotos em **3 opções modernas** na hora!',
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
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
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
  const [generatedVideos, setGeneratedVideos] = useState<DukeGeneratedVideo[]>([]);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [renderingVideo, setRenderingVideo] = useState(false);
  const [videoRenderProgress, setVideoRenderProgress] = useState(0);
  const [activeGpsRequest, setActiveGpsRequest] = useState<DukeGpsRequest | null>(null);
  const [selectedChatVariantByMsg, setSelectedChatVariantByMsg] = useState<Record<string, number>>({});
  const [showOriginalCompare, setShowOriginalCompare] = useState(false);
  const [updatingLiveImage, setUpdatingLiveImage] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [appliedBannerId, setAppliedBannerId] = useState<string | null>(null);

  const [myEvents, setMyEvents] = useState<DukeEventRecord[]>([]);
  const [rightTab, setRightTab] = useState<'preview' | 'image' | 'video' | 'gps' | 'publish' | 'saved'>('preview');
  const [mobilePane, setMobilePane] = useState<'chat' | 'workspace'>('chat');
  const [copiedLink, setCopiedLink] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const [stagedAttachment, setStagedAttachment] = useState<StagedAttachment | null>(null);
  const [lastUploadedPhoto, setLastUploadedPhoto] = useState<{ name: string; dataUrl: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const [show200Catalog, setShow200Catalog] = useState(true);
  const [catalogCategory, setCatalogCategory] = useState<'Todas' | DukeOptionCategory>('Todas');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogScrollTop, setCatalogScrollTop] = useState(0);
  const catalogListRef = useRef<HTMLDivElement | null>(null);

  const CATALOG_ROW_HEIGHT = 68;
  const CATALOG_VIEWPORT_HEIGHT = 340;

  const filteredCatalogOptions = useMemo(() => {
    const q = catalogSearch
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return DUKE_10000_OPTIONS.filter((item) => {
      if (catalogCategory !== 'Todas' && item.category !== catalogCategory) return false;
      if (!q) return true;
      return item.searchText.includes(q);
    });
  }, [catalogCategory, catalogSearch]);

  useEffect(() => {
    setCatalogScrollTop(0);
    if (catalogListRef.current) {
      catalogListRef.current.scrollTop = 0;
    }
  }, [catalogCategory, catalogSearch]);

  const virtualCatalogWindow = useMemo(() => {
    const total = filteredCatalogOptions.length;
    const overscan = 6;
    const startIdx = Math.max(0, Math.floor(catalogScrollTop / CATALOG_ROW_HEIGHT) - overscan);
    const visibleCount = Math.ceil(CATALOG_VIEWPORT_HEIGHT / CATALOG_ROW_HEIGHT) + overscan * 2;
    const endIdx = Math.min(total, startIdx + visibleCount);
    return {
      totalHeight: total * CATALOG_ROW_HEIGHT,
      startIdx,
      endIdx,
      items: filteredCatalogOptions.slice(startIdx, endIdx),
    };
  }, [filteredCatalogOptions, catalogScrollTop]);

  const activeImageAsset = useMemo(
    () => generatedImages.find((img) => img.id === activeImageId) || generatedImages[0] || null,
    [generatedImages, activeImageId]
  );

  const activeVideoAsset = useMemo(
    () => generatedVideos.find((v) => v.id === activeVideoId) || generatedVideos[0] || null,
    [generatedVideos, activeVideoId]
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
        setLastUploadedPhoto({ name: file.name, dataUrl });
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

    // Automatically reuse the most recent uploaded photo whenever the user asks to modify/redesign a photo
    const normalizedForPhotoReuse = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const mentionsPhotoEdit =
      /\b(foto|imagem|muda|mudar|modifica|modificar|altera|alterar|reformula|reformular|desing|design|moderna|moderno|fundo|borda|moldura|brilho|neon|escreve na|escreva na|coloca na|coloque na|transforma|transformar)\b/.test(
        normalizedForPhotoReuse
      );
    const reusablePhoto =
      lastUploadedPhoto ||
      (activeImageAsset?.originalDataUrl
        ? { name: 'foto-atual.jpg', dataUrl: activeImageAsset.originalDataUrl }
        : null);
    const shouldAutoReusePhoto =
      !overrideSourceImage &&
      !stagedAttachment &&
      Boolean(reusablePhoto) &&
      (effectiveMode === 'image' || mentionsPhotoEdit);

    const activeAttachment: StagedAttachment | null = overrideSourceImage
      ? {
          name: overrideSourceImage.name,
          mimeType: 'image/jpeg',
          base64Data: overrideSourceImage.dataUrl.split(',')[1] || '',
          dataUrl: overrideSourceImage.dataUrl,
          isImage: true,
        }
      : stagedAttachment
        ? stagedAttachment
        : shouldAutoReusePhoto && reusablePhoto
          ? {
              name: reusablePhoto.name,
              mimeType: 'image/jpeg',
              base64Data: reusablePhoto.dataUrl.split(',')[1] || '',
              dataUrl: reusablePhoto.dataUrl,
              isImage: true,
            }
          : null;

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
    setShow200Catalog(false);
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
        modeUsed?: 'chat' | 'image' | 'video' | 'gps' | 'event';
        reply?: string;
        shouldPublish?: boolean;
        event?: DukeEventSpec;
        imageDesign?: DukeImageDesignSpec;
        imageVariants?: DukeImageDesignSpec[];
        videoSpec?: DukeVideoSpec;
        gpsRequest?: DukeGpsRequest;
        sources?: DukeWebSource[];
        quickOptions?: DukeQuickOption[];
      };
      try {
        payload = JSON.parse(rawText) as {
          error?: string;
          modeUsed?: 'chat' | 'image' | 'video' | 'gps' | 'event';
          reply?: string;
          shouldPublish?: boolean;
          event?: DukeEventSpec;
          imageDesign?: DukeImageDesignSpec;
          imageVariants?: DukeImageDesignSpec[];
          videoSpec?: DukeVideoSpec;
          gpsRequest?: DukeGpsRequest;
          sources?: DukeWebSource[];
          quickOptions?: DukeQuickOption[];
        };
      } catch {
        throw new Error(
          response.ok
            ? 'Resposta inesperada do servidor.'
            : `Falha no servidor de IA (HTTP ${response.status}). Verifique se o servidor /api/duke-evento/chat está ativo.`
        );
      }

      if (
        !response.ok ||
        (!payload.reply && !payload.event && !payload.imageDesign && !payload.videoSpec && !payload.gpsRequest)
      ) {
        throw new Error(
          payload.error || `Não foi possível processar seu pedido (HTTP ${response.status}).`
        );
      }

      const modeUsed =
        payload.modeUsed ||
        (payload.videoSpec
          ? 'video'
          : payload.gpsRequest
            ? 'gps'
            : payload.imageDesign
              ? 'image'
              : payload.event
                ? 'event'
                : 'chat');
      let publishedUrl: string | undefined;
      let generatedImage: DukeGeneratedAsset | undefined;
      let generatedBatch: DukeGeneratedAsset[] | undefined;
      let generatedVideo: DukeGeneratedVideo | undefined;
      let resolvedGpsRequest: DukeGpsRequest | undefined;

      if (modeUsed === 'video' && payload.videoSpec) {
        const sourcePhotoUrl =
          activeAttachment?.isImage && activeAttachment.dataUrl
            ? activeAttachment.dataUrl
            : undefined;
        setRenderingVideo(true);
        setVideoRenderProgress(4);
        try {
          const rendered = await renderDukeVideoStudio(
            payload.videoSpec,
            sourcePhotoUrl,
            (pct) => setVideoRenderProgress(pct)
          );
          const videoAsset: DukeGeneratedVideo = {
            id: `vid_${Date.now()}`,
            title: payload.videoSpec.title || 'Vídeo IA Robô Duque',
            aspectRatio: payload.videoSpec.aspectRatio || '9:16',
            videoUrl: rendered.videoUrl,
            mimeType: rendered.mimeType,
            fileExtension: rendered.fileExtension,
            thumbnailDataUrl: rendered.thumbnailDataUrl,
            durationSec: rendered.durationSec,
            sourcePhotoUrl,
            videoSpec: payload.videoSpec,
            createdAt: new Date().toISOString(),
          };
          generatedVideo = videoAsset;
          setGeneratedVideos((prev) => [videoAsset, ...prev].slice(0, 12));
          setActiveVideoId(videoAsset.id);
          setRightTab('video');
        } finally {
          setRenderingVideo(false);
          setVideoRenderProgress(0);
        }
      } else if (modeUsed === 'gps' && payload.gpsRequest) {
        resolvedGpsRequest = {
          ...payload.gpsRequest,
          requestId: `gps_${Date.now()}`,
        };
        setActiveGpsRequest(resolvedGpsRequest);
        setRightTab('gps');
        setMobilePane('workspace');
      } else if (modeUsed === 'image' && (payload.imageVariants?.length || payload.imageDesign)) {
        const specsToRender =
          Array.isArray(payload.imageVariants) && payload.imageVariants.length > 0
            ? payload.imageVariants.slice(0, 3)
            : payload.imageDesign
              ? [payload.imageDesign]
              : [];
        const sourcePhotoUrl = activeAttachment?.isImage ? activeAttachment.dataUrl : undefined;
        const baseTs = Date.now();
        const renderedAssets = await Promise.all(
          specsToRender.map(async (spec, idx) => {
            const renderedPng = await renderDukeImageStudio(spec, sourcePhotoUrl);
            const asset: DukeGeneratedAsset = {
              id: `img_${baseTs}_${idx}`,
              title: spec.title || `Opção ${idx + 1}`,
              mode: spec.mode,
              aspectRatio: spec.aspectRatio,
              resultDataUrl: renderedPng,
              originalDataUrl: sourcePhotoUrl,
              designSpec: spec,
              createdAt: new Date().toISOString(),
            };
            return asset;
          })
        );
        if (renderedAssets.length > 0) {
          generatedImage = renderedAssets[0];
          generatedBatch = renderedAssets;
          setGeneratedImages((prev) => [...renderedAssets, ...prev].slice(0, 18));
          setActiveImageId(renderedAssets[0].id);
          setShowOriginalCompare(false);
          setRightTab('image');
        }
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
          (modeUsed === 'video'
            ? 'Pronto! Seu vídeo em HD foi renderizado e está liberado para assistir e baixar abaixo.'
            : modeUsed === 'gps'
              ? 'Abri o GPS Google Maps ao vivo no painel ao lado com a localização solicitada.'
              : modeUsed === 'image'
                ? 'Pronto! Criei 3 opções modernas em alta definição para você escolher.'
                : 'Pronto! Veja as opções abaixo.'),
        createdAt: new Date().toISOString(),
        publishedUrl,
        generatedImage,
        generatedImages: generatedBatch,
        generatedVideo,
        gpsRequest: resolvedGpsRequest,
        sources: Array.isArray(payload.sources) && payload.sources.length > 0 ? payload.sources : undefined,
        quickOptions:
          Array.isArray(payload.quickOptions) && payload.quickOptions.length > 0
            ? payload.quickOptions
            : undefined,
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

  const handleDownloadGeneratedVideo = (asset: DukeGeneratedVideo) => {
    if (!asset.videoUrl) {
      setApiError('Este navegador não liberou a gravação direta do arquivo de vídeo. Tente no Chrome ou Edge.');
      return;
    }
    const a = document.createElement('a');
    a.href = asset.videoUrl;
    a.download = `${sanitizeSlug(asset.title)}.${asset.fileExtension || 'webm'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleRerenderActiveVideo = async (patch: Partial<DukeVideoSpec>) => {
    if (!activeVideoAsset || renderingVideo) return;
    const nextSpec: DukeVideoSpec = {
      ...activeVideoAsset.videoSpec,
      ...patch,
    };
    setRenderingVideo(true);
    setVideoRenderProgress(4);
    setApiError(null);
    try {
      const rendered = await renderDukeVideoStudio(
        nextSpec,
        activeVideoAsset.sourcePhotoUrl,
        (pct) => setVideoRenderProgress(pct)
      );
      const updatedAsset: DukeGeneratedVideo = {
        ...activeVideoAsset,
        id: `vid_${Date.now()}`,
        title: nextSpec.title || activeVideoAsset.title,
        aspectRatio: nextSpec.aspectRatio,
        videoUrl: rendered.videoUrl,
        mimeType: rendered.mimeType,
        fileExtension: rendered.fileExtension,
        thumbnailDataUrl: rendered.thumbnailDataUrl,
        durationSec: rendered.durationSec,
        videoSpec: nextSpec,
        createdAt: new Date().toISOString(),
      };
      setGeneratedVideos((prev) => [updatedAsset, ...prev].slice(0, 12));
      setActiveVideoId(updatedAsset.id);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Erro ao renderizar nova versão do vídeo.');
    } finally {
      setRenderingVideo(false);
      setVideoRenderProgress(0);
    }
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
    setLastUploadedPhoto(null);
    setInputValue('');
    setShow200Catalog(true);
    setMessages([
      {
        ...WELCOME_MESSAGE,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleRunCatalogOption = (opt: DukeCatalogOption) => {
    setStudioMode(opt.mode);
    setShow200Catalog(false);
    const activePhoto =
      stagedAttachment?.isImage && stagedAttachment.dataUrl
        ? { name: stagedAttachment.name, dataUrl: stagedAttachment.dataUrl }
        : lastUploadedPhoto
          ? lastUploadedPhoto
          : activeImageAsset?.originalDataUrl
            ? { name: 'foto-atual.jpg', dataUrl: activeImageAsset.originalDataUrl }
            : undefined;
    if ((opt.mode === 'image' || opt.mode === 'video') && activePhoto) {
      void handleSendMessage(opt.prompt, opt.mode, activePhoto);
    } else {
      void handleSendMessage(opt.prompt, opt.mode);
    }
  };

  const handleRunCatalogOptionAsVideo = (opt: DukeCatalogOption) => {
    setStudioMode('video');
    setShow200Catalog(false);
    const activePhoto =
      stagedAttachment?.isImage && stagedAttachment.dataUrl
        ? { name: stagedAttachment.name, dataUrl: stagedAttachment.dataUrl }
        : lastUploadedPhoto
          ? lastUploadedPhoto
          : activeImageAsset?.originalDataUrl
            ? { name: 'foto-atual.jpg', dataUrl: activeImageAsset.originalDataUrl }
            : undefined;
    const videoPrompt =
      opt.mode === 'video'
        ? opt.prompt
        : `Crie um vídeo animado profissional em HD (9:16) com trilha musical e 4 cenas impactantes baseado nesta opção: ${opt.title} — ${opt.prompt}`;
    if (activePhoto) {
      void handleSendMessage(videoPrompt, 'video', activePhoto);
    } else {
      void handleSendMessage(videoPrompt, 'video');
    }
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
      {(sending || publishing || renderingVideo) && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#020805]/74 backdrop-blur-sm p-6"
        >
          <div className="flex flex-col items-center text-center gap-5 max-w-sm w-full">
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

            <div className="rounded-2xl bg-[#06160f]/92 border border-amber-400/45 px-5 py-3.5 shadow-2xl space-y-2 w-full">
              <p className="font-display text-base sm:text-lg font-bold conae-gold-text">
                {renderingVideo
                  ? `Renderizando seu Vídeo HD (${videoRenderProgress}%)...`
                  : publishing
                    ? 'Salvando e gerando seu link oficial...'
                    : 'Construindo seu pedido agora...'}
              </p>
              <p className="text-xs text-emerald-100/85">
                {renderingVideo
                  ? 'Gravando cenas animadas em 30 FPS com trilha sonora para assistir e baixar.'
                  : publishing
                    ? 'Gravando no banco Firebase e ativando o endereço do seu evento.'
                    : 'Analisando seu pedido com Inteligência Artificial sob medida para você.'}
              </p>
              {renderingVideo && (
                <div className="w-full h-2 rounded-full bg-black/60 border border-amber-400/30 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-300 transition-all duration-150"
                    style={{ width: `${Math.max(5, videoRenderProgress)}%` }}
                  />
                </div>
              )}
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
      <div className="lg:hidden grid grid-cols-3 border-b border-amber-400/20 bg-[#06120c]">
        <button
          type="button"
          onClick={() => setMobilePane('chat')}
          className={`py-2.5 text-xs font-bold cursor-pointer ${
            mobilePane === 'chat'
              ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-400/10'
              : 'text-emerald-200/70'
          }`}
        >
          Chat Duque
        </button>
        <button
          type="button"
          onClick={() => {
            if (rightTab === 'gps') {
              setRightTab(generatedVideos.length > 0 ? 'video' : generatedImages.length > 0 ? 'image' : 'preview');
            }
            setMobilePane('workspace');
          }}
          className={`py-2.5 text-xs font-bold cursor-pointer ${
            mobilePane === 'workspace' && rightTab !== 'gps'
              ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-400/10'
              : 'text-emerald-200/70'
          }`}
        >
          Estúdio {generatedVideos.length > 0 ? `(${generatedVideos.length} Víd)` : currentEvent ? '✓' : ''}
        </button>
        <button
          type="button"
          onClick={() => {
            setRightTab('gps');
            setMobilePane('workspace');
          }}
          className={`py-2.5 text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1 ${
            mobilePane === 'workspace' && rightTab === 'gps'
              ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-400/10'
              : 'text-emerald-200/70'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>GPS Maps</span>
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

                  {(msg.generatedImages?.length || msg.generatedImage) && (() => {
                    const variants =
                      msg.generatedImages && msg.generatedImages.length > 0
                        ? msg.generatedImages
                        : msg.generatedImage
                          ? [msg.generatedImage]
                          : [];
                    const selectedIdx = Math.min(
                      selectedChatVariantByMsg[msg.id] ?? 0,
                      Math.max(0, variants.length - 1)
                    );
                    const currentVariant = variants[selectedIdx];
                    if (!currentVariant) return null;

                    return (
                      <div className="rounded-xl overflow-hidden border border-amber-400/45 bg-black/55 space-y-2.5 p-2.5">
                        {variants.length > 1 && (
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                              {variants.length} Opções Modernas
                            </span>
                            <div className="flex items-center gap-1">
                              {variants.map((v, vIdx) => (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedChatVariantByMsg((prev) => ({ ...prev, [msg.id]: vIdx }));
                                    setActiveImageId(v.id);
                                    setShowOriginalCompare(false);
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                                    selectedIdx === vIdx
                                      ? 'bg-amber-400 text-neutral-950'
                                      : 'bg-black/60 text-emerald-100 border border-white/15 hover:border-amber-400/60'
                                  }`}
                                >
                                  Opção {vIdx + 1}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="rounded-lg overflow-hidden bg-black/60">
                          <img
                            src={currentVariant.resultDataUrl}
                            alt={currentVariant.title}
                            referrerPolicy="no-referrer"
                            className="w-full max-h-64 object-contain block mx-auto"
                          />
                        </div>

                        {variants.length > 1 && (
                          <div className="grid grid-cols-3 gap-1.5">
                            {variants.map((v, vIdx) => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => {
                                  setSelectedChatVariantByMsg((prev) => ({ ...prev, [msg.id]: vIdx }));
                                  setActiveImageId(v.id);
                                  setShowOriginalCompare(false);
                                }}
                                className={`group relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all bg-black/60 ${
                                  selectedIdx === vIdx
                                    ? 'border-amber-400 ring-1 ring-amber-300/60'
                                    : 'border-white/15 opacity-80 hover:opacity-100 hover:border-amber-400/50'
                                }`}
                              >
                                <img
                                  src={v.resultDataUrl}
                                  alt={v.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-16 object-cover block"
                                />
                                <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] font-bold text-amber-200 py-0.5 text-center truncate px-1">
                                  Opção {vIdx + 1}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 px-0.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadGeneratedImage(currentVariant)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-[11px] cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Baixar PNG</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveImageId(currentVariant.id);
                              setRightTab('image');
                              setMobilePane('workspace');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-700/80 hover:bg-emerald-600 text-white font-semibold text-[11px] cursor-pointer"
                          >
                            <Wand2 className="w-3 h-3" />
                            <span>Editar Ao Vivo</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleApplyImageToEventBanner(currentVariant)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/60 hover:bg-black/80 border border-amber-400/35 text-amber-200 font-semibold text-[11px] cursor-pointer"
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>Capa do Evento</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {msg.generatedVideo && (
                    <div className="rounded-xl overflow-hidden border border-amber-400/50 bg-black/60 space-y-2.5 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 inline-flex items-center gap-1">
                          <Film className="w-3.5 h-3.5" />
                          Vídeo IA Pronto · {msg.generatedVideo.aspectRatio} · {msg.generatedVideo.durationSec}s
                        </span>
                        <span className="text-[10px] font-mono text-emerald-300 uppercase">
                          .{msg.generatedVideo.fileExtension}
                        </span>
                      </div>

                      <div className="rounded-lg overflow-hidden bg-black flex items-center justify-center">
                        {msg.generatedVideo.videoUrl ? (
                          <video
                            src={msg.generatedVideo.videoUrl}
                            poster={msg.generatedVideo.thumbnailDataUrl}
                            controls
                            playsInline
                            className="w-full max-h-72 object-contain block"
                          />
                        ) : (
                          <img
                            src={msg.generatedVideo.thumbnailDataUrl}
                            alt={msg.generatedVideo.title}
                            className="w-full max-h-64 object-contain block"
                          />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDownloadGeneratedVideo(msg.generatedVideo!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar Vídeo (.{msg.generatedVideo.fileExtension})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveVideoId(msg.generatedVideo!.id);
                            setRightTab('video');
                            setMobilePane('workspace');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-700/85 hover:bg-emerald-600 text-white font-semibold text-[11px] cursor-pointer"
                        >
                          <Video className="w-3 h-3" />
                          <span>Abrir Estúdio Vídeo</span>
                        </button>
                        {msg.generatedVideo.videoSpec.voiceoverScript && (
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleSpeakMessage(
                                `${msg.id}_vo`,
                                msg.generatedVideo!.videoSpec.voiceoverScript
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 border border-amber-400/35 text-amber-200 font-semibold text-[11px] cursor-pointer"
                          >
                            {speakingMsgId === `${msg.id}_vo` ? (
                              <VolumeX className="w-3 h-3" />
                            ) : (
                              <Volume2 className="w-3 h-3" />
                            )}
                            <span>{speakingMsgId === `${msg.id}_vo` ? 'Parar Voz' : 'Ouvir Narração'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {msg.gpsRequest && (
                    <div className="rounded-xl bg-emerald-950/60 border border-emerald-400/45 p-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-4 h-4 text-amber-300 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-amber-200 truncate">
                            GPS Google Maps: {msg.gpsRequest.label || msg.gpsRequest.query}
                          </p>
                          <p className="text-[10px] text-emerald-200/80">
                            {msg.gpsRequest.action === 'route'
                              ? 'Rota ativa no mapa GPS'
                              : msg.gpsRequest.action === 'my_location'
                                ? 'Localização atual em tempo real'
                                : 'Busca ao vivo no Google Maps'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveGpsRequest({
                            ...msg.gpsRequest!,
                            requestId: `gps_reopen_${Date.now()}`,
                          });
                          setRightTab('gps');
                          setMobilePane('workspace');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-[11px] cursor-pointer shrink-0"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Abrir no Mapa GPS</span>
                      </button>
                    </div>
                  )}

                  {msg.role === 'assistant' && msg.quickOptions && msg.quickOptions.length > 0 && (
                    <div className="pt-1.5 space-y-1.5 border-t border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/85 block">
                        Opções rápidas para escolher:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.quickOptions.map((opt, idx) => (
                          <button
                            key={`${msg.id}_opt_${idx}`}
                            type="button"
                            disabled={sending || renderingVideo}
                            onClick={() => {
                              const nextMode = opt.mode || studioMode;
                              if (opt.mode) setStudioMode(opt.mode);
                              const basePhoto =
                                msg.generatedImages?.[0]?.originalDataUrl ||
                                msg.generatedImage?.originalDataUrl ||
                                activeImageAsset?.originalDataUrl ||
                                lastUploadedPhoto?.dataUrl;
                              if ((opt.mode === 'image' || opt.mode === 'video') && basePhoto) {
                                void handleSendMessage(opt.prompt, opt.mode, {
                                  name: 'foto-atual.jpg',
                                  dataUrl: basePhoto,
                                });
                              } else {
                                void handleSendMessage(opt.prompt, nextMode);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-black/50 hover:bg-amber-400/20 border border-amber-400/35 hover:border-amber-400 text-[11px] font-semibold text-amber-200 hover:text-amber-100 text-left cursor-pointer transition-colors disabled:opacity-50"
                          >
                            {opt.label}
                          </button>
                        ))}
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

            {/* Scrollable 10,500-Option 1-Click Virtualized Catalog (500 AI Video Options + 10,000 Options, all convertible to Video) */}
            {show200Catalog && !sending && (
              <div className="pt-1">
                <div className="rounded-2xl bg-[#071610] border border-amber-400/40 p-3 space-y-2.5 shadow-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {DUKE_VIDEO_OPTIONS_COUNT} Vídeos IA + 10.000 Opções Prontas — 1 Clique
                        </span>
                      </p>
                      <p className="text-[10px] text-emerald-200/75">
                        Role para ler ({filteredCatalogOptions.length.toLocaleString('pt-BR')} de{' '}
                        {DUKE_10000_OPTIONS.length.toLocaleString('pt-BR')}) · Clique em <strong>Fazer</strong> ou{' '}
                        <strong>Vídeo</strong> em qualquer opção
                      </p>
                    </div>
                    {messages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setShow200Catalog(false)}
                        aria-label="Fechar lista de opções"
                        className="p-1 rounded-lg bg-black/50 hover:bg-black/80 border border-white/15 text-emerald-200 hover:text-white cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Instant Filter Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-amber-300/80 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Filtrar 500 vídeos + 10.000 opções (ex: vídeo reels, foto, convite, igreja, loja)..."
                      className="w-full rounded-xl bg-black/55 border border-amber-400/25 focus:border-amber-400 pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-emerald-200/45 focus:outline-none"
                    />
                    {catalogSearch && (
                      <button
                        type="button"
                        onClick={() => setCatalogSearch('')}
                        aria-label="Limpar busca"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-200/70 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Category Tabs (Horizontal Scroll) */}
                  <div className="flex items-center gap-1.5 overflow-x-auto conae-scroll pb-0.5">
                    <button
                      type="button"
                      onClick={() => setCatalogCategory('Todas')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                        catalogCategory === 'Todas'
                          ? 'bg-amber-400 text-neutral-950'
                          : 'bg-black/50 text-emerald-100/80 border border-amber-400/20 hover:border-amber-400/50'
                      }`}
                    >
                      Todas ({DUKE_10000_OPTIONS.length.toLocaleString('pt-BR')})
                    </button>
                    {DUKE_OPTION_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCatalogCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                          catalogCategory === cat
                            ? cat === 'Vídeos IA'
                              ? 'bg-amber-400 text-neutral-950'
                              : 'bg-emerald-600 text-white'
                            : cat === 'Vídeos IA'
                              ? 'bg-amber-400/15 text-amber-200 border border-amber-400/45 hover:bg-amber-400/25'
                              : 'bg-black/50 text-emerald-100/80 border border-amber-400/20 hover:border-amber-400/50'
                        }`}
                      >
                        {cat === 'Vídeos IA' ? `Vídeos IA (${DUKE_VIDEO_OPTIONS_COUNT})` : cat}
                      </button>
                    ))}
                  </div>

                  {/* Quick Jump Markers for navigating all 10,500 options effortlessly */}
                  {filteredCatalogOptions.length > 500 && (
                    <div className="flex items-center gap-1 overflow-x-auto conae-scroll">
                      <span className="text-[10px] text-emerald-200/60 shrink-0 pr-0.5">Ir para:</span>
                      {[0, 0.25, 0.5, 0.75, 0.99].map((ratio) => {
                        const targetIdx = Math.min(
                          filteredCatalogOptions.length - 1,
                          Math.floor(filteredCatalogOptions.length * ratio)
                        );
                        const labelNum = targetIdx + 1;
                        return (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => {
                              const nextTop = targetIdx * CATALOG_ROW_HEIGHT;
                              setCatalogScrollTop(nextTop);
                              if (catalogListRef.current) {
                                catalogListRef.current.scrollTop = nextTop;
                              }
                            }}
                            className="px-2 py-0.5 rounded-md bg-black/50 hover:bg-amber-400/20 border border-amber-400/25 text-[10px] font-mono font-bold text-amber-300 cursor-pointer whitespace-nowrap"
                          >
                            #{labelNum.toLocaleString('pt-BR')}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Smooth 60 FPS Virtualized Scrollable List (10,500 options with zero lag) */}
                  <div
                    ref={catalogListRef}
                    onScroll={(e) => setCatalogScrollTop(e.currentTarget.scrollTop)}
                    style={{ maxHeight: `${CATALOG_VIEWPORT_HEIGHT}px` }}
                    className="overflow-y-auto conae-scroll pr-1"
                  >
                    {filteredCatalogOptions.length === 0 ? (
                      <p className="text-center text-xs text-emerald-200/70 py-6">
                        Nenhuma opção encontrada para "{catalogSearch}".
                      </p>
                    ) : (
                      <div
                        className="relative w-full"
                        style={{ height: `${virtualCatalogWindow.totalHeight}px` }}
                      >
                        {virtualCatalogWindow.items.map((item, offsetIdx) => {
                          const realIndex = virtualCatalogWindow.startIdx + offsetIdx;
                          const isVideoItem = item.mode === 'video';
                          return (
                            <div
                              key={item.id}
                              style={{
                                position: 'absolute',
                                top: `${realIndex * CATALOG_ROW_HEIGHT}px`,
                                left: 0,
                                right: 0,
                                height: `${CATALOG_ROW_HEIGHT - 6}px`,
                              }}
                            >
                              <div className="w-full h-full rounded-xl bg-[#091c14] hover:bg-[#0f2c20] border border-amber-400/20 hover:border-amber-400/65 px-3 py-1.5 transition-colors flex items-center justify-between gap-2 group">
                                <button
                                  type="button"
                                  disabled={sending || renderingVideo}
                                  onClick={() => handleRunCatalogOption(item)}
                                  className="min-w-0 flex-1 text-left space-y-0.5 cursor-pointer disabled:opacity-50"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] font-bold text-amber-300/90 shrink-0">
                                      #{String(item.id).padStart(5, '0')}
                                    </span>
                                    <span className="text-xs font-bold text-white group-hover:text-amber-200 truncate">
                                      {item.title}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-emerald-200/75 leading-snug truncate">
                                    {item.description}
                                  </p>
                                </button>
                                <div className="flex items-center gap-1 shrink-0">
                                  {!isVideoItem && (
                                    <button
                                      type="button"
                                      disabled={sending || renderingVideo}
                                      onClick={() => handleRunCatalogOptionAsVideo(item)}
                                      title="Gerar Vídeo HD com IA a partir desta opção"
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-700/70 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer transition-colors disabled:opacity-50"
                                    >
                                      <Video className="w-3 h-3" />
                                      <span>Vídeo</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={sending || renderingVideo}
                                    onClick={() => handleRunCatalogOption(item)}
                                    className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-neutral-950 font-bold text-[10px] cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                                  >
                                    {isVideoItem && <Film className="w-3 h-3" />}
                                    <span>{isVideoItem ? 'Criar Vídeo' : 'Fazer'}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
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

          {/* Mode Switcher Bar + 200 Opções Toggle Button */}
          <div className="px-3 pt-2.5 pb-1.5 border-t border-amber-400/20 bg-[#040b08] flex items-center gap-1.5 overflow-x-auto conae-scroll">
            <button
              type="button"
              onClick={() => {
                setShow200Catalog((prev) => {
                  const next = !prev;
                  if (next) {
                    window.setTimeout(() => {
                      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }, 60);
                  }
                  return next;
                });
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer inline-flex items-center gap-1 transition-colors ${
                show200Catalog
                  ? 'bg-emerald-600 text-white border border-emerald-400'
                  : 'bg-amber-400/15 text-amber-200 hover:bg-amber-400/25 border border-amber-400/45'
              }`}
            >
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>10.500 Opções</span>
            </button>
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setStudioMode(opt.id);
                  if (opt.id === 'gps') {
                    setRightTab('gps');
                  } else if (opt.id === 'video') {
                    setRightTab('video');
                  }
                }}
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
                onClick={() => setRightTab('video')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                  rightTab === 'video'
                    ? 'bg-amber-400 text-neutral-950'
                    : 'bg-black/45 text-emerald-100 hover:bg-black/70 border border-amber-400/20'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Estúdio Vídeo ({generatedVideos.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setRightTab('gps')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                  rightTab === 'gps'
                    ? 'bg-amber-400 text-neutral-950'
                    : 'bg-black/45 text-emerald-100 hover:bg-black/70 border border-amber-400/20'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>GPS Maps</span>
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

                        <div className="space-y-1.5 md:col-span-2">
                          <span className="text-[11px] font-semibold text-emerald-200/80 block">
                            Design Moderno Direto na Própria Foto (Estilo IA)
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(
                              [
                                { id: 'studio_relight', label: 'Estúdio HDR', layout: 'full_bleed', relight: 'emerald_royal', fx: 'prism_beams', overlay: 'editorial_lines' },
                                { id: 'digital_art_pop', label: 'Arte Digital IA', layout: 'full_bleed', relight: 'cool_cyber', fx: 'neon_rings', overlay: 'glass_cards' },
                                { id: 'neon_modern', label: 'Neon Futurista', layout: 'full_bleed', relight: 'violet_aura', fx: 'neon_rings', overlay: 'cyber_hud' },
                                { id: 'editorial_cover', label: 'Capa de Revista', layout: 'full_bleed', relight: 'sunset_cinema', fx: 'studio_rim', overlay: 'editorial_lines' },
                                { id: 'golden_gala', label: 'Gala Dourada', layout: 'full_bleed', relight: 'warm_gold', fx: 'bokeh_orbs', overlay: 'luxury_crest' },
                                { id: 'backdrop_3d', label: 'Estúdio 3D + Fundo', layout: 'modern_backdrop', relight: 'warm_gold', fx: 'sun_flare', overlay: 'luxury_crest' },
                              ] as Array<{
                                id: DukePhotoStyle;
                                label: string;
                                layout: DukeImageLayout;
                                relight: DukeRelightPreset;
                                fx: DukeLightFx;
                                overlay: DukeGraphicOverlay;
                              }>
                            ).map((st) => (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() =>
                                  void handleLiveUpdateImageSpec({
                                    photoStyle: st.id,
                                    layout: st.layout,
                                    relightPreset: st.relight,
                                    lightFx: st.fx,
                                    graphicDesignOverlay: st.overlay,
                                    bokehDepth: st.id === 'backdrop_3d' ? 0.35 : 0.48,
                                    hdrClarity: 0.82,
                                  })
                                }
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                                  (activeImageAsset.designSpec.photoStyle || 'studio_relight') === st.id
                                    ? 'bg-amber-400 text-neutral-950'
                                    : 'bg-[#081711] text-emerald-100 border border-white/15 hover:border-amber-400/50'
                                }`}
                              >
                                {st.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <span className="text-[11px] font-semibold text-emerald-200/80 block">
                            Iluminação & Cor Cinematográfica na Foto
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(
                              [
                                { id: 'emerald_royal', label: 'Esmeralda Real' },
                                { id: 'warm_gold', label: 'Ouro Quente' },
                                { id: 'cool_cyber', label: 'Azul Cyber' },
                                { id: 'sunset_cinema', label: 'Pôr do Sol' },
                                { id: 'violet_aura', label: 'Aura Violeta' },
                                { id: 'noir_luxury', label: 'Cinema P&B' },
                              ] as Array<{ id: DukeRelightPreset; label: string }>
                            ).map((rl) => (
                              <button
                                key={rl.id}
                                type="button"
                                onClick={() => void handleLiveUpdateImageSpec({ relightPreset: rl.id })}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                                  (activeImageAsset.designSpec.relightPreset || 'emerald_royal') === rl.id
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-[#081711] text-emerald-100 border border-white/15 hover:border-amber-400/50'
                                }`}
                              >
                                {rl.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <span className="text-[11px] font-semibold text-emerald-200/80 block">
                            Fundo Atrás da Foto & Enquadramento
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(
                              [
                                { id: 'full_bleed', label: 'Foto Cheia Moderna' },
                                { id: 'modern_backdrop', label: 'Fundo Moderno 3D' },
                                { id: 'glass_showcase', label: 'Vidro Aurora' },
                                { id: 'luxury_frame', label: 'Moldura Luxo' },
                                { id: 'editorial_card', label: 'Card Editorial' },
                              ] as Array<{ id: DukeImageLayout; label: string }>
                            ).map((ly) => (
                              <button
                                key={ly.id}
                                type="button"
                                onClick={() => void handleLiveUpdateImageSpec({ layout: ly.id })}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                                  activeImageAsset.designSpec.layout === ly.id
                                    ? 'bg-amber-400 text-neutral-950'
                                    : 'bg-[#081711] text-emerald-100 border border-white/15 hover:border-amber-400/50'
                                }`}
                              >
                                {ly.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <span className="text-[11px] font-semibold text-emerald-200/80 block">
                            Bordas Inteligentes
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(
                              [
                                { id: 'luxury_bevel', label: 'Luxo Chanfrado' },
                                { id: 'glass_modern', label: 'Vidro Moderno' },
                                { id: 'gold_double', label: 'Ouro Duplo' },
                                { id: 'neon_glow', label: 'Brilho Neon' },
                                { id: 'minimal_white', label: 'Branco Clean' },
                                { id: 'none', label: 'Sem Borda' },
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

            {rightTab === 'video' && (
              <div className="max-w-4xl mx-auto space-y-5">
                {activeVideoAsset ? (
                  <div className="rounded-2xl bg-[#07150f] border border-amber-400/35 p-4 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                          <Film className="w-3.5 h-3.5" />
                          <span>
                            Vídeo HD Criado pela IA · {activeVideoAsset.aspectRatio} · {activeVideoAsset.durationSec}s
                          </span>
                        </p>
                        <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                          {activeVideoAsset.title}
                        </h2>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadGeneratedVideo(activeVideoAsset)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs cursor-pointer whitespace-nowrap"
                        >
                          <Download className="w-4 h-4" />
                          <span>Baixar Vídeo HD (.{activeVideoAsset.fileExtension})</span>
                        </button>
                        {activeVideoAsset.videoSpec.voiceoverScript && (
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleSpeakMessage(
                                `studio_vo_${activeVideoAsset.id}`,
                                activeVideoAsset.videoSpec.voiceoverScript
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs cursor-pointer whitespace-nowrap"
                          >
                            {speakingMsgId === `studio_vo_${activeVideoAsset.id}` ? (
                              <VolumeX className="w-3.5 h-3.5" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {speakingMsgId === `studio_vo_${activeVideoAsset.id}`
                                ? 'Parar Narração'
                                : 'Ouvir Narração IA'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Playable HD Video Player */}
                    <div className="rounded-xl overflow-hidden bg-black border border-amber-400/30 p-3 flex items-center justify-center">
                      {activeVideoAsset.videoUrl ? (
                        <video
                          key={activeVideoAsset.id}
                          src={activeVideoAsset.videoUrl}
                          poster={activeVideoAsset.thumbnailDataUrl}
                          controls
                          playsInline
                          className="max-h-[480px] w-auto max-w-full rounded-lg shadow-2xl"
                        />
                      ) : (
                        <div className="text-center space-y-2 py-8">
                          <img
                            src={activeVideoAsset.thumbnailDataUrl}
                            alt={activeVideoAsset.title}
                            className="max-h-[360px] mx-auto rounded-lg"
                          />
                          <p className="text-xs text-amber-200">
                            Seu navegador não suporta gravação de vídeo via MediaRecorder. Use Chrome ou Edge para baixar o vídeo animado.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Interactive Video Re-Render Controls (Format, Style, Music) */}
                    <div className="rounded-xl bg-black/45 border border-amber-400/25 p-4 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <SlidersHorizontal className="w-4 h-4 text-amber-300" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-200">
                            Personalizar & Renderizar Nova Versão do Vídeo
                          </h3>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-emerald-200/80 block">
                            Formato do Vídeo
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(
                              [
                                { id: '9:16', label: '9:16 Reels' },
                                { id: '16:9', label: '16:9 YouTube' },
                                { id: '1:1', label: '1:1 Feed' },
                              ] as Array<{ id: DukeVideoAspectRatio; label: string }>
                            ).map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                disabled={renderingVideo}
                                onClick={() => void handleRerenderActiveVideo({ aspectRatio: r.id })}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                                  activeVideoAsset.videoSpec.aspectRatio === r.id
                                    ? 'bg-amber-400 text-neutral-950'
                                    : 'bg-[#081711] text-emerald-100 border border-white/15 hover:border-amber-400/50'
                                }`}
                              >
                                {r.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <span className="text-[11px] font-semibold text-emerald-200/80 block">
                            Estilo Visual Cinematográfico
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(
                              [
                                { id: 'cinematic_gold', label: 'Ouro Cinema' },
                                { id: 'neon_cyber', label: 'Neon Cyber' },
                                { id: 'aurora_glass', label: 'Aurora Vidro' },
                                { id: 'royal_emerald', label: 'Esmeralda CONAE' },
                                { id: 'sunset_promo', label: 'Pôr do Sol' },
                                { id: 'editorial_noir', label: 'Noir Luxo' },
                              ] as Array<{ id: DukeVideoVisualStyle; label: string }>
                            ).map((st) => (
                              <button
                                key={st.id}
                                type="button"
                                disabled={renderingVideo}
                                onClick={() => void handleRerenderActiveVideo({ visualStyle: st.id })}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                                  activeVideoAsset.videoSpec.visualStyle === st.id
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-[#081711] text-emerald-100 border border-white/15 hover:border-amber-400/50'
                                }`}
                              >
                                {st.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5 md:col-span-3">
                          <span className="text-[11px] font-semibold text-emerald-200/80 flex items-center gap-1">
                            <Music className="w-3 h-3 text-amber-300" />
                            Trilha Sonora Sintetizada
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(
                              [
                                { id: 'epic_inspirational', label: 'Épico Inspirador' },
                                { id: 'modern_tech', label: 'Moderno Tech' },
                                { id: 'corporate_upbeat', label: 'Executivo Dinâmico' },
                                { id: 'worship_warm', label: 'Adoração Suave' },
                                { id: 'luxury_gala', label: 'Gala Sofisticada' },
                              ] as Array<{ id: DukeVideoMusicMood; label: string }>
                            ).map((mood) => (
                              <button
                                key={mood.id}
                                type="button"
                                disabled={renderingVideo}
                                onClick={() => void handleRerenderActiveVideo({ musicMood: mood.id })}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                                  activeVideoAsset.videoSpec.musicMood === mood.id
                                    ? 'bg-amber-400 text-neutral-950'
                                    : 'bg-[#081711] text-emerald-100 border border-white/15 hover:border-amber-400/50'
                                }`}
                              >
                                {mood.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Scenes Overview */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-white/10">
                        {activeVideoAsset.videoSpec.scenes.map((scene) => (
                          <div
                            key={scene.sceneNumber}
                            className="rounded-lg bg-[#081711] border border-amber-400/20 p-2.5 space-y-1"
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold text-amber-300">
                              <span>
                                CENA {scene.sceneNumber} · {scene.badge}
                              </span>
                              <span className="font-mono text-emerald-300">{scene.durationSec}s</span>
                            </div>
                            <p className="text-xs font-bold text-white leading-snug">{scene.headline}</p>
                            <p className="text-[11px] text-emerald-200/75 leading-snug">{scene.subheadline}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Video History Strip */}
                    {generatedVideos.length > 1 && (
                      <div className="pt-3 border-t border-amber-400/20 space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200/75">
                          Histórico de Vídeos Criados ({generatedVideos.length})
                        </p>
                        <div className="flex items-center gap-2.5 overflow-x-auto conae-scroll pb-1">
                          {generatedVideos.map((vid) => (
                            <button
                              key={vid.id}
                              type="button"
                              onClick={() => setActiveVideoId(vid.id)}
                              className={`shrink-0 w-24 h-20 rounded-xl overflow-hidden border-2 relative cursor-pointer transition-all ${
                                activeVideoAsset.id === vid.id
                                  ? 'border-amber-400 scale-105'
                                  : 'border-white/15 opacity-75 hover:opacity-100'
                              }`}
                            >
                              <img
                                src={vid.thumbnailDataUrl}
                                alt={vid.title}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute inset-0 bg-black/35 flex items-center justify-center">
                                <Play className="w-5 h-5 text-amber-300 fill-amber-300" />
                              </span>
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
                        <Film className="w-6 h-6" />
                      </div>
                      <h2 className="font-display text-2xl font-bold text-white">
                        Estúdio de Vídeos com Inteligência Artificial
                      </h2>
                      <p className="text-sm text-emerald-200/80 leading-relaxed">
                        Peça qualquer vídeo no chat — ou escolha entre as{' '}
                        <strong>{DUKE_VIDEO_OPTIONS_COUNT} opções exclusivas de vídeo</strong> e mais{' '}
                        <strong>10.000 opções</strong> conversíveis em vídeo com 1 clique! Cada vídeo é renderizado em HD com trilha sonora para assistir e baixar.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCatalogCategory('Vídeos IA');
                            setShow200Catalog(true);
                            setStudioMode('video');
                            setMobilePane('chat');
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs cursor-pointer"
                        >
                          <Film className="w-4 h-4" />
                          <span>Abrir 500 Opções de Vídeo IA</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {rightTab === 'gps' && (
              <DukeGpsMapPanel
                incomingRequest={activeGpsRequest}
                onAskRobotAboutPlace={(prompt) => {
                  setStudioMode('chat');
                  setMobilePane('chat');
                  void handleSendMessage(prompt, 'chat');
                }}
              />
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
