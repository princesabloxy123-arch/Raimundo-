import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe2,
  MapPin,
  MessageCircle,
  RefreshCw,
  Send,
  Server,
  ShieldAlert,
  Smartphone,
  Terminal,
  Trash2,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore';
import { auth, db, sanitizeDocId } from '../firebase';
import { VisitAgentTerminalModal } from './VisitAgentTerminalModal';
import { WorldStates3DCanvas } from './WorldStates3DCanvas';
import type {
  AppVisitLog,
  AppVisitWhatsAppProvider,
  AppVisitWhatsAppStatus,
} from '../types';

interface VisitAgentAdminPanelProps {
  isAdmin: boolean;
  isPresidentMode: boolean;
  authorizedLabel?: string | null;
}

interface AgentServerStatus {
  ok: boolean;
  destinationPhoneFormatted: string;
  whatsappProvider: AppVisitWhatsAppProvider;
  autoWhatsAppReady: boolean;
  totalHandledInMemory: number;
  dispatchedCountInMemory: number;
}

const ADMIN_WHATSAPP_DIGITS = '5596981153517';

const PROVIDER_LABELS: Record<AppVisitWhatsAppProvider, string> = {
  meta_cloud: 'Meta WhatsApp Cloud API (Automático)',
  callmebot: 'CallMeBot WhatsApp (Automático)',
  webhook: 'Webhook HTTPS / Evolution / n8n (Automático)',
  none: 'Aguardando chave no servidor (Envio 1-clique ativo)',
};

const STATUS_BADGE: Record<
  AppVisitWhatsAppStatus,
  { label: string; className: string }
> = {
  enviado: {
    label: 'Enviado no Zap',
    className: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  },
  aguardando_chave: {
    label: 'Registrado no Agente',
    className: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
  },
  cooldown: {
    label: 'Pausa anti-spam',
    className: 'bg-sky-500/20 text-sky-200 border-sky-400/40',
  },
  erro: {
    label: 'Erro no envio Zap',
    className: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
  },
};

