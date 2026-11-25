import React, { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Pill,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { BRAZILIAN_STATES, EXECUTIVES_TEAM } from '../data/conaeSeed';
import { BrazilStateFlag } from './BrazilStateFlag';
import { useLanguage } from '../i18n/LanguageContext';
import type {
  BenefitPartnerCategory,
  ExecutiveMandate,
  ExecutiveMandateArea,
  ExecutiveMandateStatus,
  UserProfile,
} from '../types';

interface MandatesAndReportsPanelProps {
  isPresidentMode: boolean;
  authorizedLabel?: string | null;
  usersList: UserProfile[];
  mandates: ExecutiveMandate[];
  onCreateMandate?: (mandate: {
    assigneeUid?: string;
    assigneeName: string;
    assigneeRole: 'Executivo' | 'Afiliado';
    area: ExecutiveMandateArea;
    missionTitle: string;
    scopeDescription: string;
    state: string;
    city?: string;
    grantedBy: string;
  }) => Promise<void>;
  onSubmitMandateReport?: (params: {
    mandate: ExecutiveMandate;
    city: string;
    partnerName: string;
    partnerDiscountPercent: number;
    partnerStars?: number;
    executionReport: string;
    submittedBy: string;
    status: 'em_execucao' | 'relatorio_enviado';
  }) => Promise<void>;
  onApproveMandateAndInsert?: (params: {
    mandate: ExecutiveMandate;
    insertIntoCatalog: boolean;
  }) => Promise<void>;
  onUpdateMandateStatus?: (mandate: ExecutiveMandate, status: ExecutiveMandateStatus) => Promise<void>;
  onDeleteMandate?: (id: string) => Promise<void>;
}

const MANDATE_AREAS: ExecutiveMandateArea[] = [
  'Hotelaria',
  'Farmácia',
  'Clubes',
  'Fiscalização de Operações',
  'Cursos & Eventos',
  'Comércio & Parcerias',
];

export const MandatesAndReportsPanel: React.FC<MandatesAndReportsPanelProps> = ({
  isPresidentMode,
  authorizedLabel,
  usersList,
  mandates,
  onCreateMandate,
  onSubmitMandateReport,
  onApproveMandateAndInsert,
  onUpdateMandateStatus,
  onDeleteMandate,
}) => {
  const { tr } = useLanguage();

  // President Grant Mandate form
  const [assigneePreset, setAssigneePreset] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [assigneeUid, setAssigneeUid] = useState('');
  const [assigneeRole, setAssigneeRole] = useState<'Executivo' | 'Afiliado'>('Executivo');
  const [area, setArea] = useState<ExecutiveMandateArea>('Hotelaria');
  const [stateUf, setStateUf] = useState('GO');
  const [city, setCity] = useState('');
  const [missionTitle, setMissionTitle] = useState('');
  const [scopeDescription, setScopeDescription] = useState('');
  const [savingGrant, setSavingGrant] = useState(false);

  // Filter & Report submission states
  const [areaFilter, setAreaFilter] = useState<'TODAS' | ExecutiveMandateArea>('TODAS');
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [reportPartnerName, setReportPartnerName] = useState('');
  const [reportCity, setReportCity] = useState('');
  const [reportDiscount, setReportDiscount] = useState('25');
  const [reportStars, setReportStars] = useState('4');
  const [reportText, setReportText] = useState('');
  const [submittingReportId, setSubmittingReportId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredMandates = useMemo(() => {
    if (areaFilter === 'TODAS') return mandates;
    return mandates.filter((m) => m.area === areaFilter);
  }, [mandates, areaFilter]);

  const counts = useMemo(
    () => ({
      total: mandates.length,
      pendingReport: mandates.filter((m) => m.status === 'outorgado' || m.status === 'em_execucao').length,
      awaitingApproval: mandates.filter((m) => m.status === 'relatorio_enviado').length,
      approved: mandates.filter((m) => m.status === 'aprovado').length,
    }),
    [mandates]
  );

  const handleSelectPreset = (value: string) => {
    setAssigneePreset(value);
    if (!value) return;
    if (value.startsWith('exec:')) {
      const execId = value.slice(5);
      const ex = EXECUTIVES_TEAM.find((e) => e.id === execId);
      if (ex) {
        setAssigneeName(ex.name);
        setAssigneeRole('Executivo');
        setAssigneeUid('');
      }
      return;
    }
    if (value.startsWith('user:')) {
      const uid = value.slice(5);
      const u = usersList.find((x) => x.uid === uid);
      if (u) {
        setAssigneeName(u.displayName);
        setAssigneeUid(u.uid);
        setAssigneeRole(u.role === 'executive' || u.role === 'president' ? 'Executivo' : 'Afiliado');
        if (u.state) setStateUf(u.state);
      }
    }
  };

  const handleCreateMandate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateMandate) return;
    const cleanName = assigneeName.trim();
    const cleanMission = missionTitle.trim();
    const cleanScope = scopeDescription.trim();
    if (cleanName.length < 2 || cleanMission.length < 2 || cleanScope.length < 2) {
      setFeedback(
        tr(
          'Preencha o responsável (executivo/afiliado), título da missão e os poderes outorgados.',
          'Fill in the responsible person, mission title, and granted powers.'
        )
      );
      return;
    }
    setSavingGrant(true);
    setFeedback(null);
    try {
      await onCreateMandate({
        assigneeUid: assigneeUid.trim() || undefined,
        assigneeName: cleanName.slice(0, 100),
        assigneeRole,
        area,
        missionTitle: cleanMission.slice(0, 140),
        scopeDescription: cleanScope.slice(0, 400),
        state: stateUf,
        city: city.trim().slice(0, 80) || undefined,
        grantedBy: (authorizedLabel || 'Apóstolo Hélio César · Presidência CONAE').slice(0, 100),
      });
      setAssigneePreset('');
      setAssigneeName('');
      setAssigneeUid('');
      setCity('');
      setMissionTitle('');
      setScopeDescription('');
      setFeedback(
        tr(
          `Outorgação oficial concedida a ${cleanName} para a área de ${area}.`,
          `Official mandate granted to ${cleanName} for ${area}.`
        )
      );
    } finally {
      setSavingGrant(false);
    }
  };

  const openReportEditor = (m: ExecutiveMandate) => {
    setActiveReportId(m.id);
    setReportPartnerName(m.partnerName || '');
    setReportCity(m.city || '');
    setReportDiscount(String(m.partnerDiscountPercent ?? 25));
    setReportStars(String(m.partnerStars ?? 4));
    setReportText(m.executionReport || '');
    setFeedback(null);
  };

  const handleSubmitReport = async (m: ExecutiveMandate) => {
    if (!onSubmitMandateReport) return;
    const cleanReport = reportText.trim();
    if (cleanReport.length < 5) {
      setFeedback(
        tr(
          'Descreva os detalhes do fechamento ou da fiscalização no relatório de execução.',
          'Describe the closed agreement or inspection details in the execution report.'
        )
      );
      return;
    }
    setSubmittingReportId(m.id);
    setFeedback(null);
    try {
      await onSubmitMandateReport({
        mandate: m,
        city: (reportCity.trim() || m.city || 'Goiânia').slice(0, 80),
        partnerName: reportPartnerName.trim().slice(0, 120),
        partnerDiscountPercent: Math.min(100, Math.max(0, Number(reportDiscount) || 0)),
        partnerStars: m.area === 'Hotelaria' ? Math.min(5, Math.max(2, Number(reportStars) || 4)) : undefined,
        executionReport: cleanReport.slice(0, 600),
        submittedBy: (authorizedLabel || m.assigneeName).slice(0, 100),
        status: 'relatorio_enviado',
      });
      setActiveReportId(null);
      setFeedback(
        tr(
          'Relatório de execução enviado para conferência e homologação da Presidência.',
          'Execution report submitted for Presidency review and approval.'
        )
      );
    } finally {
      setSubmittingReportId(null);
    }
  };

  const canInsertCatalog = (mArea: ExecutiveMandateArea) =>
    mArea === 'Hotelaria' ||
    mArea === 'Farmácia' ||
    mArea === 'Clubes' ||
    mArea === 'Comércio & Parcerias';

  const statusBadge = (status: ExecutiveMandateStatus) => {
    switch (status) {
      case 'aprovado':
        return {
          label: tr('Aprovado / Homologado', 'Approved'),
          cls: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200',
        };
      case 'relatorio_enviado':
        return {
          label: tr('Relatório Enviado', 'Report Submitted'),
          cls: 'bg-amber-500/25 border-amber-400/60 text-amber-200',
        };
      case 'em_execucao':
        return {
          label: tr('Em Execução', 'In Execution'),
          cls: 'bg-sky-500/20 border-sky-400/45 text-sky-200',
        };
      case 'revogado':
        return {
          label: tr('Revogado', 'Revoked'),
          cls: 'bg-red-500/20 border-red-400/45 text-red-200',
        };
      default:
        return {
          label: tr('Outorgado', 'Granted'),
          cls: 'bg-emerald-950/80 border-amber-400/35 text-amber-300',
        };
    }
  };

  const areaIcon = (mArea: ExecutiveMandateArea) => {
    if (mArea === 'Hotelaria') return <Building2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
    if (mArea === 'Farmácia') return <Pill className="w-3.5 h-3.5 text-emerald-300 shrink-0" />;
    if (mArea === 'Fiscalização de Operações')
      return <ShieldCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
    return <ClipboardCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />;
  };

  return (
    <div className="space-y-5">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="conae-panel rounded-xl p-3.5">
          <p className="text-emerald-200/75">{tr('Total de Outorgações', 'Total Mandates')}</p>
          <p className="text-xl font-bold font-mono text-white mt-1 tabular-nums">{counts.total}</p>
        </div>
        <div className="conae-panel rounded-xl p-3.5">
          <p className="text-emerald-200/75">{tr('Em Execução', 'In Progress')}</p>
          <p className="text-xl font-bold font-mono text-amber-300 mt-1 tabular-nums">{counts.pendingReport}</p>
        </div>
        <div className="conae-panel rounded-xl p-3.5">
          <p className="text-emerald-200/75">{tr('Relatórios p/ Aprovar', 'Reports Pending')}</p>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1 tabular-nums">{counts.awaitingApproval}</p>
        </div>
        <div className="conae-panel rounded-xl p-3.5">
          <p className="text-emerald-200/75">{tr('Homologados / Inseridos', 'Approved / Inserted')}</p>
          <p className="text-xl font-bold font-mono text-emerald-300 mt-1 tabular-nums">{counts.approved}</p>
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl bg-emerald-950/75 border border-emerald-400/45 px-4 py-2.5 text-xs text-emerald-100 flex items-center justify-between gap-2">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-amber-300 hover:text-white text-[11px] font-bold cursor-pointer"
          >
            OK
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* President Form: Conceder Outorgação a Executivo ou Afiliado */}
        {isPresidentMode && (
          <form
            onSubmit={handleCreateMandate}
            className="lg:col-span-5 conae-panel rounded-xl p-4 sm:p-5 space-y-3 border border-amber-400/40"
          >
            <div className="flex items-center gap-2 border-b border-amber-400/20 pb-2.5">
              <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-white">
                  {tr('Conceder Outorgação Presidencial', 'Grant Presidential Mandate')}
                </h4>
                <p className="text-[11px] text-emerald-200/75">
                  {tr(
                    'Outorgue poder a Executivos e Afiliados para fechar Hotelaria, Farmácias, Clubes e Fiscalização.',
                    'Grant mandate to Executives and Affiliates to close Hotels, Pharmacies, Clubs, and Audits.'
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-amber-200">
                {tr('Selecionar Executivo ou Afiliado Cadastrado', 'Select Registered Executive or Affiliate')}
              </label>
              <select
                value={assigneePreset}
                onChange={(e) => handleSelectPreset(e.target.value)}
                className="w-full rounded-lg bg-black/55 border border-amber-400/35 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="">{tr('— Escolher da lista ou digitar abaixo —', '— Pick from list or type below —')}</option>
                <optgroup label={tr('Diretoria Executiva CONAE', 'CONAE Executive Board')}>
                  {EXECUTIVES_TEAM.map((ex) => (
                    <option key={ex.id} value={`exec:${ex.id}`}>
                      {ex.name} ({ex.role})
                    </option>
                  ))}
                </optgroup>
                {usersList.length > 0 && (
                  <optgroup label={tr('Afiliados & Usuários Cadastrados', 'Registered Affiliates & Users')}>
                    {usersList.map((u) => (
                      <option key={u.uid} value={`user:${u.uid}`}>
                        {u.displayName} ({u.state} · {u.role})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-[11px] text-emerald-200/80">
                  {tr('Nome do Outorgado', 'Assignee Name')}
                </label>
                <input
                  type="text"
                  required
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  placeholder={tr('Ex: Executivo Samuel ou Afiliado João', 'e.g. Executive Samuel')}
                  className="w-full rounded-lg bg-black/55 border border-amber-400/35 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] text-emerald-200/80">
                  {tr('Função', 'Role')}
                </label>
                <select
                  value={assigneeRole}
                  onChange={(e) => setAssigneeRole(e.target.value as 'Executivo' | 'Afiliado')}
                  className="w-full rounded-lg bg-black/55 border border-amber-400/35 px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Executivo">{tr('Executivo', 'Executive')}</option>
                  <option value="Afiliado">{tr('Afiliado', 'Affiliate')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-[11px] text-emerald-200/80">
                  {tr('Área da Outorgação', 'Mandate Area')}
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value as ExecutiveMandateArea)}
                  className="w-full rounded-lg bg-black/55 border border-amber-400/35 px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {MANDATE_AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] text-emerald-200/80">{tr('Estado', 'State')}</label>
                <select
                  value={stateUf}
                  onChange={(e) => setStateUf(e.target.value)}
                  className="w-full rounded-lg bg-black/55 border border-amber-400/35 px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {BRAZILIAN_STATES.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] text-emerald-200/80">
                {tr('Cidade / Região de Atuação (opcional)', 'City / Region (optional)')}
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={tr('Ex: Goiânia / Aparecida de Goiânia', 'e.g. Goiânia')}
                className="w-full rounded-lg bg-black/55 border border-amber-400/35 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] text-emerald-200/80">
                {tr('Missão / Responsabilidade Outorgada', 'Granted Mission / Responsibility')}
              </label>
              <input
                type="text"
                required
                value={missionTitle}
                onChange={(e) => setMissionTitle(e.target.value)}
                placeholder={tr(
                  'Ex: Fechamento de convênio com hotéis 4 e 5 estrelas',
                  'e.g. Close partnership agreement with 4 & 5-star hotels'
                )}
                className="w-full rounded-lg bg-black/55 border border-amber-400/35 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] text-emerald-200/80">
                {tr('Escopo de Execução & Critérios do Relatório', 'Execution Scope & Report Criteria')}
              </label>
              <textarea
                rows={3}
                required
                value={scopeDescription}
                onChange={(e) => setScopeDescription(e.target.value)}
                placeholder={tr(
                  'Ex: Negociar desconto mínimo de 25% para afiliados CONAE, coletar contrato assinado e enviar relatório para inserção oficial no app.',
                  'e.g. Negotiate min 25% discount for CONAE affiliates, collect signed agreement, and submit report for app catalog insertion.'
                )}
                className="w-full rounded-lg bg-black/55 border border-amber-400/35 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingGrant}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-55"
            >
              <Plus className="w-4 h-4" />
              <span>
                {savingGrant
                  ? tr('Registrando Outorgação...', 'Granting Mandate...')
                  : tr('Emitir Outorgação Oficial', 'Issue Official Mandate')}
              </span>
            </button>
          </form>
        )}

        {/* Active Mandates & Execution Reports Board */}
        <div
          className={`${
            isPresidentMode ? 'lg:col-span-7' : 'lg:col-span-12'
          } conae-panel rounded-xl p-4 sm:p-5 space-y-3.5`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/20 pb-2.5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400 shrink-0" />
              <h4 className="text-sm font-bold text-white">
                {tr(
                  'Outorgações Ativas & Relatórios de Execução',
                  'Active Mandates & Execution Reports'
                )}
              </h4>
            </div>
            <div className="flex flex-wrap gap-1">
              {(['TODAS', ...MANDATE_AREAS] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAreaFilter(a)}
                  className={`px-2 py-1 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                    areaFilter === a
                      ? 'bg-amber-500 text-neutral-950'
                      : 'bg-black/45 text-emerald-200/80 hover:text-white border border-white/10'
                  }`}
                >
                  {a === 'TODAS' ? tr('Todas', 'All') : a}
                </button>
              ))}
            </div>
          </div>

          {filteredMandates.length === 0 ? (
            <div className="rounded-xl bg-black/40 border border-amber-400/20 p-5 text-center text-xs text-emerald-200/75">
              {tr(
                'Nenhuma outorgação registrada nesta área ainda. O Presidente pode emitir uma outorgação ao lado para Hotelaria, Farmácias, Clubes ou Fiscalização.',
                'No mandates recorded in this area yet. The President can issue an official mandate on the left.'
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-[640px] overflow-y-auto conae-scroll pr-1">
              {filteredMandates.map((m) => {
                const badge = statusBadge(m.status);
                const isEditingReport = activeReportId === m.id;
                const isBusy = processingId === m.id || submittingReportId === m.id;

                return (
                  <div
                    key={m.id}
                    className="rounded-xl bg-black/50 border border-amber-400/25 p-3.5 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          {areaIcon(m.area)}
                          <span className="font-bold text-amber-300">{m.area}</span>
                          <span className="text-emerald-200/60">·</span>
                          <BrazilStateFlag uf={m.state} size="xs" />
                          <span className="font-mono text-white font-semibold">
                            {m.city ? `${m.city} - ${m.state}` : m.state}
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-white leading-snug">
                          {m.missionTitle}
                        </h5>
                        <p className="text-[11px] text-emerald-200/85">
                          <strong className="text-amber-200">{m.assigneeRole}:</strong> {m.assigneeName}{' '}
                          <span className="text-emerald-200/60">
                            · {tr('Outorgado por:', 'Granted by:')} {m.grantedBy}
                          </span>
                        </p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold shrink-0 ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <p className="text-xs text-emerald-100/80 leading-relaxed rounded-lg bg-emerald-950/35 border border-white/10 p-2.5">
                      {m.scopeDescription}
                    </p>

                    {/* Submitted Execution Report Box */}
                    {m.executionReport && (
                      <div className="rounded-lg bg-amber-950/30 border border-amber-400/35 p-2.5 space-y-1.5 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <span className="font-bold text-amber-300 flex items-center gap-1">
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            {tr('Relatório de Execução Enviado', 'Submitted Execution Report')}
                          </span>
                          {m.reportSubmittedAt && (
                            <span className="font-mono text-[10px] text-emerald-200/70">
                              {m.reportSubmittedAt}
                            </span>
                          )}
                        </div>
                        {m.partnerName && (
                          <p className="text-[11px] text-white font-semibold">
                            {tr('Parceiro / Operação Fechada:', 'Closed Partner / Operation:')}{' '}
                            <span className="text-amber-200">{m.partnerName}</span>
                            {typeof m.partnerDiscountPercent === 'number' && m.partnerDiscountPercent > 0 && (
                              <span className="ml-2 font-mono text-emerald-300">
                                ({m.partnerDiscountPercent}% {tr('desconto', 'off')})
                              </span>
                            )}
                            {m.area === 'Hotelaria' && m.partnerStars && (
                              <span className="ml-2 font-mono text-amber-300">
                                {m.partnerStars}★
                              </span>
                            )}
                          </p>
                        )}
                        <p className="text-emerald-50/90 leading-relaxed">{m.executionReport}</p>
                        {m.insertedIntoCatalog && (
                          <p className="text-[11px] font-bold text-emerald-300 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {tr(
                              'Já inserido oficialmente na rede do aplicativo CONAE!',
                              'Already inserted into the official CONAE app network!'
                            )}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Inline Report Form for Executive / President to file execution report */}
                    {isEditingReport && (
                      <div className="rounded-xl bg-[#04100a] border border-emerald-400/40 p-3 space-y-2.5">
                        <p className="text-xs font-bold text-emerald-300">
                          {tr(
                            'Preencher Relatório de Execução / Fechamento',
                            'Fill Execution / Partnership Closing Report'
                          )}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={reportPartnerName}
                            onChange={(e) => setReportPartnerName(e.target.value)}
                            placeholder={
                              m.area === 'Hotelaria'
                                ? tr('Nome do Hotel fechado', 'Closed Hotel name')
                                : m.area === 'Farmácia'
                                ? tr('Nome da Farmácia fechada', 'Closed Pharmacy name')
                                : m.area === 'Clubes'
                                ? tr('Nome do Clube fechado', 'Closed Club name')
                                : tr('Unidade / Operação fiscalizada', 'Audited Unit / Operation')
                            }
                            className="sm:col-span-2 rounded-lg bg-black/60 border border-amber-400/35 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                          <input
                            type="text"
                            value={reportCity}
                            onChange={(e) => setReportCity(e.target.value)}
                            placeholder={tr('Cidade', 'City')}
                            className="rounded-lg bg-black/60 border border-amber-400/35 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        {canInsertCatalog(m.area) && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-emerald-200/75">
                                {tr('Desconto Fechado (%)', 'Negotiated Discount (%)')}
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={reportDiscount}
                                onChange={(e) => setReportDiscount(e.target.value)}
                                className="w-full rounded-lg bg-black/60 border border-amber-400/35 px-2.5 py-1.5 text-xs text-white font-mono"
                              />
                            </div>
                            {m.area === 'Hotelaria' && (
                              <div className="space-y-0.5">
                                <label className="text-[10px] text-emerald-200/75">
                                  {tr('Estrelas do Hotel', 'Hotel Stars')}
                                </label>
                                <select
                                  value={reportStars}
                                  onChange={(e) => setReportStars(e.target.value)}
                                  className="w-full rounded-lg bg-black/60 border border-amber-400/35 px-2.5 py-1.5 text-xs text-white font-mono"
                                >
                                  <option value="5">5 ★</option>
                                  <option value="4">4 ★</option>
                                  <option value="3">3 ★</option>
                                  <option value="2">2 ★</option>
                                </select>
                              </div>
                            )}
                          </div>
                        )}

                        <textarea
                          rows={3}
                          value={reportText}
                          onChange={(e) => setReportText(e.target.value)}
                          placeholder={tr(
                            'Descreva o fechamento com o hotel/farmácia/clube ou os resultados da fiscalização realizada...',
                            'Describe the closed agreement or inspection findings...'
                          )}
                          className="w-full rounded-lg bg-black/60 border border-amber-400/35 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                        />

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveReportId(null)}
                            className="px-3 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-emerald-200 hover:text-white cursor-pointer"
                          >
                            {tr('Cancelar', 'Cancel')}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleSubmitReport(m)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-55"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>
                              {submittingReportId === m.id
                                ? tr('Enviando...', 'Submitting...')
                                : tr('Enviar Relatório ao Presidente', 'Submit Report to President')}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10">
                      {m.status !== 'aprovado' && m.status !== 'revogado' && (
                        <button
                          type="button"
                          onClick={() => openReportEditor(m)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-400/40 text-emerald-100 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-300" />
                          <span>
                            {m.executionReport
                              ? tr('Atualizar Relatório', 'Update Report')
                              : tr('Enviar Relatório de Execução', 'Submit Execution Report')}
                          </span>
                        </button>
                      )}

                      {isPresidentMode && m.status !== 'aprovado' && m.status !== 'revogado' && onApproveMandateAndInsert && (
                        <>
                          {canInsertCatalog(m.area) && m.partnerName && !m.insertedIntoCatalog ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={async () => {
                                setProcessingId(m.id);
                                setFeedback(null);
                                try {
                                  await onApproveMandateAndInsert({
                                    mandate: m,
                                    insertIntoCatalog: true,
                                  });
                                  setFeedback(
                                    tr(
                                      `Relatório aprovado e "${m.partnerName}" inserido automaticamente na rede CONAE!`,
                                      `Report approved and "${m.partnerName}" inserted into the official CONAE network!`
                                    )
                                  );
                                } finally {
                                  setProcessingId(null);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer disabled:opacity-55"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>
                                {m.area === 'Hotelaria'
                                  ? tr('Aprovar & Inserir Hotel na Rede', 'Approve & Add Hotel')
                                  : tr('Aprovar & Inserir na Rede', 'Approve & Add Partner')}
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={async () => {
                                setProcessingId(m.id);
                                setFeedback(null);
                                try {
                                  await onApproveMandateAndInsert({
                                    mandate: m,
                                    insertIntoCatalog: false,
                                  });
                                  setFeedback(
                                    tr('Relatório de execução aprovado pela Presidência!', 'Execution report approved by Presidency!')
                                  );
                                } finally {
                                  setProcessingId(null);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer disabled:opacity-55"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{tr('Aprovar Relatório', 'Approve Report')}</span>
                            </button>
                          )}
                        </>
                      )}

                      {isPresidentMode && m.status !== 'revogado' && onUpdateMandateStatus && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={async () => {
                            setProcessingId(m.id);
                            try {
                              await onUpdateMandateStatus(m, 'revogado');
                            } finally {
                              setProcessingId(null);
                            }
                          }}
                          className="px-2 py-1.5 rounded-lg bg-black/45 hover:bg-red-950/70 border border-red-400/35 text-red-200 text-[11px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{tr('Revogar', 'Revoke')}</span>
                        </button>
                      )}

                      {isPresidentMode && onDeleteMandate && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={async () => {
                            setProcessingId(m.id);
                            try {
                              await onDeleteMandate(m.id);
                            } finally {
                              setProcessingId(null);
                            }
                          }}
                          className="ml-auto p-1.5 rounded-lg bg-black/45 hover:bg-red-950/80 border border-red-400/30 text-red-300 cursor-pointer"
                          title={tr('Excluir outorgação', 'Delete mandate')}
                          aria-label={tr('Excluir outorgação', 'Delete mandate')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function mapMandateAreaToBenefitCategory(area: ExecutiveMandateArea): BenefitPartnerCategory {
  if (area === 'Farmácia') return 'Farmácia';
  if (area === 'Clubes') return 'Clube Conveniado';
  return 'Comércio';
}
