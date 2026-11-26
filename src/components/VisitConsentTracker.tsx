import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2, ShieldCheck, X } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, sanitizeDocId } from '../firebase';
import type {
  AppVisitDeviceType,
  AppVisitEventType,
  AppVisitLocationSource,
  AppVisitWhatsAppProvider,
  AppVisitWhatsAppStatus,
  TabId,
  UserProfile,
} from '../types';

export const CONSENT_STORAGE_KEY = 'conae_visit_captcha_session_v2';
export const CAPTCHA_CONSENT_EVENT = 'conae-visit-captcha-change';
const SESSION_STORAGE_KEY = 'conae_visit_session_id_v1';

const TAB_LABELS: Record<TabId, string> = {
  inicio: 'Início (Painel Principal)',
  cursos: 'Cursos CONAE',
  banco: 'Banco & Tesouraria CONAE',
  hoteis: 'Hotéis & Reservas',
  voos_gol: 'Passagens Aéreas GOL',
  voos_tam: 'Passagens Aéreas LATAM',
  beneficios: 'Clube de Benefícios',
  acionistas: 'Acionistas & Ações CNEC',
  vip: 'Sala VIP Executiva',
  midia: 'Mídia, TV & Rádio CONAE',
  afiliado: 'Portal do Afiliado',
  gestao_empresarial: 'Gestão Empresarial',
  gestao_eclesiastica: 'Gestão Eclesiástica',
  admin: 'Painel Administrativo',
};

interface VisitConsentTrackerProps {
  activeTab: TabId;
  standaloneRouteKind: 'main' | 'duque-evento' | 'public-event';
  standaloneSlug?: string;
  lockScreenActive?: boolean;
  firebaseUser: User | null;
  profile: UserProfile | null;
}

interface AgentApiSuccess {
  ok: true;
  event: {
    sessionId: string;
    visitorLabel: string;
    city: string;
    state: string;
    country: string;
    locationSource: AppVisitLocationSource;
    tabName: string;
    routePath: string;
    pageUrl: string;
    deviceType: AppVisitDeviceType;
    eventType: AppVisitEventType;
    consentAccepted: true;
  };
  whatsappStatus: AppVisitWhatsAppStatus;
  whatsappProvider: AppVisitWhatsAppProvider;
}

function getOrCreateSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9_-]{6,64}$/.test(existing)) {
      return existing;
    }
    const created = sanitizeDocId('vis').slice(0, 48);
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return sanitizeDocId('vis').slice(0, 48);
  }
}

function detectDeviceType(): AppVisitDeviceType {
  if (typeof navigator === 'undefined') return 'Desconhecido';
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (ua.includes('Android') && !ua.includes('Mobile'))) {
    return 'Tablet';
  }
  if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)) {
    return 'Celular';
  }
  return 'Computador';
}

function readConsentState(): 'pending' | 'accepted' | 'declined' {
  try {
    const raw = window.sessionStorage.getItem(CONSENT_STORAGE_KEY);
    if (raw === 'accepted' || raw === 'declined') return raw;
  } catch {
    // ignore storage restrictions
  }
  return 'pending';
}

function persistConsentState(decision: 'accepted' | 'declined') {
  try {
    window.sessionStorage.setItem(CONSENT_STORAGE_KEY, decision);
  } catch {
    // ignore storage restrictions
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CAPTCHA_CONSENT_EVENT, { detail: decision }));
  }
}

interface VisitCaptchaCardProps {
  variant?: 'inline' | 'floating';
}