function formatLogDate(raw: unknown): string {
  try {
    if (!raw) return 'Agora';
    let date: Date | null = null;
    if (typeof raw === 'object' && raw !== null && 'toDate' in raw) {
      date = (raw as Timestamp).toDate();
    } else if (typeof raw === 'string' || typeof raw === 'number') {
      date = new Date(raw);
    }
    if (!date || Number.isNaN(date.getTime())) return 'Agora';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch {
    return 'Agora';
  }
}

export const VisitAgentAdminPanel: React.FC<VisitAgentAdminPanelProps> = ({
  isAdmin,
  isPresidentMode,
  authorizedLabel,
}) => {
  const [logs, setLogs] = useState<AppVisitLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  const [serverStatus, setServerStatus] = useState<AgentServerStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const [testingAgent, setTestingAgent] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [terminalOpen, setTerminalOpen] = useState(false);

  const fetchServerStatus = async () => {
    setLoadingStatus(true);
    try {
      const resp = await fetch('/api/visit-agent', { cache: 'no-store' });
      if (resp.ok) {
        const data = (await resp.json()) as AgentServerStatus;
        setServerStatus(data);
      }
    } catch {
      // keep existing status
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    void fetchServerStatus();
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoadingLogs(false);
      return;
    }

    setLoadingLogs(true);
    setLogsError(null);

    const q = query(
      collection(db, 'app_visit_logs'),
      orderBy('createdAt', 'desc'),
      limit(120)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items: AppVisitLog[] = snap.docs.map((d) => ({
          ...(d.data() as AppVisitLog),
          id: d.id,
        }));
        setLogs(items);
        setLoadingLogs(false);
        setLogsError(null);
      },
      (err) => {
        setLoadingLogs(false);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes('permission')) {
          setLogsError(
            'A leitura completa do histórico de visitas é restrita à conta Google da Presidência (princesabloxy123@gmail.com).'
          );
        } else {
          setLogsError(`Não foi possível carregar os registros: ${msg}`);
        }
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (item) =>
        item.state.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        item.tabName.toLowerCase().includes(q) ||
        item.pageUrl.toLowerCase().includes(q) ||
        item.visitorLabel.toLowerCase().includes(q) ||
        item.deviceType.toLowerCase().includes(q)
    );
  }, [logs, searchTerm]);

  const stats = useMemo(() => {
    const stateSet = new Set<string>();
    const citySet = new Set<string>();
    const tabCounts = new Map<string, number>();
    let sentToZap = 0;

    for (const log of logs) {
      if (log.state) stateSet.add(log.state);
      if (log.city) citySet.add(`${log.city} (${log.state})`);
      if (log.whatsappStatus === 'enviado') sentToZap += 1;
      tabCounts.set(log.tabName, (tabCounts.get(log.tabName) || 0) + 1);
    }

    let topTab = '—';
    let topTabCount = 0;
    for (const [tab, count] of tabCounts.entries()) {
      if (count > topTabCount) {
        topTab = tab;
        topTabCount = count;
      }
    }

    return {
      total: logs.length,
      uniqueStates: stateSet.size,
      uniqueCities: citySet.size,
      sentToZap,
      topTab,
      topTabCount,
    };
  }, [logs]);

  const whatsAppSummaryHref = useMemo(() => {
    const latest = logs.slice(0, 8);
    const lines = [
      '📊 *RELATÓRIO DO AGENTE CONAE — VISITAS NO APP*',
      `Total registrado: ${stats.total} | Estados/Regiões: ${stats.uniqueStates}`,
      '',
    ];

    if (latest.length === 0) {
      lines.push('Nenhuma visita registrada ainda.');
    } else {
      latest.forEach((item, idx) => {
        lines.push(
          `${idx + 1}. *${item.city} — ${item.state}* (${item.deviceType})`,
          `   🧭 Tela: ${item.tabName}`,
          `   🔗 Link: ${item.pageUrl}`,
          `   🕒 ${formatLogDate(item.createdAt)}`
        );
      });
    }

    return `https://wa.me/${ADMIN_WHATSAPP_DIGITS}?text=${encodeURIComponent(lines.join('\n'))}`;
  }, [logs, stats.total, stats.uniqueStates]);

  const handleTestAgent = async () => {
    setTestingAgent(true);
    setTestResult(null);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const resp = await fetch('/api/visit-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          consentAccepted: true,
          sessionId: sanitizeDocId('admtest').slice(0, 48),
          eventType: 'test_alert',
          tabName: 'Teste do Agente (Painel Admin)',
          routePath: '/#admin-agente',
          pageUrl: window.location.href,
          deviceType: /Mobi|Android|iPhone/i.test(navigator.userAgent)
            ? 'Celular'
            : 'Computador',
          visitorLabel: authorizedLabel || 'Presidência CONAE',
          timezone: tz,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data?.ok) {
        setTestResult(data?.error || 'Erro ao acionar o Agente Servidor.');
        return;
      }

      const visitId = sanitizeDocId('visit');
      const payload: Record<string, unknown> = {
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
      };
      if (data.event.ipAddress) payload.ipAddress = data.event.ipAddress;
      if (data.event.protocol) payload.protocol = data.event.protocol;
      if (data.event.deviceSpecs) payload.deviceSpecs = data.event.deviceSpecs;
      if (typeof data.event.latitude === 'number') payload.latitude = data.event.latitude;
      if (typeof data.event.longitude === 'number') payload.longitude = data.event.longitude;
      if (typeof data.event.locationAccuracyM === 'number') {
        payload.locationAccuracyM = data.event.locationAccuracyM;
      }
      await setDoc(doc(db, 'app_visit_logs', visitId), payload);

      if (data.whatsappStatus === 'enviado') {
        setTestResult(
          `Alerta de teste enviado automaticamente para o WhatsApp ${data.destinationPhoneFormatted}!`
        );
      } else {
        setTestResult(
          `Teste gravado no Agente (${data.event.city} — ${data.event.state}). ${
            data.detail || 'Configure a variável de ambiente do WhatsApp para envio automático.'
          }`
        );
      }
      void fetchServerStatus();
    } catch (err) {
      setTestResult(
        err instanceof Error ? err.message : 'Falha ao testar o Agente Servidor.'
      );
    } finally {
      setTestingAgent(false);
    }
  };

  const handleDeleteLog = async (visitId: string) => {
    setDeletingId(visitId);
    try {
      await deleteDoc(doc(db, 'app_visit_logs', visitId));
    } catch {
      // ignore if unauthorized
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="relative space-y-5 rounded-2xl overflow-hidden">
      {/* 3D Interactive World Globe Divided by Brazilian States Behind the Panel */}
      <div className="relative rounded-2xl border border-emerald-400/35 bg-[#020b08] overflow-hidden shadow-2xl">
        <div className="h-[260px] sm:h-[310px] w-full relative">
          <WorldStates3DCanvas logs={logs} interactive focusBrazil />
          <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-black/70 border border-emerald-400/40 text-[11px] font-bold text-emerald-200 backdrop-blur-sm">
              Globo 3D Mundial · 27 Estados do Brasil
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-black/70 border border-amber-400/40 text-[11px] font-mono text-amber-300 backdrop-blur-sm">
              {stats.uniqueStates} UF(s) ativas · Arraste para girar
            </span>
          </div>
        </div>
      </div>

      {/* Header & Server Agent Status */}
      <div className="conae-panel rounded-2xl p-5 border border-amber-400/35 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-300">
              <Server className="w-5 h-5" />
              <h3 className="text-base md:text-lg font-bold text-white">
                Agente Servidor de Visitas &amp; Alerta Automático WhatsApp
              </h3>
            </div>
            <p className="text-xs text-emerald-100/80 max-w-2xl">
              Monitora acessos autorizados pelos visitantes (LGPD): grava cidade/estado aproximado,
              dispositivo, tela/aba aberta e link do app no servidor e encaminha alertas para o
              WhatsApp da Presidência{' '}
              <span className="font-bold text-amber-300">
                {serverStatus?.destinationPhoneFormatted || '+55 (96) 98115-3517'}
              </span>
              . Este painel é exclusivo da Administração.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTerminalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#041d14] hover:bg-[#072c1e] border border-emerald-400/60 text-emerald-200 font-mono font-bold text-xs transition-colors cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              Terminal 254
            </button>

            <button
              type="button"
              onClick={handleTestAgent}
              disabled={testingAgent}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-neutral-950 font-bold text-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {testingAgent ? 'Testando Agente...' : 'Testar Agente no Zap'}
            </button>

            <a
              href={whatsAppSummaryHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Enviar Resumo no Zap (96 98115-3517)
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="button"
              onClick={() => void fetchServerStatus()}
              disabled={loadingStatus}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-400/35 text-amber-200 hover:bg-amber-500/10 text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
              Atualizar Status
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl bg-black/35 border border-emerald-500/25 p-3">
            <p className="text-[11px] text-emerald-200/75 uppercase tracking-wide">
              Status do Agente Servidor
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-white">
                Online em /api/visit-agent
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/70 mt-1">
              Destino: {serverStatus?.destinationPhoneFormatted || '+55 (96) 98115-3517'}
            </p>
          </div>

          <div className="rounded-xl bg-black/35 border border-amber-400/25 p-3 md:col-span-2">
            <p className="text-[11px] text-amber-200/80 uppercase tracking-wide">
              Canal de Envio Automático para o WhatsApp
            </p>
            <div className="mt-1 flex items-center gap-2">
              {serverStatus?.autoWhatsAppReady ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span className="text-xs font-bold text-white">
                {PROVIDER_LABELS[serverStatus?.whatsappProvider || 'none']}
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/75 mt-1">
              {serverStatus?.autoWhatsAppReady
                ? 'Cada novo acesso autorizado no app dispara automaticamente uma mensagem no seu WhatsApp.'
                : 'O agente já grava todas as visitas aqui no painel em tempo real. Para disparar sozinho no seu WhatsApp 96 98115-3517 sem precisar clicar, ative uma das 3 chaves no passo a passo abaixo.'}
            </p>
          </div>
        </div>

        {testResult && (
          <div className="rounded-xl border border-amber-400/45 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-100">
            {testResult}
          </div>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="conae-panel-soft rounded-xl p-3.5 border border-amber-400/20">
          <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-semibold">
            <Activity className="w-3.5 h-3.5" />
            Visitas Registradas
          </div>
          <p className="text-xl font-bold text-white font-mono mt-1">{stats.total}</p>
          <p className="text-[10px] text-emerald-200/70">Últimos 120 registros autorizados</p>
        </div>

        <div className="conae-panel-soft rounded-xl p-3.5 border border-amber-400/20">
          <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-semibold">
            <Globe2 className="w-3.5 h-3.5" />
            Estados / Regiões
          </div>
          <p className="text-xl font-bold text-white font-mono mt-1">{stats.uniqueStates}</p>
          <p className="text-[10px] text-emerald-200/70">
            {stats.uniqueCities} cidades/localidades
          </p>
        </div>

        <div className="conae-panel-soft rounded-xl p-3.5 border border-amber-400/20">
          <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-semibold">
            <MessageCircle className="w-3.5 h-3.5" />
            Alertas no WhatsApp
          </div>
          <p className="text-xl font-bold text-white font-mono mt-1">{stats.sentToZap}</p>
          <p className="text-[10px] text-emerald-200/70">Disparados automaticamente</p>
        </div>

        <div className="conae-panel-soft rounded-xl p-3.5 border border-amber-400/20">
          <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-semibold">
            <MapPin className="w-3.5 h-3.5" />
            Tela Mais Acessada
          </div>
          <p className="text-sm font-bold text-white truncate mt-1.5" title={stats.topTab}>
            {stats.topTab}
          </p>
          <p className="text-[10px] text-emerald-200/70">
            {stats.topTabCount} acessos registrados
          </p>
        </div>
      </div>

      {/* Live Visitor Feed Table */}
      <div className="conae-panel rounded-2xl p-4 md:p-5 border border-amber-400/25 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-white">
              Registro em Tempo Real de Visitantes no Link do App
            </h4>
            <p className="text-[11px] text-emerald-200/70">
              Mostra cidade/estado, horário, dispositivo, tela visitada e link acessado.
            </p>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por estado, cidade, tela ou link..."
            className="w-full sm:w-72 rounded-xl bg-black/45 border border-amber-400/30 px-3 py-1.5 text-xs text-white placeholder:text-emerald-200/45 focus:outline-none focus:border-amber-400"
          />
        </div>

        {logsError && (
          <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-xs text-rose-100">
            {logsError}
          </div>
        )}

        {loadingLogs ? (
          <div className="py-8 text-center text-xs text-emerald-200/70">
            Carregando registros do Agente Servidor...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-emerald-200/70">
            Nenhum acesso encontrado ainda. Clique em <strong>Testar Agente no Zap</strong> acima ou
            aceite o aviso de privacidade no app para ver o primeiro registro instantâneo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-amber-400/20 text-[11px] text-amber-300 uppercase">
                  <th className="py-2 pr-3">Horário</th>
                  <th className="py-2 pr-3">Cidade / Estado / GPS</th>
                  <th className="py-2 pr-3">IP · Protocolo · Aparelho</th>
                  <th className="py-2 pr-3">Tela / Link Acessado</th>
                  <th className="py-2 pr-3">WhatsApp</th>
                  {isPresidentMode && <th className="py-2 text-right">Ação</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/15">
                {filteredLogs.map((log) => {
                  const badge = STATUS_BADGE[log.whatsappStatus] || STATUS_BADGE.aguardando_chave;
                  return (
                    <tr key={log.id} className="hover:bg-white/5 align-top">
                      <td className="py-2.5 pr-3 whitespace-nowrap text-emerald-100/85 font-mono text-[11px]">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-300" />
                          {formatLogDate(log.createdAt)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold text-white">{log.city}</p>
                        <p className="text-[11px] text-amber-200/90">
                          {log.state} · {log.country}
                        </p>
                        {typeof log.latitude === 'number' && typeof log.longitude === 'number' && (
                          <a
                            href={`https://maps.google.com/?q=${log.latitude},${log.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-rose-300 hover:underline font-mono mt-0.5"
                          >
                            <MapPin className="w-3 h-3" />
                            {log.latitude}, {log.longitude}
                          </a>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 max-w-[230px]">
                        <p className="font-mono text-[11px] text-amber-200">
                          {log.ipAddress || 'IP proxy'} · {log.protocol || 'HTTPS'}
                        </p>
                        <p className="font-medium text-emerald-50 text-[11px] inline-flex items-center gap-1">
                          <Smartphone className="w-3 h-3" />
                          {log.deviceType} — {log.visitorLabel}
                        </p>
                        {log.deviceSpecs && (
                          <p className="text-[10px] text-emerald-200/75 truncate" title={log.deviceSpecs}>
                            {log.deviceSpecs}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 max-w-xs">
                        <p className="font-semibold text-amber-200 truncate" title={log.tabName}>
                          {log.tabName}
                        </p>
                        <p
                          className="text-[11px] text-emerald-200/70 truncate font-mono"
                          title={log.pageUrl}
                        >
                          {log.pageUrl}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      {isPresidentMode && (
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => void handleDeleteLog(log.id)}
                            disabled={deletingId === log.id}
                            aria-label="Excluir registro"
                            className="p-1.5 rounded-lg text-rose-300/80 hover:text-rose-200 hover:bg-rose-500/15 cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Automatic WhatsApp Setup Instructions */}
      <div className="conae-panel-soft rounded-2xl p-4 md:p-5 border border-emerald-400/25 space-y-3">
        <h4 className="text-sm font-bold text-amber-300">
          Como ativar o envio 100% automático no WhatsApp (96) 98115-3517
        </h4>
        <p className="text-xs text-emerald-100/80 leading-relaxed">
          O servidor (<code className="text-amber-200">/api/visit-agent</code>) já está pronto para
          enviar alertas automáticos em segundo plano assim que você adicionar a chave de envio nas{' '}
          <strong>Variáveis de Ambiente (Environment Variables)</strong> na Vercel ou no servidor:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-black/40 border border-amber-400/25 p-3 space-y-1.5">
            <p className="font-bold text-amber-300">Opção 1 — CallMeBot (1 minuto, gratuito)</p>
            <ol className="list-decimal list-inside space-y-1 text-emerald-100/80 text-[11px]">
              <li>
                Salve o contato <span className="font-mono text-white">+34 644 71 98 38</span> no
                seu celular (96 98115-3517).
              </li>
              <li>
                Envie no WhatsApp:{' '}
                <span className="font-mono text-amber-200">
                  I allow callmebot to send me messages
                </span>
              </li>
              <li>
                Coloque o código recebido na variável{' '}
                <code className="text-amber-200">CALLMEBOT_API_KEY</code> e{' '}
                <code className="text-amber-200">WHATSAPP_ADMIN_PHONE=5596981153517</code>.
              </li>
            </ol>
          </div>

          <div className="rounded-xl bg-black/40 border border-emerald-400/20 p-3 space-y-1.5">
            <p className="font-bold text-emerald-300">Opção 2 — Meta WhatsApp Cloud API</p>
            <p className="text-[11px] text-emerald-100/80">
              Para uso corporativo oficial da Meta, adicione no servidor:
            </p>
            <ul className="space-y-1 font-mono text-[11px] text-amber-200">
              <li>WHATSAPP_CLOUD_TOKEN</li>
              <li>WHATSAPP_PHONE_NUMBER_ID</li>
              <li>WHATSAPP_ADMIN_PHONE=5596981153517</li>
            </ul>
          </div>

          <div className="rounded-xl bg-black/40 border border-emerald-400/20 p-3 space-y-1.5">
            <p className="font-bold text-sky-300">Opção 3 — Evolution API / Z-API / n8n / Make</p>
            <p className="text-[11px] text-emerald-100/80">
              Aponte um Webhook HTTPS para encaminhar o JSON de visitas ao seu WhatsApp:
            </p>
            <ul className="space-y-1 font-mono text-[11px] text-amber-200">
              <li>WHATSAPP_WEBHOOK_URL=https://...</li>
              <li>WHATSAPP_WEBHOOK_SECRET (opcional)</li>
            </ul>
          </div>
        </div>
      </div>

      <VisitAgentTerminalModal
        open={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        firebaseUser={auth.currentUser}
        isAdmin={isAdmin}
      />
    </div>
  );
};
