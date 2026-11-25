import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Layers,
  MapPin,
  MessageCircle,
  QrCode,
  Share2,
  Sparkles,
  Ticket,
  UserCheck,
  Users,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../firebase';
import type { DukeEventRecord, DukeEventSpec, DukeEventTheme } from '../types';

interface PublicEventPageProps {
  slug?: string;
  previewEvent?: DukeEventSpec | null;
  embedded?: boolean;
  publishedUrl?: string;
  onBackToStudio?: () => void;
  onBackToConae?: () => void;
}

interface ThemePalette {
  pageBg: string;
  surface: string;
  surfaceSubtle: string;
  border: string;
  accentText: string;
  accentBg: string;
  accentBgHover: string;
  accentOnBg: string;
  headingText: string;
  bodyText: string;
  mutedText: string;
  heroGlow: string;
  isLight: boolean;
}

const THEME_PALETTES: Record<DukeEventTheme, ThemePalette> = {
  emerald_gold: {
    pageBg: 'bg-[#040b08]',
    surface: 'bg-[#081711]',
    surfaceSubtle: 'bg-[#0b2017]',
    border: 'border-amber-400/25',
    accentText: 'text-amber-300',
    accentBg: 'bg-amber-400',
    accentBgHover: 'hover:bg-amber-300',
    accentOnBg: 'text-neutral-950',
    headingText: 'text-white',
    bodyText: 'text-emerald-50/90',
    mutedText: 'text-emerald-200/70',
    heroGlow:
      'radial-gradient(circle at 18% 12%, rgba(16, 185, 129, 0.20), transparent 46%), radial-gradient(circle at 84% 10%, rgba(245, 158, 11, 0.16), transparent 42%)',
    isLight: false,
  },
  royal_blue: {
    pageBg: 'bg-[#050a14]',
    surface: 'bg-[#0a1426]',
    surfaceSubtle: 'bg-[#101e38]',
    border: 'border-sky-400/25',
    accentText: 'text-sky-300',
    accentBg: 'bg-sky-400',
    accentBgHover: 'hover:bg-sky-300',
    accentOnBg: 'text-slate-950',
    headingText: 'text-white',
    bodyText: 'text-slate-100/90',
    mutedText: 'text-slate-300/75',
    heroGlow:
      'radial-gradient(circle at 20% 10%, rgba(56, 189, 248, 0.22), transparent 46%), radial-gradient(circle at 82% 14%, rgba(59, 130, 246, 0.18), transparent 44%)',
    isLight: false,
  },
  crimson_gold: {
    pageBg: 'bg-[#0f0507]',
    surface: 'bg-[#1b0a0e]',
    surfaceSubtle: 'bg-[#260f15]',
    border: 'border-amber-400/30',
    accentText: 'text-amber-300',
    accentBg: 'bg-amber-400',
    accentBgHover: 'hover:bg-amber-300',
    accentOnBg: 'text-neutral-950',
    headingText: 'text-white',
    bodyText: 'text-rose-50/90',
    mutedText: 'text-rose-200/75',
    heroGlow:
      'radial-gradient(circle at 18% 12%, rgba(225, 29, 72, 0.24), transparent 46%), radial-gradient(circle at 84% 12%, rgba(245, 158, 11, 0.16), transparent 42%)',
    isLight: false,
  },
  midnight_violet: {
    pageBg: 'bg-[#080612]',
    surface: 'bg-[#120d24]',
    surfaceSubtle: 'bg-[#1b1436]',
    border: 'border-violet-400/25',
    accentText: 'text-violet-300',
    accentBg: 'bg-violet-400',
    accentBgHover: 'hover:bg-violet-300',
    accentOnBg: 'text-slate-950',
    headingText: 'text-white',
    bodyText: 'text-violet-50/90',
    mutedText: 'text-violet-200/75',
    heroGlow:
      'radial-gradient(circle at 20% 10%, rgba(139, 92, 246, 0.24), transparent 48%), radial-gradient(circle at 82% 14%, rgba(236, 72, 153, 0.16), transparent 42%)',
    isLight: false,
  },
  ivory_gold: {
    pageBg: 'bg-[#faf7f0]',
    surface: 'bg-white',
    surfaceSubtle: 'bg-[#f4eee0]',
    border: 'border-amber-700/20',
    accentText: 'text-amber-700',
    accentBg: 'bg-amber-700',
    accentBgHover: 'hover:bg-amber-800',
    accentOnBg: 'text-white',
    headingText: 'text-stone-900',
    bodyText: 'text-stone-700',
    mutedText: 'text-stone-500',
    heroGlow:
      'radial-gradient(circle at 18% 12%, rgba(217, 119, 6, 0.14), transparent 48%), radial-gradient(circle at 82% 14%, rgba(180, 83, 9, 0.08), transparent 44%)',
    isLight: true,
  },
};

