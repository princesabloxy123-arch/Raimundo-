import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  GitBranch,
  KeyRound,
  Lock,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Terminal,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { CONAE_ASSETS, EXECUTIVES_TEAM } from '../data/conaeSeed';
import { isAppAccessPassword, isAppInstallPassword } from '../firebase';
import { LanguageFlags, useLanguage } from '../i18n/LanguageContext';
import { BrazilStateFlag } from './BrazilStateFlag';
import { VisitAgentTerminalModal } from './VisitAgentTerminalModal';
import { VisitCaptchaCard } from './VisitConsentTracker';
import type { PWAInstallState } from '../hooks/usePWAInstall';
import type { PublicAffiliate, ShareholderTreeNode } from '../types';
import type {
  ShareholderValuationRecord,
  StateTreasuryStat,
  TreasuryBuyerHighlight,
} from '../utils/treasuryStateStats';

interface AppLockScreenProps {
  onUnlock: () => void;
  trialExpired?: boolean;
  remainingTrialSeconds?: number;
  onResumeTrial?: () => void;
  stateStats?: StateTreasuryStat[];
  shareUnitPriceBRL?: number;
  latestDailyQuotePercent?: number;
  valuationBoostPercent?: number;
  totalEquityBRL?: number;
  shareholderTree?: ShareholderTreeNode[];
  buyerHighlights?: TreasuryBuyerHighlight[];
  shareholderValuations?: ShareholderValuationRecord[];
  publicAffiliates?: PublicAffiliate[];
  pwaInstall?: PWAInstallState;
  onOpenDuqueEvento?: () => void;
  firebaseUser?: User | null;
  isAdmin?: boolean;
  onGoogleLogin?: () => Promise<void> | void;
}

const ADMIN_CONTACT_NAME = 'Raimundo Netto';
const ADMIN_WHATSAPP_DISPLAY = '(96) 98115-3517';
const ADMIN_WHATSAPP_DIGITS = '5596981153517';
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;
const LOCK_BANNER_IMAGE = '/assets/aistudio/InShot_20261124_195330616_6fd30136.jpg';
const CONAE_DUQUE_ROBOT_3D = '/src/assets/images/conae_duque_robot_3d_1795637461401.jpg';
const CONAE_AI_BRAIN_3D = '/src/assets/images/conae_ai_brain_3d_1795638395875.jpg';

