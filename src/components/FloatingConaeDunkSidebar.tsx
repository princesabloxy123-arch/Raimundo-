import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  Church,
  Crown,
  GraduationCap,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Pause,
  Plane,
  Play,
  Send,
  TrendingUp,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { CONAE_ASSETS, EXECUTIVES_TEAM } from '../data/conaeSeed';
import { GOL_PROMO_FLIGHTS } from '../data/golFlightsData';
import { LATAM_PROMO_FLIGHTS } from '../data/latamFlightsData';
import type {
  BenefitPartner,
  BusinessPortalRecord,
  CourseItem,
  EcclesiasticalPortalRecord,
  PartnerHotel,
  PublicAffiliate,
  ShareholderTreeNode,
  SponsorItem,
  TabId,
} from '../types';
import type { StateTreasuryStat, TreasuryBuyerHighlight } from '../utils/treasuryStateStats';
import { searchConaeDunkAppKnowledge, type ConaeDunkAnswer } from '../utils/conaeDunkSearch';
import { useLanguage } from '../i18n/LanguageContext';

type AuthorityTier = 'Presidente' | 'Exclusivo Diretor' | 'Acionista' | 'Afiliado';

interface ShareholderShowcaseItem {
  id: string;
  name: string;
  roleTitle: string;
  authority: AuthorityTier;
  state: string;
  photoUrl: string;
  percent: number;
  snecShares: number;
  note: string;
}

interface DunkSlide {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  speechText: string;
  avatarUrl?: string;
  metricLabel?: string;
  authority?: AuthorityTier;
  targetTab: TabId;
  ctaLabel: string;
}

interface FloatingConaeDunkSidebarProps {
  shareholderTree: ShareholderTreeNode[];
  buyerHighlights: TreasuryBuyerHighlight[];
  publicAffiliates: PublicAffiliate[];
  hotels: PartnerHotel[];
  courses: CourseItem[];
  benefitPartners: BenefitPartner[];
  sponsors?: SponsorItem[];
  stateStats?: StateTreasuryStat[];
  businessRecords: BusinessPortalRecord[];
  ecclesiasticalRecords: EcclesiasticalPortalRecord[];
  shareUnitPriceBRL: number;
  latestDailyQuotePercent: number;
  valuationBoostPercent: number;
  totalEquityBRL: number;
  totalSharesForSale: number;
  lockScreenActive?: boolean;
  onNavigateTab: (tab: TabId) => void;
}

const BASE_MARKET_CANDLES = [
  { o: 5.0, c: 5.0, h: 5.02, l: 4.99 },
  { o: 5.0, c: 5.0, h: 5.02, l: 4.99 },
  { o: 5.0, c: 5.0, h: 5.02, l: 4.99 },
  { o: 5.0, c: 5.0, h: 5.02, l: 4.99 },
  { o: 5.0, c: 5.0, h: 5.02, l: 4.99 },
  { o: 5.0, c: 5.0, h: 5.02, l: 4.99 },
  { o: 5.0, c: 5.0, h: 5.02, l: 4.99 },
];

const SpinningSnecCoin: React.FC<{ size?: 'xs' | 'sm' }> = ({ size = 'xs' }) => {
  const dim = size === 'sm' ? 'w-4 h-4 text-[5px]' : 'w-3.5 h-3.5 text-[4.5px]';
  return (
    <span
      className={`conae-snec-coin-spin ${dim} rounded-full items-center justify-center bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-700 border border-yellow-100/90 text-neutral-950 font-extrabold font-mono shadow-[0_0_6px_rgba(251,191,36,0.6)] shrink-0 select-none`}
      title="Criptomoeda SNEC / CNEC CONAE"
      aria-label="Moeda SNEC"
    >
      SNEC
    </span>
  );
};