function escapeHtml(input: string): string {
  return (input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildStandaloneEventHtml(ev: DukeEventSpec, publicUrl?: string): string {
  const isLight = ev.theme === 'ivory_gold';
  const bg = isLight ? '#faf7f0' : '#050b08';
  const cardBg = isLight ? '#ffffff' : '#0b1913';
  const text = isLight ? '#1c1917' : '#ecfdf5';
  const muted = isLight ? '#57534e' : '#a7f3d0';
  const accent = ev.theme === 'royal_blue' ? '#38bdf8' : ev.theme === 'midnight_violet' ? '#a78bfa' : '#f59e0b';
  const phoneDigits = (ev.whatsappPhone || '').replace(/\D/g, '');
  const waHref = phoneDigits
    ? `https://wa.me/${phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`}?text=${encodeURIComponent(
        `Olá! Quero garantir minha participação no evento ${ev.title}.`
      )}`
    : '#inscricao';

  const metricsHtml = ev.metrics
    .map(
      (m) =>
        `<div class="card"><div class="metric-val">${escapeHtml(m.value)}</div><div class="muted">${escapeHtml(m.label)}</div></div>`
    )
    .join('');

  const panelsHtml = ev.panels
    .map(
      (p) =>
        `<div class="card"><div class="badge">${escapeHtml(p.badge)}</div><h3>${escapeHtml(p.title)}</h3><p class="sub">${escapeHtml(p.subtitle)}</p><p class="muted">${escapeHtml(p.description)}</p></div>`
    )
    .join('');

  const scheduleHtml = ev.schedule
    .map(
      (s) =>
        `<div class="card row"><div class="time">${escapeHtml(s.time)}</div><div><h3>${escapeHtml(s.title)}</h3><p class="sub">${escapeHtml(s.speaker)} · ${escapeHtml(s.stage)}</p><p class="muted">${escapeHtml(s.description)}</p></div></div>`
    )
    .join('');

  const speakersHtml = ev.speakers
    .map(
      (sp) =>
        `<div class="card"><h3>${escapeHtml(sp.name)}</h3><p class="sub">${escapeHtml(sp.role)}</p><p class="muted">${escapeHtml(sp.topic)}</p></div>`
    )
    .join('');

  const ticketsHtml = ev.tickets
    .map(
      (t) =>
        `<div class="card ${t.highlighted ? 'highlight' : ''}"><h3>${escapeHtml(t.name)}</h3><div class="metric-val">${escapeHtml(t.priceLabel)}</div><p class="muted">${escapeHtml(t.perks)}</p></div>`
    )
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(ev.title)} · ${escapeHtml(ev.organizerName)}</title>
  <style>
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:${bg};color:${text};line-height:1.55}
    .wrap{max-width:980px;margin:0 auto;padding:36px 20px 64px}
    .eyebrow{color:${accent};font-weight:700;font-size:12px;letter-spacing:.1em;text-transform:uppercase}
    h1{font-size:clamp(28px,5vw,48px);line-height:1.12;margin:10px 0 12px}
    h2{font-size:22px;margin:36px 0 14px;border-bottom:1px solid rgba(245,158,11,.25);padding-bottom:8px}
    h3{margin:6px 0;font-size:17px}
    .lead{font-size:17px;opacity:.92;max-width:740px}
    .meta{display:flex;flex-wrap:wrap;gap:14px;margin:20px 0;font-size:14px;color:${muted}}
    .cta{display:inline-block;margin-top:14px;background:${accent};color:#0a0a0a;font-weight:700;padding:13px 22px;border-radius:10px;text-decoration:none}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}
    .card{background:${cardBg};border:1px solid rgba(245,158,11,.22);border-radius:14px;padding:16px}
    .highlight{border-color:${accent};box-shadow:0 0 0 1px ${accent}}
    .metric-val{font-size:26px;font-weight:800;color:${accent}}
    .badge{font-size:11px;font-weight:700;text-transform:uppercase;color:${accent};letter-spacing:.08em}
    .sub{font-size:13px;font-weight:600;margin:4px 0}
    .muted{font-size:13px;color:${muted};margin:6px 0 0}
    .row{display:flex;gap:16px;align-items:flex-start}
    .time{font-family:monospace;font-weight:700;color:${accent};min-width:74px}
    footer{margin-top:48px;padding-top:18px;border-top:1px solid rgba(245,158,11,.2);font-size:12px;color:${muted}}
  </style>
</head>
<body>
  <main class="wrap">
    ${ev.bannerImageUrl ? `<img src="${escapeHtml(ev.bannerImageUrl)}" alt="${escapeHtml(ev.title)}" style="width:100%;max-height:360px;object-fit:cover;border-radius:16px;margin-bottom:22px;border:1px solid rgba(245,158,11,.35)" />` : ''}
    <div class="eyebrow">${escapeHtml(ev.category)} · ${escapeHtml(ev.organizerName)}</div>
    <h1>${escapeHtml(ev.title)}</h1>
    <p class="lead">${escapeHtml(ev.subtitle)}</p>
    <p class="muted">${escapeHtml(ev.heroSummary)}</p>
    <div class="meta">
      <span>Data: <strong>${escapeHtml(ev.dateLabel)}</strong></span>
      ${ev.timeLabel ? `<span>Horário: <strong>${escapeHtml(ev.timeLabel)}</strong></span>` : ''}
      <span>Local: <strong>${escapeHtml(ev.venueName)} — ${escapeHtml(ev.city)}/${escapeHtml(ev.state)}</strong></span>
    </div>
    <a class="cta" href="${waHref}" target="_blank" rel="noopener noreferrer">${escapeHtml(ev.registrationCta)}</a>
    ${metricsHtml ? `<h2>Números do Evento</h2><div class="grid">${metricsHtml}</div>` : ''}
    ${panelsHtml ? `<h2>Painéis & Experiências</h2><div class="grid">${panelsHtml}</div>` : ''}
    ${scheduleHtml ? `<h2>Programação Oficial</h2><div style="display:grid;gap:12px">${scheduleHtml}</div>` : ''}
    ${speakersHtml ? `<h2>Preletores & Convidados</h2><div class="grid">${speakersHtml}</div>` : ''}
    ${ticketsHtml ? `<h2 id="inscricao">Ingressos & Inscrição</h2><div class="grid">${ticketsHtml}</div>` : ''}
    <footer>
      Página gerada pelo Robô Duque Evento · ${escapeHtml(ev.organizerName)}${publicUrl ? ` · Link oficial: ${escapeHtml(publicUrl)}` : ''}
    </footer>
  </main>
</body>
</html>`;
}

export const PublicEventPage: React.FC<PublicEventPageProps> = ({
  slug,
  previewEvent,
  embedded = false,
  publishedUrl,
  onBackToStudio,
  onBackToConae,
}) => {
  const [loadedEvent, setLoadedEvent] = useState<DukeEventRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(!previewEvent && Boolean(slug));
  const [notFound, setNotFound] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [attendeeName, setAttendeeName] = useState('');
  const [selectedTicket, setSelectedTicket] = useState('');
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);

  useEffect(() => {
    if (previewEvent) {
      setLoading(false);
      setNotFound(false);
      setLoadError(null);
      return;
    }
    if (!slug) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setLoadError(null);

    getDoc(doc(db, 'duke_events', slug))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setLoadedEvent(null);
          setNotFound(true);
        } else {
          setLoadedEvent(snap.data() as DukeEventRecord);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : 'Não foi possível carregar este evento no banco Firebase.'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, previewEvent]);

  const eventData: DukeEventSpec | null = previewEvent ?? loadedEvent;

  useEffect(() => {
    if (eventData?.tickets?.[0] && !selectedTicket) {
      setSelectedTicket(eventData.tickets[0].name);
    }
  }, [eventData, selectedTicket]);

  const palette = useMemo(() => {
    const key = eventData?.theme ?? 'emerald_gold';
    return THEME_PALETTES[key] ?? THEME_PALETTES.emerald_gold;
  }, [eventData?.theme]);

  const shareUrl = useMemo(() => {
    if (publishedUrl) return publishedUrl;
    if (typeof window !== 'undefined' && slug) {
      return `${window.location.origin}/evento/${slug}`;
    }
    if (typeof window !== 'undefined' && eventData?.slug) {
      return `${window.location.origin}/evento/${eventData.slug}`;
    }
    return '';
  }, [publishedUrl, slug, eventData?.slug]);

  const whatsappDigits = useMemo(() => {
    const raw = (eventData?.whatsappPhone || '').replace(/\D/g, '');
    if (!raw) return '';
    return raw.startsWith('55') ? raw : `55${raw}`;
  }, [eventData?.whatsappPhone]);

  const buildWhatsappRsvpUrl = (name: string, ticket: string) => {
    if (!whatsappDigits || !eventData) return '';
    const msg = `Olá! Meu nome é ${name.trim() || 'Participante'} e desejo confirmar minha inscrição no evento "${eventData.title}" (${ticket || 'Ingresso Oficial'}).${shareUrl ? ` Link: ${shareUrl}` : ''}`;
    return `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(msg)}`;
  };

  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2400);
    } catch {
      // Ignore clipboard failures in restricted contexts
    }
  };

  const handleDownloadHtml = () => {
    if (!eventData) return;
    const html = buildStandaloneEventHtml(eventData, shareUrl);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventData.slug || 'evento-duque'}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040b08] text-emerald-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-[#081711] border border-amber-400/30 p-6 text-center space-y-3">
          <Sparkles className="w-7 h-7 text-amber-300 mx-auto animate-spin" />
          <h1 className="font-display text-xl font-bold text-white">Carregando página do evento...</h1>
          <p className="text-sm text-emerald-200/75">
            Buscando painéis, programação e ingressos diretamente no banco Firebase.
          </p>
        </div>
      </div>
    );
  }

  if (notFound || loadError || !eventData) {
    return (
      <div className="min-h-screen bg-[#040b08] text-emerald-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-2xl bg-[#081711] border border-amber-400/35 p-6 space-y-4 text-center">
          <h1 className="font-display text-2xl font-bold text-white">
            {loadError ? 'Erro ao abrir evento' : 'Evento não encontrado'}
          </h1>
          <p className="text-sm text-emerald-200/80 leading-relaxed">
            {loadError ||
              `O link "/evento/${slug || ''}" ainda não foi publicado no banco ou foi removido pelo organizador.`}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            {onBackToStudio && (
              <button
                type="button"
                onClick={onBackToStudio}
                className="px-4 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-sm cursor-pointer whitespace-nowrap"
              >
                Criar Evento com Robô Duque
              </button>
            )}
            {onBackToConae && (
              <button
                type="button"
                onClick={onBackToConae}
                className="px-4 py-2.5 rounded-lg bg-black/50 hover:bg-black/70 border border-amber-400/35 text-emerald-100 font-semibold text-sm cursor-pointer whitespace-nowrap"
              >
                Voltar ao CONAE
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${embedded ? 'rounded-2xl overflow-hidden border ' + palette.border : 'min-h-screen'} ${palette.pageBg} ${palette.bodyText} relative`}
    >
      {/* Subtle Ambient Hero Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{ background: palette.heroGlow }}
      />

      {/* Standalone Public Top Navigation */}
      {!embedded && (
        <header
          className={`sticky top-0 z-30 border-b ${palette.border} ${
            palette.isLight ? 'bg-[#faf7f0]/92' : 'bg-black/65'
          } backdrop-blur-md`}
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {onBackToConae && (
                <button
                  type="button"
                  onClick={onBackToConae}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold ${palette.mutedText} hover:${palette.headingText} cursor-pointer whitespace-nowrap`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  CONAE
                </button>
              )}
              <span className={`text-xs font-bold tracking-wider uppercase truncate ${palette.accentText}`}>
                {eventData.organizerName}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {shareUrl && (
                <button
                  type="button"
                  onClick={handleCopyShareUrl}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${palette.border} text-xs font-semibold cursor-pointer whitespace-nowrap ${
                    palette.isLight ? 'bg-white text-stone-800 hover:bg-stone-50' : 'bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Link Copiado' : 'Copiar Link'}</span>
                </button>
              )}
              {shareUrl && (
                <button
                  type="button"
                  onClick={() => setShowQrModal((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${palette.border} text-xs font-semibold cursor-pointer whitespace-nowrap ${
                    palette.isLight ? 'bg-white text-stone-800 hover:bg-stone-50' : 'bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">QR Code</span>
                </button>
              )}
              {onBackToStudio && (
                <button
                  type="button"
                  onClick={onBackToStudio}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${palette.accentBg} ${palette.accentBgHover} ${palette.accentOnBg} text-xs font-bold cursor-pointer whitespace-nowrap`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Criar Meu Evento</span>
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Optional QR Code Share Panel */}
      {showQrModal && shareUrl && !embedded && (
        <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 pt-4">
          <div className={`rounded-2xl ${palette.surface} border ${palette.border} p-4 flex flex-col sm:flex-row items-center justify-between gap-4`}>
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-white shrink-0">
                <QRCodeSVG value={shareUrl} size={96} />
              </div>
              <div className="space-y-1">
                <h2 className={`text-sm font-bold ${palette.headingText}`}>QR Code Oficial de Divulgação</h2>
                <p className={`text-xs font-mono break-all ${palette.accentText}`}>{shareUrl}</p>
                <p className={`text-xs ${palette.mutedText}`}>
                  Compartilhe este link ou imprima o QR Code nos convites e telões do evento.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadHtml}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border ${palette.border} text-xs font-semibold cursor-pointer whitespace-nowrap ${
                palette.isLight ? 'bg-stone-100 text-stone-900' : 'bg-black/40 text-white hover:bg-black/60'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar HTML</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Event Canvas */}
      <main className={`relative z-10 max-w-5xl mx-auto ${embedded ? 'px-4 sm:px-6 py-6' : 'px-4 sm:px-6 py-10 sm:py-14'} space-y-10`}>
        {/* HERO SECTION */}
        <section className="space-y-5">
          {eventData.bannerImageUrl && (
            <div className={`rounded-2xl overflow-hidden border ${palette.border} bg-black/40 shadow-lg`}>
              <img
                src={eventData.bannerImageUrl}
                alt={eventData.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-[340px] object-cover block"
              />
            </div>
          )}
          <div className="space-y-3">
            <p className={`text-xs font-bold uppercase tracking-[0.16em] ${palette.accentText}`}>
              {eventData.category} · {eventData.organizerName}
            </p>
            <h1 className={`font-display ${embedded ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-5xl'} font-bold leading-tight [text-wrap:balance] ${palette.headingText}`}>
              {eventData.title}
            </h1>
            {eventData.subtitle && (
              <p className={`text-base sm:text-lg leading-relaxed max-w-3xl ${palette.bodyText}`}>
                {eventData.subtitle}
              </p>
            )}
            <p className={`text-sm leading-relaxed max-w-3xl ${palette.mutedText}`}>
              {eventData.heroSummary}
            </p>
          </div>

          {/* Core Event Info Strip (No Pill Clutter) */}
          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl ${palette.surface} border ${palette.border} p-4`}>
            <div className="flex items-start gap-2.5">
              <Calendar className={`w-4 h-4 mt-0.5 shrink-0 ${palette.accentText}`} />
              <div className="min-w-0">
                <span className={`block text-[11px] uppercase tracking-wider ${palette.mutedText}`}>Data</span>
                <span className={`text-sm font-semibold ${palette.headingText}`}>{eventData.dateLabel}</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock className={`w-4 h-4 mt-0.5 shrink-0 ${palette.accentText}`} />
              <div className="min-w-0">
                <span className={`block text-[11px] uppercase tracking-wider ${palette.mutedText}`}>Horário</span>
                <span className={`text-sm font-semibold ${palette.headingText}`}>
                  {eventData.timeLabel || 'Programação integral'}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${palette.accentText}`} />
              <div className="min-w-0">
                <span className={`block text-[11px] uppercase tracking-wider ${palette.mutedText}`}>Local</span>
                <span className={`text-sm font-semibold ${palette.headingText}`}>
                  {eventData.venueName} · {eventData.city}/{eventData.state}
                </span>
              </div>
            </div>
          </div>

          {/* Hero Primary Action Row */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href="#evento-inscricao"
              className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl ${palette.accentBg} ${palette.accentBgHover} ${palette.accentOnBg} font-bold text-sm transition-colors whitespace-nowrap`}
            >
              <Ticket className="w-4 h-4 shrink-0" />
              <span>{eventData.registrationCta}</span>
            </a>

            {whatsappDigits && (
              <a
                href={buildWhatsappRsvpUrl(attendeeName, selectedTicket)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Confirmar no WhatsApp</span>
              </a>
            )}

            {shareUrl && !embedded && (
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Convite oficial para ${eventData.title} — Confira a programação completa: ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border ${palette.border} text-sm font-semibold transition-colors whitespace-nowrap ${
                  palette.isLight ? 'bg-white text-stone-800 hover:bg-stone-50' : 'bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span>Divulgar Link</span>
              </a>
            )}
          </div>

          {/* Highlights Checklist */}
          {eventData.highlights.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              {eventData.highlights.map((item, idx) => (
                <div key={`hl_${idx}`} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${palette.accentText}`} />
                  <span className={palette.bodyText}>{item}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* METRICS / IMPACT NUMBERS */}
        {eventData.metrics.length > 0 && (
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {eventData.metrics.map((metric, idx) => (
              <div
                key={`met_${idx}`}
                className={`rounded-xl ${palette.surface} border ${palette.border} p-4 space-y-1`}
              >
                <span className={`block text-2xl font-bold font-mono tabular-nums ${palette.accentText}`}>
                  {metric.value}
                </span>
                <span className={`block text-xs ${palette.mutedText}`}>{metric.label}</span>
              </div>
            ))}
          </section>
        )}

        {/* CUSTOM EVENT PANELS */}
        {eventData.panels.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b pb-2.5 border-white/10">
              <div className="flex items-center gap-2">
                <Layers className={`w-4 h-4 ${palette.accentText}`} />
                <h2 className={`font-display text-xl sm:text-2xl font-bold ${palette.headingText}`}>
                  Painéis & Experiências do Evento
                </h2>
              </div>
              <span className={`text-xs font-mono ${palette.mutedText}`}>
                {eventData.panels.length} {eventData.panels.length === 1 ? 'painel' : 'painéis'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eventData.panels.map((panel, idx) => (
                <article
                  key={`pnl_${idx}`}
                  className={`rounded-xl ${palette.surface} border ${palette.border} p-5 space-y-2 flex flex-col justify-between`}
                >
                  <div className="space-y-1.5">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${palette.accentText}`}>
                      {panel.badge}
                    </span>
                    <h3 className={`text-base font-bold leading-snug ${palette.headingText}`}>
                      {panel.title}
                    </h3>
                    {panel.subtitle && (
                      <p className={`text-xs font-medium ${palette.bodyText}`}>{panel.subtitle}</p>
                    )}
                    <p className={`text-sm leading-relaxed ${palette.mutedText}`}>{panel.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* SCHEDULE / PROGRAMAÇÃO */}
        {eventData.schedule.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b pb-2.5 border-white/10">
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${palette.accentText}`} />
                <h2 className={`font-display text-xl sm:text-2xl font-bold ${palette.headingText}`}>
                  Programação Oficial
                </h2>
              </div>
              <span className={`text-xs font-mono ${palette.mutedText}`}>
                {eventData.dateLabel}
              </span>
            </div>

            <div className="space-y-2.5">
              {eventData.schedule.map((slot, idx) => (
                <div
                  key={`sch_${idx}`}
                  className={`rounded-xl ${palette.surface} border ${palette.border} p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-start`}
                >
                  <div className="sm:col-span-3 space-y-0.5">
                    <span className={`block font-mono text-sm font-bold tabular-nums ${palette.accentText}`}>
                      {slot.time}
                    </span>
                    <span className={`block text-xs ${palette.mutedText}`}>{slot.stage}</span>
                  </div>
                  <div className="sm:col-span-9 space-y-1">
                    <h3 className={`text-sm sm:text-base font-bold ${palette.headingText}`}>
                      {slot.title}
                    </h3>
                    <p className={`text-xs font-semibold ${palette.bodyText}`}>{slot.speaker}</p>
                    <p className={`text-xs sm:text-sm leading-relaxed ${palette.mutedText}`}>
                      {slot.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SPEAKERS / PRELETORES */}
        {eventData.speakers.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2.5 border-white/10">
              <Users className={`w-4 h-4 ${palette.accentText}`} />
              <h2 className={`font-display text-xl sm:text-2xl font-bold ${palette.headingText}`}>
                Preletores & Convidados Confirmados
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {eventData.speakers.map((speaker, idx) => {
                const initials = speaker.name
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() || '')
                  .join('');

                return (
                  <div
                    key={`spk_${idx}`}
                    className={`rounded-xl ${palette.surface} border ${palette.border} p-4 space-y-3`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full ${palette.surfaceSubtle} border ${palette.border} flex items-center justify-center font-bold text-xs ${palette.accentText} shrink-0`}
                      >
                        {initials || 'CV'}
                      </div>
                      <div className="min-w-0">
                        <h3 className={`text-sm font-bold truncate ${palette.headingText}`}>
                          {speaker.name}
                        </h3>
                        <p className={`text-xs truncate ${palette.accentText}`}>{speaker.role}</p>
                      </div>
                    </div>
                    <p className={`text-xs leading-relaxed ${palette.mutedText}`}>{speaker.topic}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TICKETS & REGISTRATION */}
        <section id="evento-inscricao" className="space-y-5">
          <div className="flex items-center gap-2 border-b pb-2.5 border-white/10">
            <Ticket className={`w-4 h-4 ${palette.accentText}`} />
            <h2 className={`font-display text-xl sm:text-2xl font-bold ${palette.headingText}`}>
              Ingressos & Credenciamento
            </h2>
          </div>

          {eventData.tickets.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {eventData.tickets.map((ticket, idx) => {
                const isSelected = selectedTicket === ticket.name;
                return (
                  <button
                    key={`tkt_${idx}`}
                    type="button"
                    onClick={() => setSelectedTicket(ticket.name)}
                    className={`text-left rounded-xl p-5 border transition-colors cursor-pointer space-y-2 ${
                      ticket.highlighted || isSelected
                        ? `${palette.surfaceSubtle} border-amber-400/70`
                        : `${palette.surface} ${palette.border} hover:border-amber-400/45`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-bold ${palette.headingText}`}>{ticket.name}</span>
                      {ticket.highlighted && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${palette.accentText}`}>
                          Destaque
                        </span>
                      )}
                    </div>
                    <div className={`text-2xl font-bold font-mono tabular-nums ${palette.accentText}`}>
                      {ticket.priceLabel}
                    </div>
                    <p className={`text-xs leading-relaxed ${palette.mutedText}`}>{ticket.perks}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Attendance Confirmation Form */}
          <div className={`rounded-2xl ${palette.surface} border ${palette.border} p-5 space-y-4`}>
            <div className="flex items-center gap-2">
              <UserCheck className={`w-4 h-4 ${palette.accentText}`} />
              <h3 className={`text-base font-bold ${palette.headingText}`}>
                Confirmar Presença / Solicitar Inscrição
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={attendeeName}
                onChange={(e) => {
                  setAttendeeName(e.target.value);
                  setRsvpSubmitted(false);
                }}
                placeholder="Seu nome completo"
                className={`rounded-lg border ${palette.border} px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400 ${
                  palette.isLight ? 'bg-stone-50 text-stone-900 placeholder:text-stone-400' : 'bg-black/45 text-white placeholder:text-emerald-200/45'
                }`}
              />
              <input
                type="text"
                value={selectedTicket}
                onChange={(e) => setSelectedTicket(e.target.value)}
                placeholder="Modalidade / Ingresso"
                className={`rounded-lg border ${palette.border} px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-400 ${
                  palette.isLight ? 'bg-stone-50 text-stone-900 placeholder:text-stone-400' : 'bg-black/45 text-white placeholder:text-emerald-200/45'
                }`}
              />
              {whatsappDigits ? (
                <a
                  href={buildWhatsappRsvpUrl(attendeeName, selectedTicket)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg ${palette.accentBg} ${palette.accentBgHover} ${palette.accentOnBg} font-bold text-sm transition-colors whitespace-nowrap`}
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>Enviar no WhatsApp</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setRsvpSubmitted(true)}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg ${palette.accentBg} ${palette.accentBgHover} ${palette.accentOnBg} font-bold text-sm transition-colors cursor-pointer whitespace-nowrap`}
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Confirmar Pré-Inscrição</span>
                </button>
              )}
            </div>

            {rsvpSubmitted && !whatsappDigits && (
              <p className={`text-xs font-semibold ${palette.accentText}`}>
                Pré-inscrição registrada para {attendeeName.trim() || 'Participante'} ({selectedTicket || 'Ingresso Padrão'}).
              </p>
            )}
          </div>
        </section>

        {/* FOOTER */}
        <footer className={`pt-6 border-t ${palette.border} flex flex-wrap items-center justify-between gap-3 text-xs ${palette.mutedText}`}>
          <div>
            <strong>{eventData.organizerName}</strong> · {eventData.tagline}
          </div>
          {!embedded && (
            <div className="flex items-center gap-3">
              <span>Criado com Robô Duque Evento · IA</span>
              {onBackToStudio && (
                <button
                  type="button"
                  onClick={onBackToStudio}
                  className={`inline-flex items-center gap-1 font-semibold ${palette.accentText} hover:underline cursor-pointer`}
                >
                  <span>Criar seu evento</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </footer>
      </main>
    </div>
  );
};