export const VisitCaptchaCard: React.FC<VisitCaptchaCardProps> = ({ variant = 'inline' }) => {
  const [consent, setConsent] = useState<'pending' | 'accepted' | 'declined'>(() =>
    typeof window !== 'undefined' ? readConsentState() : 'pending'
  );
  const [captchaStage, setCaptchaStage] = useState<'idle' | 'verifying' | 'verified'>(() =>
    typeof window !== 'undefined' && readConsentState() === 'accepted' ? 'verified' : 'idle'
  );
  const [showTerms, setShowTerms] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onConsentChange = (e: Event) => {
      const detail = (e as CustomEvent<'accepted' | 'declined'>).detail;
      if (detail === 'accepted') {
        setConsent('accepted');
        setCaptchaStage('verified');
      } else if (detail === 'declined') {
        setConsent('declined');
        setDismissed(true);
      }
    };
    window.addEventListener(CAPTCHA_CONSENT_EVENT, onConsentChange);
    return () => window.removeEventListener(CAPTCHA_CONSENT_EVENT, onConsentChange);
  }, []);

  const handleCaptchaClick = () => {
    if (captchaStage !== 'idle') return;
    setCaptchaStage('verifying');

    window.setTimeout(() => {
      setCaptchaStage('verified');
      setConsent('accepted');
      persistConsentState('accepted');

      if (variant === 'floating') {
        window.setTimeout(() => {
          setDismissed(true);
        }, 900);
      }
    }, 400);
  };

  const handleDecline = () => {
    setConsent('declined');
    setDismissed(true);
    persistConsentState('declined');
  };

  if (dismissed || consent === 'declined') {
    return null;
  }

  if (variant === 'floating' && consent === 'accepted' && captchaStage === 'idle') {
    return null;
  }

  const containerClass =
    variant === 'inline'
      ? 'w-full max-w-xl rounded-xl border-2 border-amber-400/80 bg-white text-neutral-900 shadow-[0_14px_40px_rgba(0,0,0,0.6)] overflow-hidden shrink-0'
      : 'fixed top-3 left-1/2 -translate-x-1/2 z-[80] w-[calc(100vw-1.5rem)] max-w-[340px] rounded-xl border-2 border-amber-400/85 bg-white text-neutral-900 shadow-[0_18px_50px_rgba(0,0,0,0.65)] overflow-hidden';

  return (
    <div role="region" aria-label="Verificação CAPTCHA e Termos CONAE" className={containerClass}>
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleCaptchaClick}
          disabled={captchaStage !== 'idle'}
          aria-checked={captchaStage === 'verified'}
          role="checkbox"
          className="flex items-center gap-3 text-left group cursor-pointer disabled:cursor-default min-w-0 flex-1"
        >
          <span
            className={`w-7 h-7 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
              captchaStage === 'verified'
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : captchaStage === 'verifying'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
                  : 'bg-white border-neutral-400 group-hover:border-emerald-600'
            }`}
          >
            {captchaStage === 'verifying' && <Loader2 className="w-4 h-4 animate-spin" />}
            {captchaStage === 'verified' && <Check className="w-4 h-4 stroke-[3]" />}
          </span>

          <span className="min-w-0 leading-tight">
            <span className="block text-[13px] font-bold text-neutral-900">
              {captchaStage === 'verified'
                ? 'Verificado!'
                : captchaStage === 'verifying'
                  ? 'Verificando...'
                  : 'Não sou um robô'}
            </span>
            <span className="block text-[10px] text-neutral-600 mt-0.5 truncate">
              {captchaStage === 'verified'
                ? 'Acesso verificado conforme Termos CONAE'
                : 'Clique para confirmar e aceitar os Termos'}
            </span>
          </span>
        </button>

        <div className="flex flex-col items-center shrink-0 pl-2.5 border-l border-neutral-200">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            {captchaStage !== 'verified' && (
              <button
                type="button"
                onClick={handleDecline}
                aria-label="Fechar sem aceitar"
                title="Fechar sem aceitar"
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="text-[8.5px] font-extrabold tracking-wide text-neutral-700 mt-0.5 uppercase">
            CAPTCHA
          </span>
          <button
            type="button"
            onClick={() => setShowTerms((v) => !v)}
            className="text-[9px] text-emerald-700 hover:text-emerald-900 font-semibold underline mt-0.5 cursor-pointer"
          >
            Termos · Privacidade
          </button>
        </div>
      </div>

      {showTerms && (
        <div className="px-3.5 pb-3 pt-2 border-t border-neutral-200 bg-neutral-50 text-[10.5px] text-neutral-700 leading-relaxed space-y-2">
          <p>
            <strong className="text-neutral-900">Termos de Acesso (LGPD):</strong> ao marcar{' '}
            <em>&ldquo;Não sou um robô&rdquo;</em>, você concorda com os termos da plataforma CONAE
            e autoriza o registro de segurança da sua{' '}
            <strong className="text-neutral-900">cidade/estado aproximado</strong>,{' '}
            <strong className="text-neutral-900">dispositivo</strong>,{' '}
            <strong className="text-neutral-900">telas</strong> e{' '}
            <strong className="text-neutral-900">links acessados</strong> para proteção e
            atendimento.
          </p>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowTerms(false)}
              className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              Ocultar termos
            </button>
            {captchaStage !== 'verified' && (
              <button
                type="button"
                onClick={handleDecline}
                className="text-[10px] font-semibold text-neutral-500 hover:text-rose-600 cursor-pointer"
              >
                Continuar sem registro
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const VisitConsentTracker: React.FC<VisitConsentTrackerProps> = ({
  activeTab,
  standaloneRouteKind,
  standaloneSlug,
  lockScreenActive = false,
  firebaseUser,
  profile,
}) => {
  const [consent, setConsent] = useState<'pending' | 'accepted' | 'declined'>(() =>
    typeof window !== 'undefined' ? readConsentState() : 'pending'
  );

  const hasSentInitialOpenRef = useRef(false);
  const lastTrackedKeyRef = useRef<string>('');
  const sessionIdRef = useRef<string>('');

  useEffect(() => {
    const onConsentChange = (e: Event) => {
      const detail = (e as CustomEvent<'accepted' | 'declined'>).detail;
      if (detail === 'accepted' || detail === 'declined') {
        setConsent(detail);
      }
    };
    window.addEventListener(CAPTCHA_CONSENT_EVENT, onConsentChange);
    return () => window.removeEventListener(CAPTCHA_CONSENT_EVENT, onConsentChange);
  }, []);

  const resolvedTabName = (() => {
    if (standaloneRouteKind === 'duque-evento') return 'Robô Duque Evento & GPS';
    if (standaloneRouteKind === 'public-event') {
      return `Página de Evento (${(standaloneSlug || 'publico').slice(0, 40)})`;
    }
    if (lockScreenActive) return 'Tela de Acesso / Entrada CONAE';
    return TAB_LABELS[activeTab] || 'Início';
  })();

  const resolvedRoutePath = (() => {
    if (typeof window === 'undefined') return '/';
    const path = `${window.location.pathname}${window.location.search}` || '/';
    if (standaloneRouteKind === 'main') {
      return lockScreenActive ? `${path}#acesso` : `${path}#${activeTab}`;
    }
    return path;
  })();

  useEffect(() => {
    if (consent !== 'accepted' || typeof window === 'undefined') return;

    if (!sessionIdRef.current) {
      sessionIdRef.current = getOrCreateSessionId();
    }

    const trackingKey = `${standaloneRouteKind}:${standaloneSlug || ''}:${lockScreenActive ? 'lock' : activeTab}`;
    if (lastTrackedKeyRef.current === trackingKey) return;
    lastTrackedKeyRef.current = trackingKey;

    const eventType: AppVisitEventType = !hasSentInitialOpenRef.current
      ? 'app_open'
      : standaloneRouteKind === 'main'
        ? 'tab_view'
        : 'route_view';
    hasSentInitialOpenRef.current = true;

    const visitorLabel =
      profile?.displayName?.trim() ||
      firebaseUser?.displayName?.trim() ||
      (firebaseUser?.email ? firebaseUser.email.split('@')[0] : '') ||
      'Visitante';

    const timezone = (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      } catch {
        return '';
      }
    })();

    let cancelled = false;

    const reportVisit = async () => {
      try {
        const response = await fetch('/api/visit-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'track',
            consentAccepted: true,
            sessionId: sessionIdRef.current,
            eventType,
            tabName: resolvedTabName,
            routePath: resolvedRoutePath,
            pageUrl: window.location.href,
            deviceType: detectDeviceType(),
            visitorLabel: visitorLabel.slice(0, 80),
            timezone,
            consentedState: profile?.state || undefined,
          }),
        });

        if (!response.ok || cancelled) return;
        const data = (await response.json()) as AgentApiSuccess;
        if (!data?.ok || !data.event || cancelled) return;

        const visitId = sanitizeDocId('visit');
        await setDoc(doc(db, 'app_visit_logs', visitId), {
          id: visitId,
          sessionId: data.event.sessionId,
          visitorLabel: data.event.visitorLabel,
          city: data.event.city,
          state: data.event.state,
          country: data.event.country,
          locationSource: data.event.locationSource,
          tabName: data.event.tabName,
          routePath: data.event.routePath,
          pageUrl: data.event.pageUrl,
          deviceType: data.event.deviceType,
          eventType: data.event.eventType,
          whatsappStatus: data.whatsappStatus,
          whatsappProvider: data.whatsappProvider,
          consentAccepted: true,
          createdAt: serverTimestamp(),
        });
      } catch {
        // Non-blocking analytics
      }
    };

    const timer = window.setTimeout(() => {
      void reportVisit();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    consent,
    activeTab,
    standaloneRouteKind,
    standaloneSlug,
    lockScreenActive,
    resolvedTabName,
    resolvedRoutePath,
    firebaseUser,
    profile,
  ]);

  // On Lock Screen, the CAPTCHA is rendered inline between the Robot card and Photo card.
  if (lockScreenActive || consent !== 'pending') {
    return null;
  }

  return <VisitCaptchaCard variant="floating" />;
};