const ConaeDunkRobotAvatar: React.FC<{ speaking: boolean }> = ({ speaking }) => (
  <div className="relative w-5 h-5 shrink-0 flex items-center justify-center">
    <svg
      viewBox="0 0 64 64"
      className="w-5 h-5 drop-shadow-[0_0_5px_rgba(16,185,129,0.55)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="dunkGoldMetalSm" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id="dunkEmeraldBodySm" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#065f46" />
          <stop offset="100%" stopColor="#022c22" />
        </linearGradient>
        <linearGradient id="dunkVisorSm" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <line x1="32" y1="5" x2="32" y2="13" stroke="url(#dunkGoldMetalSm)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="32" cy="5" r="3.2" fill="#fde047" />
      <rect x="6" y="24" width="6" height="14" rx="3" fill="url(#dunkGoldMetalSm)" />
      <rect x="52" y="24" width="6" height="14" rx="3" fill="url(#dunkGoldMetalSm)" />
      <rect
        x="11"
        y="13"
        width="42"
        height="36"
        rx="12"
        fill="url(#dunkEmeraldBodySm)"
        stroke="url(#dunkGoldMetalSm)"
        strokeWidth="2.6"
      />
      <rect x="16" y="21" width="32" height="14" rx="6" fill="#03120c" stroke="#f59e0b" strokeWidth="1.2" />
      <circle cx="25" cy="28" r="3.4" fill="url(#dunkVisorSm)" />
      <circle cx="39" cy="28" r="3.4" fill="url(#dunkVisorSm)" />
      <rect x="23" y="39" width="18" height="4" rx="2" fill="#03120c" stroke="#34d399" strokeWidth="0.9" />
      <line
        x1="26"
        y1="41"
        x2="38"
        y2="41"
        stroke={speaking ? '#fde047' : '#34d399'}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

export const FloatingConaeDunkSidebar: React.FC<FloatingConaeDunkSidebarProps> = ({
  shareholderTree,
  buyerHighlights,
  publicAffiliates,
  hotels,
  courses,
  benefitPartners,
  sponsors = [],
  stateStats = [],
  businessRecords,
  ecclesiasticalRecords,
  shareUnitPriceBRL,
  latestDailyQuotePercent,
  valuationBoostPercent,
  totalEquityBRL,
  totalSharesForSale,
  lockScreenActive = false,
  onNavigateTab,
}) => {
  const { isEn, tr } = useLanguage();
  const locale = isEn ? 'en-US' : 'pt-BR';

  const [minimized, setMinimized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });
  const [expandedWide, setExpandedWide] = useState(false);
  const [directoryTab, setDirectoryTab] = useState<'acionistas' | 'empresarial' | 'ministerial'>('acionistas');
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [marketTick, setMarketTick] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Big Microphone Voice Q&A State
  const [askModalOpen, setAskModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [questionInput, setQuestionInput] = useState('');
  const [micStatusMsg, setMicStatusMsg] = useState<string | null>(null);
  const [dunkAnswer, setDunkAnswer] = useState<ConaeDunkAnswer | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setMarketTick((t) => (t + 1) % 360);
    }, 1100);
    return () => window.clearInterval(id);
  }, []);

  const shareholderProfiles = useMemo<ShareholderShowcaseItem[]>(() => {
    const list: ShareholderShowcaseItem[] = [];

    EXECUTIVES_TEAM.forEach((exec, idx) => {
      const isPresident = exec.id === 'exec_helio' || idx === 0;
      list.push({
        id: exec.id,
        name: exec.name,
        roleTitle: exec.role,
        authority: isPresident ? 'Presidente' : 'Exclusivo Diretor',
        state: 'GO',
        photoUrl: exec.photo,
        percent: isPresident ? 35.0 : idx === 1 ? 15.0 : 12.5,
        snecShares: isPresident ? 35000 : idx === 1 ? 15000 : 12500,
        note: exec.highlight,
      });
    });

    shareholderTree
      .filter((n) => n.active !== false)
      .forEach((node) => {
        const isDir =
          node.branchTitle.toLowerCase().includes('conselheir') ||
          node.branchTitle.toLowerCase().includes('diret') ||
          node.sharePercent >= 3.0;
        list.push({
          id: `tree_${node.id}`,
          name: node.fullName,
          roleTitle: node.branchTitle,
          authority: isDir ? 'Exclusivo Diretor' : 'Acionista',
          state: node.state || 'BR',
          photoUrl: node.photoUrl || CONAE_ASSETS.emblemHeart,
          percent: Number(node.sharePercent || 0),
          snecShares: Number(node.sharesCount || 0),
          note: node.executionPowers,
        });
      });

    buyerHighlights.forEach((buyer) => {
      const already = list.some(
        (item) => item.name.toLowerCase() === buyer.buyerName.toLowerCase()
      );
      if (!already) {
        const pct = Number(((buyer.sharesCount / 100000) * 100).toFixed(2));
        list.push({
          id: `buyer_${buyer.id}`,
          name: buyer.buyerName,
          roleTitle: tr('Acionista SNEC/CNEC', 'SNEC/CNEC Shareholder'),
          authority: 'Acionista',
          state: buyer.state || 'BR',
          photoUrl: buyer.buyerPhotoUrl || CONAE_ASSETS.emblemHeart,
          percent: pct > 0 ? pct : 0.25,
          snecShares: buyer.sharesCount || 250,
          note: `${buyer.entryDate || 'CONAE'} · R$ ${buyer.amountBRL.toLocaleString(locale, { minimumFractionDigits: 0 })}`,
        });
      }
    });

    publicAffiliates.slice(0, 8).forEach((aff) => {
      const already = list.some(
        (item) => item.name.toLowerCase() === aff.displayName.toLowerCase()
      );
      if (!already) {
        const tierPct =
          aff.vipTier === 'Diamante' ? 1.0 : aff.vipTier === 'Ouro' ? 0.5 : aff.vipTier === 'Prata' ? 0.2 : 0.1;
        list.push({
          id: `aff_${aff.uid}`,
          name: aff.displayName,
          roleTitle: `Afiliado · ${aff.vipTier}`,
          authority: 'Afiliado',
          state: aff.state || 'BR',
          photoUrl: aff.photoUrl || CONAE_ASSETS.emblemHeart,
          percent: tierPct,
          snecShares: Math.round(tierPct * 1000),
          note: tr('Afiliado credenciado CONAE & SNEC.', 'Accredited CONAE & SNEC affiliate.'),
        });
      }
    });

    return list;
  }, [shareholderTree, buyerHighlights, publicAffiliates, locale, tr]);

  const businessAffiliates = useMemo(() => {
    const live = businessRecords.map((r) => ({
      id: r.id,
      name: r.title,
      detail: r.companyOrHotel || (r.recordType === 'plan_10_investment' ? 'Plano 10% CONAE' : 'Empresarial'),
      state: r.state || 'BR',
    }));

    const fallback = [
      { id: 'biz_seed_1', name: 'CONAE Palace Hotel', detail: 'Hotelaria · 60% OFF', state: 'GO' },
      { id: 'biz_seed_2', name: 'Grand Paulista Suites', detail: 'Empresarial · 50% OFF', state: 'SP' },
      { id: 'biz_seed_3', name: 'Rede Farmácias CONAE', detail: 'Cartão 3 Meses Plano 10%', state: 'BR' },
    ];

    return live.length > 0 ? [...live, ...fallback.slice(0, 2)] : fallback;
  }, [businessRecords]);

  const ministerialAffiliates = useMemo(() => {
    const live = ecclesiasticalRecords.map((r) => ({
      id: r.id,
      name: r.fullNameOrTitle,
      detail: `${r.ministryRole || 'Obreiro'} · ${r.churchName || 'CONAE'}`,
      state: r.state || 'BR',
    }));

    const fromAffiliates = publicAffiliates.slice(0, 5).map((aff) => ({
      id: `min_${aff.uid}`,
      name: aff.displayName,
      detail: `Ministerial · ${aff.vipTier}`,
      state: aff.state || 'BR',
    }));

    return [...live, ...fromAffiliates];
  }, [ecclesiasticalRecords, publicAffiliates]);

  const presentationSlides = useMemo<DunkSlide[]>(() => {
    const slides: DunkSlide[] = [];

    slides.push({
      id: 'dunk_intro',
      category: tr('Robô Oficial', 'Official Robot'),
      title: 'CONAE DUNK',
      subtitle: tr(
        `Apresento ${shareholderProfiles.length} acionistas SNEC, ${hotels.length} hotéis, ${courses.length} cursos e afiliados.`,
        `Presenting ${shareholderProfiles.length} SNEC shareholders, ${hotels.length} hotels & ${courses.length} courses.`
      ),
      speechText: `Olá! Eu sou o robô CONAE DUNK. Apresento nossos acionistas em SNEC, parceria de hotelaria, cursos, voos e afiliados empresariais e ministeriais.`,
      metricLabel: `SNEC R$ ${shareUnitPriceBRL.toFixed(2).replace('.', ',')}`,
      targetTab: 'acionistas',
      ctaLabel: tr('Acionistas', 'Shares'),
    });

    shareholderProfiles.slice(0, 8).forEach((sh) => {
      slides.push({
        id: `slide_sh_${sh.id}`,
        category: `${sh.authority} · ${sh.state}`,
        title: sh.name,
        subtitle: `${sh.percent.toFixed(1)}% (${sh.snecShares.toLocaleString(locale)} SNEC) · ${sh.roleTitle}`,
        speechText: `Apresentando ${sh.authority} ${sh.name}, com ${sh.percent.toFixed(1)} por cento em ações SNEC.`,
        avatarUrl: sh.photoUrl,
        metricLabel: `${sh.percent.toFixed(1)}% SNEC`,
        authority: sh.authority,
        targetTab: 'acionistas',
        ctaLabel: tr('Ver Perfil', 'Profile'),
      });
    });

    hotels
      .filter((h) => h.active !== false)
      .slice(0, 4)
      .forEach((hotel) => {
        slides.push({
          id: `slide_hotel_${hotel.id}`,
          category: tr('Hotelaria CONAE', 'CONAE Hotels'),
          title: `${hotel.name}`,
          subtitle: `${hotel.city}-${hotel.state} · ${hotel.discountPercent}% OFF para conveniados.`,
          speechText: `Parceria de hotelaria: ${hotel.name} em ${hotel.city}, com ${hotel.discountPercent} por cento de desconto.`,
          avatarUrl: hotel.photoUrl || CONAE_ASSETS.emblemHeart,
          metricLabel: `-${hotel.discountPercent}% OFF`,
          targetTab: 'hoteis',
          ctaLabel: tr('Hotelaria', 'Hotels'),
        });
      });

    slides.push({
      id: 'slide_gestao_empresarial',
      category: tr('Gestão Empresarial', 'Business Mgmt'),
      title: tr('Plano 10% & 3 Meses Cartão', '10% Plan & 3-Mo Card'),
      subtitle: tr(
        `Farmácias + Hotelaria + 50% Cursos e ${businessAffiliates.length} afiliados empresariais.`,
        `Pharmacies + Hotels + 50% Courses and ${businessAffiliates.length} business affiliates.`
      ),
      speechText: `Gestão Empresarial CONAE: Plano dez por cento com três meses de cartão de desconto em farmácias e hotelaria e cinquenta por cento nos cursos.`,
      metricLabel: 'Plano 10%',
      targetTab: 'gestao_empresarial',
      ctaLabel: tr('Empresarial', 'Business'),
    });

    slides.push({
      id: 'slide_gestao_ministerial',
      category: tr('Gestão Ministerial', 'Ministerial Mgmt'),
      title: tr('Obreiros & Eventos', 'Ministers & Events'),
      subtitle: tr(
        `${ministerialAffiliates.length} obreiros com cursos, hotéis e voos GOL/TAM com desconto.`,
        `${ministerialAffiliates.length} ministers with courses, hotels, and GOL/TAM deals.`
      ),
      speechText: `Gestão Ministerial e Eclesiástica: credenciamento de obreiros, eventos de ministério, cursos e pacotes aéreos com desconto.`,
      metricLabel: `${ministerialAffiliates.length} Obreiros`,
      targetTab: 'gestao_eclesiastica',
      ctaLabel: tr('Ministerial', 'Ministry'),
    });

    const bestGol = GOL_PROMO_FLIGHTS[0];
    const bestTam = LATAM_PROMO_FLIGHTS[0];
    slides.push({
      id: 'slide_ecossistema_completo',
      category: tr('Ecossistema CONAE', 'CONAE Ecosystem'),
      title: tr('Cursos, Voos & Descontos', 'Courses, Flights & Perks'),
      subtitle: tr(
        `${courses.length} cursos, ${benefitPartners.length} parceiros, GOL R$ ${bestGol.promoPriceBRL} e TAM R$ ${bestTam.promoPriceBRL}.`,
        `${courses.length} courses, ${benefitPartners.length} partners, GOL R$ ${bestGol.promoPriceBRL} & TAM R$ ${bestTam.promoPriceBRL}.`
      ),
      speechText: `Tudo no CONAE: cursos, rede de farmácias e passagens aéreas GOL e TAM com desconto.`,
      metricLabel: 'GOL · TAM',
      targetTab: 'cursos',
      ctaLabel: tr('Cursos', 'Courses'),
    });

    return slides;
  }, [
    shareholderProfiles,
    hotels,
    courses,
    benefitPartners,
    businessAffiliates.length,
    ministerialAffiliates.length,
    shareUnitPriceBRL,
    locale,
    tr,
  ]);

  const safeSlideIndex = presentationSlides.length > 0 ? slideIndex % presentationSlides.length : 0;
  const activeSlide = presentationSlides[safeSlideIndex];

  useEffect(() => {
    if (!isPlaying || minimized || presentationSlides.length <= 1) return;
    const id = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % presentationSlides.length);
    }, 6500);
    return () => window.clearInterval(id);
  }, [isPlaying, minimized, presentationSlides.length]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!voiceEnabled || minimized || !activeSlide) {
      window.speechSynthesis.cancel();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(activeSlide.speechText);
      utter.lang = isEn ? 'en-US' : 'pt-BR';
      utter.rate = 1.02;
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore speech synthesis errors
    }
    return () => {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [voiceEnabled, minimized, activeSlide, isEn]);

  const liveMarket = useMemo(() => {
    const scale = shareUnitPriceBRL > 0 ? shareUnitPriceBRL / 4.95 : 1;
    const boost = 1 + valuationBoostPercent / 100;
    const candles = BASE_MARKET_CANDLES.map((c, idx) => {
      const wave = Math.sin(marketTick * 0.45 + idx * 0.9) * 0.04;
      const o = Number((c.o * scale * boost + wave * 0.5).toFixed(2));
      const close = Number((c.c * scale * boost + wave).toFixed(2));
      const h = Number((Math.max(o, close) + 0.06 * scale).toFixed(2));
      const l = Number((Math.min(o, close) - 0.05 * scale).toFixed(2));
      return { o, c: close, h, l, up: close >= o };
    });
    const lastPrice = candles[candles.length - 1]?.c ?? shareUnitPriceBRL;
    const minVal = Math.min(...candles.map((x) => x.l)) * 0.99;
    const maxVal = Math.max(...candles.map((x) => x.h)) * 1.01;
    const span = maxVal - minVal || 1;
    const w = 132;
    const h = 22;
    const padX = 5;
    const padY = 3;
    const step = (w - padX * 2) / Math.max(1, candles.length - 1);
    const toY = (v: number) => padY + (1 - (v - minVal) / span) * (h - padY * 2);

    const linePath = candles
      .map((c, i) => `${i === 0 ? 'M' : 'L'} ${(padX + i * step).toFixed(1)} ${toY(c.c).toFixed(1)}`)
      .join(' ');

    return { candles, lastPrice, linePath, step, padX, toY, w, h };
  }, [shareUnitPriceBRL, valuationBoostPercent, marketTick]);

  const handleFocusShareholder = (sh: ShareholderShowcaseItem) => {
    const idx = presentationSlides.findIndex((s) => s.id === `slide_sh_${sh.id}`);
    setSlideIndex(idx >= 0 ? idx : 0);
  };

  const authorityAccent = (auth: AuthorityTier) => {
    if (auth === 'Presidente') return 'text-amber-300';
    if (auth === 'Exclusivo Diretor') return 'text-yellow-200';
    if (auth === 'Acionista') return 'text-emerald-300';
    return 'text-emerald-100/80';
  };

  const speakAnswer = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = isEn ? 'en-US' : 'pt-BR';
      utter.rate = 1.03;
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore speech synthesis failures
    }
  };

  const runDunkQuestion = (queryText: string, speakOut = true) => {
    const cleaned = queryText.trim();
    const result = searchConaeDunkAppKnowledge(cleaned, {
      shareholderTree,
      buyerHighlights,
      publicAffiliates,
      hotels,
      courses,
      benefitPartners,
      sponsors,
      businessRecords,
      ecclesiasticalRecords,
      stateStats,
      shareUnitPriceBRL,
      latestDailyQuotePercent,
      valuationBoostPercent,
      totalEquityBRL,
      totalSharesForSale,
      isEn,
    });
    setDunkAnswer(result);
    setMicStatusMsg(null);
    if (speakOut) {
      speakAnswer(result.answerText);
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop errors
    }
    recognitionRef.current = null;
    setIsListening(false);
  };

  const handlePressBigMic = () => {
    setAskModalOpen(true);

    if (isListening) {
      stopListening();
      return;
    }

    type SpeechRecCtor = new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onstart: (() => void) | null;
      onend: (() => void) | null;
      onerror: ((ev: { error?: string }) => void) | null;
      onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null;
      start: () => void;
      stop: () => void;
    };

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecCtor;
      webkitSpeechRecognition?: SpeechRecCtor;
    };
    const SpeechRecognitionApi = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setMicStatusMsg(
        tr(
          'Microfone por voz indisponível neste navegador. Digite sua pergunta abaixo para o CONAE DUNK responder.',
          'Voice recognition is unavailable in this browser. Type your question below for CONAE DUNK.'
        )
      );
      return;
    }

    try {
      const rec = new SpeechRecognitionApi();
      rec.lang = isEn ? 'en-US' : 'pt-BR';
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      let latestTranscript = '';

      rec.onstart = () => {
        setIsListening(true);
        setMicStatusMsg(
          tr('Ouvindo sua pergunta... fale agora!', 'Listening to your question... speak now!')
        );
      };

      rec.onresult = (event) => {
        let combined = '';
        let hasFinal = false;
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res?.[0]?.transcript) {
            combined += res[0].transcript;
          }
          if (res?.isFinal) hasFinal = true;
        }
        latestTranscript = combined.trim();
        setQuestionInput(latestTranscript);
        if (hasFinal && latestTranscript) {
          runDunkQuestion(latestTranscript, true);
        }
      };

      rec.onerror = (ev) => {
        setIsListening(false);
        recognitionRef.current = null;
        if (ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed') {
          setMicStatusMsg(
            tr(
              'Permita o microfone no navegador ou digite sua pergunta abaixo para o CONAE DUNK.',
              'Allow microphone access or type your question below for CONAE DUNK.'
            )
          );
        } else {
          setMicStatusMsg(
            tr(
              'Não consegui captar o áudio. Aperte o microfone novamente ou digite sua pergunta.',
              'Could not capture audio. Press the microphone again or type your question.'
            )
          );
        }
      };

      rec.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
        if (latestTranscript) {
          runDunkQuestion(latestTranscript, true);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsListening(false);
      setMicStatusMsg(
        tr(
          'Digite sua pergunta abaixo que o CONAE DUNK busca a resposta em todo o aplicativo.',
          'Type your question below and CONAE DUNK will search the entire app.'
        )
      );
    }
  };

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  const handleQuestionFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim()) return;
    stopListening();
    runDunkQuestion(questionInput, true);
  };

  const quickTopics = [
    tr('Cotação SNEC', 'SNEC Quote'),
    tr('Hotéis com desconto', 'Partner Hotels'),
    tr('Plano 10%', '10% Plan'),
    tr('Gestão Eclesiástica', 'Ecclesiastical Mgmt'),
    tr('Voos GOL e TAM', 'GOL & TAM Flights'),
    tr('Cursos CONAE', 'CONAE Courses'),
  ];

  // Big Microphone Button + Floating Voice Q&A Answer Popover (always accessible at bottom-left)
  const bigMicOverlay = (
    <>
      {askModalOpen && (
        <div
          role="dialog"
          aria-label={tr('Perguntar ao Robô CONAE DUNK', 'Ask Robot CONAE DUNK')}
          className="fixed left-2 sm:left-3 bottom-[84px] sm:bottom-[92px] z-[70] w-[292px] sm:w-[340px] max-w-[calc(100vw-16px)] rounded-2xl bg-[#06140e]/95 backdrop-blur-md border border-amber-400/65 shadow-[0_20px_60px_rgba(0,0,0,0.82)] p-3 space-y-2.5 text-emerald-50"
        >
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-amber-400/25">
            <div className="flex items-center gap-2 min-w-0">
              <ConaeDunkRobotAvatar speaking={isListening || Boolean(dunkAnswer)} />
              <div className="leading-tight min-w-0">
                <p className="font-display text-xs font-bold conae-gold-text truncate">
                  {tr('Pergunte ao CONAE DUNK', 'Ask CONAE DUNK')}
                </p>
                <p className="text-[10px] text-emerald-200/80 truncate">
                  {tr('Busca respostas em todo o aplicativo', 'Searches answers across the entire app')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                stopListening();
                setAskModalOpen(false);
              }}
              aria-label={tr('Fechar perguntas', 'Close Q&A')}
              className="p-1 rounded-md bg-black/55 border border-amber-400/25 text-emerald-200 hover:text-white cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Centered Big Interactive Mic inside Q&A drawer */}
          <div className="flex flex-col items-center gap-1.5 py-1">
            <button
              type="button"
              onClick={handlePressBigMic}
              className={`relative w-16 h-16 rounded-full flex items-center justify-center border-2 transition-transform active:scale-95 cursor-pointer shadow-xl ${
                isListening
                  ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-amber-400 text-neutral-950 border-yellow-200 shadow-[0_0_28px_rgba(52,211,153,0.85)]'
                  : 'bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-neutral-950 border-yellow-100 hover:brightness-110 shadow-[0_0_22px_rgba(245,158,11,0.65)]'
              }`}
              aria-label={
                isListening
                  ? tr('Parar gravação do microfone', 'Stop microphone recording')
                  : tr('Apertar microfone para falar com CONAE DUNK', 'Press microphone to speak to CONAE DUNK')
              }
            >
              {isListening && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full border-2 border-emerald-300 animate-ping opacity-75"
                />
              )}
              {isListening ? (
                <MicOff className="w-8 h-8 relative z-10" />
              ) : (
                <Mic className="w-8 h-8 relative z-10" />
              )}
            </button>
            <p className="text-[11px] font-semibold text-amber-200 text-center">
              {isListening
                ? tr('Ouvindo... aperte para finalizar', 'Listening... tap to finish')
                : tr('Aperte o microfone grande e faça sua pergunta', 'Press the big microphone and ask anything')}
            </p>
            {micStatusMsg && (
              <p className="text-[10px] text-emerald-200/85 text-center leading-snug">{micStatusMsg}</p>
            )}
          </div>

          {/* Text Input Fallback so user can also type or edit voice transcript */}
          <form onSubmit={handleQuestionFormSubmit} className="flex items-center gap-1.5">
            <input
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder={tr('Ou digite sua pergunta aqui...', 'Or type your question here...')}
              className="flex-1 min-w-0 rounded-lg bg-black/65 border border-amber-400/35 px-2.5 py-1.5 text-xs text-white placeholder:text-emerald-200/45 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              aria-label={tr('Enviar pergunta', 'Send question')}
              className="p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Suggestion Buttons */}
          <div className="flex flex-wrap gap-1">
            {quickTopics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => {
                  setQuestionInput(topic);
                  runDunkQuestion(topic, true);
                }}
                className="px-2 py-0.5 rounded-md bg-emerald-950/75 hover:bg-emerald-900 border border-amber-400/25 text-[10px] text-emerald-100 cursor-pointer"
              >
                {topic}
              </button>
            ))}
          </div>

          {/* CONAE DUNK Answer Box */}
          {dunkAnswer && (
            <div className="rounded-xl bg-black/60 border border-emerald-400/40 p-2.5 space-y-1.5 max-h-[185px] overflow-y-auto conae-scroll">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-amber-300 leading-tight">{dunkAnswer.title}</p>
                <button
                  type="button"
                  onClick={() => speakAnswer(dunkAnswer.answerText)}
                  title={tr('Ouvir resposta novamente', 'Listen again')}
                  className="p-1 rounded bg-emerald-950/80 border border-emerald-400/35 text-emerald-200 hover:text-white cursor-pointer shrink-0"
                >
                  <Volume2 className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[11px] text-emerald-50/90 leading-relaxed">{dunkAnswer.answerText}</p>
              {dunkAnswer.highlights.length > 0 && (
                <div className="text-[10px] text-amber-200/90 space-y-0.5 pt-1 border-t border-white/10">
                  {dunkAnswer.highlights.map((h, i) => (
                    <p key={`hl_${i}`} className="truncate">
                      • {h}
                    </p>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  onNavigateTab(dunkAnswer.targetTab);
                  setAskModalOpen(false);
                }}
                className="w-full mt-1 py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-xs inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>{dunkAnswer.ctaLabel}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (minimized) {
    return (
      <>
        {bigMicOverlay}
        <div
          className={`fixed left-1.5 sm:left-2.5 bottom-3 ${
            lockScreenActive ? 'z-[60]' : 'z-40'
          } flex items-end gap-2 conae-dunk-float`}
        >
          {/* Big Microphone Button directly on bottom-left */}
          <button
            type="button"
            onClick={handlePressBigMic}
            title={tr(
              'Aperte o microfone grande para perguntar ao robô CONAE DUNK',
              'Press the big microphone to ask robot CONAE DUNK'
            )}
            aria-label={tr('Perguntar por voz ao CONAE DUNK', 'Ask CONAE DUNK by voice')}
            className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center border-2 transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${
              isListening
                ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-amber-400 text-neutral-950 border-yellow-200 shadow-[0_0_24px_rgba(52,211,153,0.85)]'
                : 'bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-neutral-950 border-yellow-100 shadow-[0_0_20px_rgba(245,158,11,0.65)]'
            }`}
          >
            {isListening && (
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full border-2 border-emerald-300 animate-ping opacity-75"
              />
            )}
            <Mic className="w-7 h-7 sm:w-8 sm:h-8 relative z-10" />
            <span className="text-[7.5px] font-extrabold uppercase tracking-tight leading-none relative z-10">
              {isListening ? tr('Ouvindo', 'Live') : tr('Falar', 'Ask')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="conae-panel rounded-lg px-2 py-1.5 flex items-center gap-1 shadow-xl border border-amber-400/60 hover:border-amber-300 transition-colors cursor-pointer"
            title={tr('Abrir CONAE DUNK & Cotação SNEC', 'Open CONAE DUNK & SNEC Quotes')}
          >
            <SpinningSnecCoin size="xs" />
            <span className="text-[9px] font-bold text-amber-300 whitespace-nowrap">
              CONAE DUNK
            </span>
            <Maximize2 className="w-2.5 h-2.5 text-amber-300 shrink-0" />
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {bigMicOverlay}
      <div
        className={`fixed left-1.5 sm:left-2.5 bottom-3 ${
          lockScreenActive ? 'z-[60]' : 'z-40'
        } flex items-end gap-2 conae-dunk-float`}
      >
        <aside
          aria-label={tr(
            'Menu flutuante inferior esquerdo compacto CONAE DUNK e Cotação SNEC',
            'Ultra-compact bottom-left floating CONAE DUNK and SNEC Quotes panel'
          )}
          className={`${
            expandedWide ? 'w-[214px] sm:w-[230px]' : 'w-[144px] sm:w-[154px]'
          } max-h-[252px] flex flex-col conae-panel rounded-xl border border-amber-400/55 shadow-[0_12px_32px_rgba(0,0,0,0.72)] overflow-hidden`}
        >
      {/* Ultra-Compact Header */}
      <div className="px-1.5 py-1 bg-gradient-to-r from-emerald-950/95 via-black/90 to-amber-950/75 border-b border-amber-400/30 flex items-center justify-between gap-1 shrink-0">
        <div className="flex items-center gap-1 min-w-0">
          <ConaeDunkRobotAvatar speaking={isPlaying} />
          <div className="min-w-0 leading-none">
            <div className="flex items-center gap-0.5">
              <span className="font-display text-[9px] font-bold conae-gold-text truncate">
                CONAE DUNK
              </span>
              <SpinningSnecCoin size="xs" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setVoiceEnabled((v) => !v)}
            title={voiceEnabled ? tr('Silenciar voz', 'Mute voice') : tr('Ouvir CONAE DUNK', 'Hear CONAE DUNK')}
            aria-label={voiceEnabled ? tr('Silenciar voz', 'Mute voice') : tr('Ativar voz', 'Enable voice')}
            className={`p-0.5 rounded border cursor-pointer ${
              voiceEnabled
                ? 'bg-amber-500 text-neutral-950 border-amber-300'
                : 'bg-black/55 text-emerald-200/80 border-amber-400/20 hover:text-white'
            }`}
          >
            {voiceEnabled ? <Volume2 className="w-2.5 h-2.5" /> : <VolumeX className="w-2.5 h-2.5" />}
          </button>
          <button
            type="button"
            onClick={() => setExpandedWide((prev) => !prev)}
            title={expandedWide ? tr('Reduzir largura', 'Narrow width') : tr('Ampliar largura', 'Wider width')}
            aria-label={expandedWide ? tr('Reduzir largura', 'Narrow width') : tr('Ampliar largura', 'Wider width')}
            className="hidden sm:inline-flex p-0.5 rounded bg-black/55 border border-amber-400/20 text-emerald-200/80 hover:text-white cursor-pointer"
          >
            <Maximize2 className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            title={tr('Minimizar', 'Minimize')}
            aria-label={tr('Minimizar', 'Minimize')}
            className="p-0.5 rounded bg-black/55 border border-amber-400/20 text-amber-300 hover:text-white cursor-pointer"
          >
            <Minimize2 className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Compact Scrollable Body */}
      <div className="p-1 space-y-1 overflow-y-auto conae-scroll">
        {/* 1. Barra de Rolamento Horizontal: Perfis + Moeda SNEC Girando + % + Autoridade */}
        <div className="marquee-wrapper overflow-hidden rounded-lg bg-black/60 border border-amber-400/30 py-1 px-0.5">
          <div className="animate-marquee-shareholders flex items-center gap-1.5">
            {[...shareholderProfiles, ...shareholderProfiles].map((sh, idx) => (
              <button
                key={`rail_sm_${sh.id}_${idx}`}
                type="button"
                onClick={() => handleFocusShareholder(sh)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/75 hover:bg-emerald-900/85 border border-amber-400/30 cursor-pointer shrink-0 text-left"
                title={`${sh.name} · ${sh.authority} · ${sh.percent.toFixed(1)}% SNEC`}
              >
                <span className="w-5 h-5 rounded-full border border-amber-400/80 overflow-hidden bg-black/70 shrink-0 block">
                  {!failedImages[sh.id] ? (
                    <img
                      src={sh.photoUrl}
                      alt={sh.name}
                      referrerPolicy="no-referrer"
                      onError={() => setFailedImages((prev) => ({ ...prev, [sh.id]: true }))}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-[7px] font-bold text-amber-300">
                      {sh.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="leading-none">
                  <span className="flex items-center gap-0.5">
                    <span className="text-[8.5px] font-bold text-white max-w-[66px] truncate">
                      {sh.name.split(' ')[0]}
                    </span>
                    <SpinningSnecCoin size="xs" />
                  </span>
                  <span className="flex items-center gap-0.5 text-[7.5px] font-mono tabular-nums mt-0.5">
                    <span className="text-amber-300 font-bold">{sh.percent.toFixed(1)}%</span>
                    <span className={`font-sans ${authorityAccent(sh.authority)}`}>
                      {sh.authority === 'Exclusivo Diretor' ? 'Dir.Excl' : sh.authority}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Mini Apresentação CONAE DUNK */}
        {activeSlide && (
          <div className="rounded-lg bg-gradient-to-br from-emerald-950/85 via-black/80 to-amber-950/40 border border-amber-400/35 p-1.5 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[8px] font-semibold text-amber-300 truncate">
                {activeSlide.category}
              </span>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setSlideIndex((prev) => (prev - 1 + presentationSlides.length) % presentationSlides.length)
                  }
                  aria-label={tr('Anterior', 'Previous')}
                  className="p-0.5 rounded bg-black/55 text-emerald-200 hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-2.5 h-2.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  aria-label={isPlaying ? tr('Pausar', 'Pause') : tr('Iniciar', 'Play')}
                  className="p-0.5 rounded bg-amber-500 text-neutral-950 hover:bg-amber-400 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setSlideIndex((prev) => (prev + 1) % presentationSlides.length)}
                  aria-label={tr('Próximo', 'Next')}
                  className="p-0.5 rounded bg-black/55 text-emerald-200 hover:text-white cursor-pointer"
                >
                  <ChevronRight className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

            <div className="flex items-start gap-1.5">
              {activeSlide.avatarUrl && (
                <div className="w-6 h-6 rounded-full border border-amber-400/75 overflow-hidden bg-black/60 shrink-0">
                  <img
                    src={activeSlide.avatarUrl}
                    alt={activeSlide.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[9.5px] font-bold text-white leading-tight truncate">
                  {activeSlide.title}
                </p>
                <p className="text-[8.5px] text-emerald-100/80 leading-snug line-clamp-2 mt-0.5">
                  {activeSlide.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1 pt-1 border-t border-amber-400/15">
              <span className="text-[8px] font-mono text-amber-200 tabular-nums truncate">
                {activeSlide.metricLabel}
              </span>
              <button
                type="button"
                onClick={() => onNavigateTab(activeSlide.targetTab)}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[8.5px] cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>{activeSlide.ctaLabel}</span>
                <ArrowUpRight className="w-2.5 h-2.5 shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* 3. Mini Mercado SNEC / CNEC */}
        <div className="rounded-lg bg-black/65 border border-emerald-400/30 p-1.5 space-y-1">
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => onNavigateTab('banco')}
              className="inline-flex items-center gap-1 text-[8.5px] font-bold text-emerald-200 hover:text-amber-300 cursor-pointer truncate"
            >
              <TrendingUp className="w-2.5 h-2.5 text-amber-400 shrink-0" />
              <span className="truncate">SNEC</span>
            </button>
            <div className="flex items-center gap-1 font-mono text-[8.5px] tabular-nums shrink-0">
              <span className="font-bold text-white">
                R${liveMarket.lastPrice.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-emerald-300 font-bold">
                +{(Math.max(0.45, latestDailyQuotePercent || valuationBoostPercent || 1.85)).toFixed(1)}%
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('banco')}
            className="w-full block rounded bg-[#030b08] border border-amber-400/20 p-0.5 cursor-pointer"
            title={`Patrimônio: R$ ${totalEquityBRL.toLocaleString(locale)} · Oferta: ${totalSharesForSale.toLocaleString(locale)} SNEC`}
          >
            <svg viewBox={`0 0 ${liveMarket.w} ${liveMarket.h}`} className="w-full h-auto overflow-visible">
              {liveMarket.candles.map((c, i) => {
                const cx = liveMarket.padX + i * liveMarket.step;
                const yH = liveMarket.toY(c.h);
                const yL = liveMarket.toY(c.l);
                const yO = liveMarket.toY(c.o);
                const yC = liveMarket.toY(c.c);
                const top = Math.min(yO, yC);
                const bodyH = Math.max(2.5, Math.abs(yC - yO));
                const color = c.up ? '#10b981' : '#f59e0b';
                return (
                  <g key={`cndl_sm_${i}`}>
                    <line x1={cx} y1={yH} x2={cx} y2={yL} stroke={color} strokeWidth="1" />
                    <rect x={cx - 3} y={top} width="6" height={bodyH} rx="1" fill={color} opacity="0.9" />
                  </g>
                );
              })}
              <path
                d={liveMarket.linePath}
                fill="none"
                stroke="#fde047"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {liveMarket.linePath && (
                <circle r="2" fill="#fef08a">
                  <animateMotion dur="3.2s" repeatCount="indefinite" path={liveMarket.linePath} />
                </circle>
              )}
            </svg>
          </button>
        </div>

        {/* 4. Diretório Compacto: Acionistas | Empresarial | Ministerial */}
        <div className="rounded-lg bg-black/55 border border-amber-400/25 p-1 space-y-1">
          <div className="grid grid-cols-3 gap-0.5 bg-black/60 p-0.5 rounded border border-white/10">
            <button
              type="button"
              onClick={() => setDirectoryTab('acionistas')}
              className={`py-0.5 px-0.5 rounded text-[8px] font-bold cursor-pointer truncate ${
                directoryTab === 'acionistas' ? 'bg-amber-500 text-neutral-950' : 'text-emerald-100/80'
              }`}
            >
              SNEC
            </button>
            <button
              type="button"
              onClick={() => setDirectoryTab('empresarial')}
              className={`py-0.5 px-0.5 rounded text-[8px] font-bold cursor-pointer truncate ${
                directoryTab === 'empresarial' ? 'bg-amber-500 text-neutral-950' : 'text-emerald-100/80'
              }`}
            >
              {tr('Empres.', 'Biz')}
            </button>
            <button
              type="button"
              onClick={() => setDirectoryTab('ministerial')}
              className={`py-0.5 px-0.5 rounded text-[8px] font-bold cursor-pointer truncate ${
                directoryTab === 'ministerial' ? 'bg-emerald-500 text-neutral-950' : 'text-emerald-100/80'
              }`}
            >
              {tr('Minist.', 'Min')}
            </button>
          </div>

          {directoryTab === 'acionistas' && (
            <div className="space-y-1 max-h-[54px] overflow-y-auto conae-scroll pr-0.5">
              {shareholderProfiles.slice(0, 8).map((sh) => (
                <button
                  key={`dir_sm_${sh.id}`}
                  type="button"
                  onClick={() => handleFocusShareholder(sh)}
                  className="w-full rounded bg-emerald-950/45 hover:bg-emerald-900/55 border border-amber-400/15 px-1.5 py-1 flex items-center justify-between gap-1 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="w-4 h-4 rounded-full border border-amber-400/70 overflow-hidden bg-black shrink-0 block">
                      {!failedImages[sh.id] ? (
                        <img
                          src={sh.photoUrl}
                          alt={sh.name}
                          referrerPolicy="no-referrer"
                          onError={() => setFailedImages((prev) => ({ ...prev, [sh.id]: true }))}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-[6px] font-bold text-amber-300">
                          {sh.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 leading-none">
                      <p className="text-[8.5px] font-semibold text-white truncate">{sh.name}</p>
                      <p className={`text-[7.5px] truncate mt-0.5 ${authorityAccent(sh.authority)}`}>
                        {sh.authority}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[8px] font-bold text-amber-300 tabular-nums shrink-0">
                    {sh.percent.toFixed(1)}%
                  </span>
                </button>
              ))}
            </div>
          )}

          {directoryTab === 'empresarial' && (
            <div className="space-y-1">
              <div className="space-y-1 max-h-[46px] overflow-y-auto conae-scroll pr-0.5">
                {businessAffiliates.map((item) => (
                  <div
                    key={item.id}
                    className="rounded bg-amber-950/35 border border-amber-400/20 px-1.5 py-1 flex items-center justify-between gap-1"
                  >
                    <div className="min-w-0 leading-none">
                      <p className="text-[8.5px] font-semibold text-white truncate flex items-center gap-1">
                        <Briefcase className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </p>
                      <p className="text-[7.5px] text-emerald-200/75 truncate mt-0.5">{item.detail}</p>
                    </div>
                    <span className="text-[7.5px] font-mono text-amber-300 shrink-0">{item.state}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('gestao_empresarial')}
                className="w-full py-1 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[8.5px] cursor-pointer"
              >
                {tr('Gestão Empresarial', 'Business Mgmt')}
              </button>
            </div>
          )}

          {directoryTab === 'ministerial' && (
            <div className="space-y-1">
              <div className="space-y-1 max-h-[46px] overflow-y-auto conae-scroll pr-0.5">
                {ministerialAffiliates.map((item) => (
                  <div
                    key={item.id}
                    className="rounded bg-emerald-950/50 border border-emerald-400/20 px-1.5 py-1 flex items-center justify-between gap-1"
                  >
                    <div className="min-w-0 leading-none">
                      <p className="text-[8.5px] font-semibold text-white truncate flex items-center gap-1">
                        <Church className="w-2.5 h-2.5 text-emerald-300 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </p>
                      <p className="text-[7.5px] text-emerald-200/75 truncate mt-0.5">{item.detail}</p>
                    </div>
                    <span className="text-[7.5px] font-mono text-emerald-300 shrink-0">{item.state}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('gestao_eclesiastica')}
                className="w-full py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-[8.5px] cursor-pointer"
              >
                {tr('Gestão Ministerial', 'Ministerial Mgmt')}
              </button>
            </div>
          )}
        </div>

        {/* Ultra-compact quick buttons */}
        <div className="grid grid-cols-4 gap-0.5">
          <button
            type="button"
            onClick={() => onNavigateTab('hoteis')}
            title={tr('Hotéis', 'Hotels')}
            className="py-1 rounded bg-black/50 hover:bg-amber-500/20 border border-amber-400/20 flex items-center justify-center cursor-pointer"
          >
            <Building2 className="w-2.5 h-2.5 text-amber-300" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('cursos')}
            title={tr('Cursos', 'Courses')}
            className="py-1 rounded bg-black/50 hover:bg-amber-500/20 border border-amber-400/20 flex items-center justify-center cursor-pointer"
          >
            <GraduationCap className="w-2.5 h-2.5 text-emerald-300" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('voos_gol')}
            title={tr('Voos', 'Flights')}
            className="py-1 rounded bg-black/50 hover:bg-amber-500/20 border border-amber-400/20 flex items-center justify-center cursor-pointer"
          >
            <Plane className="w-2.5 h-2.5 text-[#FF8C42]" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('acionistas')}
            title={tr('Acionistas 100k', '100k Shareholders')}
            className="py-1 rounded bg-black/50 hover:bg-amber-500/20 border border-amber-400/20 flex items-center justify-center cursor-pointer"
          >
            <Crown className="w-2.5 h-2.5 text-amber-300" />
          </button>
        </div>
      </div>
        </aside>

        {/* Big Microphone Button always visible beside the ultra-compact bottom-left CONAE DUNK */}
        <button
          type="button"
          onClick={handlePressBigMic}
          title={tr(
            'Aperte o microfone grande para perguntar ao robô CONAE DUNK',
            'Press the big microphone to ask robot CONAE DUNK'
          )}
          aria-label={tr('Perguntar por voz ao CONAE DUNK', 'Ask CONAE DUNK by voice')}
          className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center border-2 transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${
            isListening
              ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-amber-400 text-neutral-950 border-yellow-200 shadow-[0_0_26px_rgba(52,211,153,0.9)]'
              : 'bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-neutral-950 border-yellow-100 shadow-[0_0_22px_rgba(245,158,11,0.7)]'
          }`}
        >
          {isListening && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border-2 border-emerald-300 animate-ping opacity-75"
            />
          )}
          {isListening ? (
            <MicOff className="w-7 h-7 sm:w-8 sm:h-8 relative z-10" />
          ) : (
            <Mic className="w-7 h-7 sm:w-8 sm:h-8 relative z-10" />
          )}
          <span className="text-[7.5px] font-extrabold uppercase tracking-tight leading-none relative z-10">
            {isListening ? tr('Ouvindo', 'Live') : tr('Falar', 'Ask')}
          </span>
        </button>
      </div>
    </>
  );
};