const WEEKDAYS_PT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const BASE_WEEK_PRICES = [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0];

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  onUnlock,
  trialExpired = true,
  remainingTrialSeconds = 0,
  onResumeTrial,
  stateStats = [],
  shareUnitPriceBRL = 5.0,
  latestDailyQuotePercent = 0,
  valuationBoostPercent = 0,
  totalEquityBRL = 0,
  shareholderTree = [],
  buyerHighlights = [],
  shareholderValuations = [],
  publicAffiliates = [],
  pwaInstall,
  onOpenDuqueEvento,
  firebaseUser = null,
  isAdmin = false,
  onGoogleLogin,
}) => {
  const [terminal254Open, setTerminal254Open] = useState(false);
  const { isEn, tr } = useLanguage();
  const locale = isEn ? 'en-US' : 'pt-BR';
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [opTick, setOpTick] = useState(0);

  // Password-protected PWA Installer states (requires installer password)
  const [installerOpen, setInstallerOpen] = useState(false);
  const [installPassword, setInstallPassword] = useState('');
  const [showInstallPassword, setShowInstallPassword] = useState(false);
  const [checkingInstall, setCheckingInstall] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [installFailedAttempts, setInstallFailedAttempts] = useState(0);
  const [installCooldownLeft, setInstallCooldownLeft] = useState(0);
  const [installAuthorized, setInstallAuthorized] = useState(false);
  const [installStatusMsg, setInstallStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const id = window.setInterval(() => {
      setCooldownLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldownLeft]);

  useEffect(() => {
    if (installCooldownLeft <= 0) return;
    const id = window.setInterval(() => {
      setInstallCooldownLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [installCooldownLeft]);

  // Live animation pulse for the small operating chart & active weekday highlight
  useEffect(() => {
    const id = window.setInterval(() => {
      setOpTick((prev) => (prev + 1) % 700);
    }, 1200);
    return () => window.clearInterval(id);
  }, []);

  const weekdays = isEn ? WEEKDAYS_EN : WEEKDAYS_PT;
  const activeDayIndex = opTick % 7;

  // Weekly small operation chart points (Seg -> Dom)
  const weeklyChart = useMemo(() => {
    const scale = shareUnitPriceBRL > 0 ? shareUnitPriceBRL / 4.96 : 1;
    const boost = 1 + valuationBoostPercent / 100;
    const points = BASE_WEEK_PRICES.map((base, idx) => {
      const wave = Math.sin(opTick * 0.55 + idx * 0.85) * 0.035;
      const val = Number((base * scale * boost + wave).toFixed(2));
      return { day: weekdays[idx], val };
    });

    const w = 232;
    const h = 54;
    const padX = 14;
    const padY = 8;
    const min = Math.min(...points.map((p) => p.val)) * 0.985;
    const max = Math.max(...points.map((p) => p.val)) * 1.015;
    const span = max - min || 1;

    const coords = points.map((p, idx) => ({
      ...p,
      x: padX + (idx / Math.max(1, points.length - 1)) * (w - padX * 2),
      y: padY + (1 - (p.val - min) / span) * (h - padY * 2),
    }));

    const linePath = coords
      .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');
    const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${h} L ${coords[0].x.toFixed(1)} ${h} Z`;

    return {
      coords,
      linePath,
      areaPath,
      w,
      h,
      currentPrice: coords[activeDayIndex]?.val ?? shareUnitPriceBRL,
    };
  }, [shareUnitPriceBRL, valuationBoostPercent, opTick, weekdays, activeDayIndex]);

  // All 27 states sorted with active ones first
  const orderedStates = useMemo(() => {
    const active = stateStats.filter((s) => s.percent > 0).sort((a, b) => b.percent - a.percent);
    const waiting = stateStats.filter((s) => s.percent <= 0);
    return [...active, ...waiting];
  }, [stateStats]);

  // Presidential Tree + Shareholders list for vertical lateral scrolling rail
  const presidentialTreeRail = useMemo(() => {
    const items: {
      id: string;
      name: string;
      role: string;
      photo: string;
      percent: number;
      state: string;
      level: 'presidente' | 'diretor' | 'acionista';
    }[] = [];

    EXECUTIVES_TEAM.forEach((exec, idx) => {
      items.push({
        id: exec.id,
        name: exec.name,
        role: idx === 0 ? 'Presidente Mundial' : 'Exclusivo Diretor',
        photo: exec.photo,
        percent: idx === 0 ? 35.0 : idx === 1 ? 15.0 : 12.5,
        state: 'GO',
        level: idx === 0 ? 'presidente' : 'diretor',
      });
    });

    shareholderTree
      .filter((n) => n.active !== false)
      .forEach((node) => {
        items.push({
          id: `lk_tree_${node.id}`,
          name: node.fullName,
          role: `↳ ${node.branchTitle}`,
          photo: node.photoUrl || CONAE_ASSETS.emblemHeart,
          percent: Number(node.sharePercent || 0),
          state: node.state || 'BR',
          level: 'acionista',
        });
      });

    buyerHighlights.forEach((buyer) => {
      const exists = items.some((x) => x.name.toLowerCase() === buyer.buyerName.toLowerCase());
      if (!exists) {
        items.push({
          id: `lk_buy_${buyer.id}`,
          name: buyer.buyerName,
          role: '↳ Acionista SNEC',
          photo: buyer.buyerPhotoUrl || CONAE_ASSETS.emblemHeart,
          percent: Math.max(0.2, Number(((buyer.sharesCount / 100000) * 100).toFixed(2))),
          state: buyer.state || 'BR',
          level: 'acionista',
        });
      }
    });

    return items;
  }, [shareholderTree, buyerHighlights]);

  const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP_DIGITS}?text=${encodeURIComponent(
    tr(
      'Olá Raimundo Netto, meu tempo de degustação de 40 minutos encerrou e gostaria da senha para liberar o acesso ao aplicativo CONAE.',
      'Hello Raimundo Netto, my 40-minute preview has ended and I would like the password to unlock access to the CONAE app.'
    )
  )}`;

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText('96 981153517');
      setCopiedPhone(true);
      window.setTimeout(() => setCopiedPhone(false), 2200);
    } catch {
      // Ignore clipboard failures in restricted iframes
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownLeft > 0 || checking) return;

    const trimmed = password.trim();
    if (!trimmed) {
      setErrorMsg(
        tr('Informe a senha de acesso para liberar o aplicativo.', 'Enter the access password to unlock.')
      );
      return;
    }

    setChecking(true);
    setErrorMsg(null);
    try {
      const ok = await isAppAccessPassword(trimmed);
      if (ok) {
        setPassword('');
        setFailedAttempts(0);
        onUnlock();
        return;
      }

      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      setPassword('');

      if (nextAttempts >= MAX_ATTEMPTS) {
        setCooldownLeft(LOCKOUT_SECONDS);
        setFailedAttempts(0);
        setErrorMsg(
          tr(
            `Muitas tentativas incorretas. Aguarde ${LOCKOUT_SECONDS}s ou fale com ${ADMIN_CONTACT_NAME}.`,
            `Too many incorrect attempts. Wait ${LOCKOUT_SECONDS}s or contact ${ADMIN_CONTACT_NAME}.`
          )
        );
      } else {
        setErrorMsg(
          tr(
            `Senha incorreta (${nextAttempts}/${MAX_ATTEMPTS}). Fale com ${ADMIN_CONTACT_NAME} no WhatsApp ${ADMIN_WHATSAPP_DISPLAY}.`,
            `Incorrect password (${nextAttempts}/${MAX_ATTEMPTS}). Contact ${ADMIN_CONTACT_NAME} on WhatsApp ${ADMIN_WHATSAPP_DISPLAY}.`
          )
        );
      }
    } finally {
      setChecking(false);
    }
  };

  const triggerNativeInstall = async () => {
    if (!pwaInstall) {
      setInstallStatusMsg(
        tr(
          'Instalação liberada! Use o menu do navegador para adicionar o CONAE à tela inicial.',
          'Installation unlocked! Use your browser menu to add CONAE to your home screen.'
        )
      );
      return;
    }

    if (pwaInstall.isInstalled) {
      setInstallStatusMsg(
        tr('O aplicativo CONAE já está instalado neste dispositivo.', 'CONAE is already installed on this device.')
      );
      return;
    }

    if (pwaInstall.isInstallable) {
      const outcome = await pwaInstall.install();
      if (outcome === 'accepted') {
        setInstallStatusMsg(
          tr(
            'Instalação confirmada! O ícone do CONAE será adicionado à sua tela inicial.',
            'Installation confirmed! The CONAE icon will be added to your home screen.'
          )
        );
      } else if (outcome === 'dismissed') {
        setInstallStatusMsg(
          tr(
            'Instalação cancelada na janela do navegador. Clique em "Iniciar Instalação Agora" quando desejar concluir.',
            'Browser prompt dismissed. Click "Start Installation Now" whenever ready.'
          )
        );
      }
      return;
    }

    if (pwaInstall.isIOS) {
      setInstallStatusMsg(
        tr(
          'Instalação liberada no iPhone/iPad: toque em Compartilhar no Safari e escolha "Adicionar à Tela de Início".',
          'Unlocked for iPhone/iPad: tap Share in Safari and select "Add to Home Screen".'
        )
      );
      return;
    }

    setInstallStatusMsg(
      tr(
        'Instalação liberada! Toque no menu do navegador (⋮) e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".',
        'Installation unlocked! Open your browser menu (⋮) and choose "Install app" or "Add to Home Screen".'
      )
    );
  };

  const handleInstallPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (installCooldownLeft > 0 || checkingInstall) return;

    const trimmed = installPassword.trim();
    if (!trimmed) {
      setInstallError(
        tr('Digite a senha do instalador para baixar e instalar o aplicativo.', 'Enter the installer password to install the app.')
      );
      return;
    }

    setCheckingInstall(true);
    setInstallError(null);
    setInstallStatusMsg(null);
    try {
      const ok = await isAppInstallPassword(trimmed);
      if (ok) {
        setInstallPassword('');
        setInstallFailedAttempts(0);
        setInstallAuthorized(true);
        await triggerNativeInstall();
        return;
      }

      const nextAttempts = installFailedAttempts + 1;
      setInstallFailedAttempts(nextAttempts);
      setInstallPassword('');

      if (nextAttempts >= MAX_ATTEMPTS) {
        setInstallCooldownLeft(LOCKOUT_SECONDS);
        setInstallFailedAttempts(0);
        setInstallError(
          tr(
            `Muitas tentativas incorretas no instalador. Aguarde ${LOCKOUT_SECONDS}s ou fale com ${ADMIN_CONTACT_NAME}.`,
            `Too many incorrect installer attempts. Wait ${LOCKOUT_SECONDS}s or contact ${ADMIN_CONTACT_NAME}.`
          )
        );
      } else {
        setInstallError(
          tr(
            `Senha do instalador incorreta (${nextAttempts}/${MAX_ATTEMPTS}).`,
            `Incorrect installer password (${nextAttempts}/${MAX_ATTEMPTS}).`
          )
        );
      }
    } finally {
      setCheckingInstall(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conae-lock-heading"
      className="fixed inset-0 z-50 overflow-hidden bg-[#040a07]"
    >
      {/* Full-screen Background Image Layer */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <img
          src={LOCK_BANNER_IMAGE}
          alt=""
          className="w-full h-full object-cover object-center opacity-55 scale-[1.02]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030b08]/58 via-[#040e0a]/52 to-[#030907]/82 backdrop-blur-[1.5px]" />
      </div>

      {/* Scrollable Foreground Content */}
      <div className="relative z-10 w-full h-full overflow-y-auto flex flex-col items-center justify-start sm:justify-center gap-3 p-3 pb-28 sm:p-4 sm:pb-8">
        {/* Floating Animated 3D Moving Robot Notification Card */}
        <aside
          aria-label={tr('Notificação flutuante do robô CONAE', 'Floating CONAE robot notification')}
          className="animate-float-vertical w-full max-w-xl lg:fixed lg:top-6 lg:right-6 lg:w-[310px] lg:max-w-[310px] z-30 shrink-0"
        >
          <div className="rounded-2xl bg-gradient-to-br from-[#062318]/96 via-[#071812]/96 to-[#1d1504]/96 backdrop-blur-md border border-amber-400/80 shadow-[0_20px_54px_rgba(0,0,0,0.72)] p-3.5 space-y-2.5 text-emerald-50">
            <div className="flex items-center gap-3">
              {/* 3D Moving Robot Figure */}
              <div className="conae-robot-3d-stage shrink-0">
                <span aria-hidden="true" className="conae-robot-3d-aura" />
                <div className="conae-robot-3d-figure w-[68px] h-[68px] rounded-2xl overflow-hidden border-2 border-amber-400/95 bg-[#040e0a]">
                  <img
                    src={CONAE_DUQUE_ROBOT_3D}
                    alt={tr('Robô CONAE em movimento 3D', 'Animated 3D CONAE Robot')}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span aria-hidden="true" className="conae-robot-3d-shine" />
                </div>
              </div>

              {/* 3D Moving Neural Brain Figure */}
              <div className="conae-brain-3d-stage shrink-0">
                <span aria-hidden="true" className="conae-brain-3d-aura" />
                <span aria-hidden="true" className="conae-brain-3d-ring" />
                <div className="conae-brain-3d-core w-[56px] h-[56px] rounded-full overflow-hidden border-2 border-emerald-400/90 bg-[#030b08]">
                  <img
                    src={CONAE_AI_BRAIN_3D}
                    alt={tr('Cérebro IA em movimento 3D', 'Animated 3D AI Brain')}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover scale-105"
                  />
                </div>
              </div>

              <div className="min-w-0 flex-1 leading-tight space-y-1">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-xs font-bold text-amber-200 leading-snug">
                    {tr(
                      'Pronto para servir nossos clientes da CONAE!',
                      'Ready to serve our CONAE clients!'
                    )}
                  </p>
                  <a
                    href="/duque-evento"
                    target="_blank"
                    rel="noopener noreferrer"
                    title={tr('Abrir em nova aba', 'Open in new tab')}
                    className="p-1.5 rounded-lg bg-black/45 hover:bg-black/70 border border-amber-400/40 text-amber-300 hover:text-amber-200 transition-colors shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-[11px] text-emerald-50/90 leading-snug">
                  {tr(
                    'Entre e fale comigo — construo tudo e gero seu link.',
                    'Come in and talk to me — I build everything and generate your link.'
                  )}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-black/45 border border-emerald-400/25 px-3 py-2">
              <p className="text-[11px] text-emerald-100/90 leading-snug">
                {tr(
                  'Divulgue seu evento com nosso robô — ele faz toda a parte pra você e entrega o link na hora.',
                  'Promote your event with our robot — it handles everything for you and delivers the link instantly.'
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onOpenDuqueEvento ? (
                <button
                  type="button"
                  onClick={onOpenDuqueEvento}
                  className="conae-btn-inner-glow flex-1 min-h-[38px] px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>{tr('Entrar e Conversar', 'Enter & Chat')}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              ) : (
                <a
                  href="/duque-evento"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="conae-btn-inner-glow flex-1 min-h-[38px] px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <span>{tr('Entrar e Conversar', 'Enter & Chat')}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </a>
              )}
              <a
                href="/duque-evento"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-black/50 hover:bg-black/75 border border-amber-400/35 text-[11px] font-semibold text-amber-200 inline-flex items-center gap-1 whitespace-nowrap"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span>{tr('Nova Aba', 'New Tab')}</span>
              </a>
            </div>
          </div>
        </aside>

        {/* Inline CAPTCHA + Terms positioned directly between the Robot card and the CONAE Photo card */}
        <VisitCaptchaCard variant="inline" />

        {/* Unified frosted Lock Screen Panel containing Banner, Rolling Bars, Password, Installer, Contact & Live Operation */}
        <section className="w-full max-w-xl rounded-2xl bg-[#07150f]/84 backdrop-blur-md border border-amber-400/50 shadow-[0_24px_70px_rgba(0,0,0,0.68)] p-3.5 sm:p-4 space-y-2.5 text-emerald-50 shrink-0">
        {/* Top Row: Emblem + Brand + Language Switch */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full border border-amber-400/80 overflow-hidden bg-emerald-950/75 flex items-center justify-center shrink-0">
              {!logoError ? (
                <img
                  src={CONAE_ASSETS.emblemHeart}
                  alt={tr('Emblema CONAE', 'CONAE Emblem')}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ShieldCheck className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div className="leading-tight min-w-0">
              <span className="font-display text-lg font-bold tracking-wide conae-gold-text block">
                CONAE
              </span>
              <span className="text-[11px] text-emerald-100/80 block truncate">
                {tr('Acesso Protegido por Senha', 'Password-Protected Access')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setTerminal254Open(true)}
              title="Terminal 254 do Agente Servidor"
              aria-label="Abrir Terminal 254"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 hover:bg-emerald-950/90 border border-emerald-500/35 hover:border-emerald-400/80 text-[10px] font-mono font-bold text-emerald-300/90 hover:text-emerald-200 transition-colors cursor-pointer"
            >
              <Terminal className="w-3 h-3 text-emerald-400" />
              <span>254</span>
            </button>
            <LanguageFlags />
          </div>
        </div>

        {/* Medium-Small Official Banner inside the Lock Card */}
        <div className="w-full max-w-[280px] sm:max-w-[310px] mx-auto rounded-lg overflow-hidden border border-amber-400/55 shadow-md bg-[#04101d]">
          <img
            src={LOCK_BANNER_IMAGE}
            alt={tr(
              'CONAE Convenção & Holding · Gestor Empresarial e Gestor Ministerial',
              'CONAE Convention & Holding · Business & Ministerial Management'
            )}
            className="w-full h-auto block object-contain"
          />
        </div>

        {/* Rolling Bars Brought Directly Inside the Top Lock Card */}
        <div className="space-y-1.5">
          {/* Horizontal Moving Bar 1: All Inserted Shareholders / Buyers with Daily Quote (% & R$) */}
          {shareholderValuations.length > 0 && (
            <div className="marquee-wrapper overflow-hidden rounded-lg bg-[#04110b]/90 border border-amber-400/35 py-1 px-1.5">
              <div className="animate-marquee-investors flex items-center gap-2.5">
                {[...shareholderValuations, ...shareholderValuations].map((h, idx) => (
                  <div
                    key={`lk_sh_${h.id}_${idx}`}
                    className="inline-flex items-center gap-1.5 text-[9px] font-mono shrink-0"
                  >
                    <img
                      src={h.photoUrl}
                      alt={h.name}
                      referrerPolicy="no-referrer"
                      className="w-4 h-4 rounded-full object-cover border border-amber-400/80 shrink-0"
                    />
                    <BrazilStateFlag uf={h.state} size="xs" />
                    <span className="font-sans font-semibold text-white whitespace-nowrap">
                      {h.name}
                    </span>
                    <span className="text-amber-300 whitespace-nowrap">
                      {h.sharesCount.toLocaleString(locale)} {tr('ações', 'sh')} · R${' '}
                      {h.currentEquityBRL.toLocaleString(locale, { minimumFractionDigits: 2 })}
                    </span>
                    <span
                      className={`font-bold whitespace-nowrap ${
                        h.equityStatus === 'up'
                          ? 'text-emerald-300'
                          : h.equityStatus === 'down'
                          ? 'text-red-300'
                          : 'text-amber-200/80'
                      }`}
                    >
                      {h.equityStatus === 'up'
                        ? `▲ +${h.totalDeltaPercent.toFixed(2).replace('.', ',')}% (+R$ ${h.totalDeltaBRL.toLocaleString(locale, { minimumFractionDigits: 2 })})`
                        : h.equityStatus === 'down'
                        ? `▼ ${h.totalDeltaPercent.toFixed(2).replace('.', ',')}% (-R$ ${Math.abs(h.totalDeltaBRL).toLocaleString(locale, { minimumFractionDigits: 2 })})`
                        : tr('• Sem aumento 0,00% (R$ 0,00)', '• No gain 0.00% (R$ 0.00)')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Horizontal Moving Bar 2: All 27 Brazilian States Operating */}
          {orderedStates.length > 0 && (
            <div className="marquee-wrapper overflow-hidden rounded-lg bg-black/55 border border-amber-400/25 py-1 px-1.5">
              <div className="animate-marquee-flags flex items-center gap-2.5">
                {[...orderedStates, ...orderedStates].map((st, idx) => (
                  <div
                    key={`lk_st_${st.uf}_${idx}`}
                    className="inline-flex items-center gap-1 text-[9.5px] font-mono shrink-0"
                  >
                    <BrazilStateFlag uf={st.uf} size="xs" />
                    <span className="font-bold text-white">{st.uf}</span>
                    <span
                      className={`tabular-nums font-semibold ${
                        st.percent > 0 ? 'text-amber-300' : 'text-emerald-300/75'
                      }`}
                    >
                      {st.percent.toFixed(1).replace('.', ',')}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Horizontal Moving Bar 3: Nossos Afiliados & Ações SNEC */}
          {publicAffiliates.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-200 whitespace-nowrap shrink-0">
                <Users className="w-3 h-3 text-amber-300" />
                {tr('Afiliados:', 'Affiliates:')}
              </span>
              <div className="marquee-wrapper overflow-hidden flex-1 rounded-lg bg-black/50 border border-emerald-400/25 py-1 px-1.5">
                <div className="animate-marquee-shareholders flex items-center gap-2">
                  {[...publicAffiliates, ...publicAffiliates].map((aff, idx) => (
                    <div
                      key={`lk_aff_${aff.uid}_${idx}`}
                      className="inline-flex items-center gap-1.5 text-[9px] shrink-0"
                    >
                      <img
                        src={aff.photoUrl || CONAE_ASSETS.emblemHeart}
                        alt={aff.displayName}
                        referrerPolicy="no-referrer"
                        className="w-4 h-4 rounded-full object-cover border border-amber-400/70 shrink-0"
                      />
                      <span className="font-semibold text-white whitespace-nowrap">
                        {aff.displayName}
                      </span>
                      <span className="font-mono text-amber-300 whitespace-nowrap">
                        {aff.state} · {aff.vipTier}
                      </span>
                      <span className="conae-snec-coin-spin w-3.5 h-3.5 rounded-full items-center justify-center bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-700 text-neutral-950 text-[4.5px] font-extrabold font-mono">
                        SNEC
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Title & Message */}
        <div className="space-y-1 pt-1 border-t border-amber-400/20">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <h2
              id="conae-lock-heading"
              className="text-base sm:text-lg font-bold text-white leading-snug [text-wrap:balance]"
            >
              {trialExpired
                ? tr('Degustação de 40 Minutos Encerrada', '40-Minute Preview Ended')
                : tr('Tela de Bloqueio CONAE', 'CONAE Lock Screen')}
            </h2>
          </div>
          <p className="text-xs text-emerald-100/85 leading-relaxed">
            {trialExpired
              ? tr(
                  'Seu período de degustação de 40 minutos terminou. Digite a senha para liberar o acesso completo ao aplicativo.',
                  'Your 40-minute preview period has ended. Enter the password to unlock full access to the application.'
                )
              : tr(
                  'Digite a senha oficial para liberar o acesso definitivo ao aplicativo sem limite de tempo.',
                  'Enter the official password to unlock unlimited access to the application.'
                )}
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="space-y-1">
            <label htmlFor="conae-app-lock-password" className="block text-xs font-medium text-amber-200/95">
              {tr('Senha de Liberação', 'Access Password')}
            </label>
            <div className="relative">
              <input
                id="conae-app-lock-password"
                type={showPassword ? 'text' : 'password'}
                inputMode="text"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                required
                disabled={cooldownLeft > 0 || checking}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder={tr('Digite a senha para liberar', 'Enter password to unlock')}
                className="w-full min-h-[42px] rounded-lg bg-black/55 border border-amber-400/45 pl-3.5 pr-11 py-2 text-sm text-white font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans placeholder:text-emerald-200/50 focus:outline-none focus:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:opacity-55"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword
                    ? tr('Ocultar senha', 'Hide password')
                    : tr('Mostrar senha', 'Show password')
                }
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-md text-emerald-200/80 hover:text-amber-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-lg bg-red-950/75 border border-red-400/50 px-3 py-2 text-xs text-red-100 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {cooldownLeft > 0 && (
            <p className="text-xs font-mono tabular-nums text-amber-300">
              {tr(`Aguarde ${cooldownLeft}s para tentar novamente.`, `Wait ${cooldownLeft}s to try again.`)}
            </p>
          )}

          <button
            type="submit"
            disabled={cooldownLeft > 0 || checking}
            className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            {checking
              ? tr('Verificando...', 'Verifying...')
              : cooldownLeft > 0
              ? tr(`Aguarde (${cooldownLeft}s)`, `Please wait (${cooldownLeft}s)`)
              : tr('Liberar Acesso', 'Unlock Access')}
          </button>

          {!trialExpired && onResumeTrial && remainingTrialSeconds > 0 && (
            <button
              type="button"
              onClick={onResumeTrial}
              className="w-full min-h-[38px] px-4 py-1.5 rounded-lg bg-black/40 hover:bg-black/55 border border-amber-400/30 text-xs font-medium text-emerald-100 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              {tr(
                `Continuar degustação (${formatCountdown(remainingTrialSeconds)} restantes)`,
                `Continue preview (${formatCountdown(remainingTrialSeconds)} left)`
              )}
            </button>
          )}
        </form>

        {/* Password-Protected App Installer on Lock Screen */}
        <div className="pt-2.5 border-t border-amber-400/20 space-y-2">
          {pwaInstall?.isInstalled ? (
            <div className="rounded-lg bg-emerald-950/65 border border-emerald-400/35 px-3 py-2 flex items-center gap-2 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">
                {tr('Aplicativo CONAE instalado neste dispositivo', 'CONAE app installed on this device')}
              </span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setInstallerOpen((prev) => !prev);
                  setInstallError(null);
                }}
                className="w-full min-h-[40px] px-3.5 py-2 rounded-lg bg-gradient-to-r from-emerald-800/85 via-emerald-700/85 to-amber-600/85 hover:from-emerald-700 hover:to-amber-500 border border-amber-300/50 text-white font-semibold text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer shadow-md"
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <Download className="w-4 h-4 text-amber-200 shrink-0" />
                  <span className="truncate">
                    {tr('Instalar Aplicativo CONAE', 'Install CONAE App')}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-100 bg-black/35 px-2 py-0.5 rounded border border-amber-300/35 shrink-0">
                  <KeyRound className="w-3 h-3 text-amber-300" />
                  {installAuthorized
                    ? tr('Liberado', 'Unlocked')
                    : tr('Com Senha', 'Password')}
                </span>
              </button>

              {installerOpen && (
                <div className="rounded-xl bg-black/55 border border-amber-400/40 p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Smartphone className="w-4 h-4 text-amber-300 shrink-0" />
                      <span className="text-xs font-bold text-amber-200 truncate">
                        {tr('Instalador Oficial CONAE', 'Official CONAE Installer')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInstallerOpen(false)}
                      aria-label={tr('Fechar instalador', 'Close installer')}
                      className="p-1 rounded bg-black/50 text-emerald-200 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!installAuthorized ? (
                    <form onSubmit={handleInstallPasswordSubmit} className="space-y-2">
                      <label
                        htmlFor="conae-app-install-password"
                        className="block text-[11px] text-emerald-100/90 leading-snug"
                      >
                        {tr(
                          'Digite a senha do instalador para liberar a instalação do aplicativo:',
                          'Enter the installer password to unlock app installation:'
                        )}
                      </label>
                      <div className="relative">
                        <input
                          id="conae-app-install-password"
                          type={showInstallPassword ? 'text' : 'password'}
                          inputMode="text"
                          autoComplete="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          required
                          disabled={installCooldownLeft > 0 || checkingInstall}
                          value={installPassword}
                          onChange={(e) => {
                            setInstallPassword(e.target.value);
                            if (installError) setInstallError(null);
                          }}
                          placeholder={tr('Senha do instalador', 'Installer password')}
                          className="w-full min-h-[38px] rounded-lg bg-black/65 border border-amber-400/45 pl-3 pr-10 py-1.5 text-xs text-white font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans placeholder:text-emerald-200/45 focus:outline-none focus:border-amber-400 disabled:opacity-55"
                        />
                        <button
                          type="button"
                          onClick={() => setShowInstallPassword((prev) => !prev)}
                          aria-label={
                            showInstallPassword
                              ? tr('Ocultar senha do instalador', 'Hide installer password')
                              : tr('Mostrar senha do instalador', 'Show installer password')
                          }
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded text-emerald-200/80 hover:text-amber-300 cursor-pointer"
                        >
                          {showInstallPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {installError && (
                        <div
                          role="alert"
                          className="rounded-lg bg-red-950/75 border border-red-400/50 px-2.5 py-1.5 text-[11px] text-red-100 flex items-start gap-1.5"
                        >
                          <AlertCircle className="w-3.5 h-3.5 text-red-300 shrink-0 mt-0.5" />
                          <span>{installError}</span>
                        </div>
                      )}

                      {installCooldownLeft > 0 && (
                        <p className="text-[11px] font-mono tabular-nums text-amber-300">
                          {tr(
                            `Aguarde ${installCooldownLeft}s para tentar novamente.`,
                            `Wait ${installCooldownLeft}s to try again.`
                          )}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={installCooldownLeft > 0 || checkingInstall}
                        className="w-full min-h-[36px] px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-55"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>
                          {checkingInstall
                            ? tr('Verificando...', 'Verifying...')
                            : installCooldownLeft > 0
                            ? tr(`Aguarde (${installCooldownLeft}s)`, `Wait (${installCooldownLeft}s)`)
                            : tr('Validar Senha e Instalar', 'Verify Password & Install')}
                        </span>
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-lg bg-emerald-950/70 border border-emerald-400/40 px-2.5 py-2 text-[11px] text-emerald-100 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-bold text-emerald-300">
                            {tr('Instalador Liberado!', 'Installer Unlocked!')}
                          </p>
                          <p className="leading-snug text-emerald-100/90">
                            {installStatusMsg ||
                              tr(
                                'Clique abaixo para iniciar a instalação oficial do aplicativo CONAE.',
                                'Click below to start the official CONAE app installation.'
                              )}
                          </p>
                        </div>
                      </div>

                      {pwaInstall?.isInstallable ? (
                        <button
                          type="button"
                          onClick={triggerNativeInstall}
                          className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-amber-400 hover:brightness-110 text-neutral-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>{tr('Iniciar Instalação Agora', 'Start Installation Now')}</span>
                        </button>
                      ) : pwaInstall?.isIOS ? (
                        <div className="rounded-lg bg-black/50 border border-amber-400/25 p-2.5 text-[11px] text-emerald-100/90 space-y-1">
                          <p className="font-semibold text-amber-300">
                            {tr('Como instalar no iPhone / iPad (Safari):', 'How to install on iPhone / iPad (Safari):')}
                          </p>
                          <p>{tr('1. Toque no ícone Compartilhar na barra do Safari.', '1. Tap the Share icon in the Safari toolbar.')}</p>
                          <p>{tr('2. Role para baixo e toque em "Adicionar à Tela de Início".', '2. Scroll down and tap "Add to Home Screen".')}</p>
                          <p>{tr('3. Confirme tocando em "Adicionar".', '3. Confirm by tapping "Add".')}</p>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-black/50 border border-amber-400/25 p-2.5 text-[11px] text-emerald-100/90 space-y-1">
                          <p className="font-semibold text-amber-300">
                            {tr('Como concluir a instalação no navegador:', 'How to complete installation in your browser:')}
                          </p>
                          <p>
                            {tr(
                              '1. Abra o menu do navegador (⋮ no Android/Chrome ou ícone de instalar na barra de endereço).',
                              '1. Open the browser menu (⋮ on Android/Chrome or the install icon in the address bar).'
                            )}
                          </p>
                          <p>
                            {tr(
                              '2. Toque em "Instalar aplicativo" ou "Adicionar à tela inicial".',
                              '2. Tap "Install app" or "Add to Home Screen".'
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Administrator Raimundo Netto Contact */}
        <div className="pt-2.5 border-t border-amber-400/20 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
            <span className="text-emerald-100/85">
              {tr('Fale com o administrador:', 'Contact administrator:')}{' '}
              <strong className="text-amber-300">{ADMIN_CONTACT_NAME}</strong>
            </span>
            <span className="font-mono tabular-nums font-semibold text-white">
              Zap {ADMIN_WHATSAPP_DISPLAY}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{tr('Chamar no Zap', 'WhatsApp')}</span>
            </a>
            <button
              type="button"
              onClick={handleCopyPhone}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg bg-black/45 hover:bg-black/65 border border-amber-400/35 text-emerald-100 hover:text-white font-medium text-xs transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {copiedPhone ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{tr('Copiado', 'Copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>{tr('Copiar Número', 'Copy Number')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Compact Live Operating Chart (Days of Week) + Vertical Rolling Presidential Tree & Shareholders inside the Lock Panel */}
        <div className="pt-2.5 border-t border-amber-400/20 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-stretch">
          {/* Small Operating Chart showing every day of the week (Seg -> Dom) */}
          <div className="sm:col-span-7 rounded-xl bg-black/50 border border-emerald-400/30 p-2.5 flex flex-col justify-between space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] font-bold text-amber-200 truncate">
                  {tr('Gráfico de Operação · Ações SNEC/CNEC', 'Live Operation · SNEC/CNEC Shares')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10.5px] tabular-nums shrink-0">
                <span className="font-bold text-white">
                  R$ {weeklyChart.currentPrice.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-emerald-300 font-bold">
                  +{(Math.max(0.65, latestDailyQuotePercent || valuationBoostPercent || 1.85)).toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Compact Live Chart SVG */}
            <div className="rounded-lg bg-[#030b08]/90 border border-amber-400/20 px-1.5 py-1">
              <svg viewBox={`0 0 ${weeklyChart.w} ${weeklyChart.h}`} className="w-full h-auto overflow-visible">
                <defs>
                  <linearGradient id="lockOpAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.42" />
                    <stop offset="100%" stopColor="#050907" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={weeklyChart.areaPath} fill="url(#lockOpAreaGrad)" />
                <path
                  d={weeklyChart.linePath}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {weeklyChart.coords.map((pt, idx) => (
                  <g key={`wk_pt_${pt.day}`}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={idx === activeDayIndex ? 3.4 : 2}
                      fill={idx === activeDayIndex ? '#10b981' : '#fde047'}
                      stroke={idx === activeDayIndex ? '#fef08a' : 'none'}
                      strokeWidth="1"
                    />
                  </g>
                ))}
                {weeklyChart.linePath && (
                  <circle r="2.4" fill="#fef08a">
                    <animateMotion dur="4.2s" repeatCount="indefinite" path={weeklyChart.linePath} />
                  </circle>
                )}
              </svg>

              {/* Days of the Week Operating Row (Seg -> Dom) */}
              <div className="grid grid-cols-7 gap-0.5 mt-1 pt-1 border-t border-white/10 text-center font-mono tabular-nums">
                {weeklyChart.coords.map((pt, idx) => {
                  const isActive = idx === activeDayIndex;
                  return (
                    <div
                      key={`wk_lbl_${pt.day}`}
                      className={`rounded px-0.5 py-0.5 transition-colors ${
                        isActive
                          ? 'bg-emerald-700/75 text-amber-200 font-bold'
                          : 'text-emerald-200/75'
                      }`}
                    >
                      <span className="block text-[8.5px] leading-none">{pt.day}</span>
                      <span className="block text-[7.5px] text-amber-300/90 mt-0.5 leading-none">
                        {pt.val.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 text-[9.5px] font-mono tabular-nums text-emerald-200/80">
              <span>
                {tr('Dia operando:', 'Operating day:')}{' '}
                <strong className="text-amber-300">{weekdays[activeDayIndex]}</strong>
              </span>
              <span>
                {tr('Patrimônio:', 'Equity:')}{' '}
                <strong className="text-emerald-300">
                  R$ {totalEquityBRL.toLocaleString(locale, { maximumFractionDigits: 0 })}
                </strong>
              </span>
            </div>
          </div>

          {/* Lateral Vertical Scrolling Bar: Árvore Presidencial junto com seus Acionistas */}
          <div className="sm:col-span-5 rounded-xl bg-black/50 border border-amber-400/30 p-2 flex flex-col space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-200 truncate">
                <GitBranch className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">
                  {tr('Árvore Presidencial & Acionistas', 'Presidential Tree & Shareholders')}
                </span>
              </span>
              <Crown className="w-3 h-3 text-amber-300 shrink-0" />
            </div>

            <div className="vertical-marquee-wrapper overflow-hidden h-[100px] rounded-lg bg-[#030b08]/80 border border-amber-400/20 px-1.5 py-1">
              <div className="animate-vertical-marquee space-y-1.5">
                {[...presidentialTreeRail, ...presidentialTreeRail].map((item, idx) => (
                  <div
                    key={`ptree_${item.id}_${idx}`}
                    className={`rounded-md px-1.5 py-1 flex items-center justify-between gap-1.5 border ${
                      item.level === 'presidente'
                        ? 'bg-amber-950/60 border-amber-400/50'
                        : item.level === 'diretor'
                        ? 'bg-emerald-950/60 border-amber-400/30'
                        : 'bg-black/55 border-emerald-500/25'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img
                        src={item.photo}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-5 h-5 rounded-full object-cover border border-amber-400/75 shrink-0"
                      />
                      <div className="min-w-0 leading-tight">
                        <p className="text-[9.5px] font-bold text-white truncate">{item.name}</p>
                        <p className="text-[8px] text-emerald-200/80 truncate">{item.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 font-mono text-[8.5px] font-bold text-amber-300 tabular-nums">
                      <span>{item.percent.toFixed(1)}%</span>
                      <span className="conae-snec-coin-spin w-3.5 h-3.5 rounded-full items-center justify-center bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-700 text-neutral-950 text-[4.5px] font-extrabold">
                        SNEC
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>

      <VisitAgentTerminalModal
        open={terminal254Open}
        onClose={() => setTerminal254Open(false)}
        firebaseUser={firebaseUser}
        isAdmin={isAdmin}
        onGoogleLogin={onGoogleLogin}
      />
    </div>
  );
};
