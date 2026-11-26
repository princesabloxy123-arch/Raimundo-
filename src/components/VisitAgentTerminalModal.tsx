import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MapPin,
  MessageCircle,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, isVisitTerminalPassword } from '../firebase';
import { WorldStates3DCanvas } from './WorldStates3DCanvas';
import type { AppVisitLog } from '../types';

interface VisitAgentTerminalModalProps {
  open: boolean;
  onClose: () => void;
  firebaseUser: User | null;
  isAdmin: boolean;
  onGoogleLogin?: () => Promise<void> | void;
  skipPasswordGate?: boolean;
}

const ADMIN_WHATSAPP_DIGITS = '5596981153517';
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

function formatTermTime(raw: unknown): string {
  try {
    if (!raw) return '--/--/-- --:--:--';
    let date: Date | null = null;
    if (typeof raw === 'object' && raw !== null && 'toDate' in raw) {
      date = (raw as Timestamp).toDate();
    } else if (typeof raw === 'string' || typeof raw === 'number') {
      date = new Date(raw);
    }
    if (!date || Number.isNaN(date.getTime())) return '--/--/-- --:--:--';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch {
    return '--/--/-- --:--:--';
  }
}

export const VisitAgentTerminalModal: React.FC<VisitAgentTerminalModalProps> = ({
  open,
  onClose,
  isAdmin,
  onGoogleLogin,
  skipPasswordGate = false,
}) => {
  const [authorized, setAuthorized] = useState(skipPasswordGate);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const [logs, setLogs] = useState<AppVisitLog[]>([]);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (open && skipPasswordGate) {
      setAuthorized(true);
    }
  }, [open, skipPasswordGate]);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const id = window.setInterval(() => {
      setCooldownLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldownLeft]);

  useEffect(() => {
    if (!open || !authorized || !isAdmin) {
      return;
    }

    const q = query(
      collection(db, 'app_visit_logs'),
      orderBy('createdAt', 'desc'),
      limit(150)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items: AppVisitLog[] = snap.docs.map((d) => ({
          ...(d.data() as AppVisitLog),
          id: d.id,
        }));
        setLogs(items);
      },
      () => {
        setLogs([]);
      }
    );

    return () => unsubscribe();
  }, [open, authorized, isAdmin]);

  const whatsAppReportHref = useMemo(() => {
    const top = logs.slice(0, 10);
    const lines = top.map((item, i) => {
      const gpsLine =
        typeof item.latitude === 'number' && typeof item.longitude === 'number'
          ? `\nGPS: ${item.latitude}, ${item.longitude}`
          : '';
      return [
        `${i + 1}. [${formatTermTime(item.createdAt)}] ${item.city} — ${item.state} (${item.deviceType})`,
        `IP: ${item.ipAddress || '-'} | ${item.protocol || 'HTTPS'} | ${item.deviceSpecs || '-'}${gpsLine}`,
        `${item.tabName} | ${item.pageUrl}`,
      ].join('\n');
    });
    return `https://wa.me/${ADMIN_WHATSAPP_DIGITS}?text=${encodeURIComponent(lines.join('\n\n'))}`;
  }, [logs]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownLeft > 0 || checking) return;
    const trimmed = pin.trim();
    if (!trimmed) return;

    setChecking(true);
    setPinError(null);
    try {
      const ok = await isVisitTerminalPassword(trimmed);
      if (ok) {
        setPin('');
        setFailedAttempts(0);
        setAuthorized(true);
        return;
      }
      const next = failedAttempts + 1;
      setFailedAttempts(next);
      setPin('');
      if (next >= MAX_ATTEMPTS) {
        setCooldownLeft(LOCKOUT_SECONDS);
        setFailedAttempts(0);
        setPinError(`${LOCKOUT_SECONDS}s`);
      } else {
        setPinError(`${next}/${MAX_ATTEMPTS}`);
      }
    } finally {
      setChecking(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'app_visit_logs', id));
    } catch {
      // ignore
    }
  };

  const handleAdminSignIn = async () => {
    if (!onGoogleLogin) return;
    setSigningIn(true);
    try {
      await onGoogleLogin();
    } finally {
      setSigningIn(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="254"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-5"
    >
      <div className="w-full max-w-4xl h-[82vh] max-h-[86vh] flex flex-col rounded-2xl border border-emerald-400/45 bg-[#020a07] shadow-[0_24px_80px_rgba(0,0,0,0.9)] overflow-hidden font-mono text-emerald-100">
        {/* Minimal Title Bar */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#051811] border-b border-emerald-500/30 relative z-20">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/90" />
            <Terminal className="w-4 h-4 text-emerald-400 ml-1 shrink-0" />
            <span className="text-xs font-bold text-emerald-200">254</span>
          </div>

          <div className="flex items-center gap-2">
            {authorized && logs.length > 0 && (
              <a
                href={whatsAppReportHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="p-1.5 rounded-lg bg-emerald-600/85 hover:bg-emerald-500 text-white"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="p-1.5 rounded-lg text-emerald-300/80 hover:text-white hover:bg-emerald-500/20 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body with 3D Rotating World & Brazilian States Globe Behind */}
        {!authorized ? (
          <div className="relative flex-1 p-6 flex flex-col items-center justify-center space-y-4 overflow-hidden">
            <div className="absolute inset-0 opacity-45 pointer-events-none">
              <WorldStates3DCanvas logs={[]} interactive={false} />
            </div>

            <div className="relative z-10 w-11 h-11 rounded-2xl bg-emerald-950/90 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <Lock className="w-5 h-5" />
            </div>

            <form onSubmit={handlePinSubmit} className="relative z-10 w-full max-w-[240px] space-y-3">
              <div className="relative">
                <KeyRound className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  disabled={cooldownLeft > 0 || checking}
                  placeholder="••••••"
                  className="w-full rounded-xl bg-black/80 border border-emerald-500/45 pl-9 pr-10 py-2.5 text-sm text-center tracking-widest text-emerald-100 placeholder:text-emerald-400/40 focus:outline-none focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  aria-label={showPin ? 'Ocultar' : 'Mostrar'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-300/70 hover:text-emerald-200 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {pinError && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-rose-300">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={cooldownLeft > 0 || checking}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-bold text-xs tracking-wider transition-colors cursor-pointer"
              >
                {cooldownLeft > 0 ? `${cooldownLeft}s` : 'ENTRAR'}
              </button>
            </form>
          </div>
        ) : (
          <div className="relative flex-1 overflow-hidden bg-[#020705]">
            {/* 3D World Globe Divided by Brazilian States Behind the Terminal */}
            <div className="absolute inset-0 opacity-65">
              <WorldStates3DCanvas logs={logs} interactive={logs.length === 0} />
            </div>

            <div className="relative z-10 h-full overflow-y-auto p-4 space-y-2 text-xs">
              {!isAdmin ? (
                <div className="h-full flex items-center justify-center">
                  {onGoogleLogin && (
                    <button
                      type="button"
                      onClick={() => void handleAdminSignIn()}
                      disabled={signingIn}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs cursor-pointer disabled:opacity-60 shadow-lg"
                    >
                      {signingIn ? '...' : 'Google'}
                    </button>
                  )}
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border border-emerald-500/30 bg-[#020a07]/82 backdrop-blur-sm p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap text-[11px]">
                        <span className="text-amber-300 font-bold">
                          [{formatTermTime(log.createdAt)}]
                        </span>
                        <span className="text-white font-bold">
                          {log.city} — {log.state} ({log.country})
                        </span>
                        <span className="text-sky-300">{log.deviceType}</span>
                        {log.protocol && (
                          <span className="text-emerald-300">{log.protocol}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleDeleteEntry(log.id)}
                        aria-label="Apagar"
                        className="text-rose-300/70 hover:text-rose-200 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[11px] text-emerald-200/90 space-y-0.5 break-all">
                      {(log.ipAddress || log.deviceSpecs) && (
                        <p className="text-amber-200/90">
                          {log.ipAddress ? `IP: ${log.ipAddress}` : ''}
                          {log.ipAddress && log.deviceSpecs ? ' · ' : ''}
                          {log.deviceSpecs || ''}
                        </p>
                      )}
                      {typeof log.latitude === 'number' && typeof log.longitude === 'number' && (
                        <p>
                          <a
                            href={`https://maps.google.com/?q=${log.latitude},${log.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-rose-300 hover:underline"
                          >
                            <MapPin className="w-3 h-3" />
                            {log.latitude}, {log.longitude}
                            {log.locationAccuracyM ? ` (±${log.locationAccuracyM}m)` : ''}
                          </a>
                        </p>
                      )}
                      <p>
                        {log.visitorLabel} · {log.tabName}
                      </p>
                      <p className="text-emerald-400/85">{log.pageUrl}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
