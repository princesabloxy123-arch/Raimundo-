import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  CreditCard,
  GitBranch,
  GraduationCap,
  Hotel,
  Percent,
  Pill,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import type {
  BenefitPartner,
  BusinessPortalRecord,
  CourseItem,
  PartnerHotel,
  UserProfile,
} from '../types';
import { useLanguage } from '../i18n/LanguageContext';

const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

type BusinessSubTab = 'plano10' | 'hotelaria_eventos' | 'arvore_vendas' | 'beneficios_empresa';

interface BusinessManagementTabProps {
  profile: UserProfile | null;
  hotels: PartnerHotel[];
  courses: CourseItem[];
  benefitPartners: BenefitPartner[];
  records: BusinessPortalRecord[];
  onCreateRecord: (params: {
    recordType: BusinessPortalRecord['recordType'];
    title: string;
    companyOrHotel?: string;
    parentNodeId?: string;
    contactPhone?: string;
    state: string;
    eventDate?: string;
    guestsCount?: number;
    hotelId?: string;
    discountPercent?: number;
    investmentAmountBRL?: number;
    notes?: string;
    status?: BusinessPortalRecord['status'];
  }) => Promise<boolean>;
  onDeleteRecord: (id: string) => Promise<void>;
  onRequireAuth: () => void;
  onGoToHotels: () => void;
  onGoToCourses: () => void;
  onGoToBenefits: () => void;
  onGoToBank: () => void;
}

export const BusinessManagementTab: React.FC<BusinessManagementTabProps> = ({
  profile,
  hotels,
  courses,
  benefitPartners,
  records,
  onCreateRecord,
  onDeleteRecord,
  onRequireAuth,
  onGoToHotels,
  onGoToCourses,
  onGoToBenefits,
  onGoToBank,
}) => {
  const { isEn, tr, translateDynamic } = useLanguage();
  const locale = isEn ? 'en-US' : 'pt-BR';

  const [subTab, setSubTab] = useState<BusinessSubTab>('plano10');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  // Plano 10% CONAE state
  const [planAmount, setPlanAmount] = useState('5000');
  const [planCompany, setPlanCompany] = useState('');
  const [planPhone, setPlanPhone] = useState('');
  const [planState, setPlanState] = useState(profile?.state || 'GO');
  const [planNotes, setPlanNotes] = useState('');

  // Client & Hotelaria registration + Sales Tree state
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientState, setClientState] = useState(profile?.state || 'GO');
  const [clientParentId, setClientParentId] = useState('root');
  const [clientNotes, setClientNotes] = useState('');
  const [clientMode, setClientMode] = useState<'client' | 'sales_tree'>('sales_tree');

  // Partner Hotel Event scheduling state
  const activeHotels = useMemo(() => hotels.filter((h) => h.active !== false), [hotels]);
  const [selectedHotelId, setSelectedHotelId] = useState(activeHotels[0]?.id || '');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [eventGuests, setEventGuests] = useState('80');
  const [eventPhone, setEventPhone] = useState('');
  const [eventNotes, setEventNotes] = useState('');

  const selectedHotel = useMemo(
    () => activeHotels.find((h) => h.id === selectedHotelId) || activeHotels[0] || null,
    [activeHotels, selectedHotelId]
  );

  const pharmacyPartners = useMemo(
    () => benefitPartners.filter((p) => p.active !== false && p.category === 'Farmácia'),
    [benefitPartners]
  );

  const activeCourses = useMemo(
    () => courses.filter((c) => c.active !== false),
    [courses]
  );

  const planInvestments = useMemo(
    () => records.filter((r) => r.recordType === 'plan_10_investment'),
    [records]
  );
  const hotelEvents = useMemo(
    () => records.filter((r) => r.recordType === 'hotel_event'),
    [records]
  );
  const salesNodes = useMemo(
    () => records.filter((r) => r.recordType === 'sales_tree' || r.recordType === 'client'),
    [records]
  );

  const parsedPlanAmount = Math.max(0, Number(planAmount) || 0);
  const projectedTenPercent = Number((parsedPlanAmount * 0.1).toFixed(2));
  const totalInvestedPlan10 = useMemo(
    () => planInvestments.reduce((sum, r) => sum + (Number(r.investmentAmountBRL) || 0), 0),
    [planInvestments]
  );

  // Build hierarchical tree structure from salesNodes
  const treeChildrenMap = useMemo(() => {
    const map = new Map<string, BusinessPortalRecord[]>();
    const nodeIds = new Set(salesNodes.map((n) => n.id));
    salesNodes.forEach((node) => {
      const parentKey =
        node.parentNodeId && node.parentNodeId !== 'root' && nodeIds.has(node.parentNodeId)
          ? node.parentNodeId
          : 'root';
      const arr = map.get(parentKey) || [];
      arr.push(node);
      map.set(parentKey, arr);
    });
    return map;
  }, [salesNodes]);

  const handleCopySamuelPix = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('33004855844').catch(() => {});
    }
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2600);
  };

  const handleSubmitPlan10 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onRequireAuth();
      return;
    }
    if (parsedPlanAmount < 100) {
      setFeedback(
        tr(
          'Informe um valor mínimo de R$ 100,00 para o Plano 10% CONAE.',
          'Enter a minimum amount of R$ 100.00 for the CONAE 10% Plan.'
        )
      );
      return;
    }
    setSaving(true);
    setFeedback(null);
    const ok = await onCreateRecord({
      recordType: 'plan_10_investment',
      title: `Plano 10% CONAE · ${planCompany.trim() || profile.displayName}`,
      companyOrHotel: planCompany.trim() || profile.displayName,
      contactPhone: planPhone.trim(),
      state: planState,
      investmentAmountBRL: parsedPlanAmount,
      discountPercent: 50,
      notes:
        planNotes.trim() ||
        '3 meses Cartão Desconto Farmácia + Hotelaria + 50% acesso nos Cursos CONAE',
      status: 'pending',
    });
    setSaving(false);
    if (ok) {
      setPlanCompany('');
      setPlanNotes('');
      setFeedback(
        tr(
          'Investimento Plano 10% registrado! Seus 3 meses de Cartão de Desconto (Farmácia + Hotelaria) e 50% de acesso aos Cursos CONAE foram vinculados à sua conta.',
          '10% Plan investment recorded! Your 3-month Discount Card (Pharmacy + Hospitality) and 50% CONAE Courses access are now linked to your account.'
        )
      );
    }
  };

  const handleSubmitHotelEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onRequireAuth();
      return;
    }
    if (!selectedHotel || eventTitle.trim().length < 2) {
      setFeedback(
        tr(
          'Informe o nome do evento e selecione um hotel conveniado.',
          'Enter the event name and select a partner hotel.'
        )
      );
      return;
    }
    setSaving(true);
    setFeedback(null);
    const ok = await onCreateRecord({
      recordType: 'hotel_event',
      title: eventTitle.trim(),
      companyOrHotel: `${selectedHotel.name} (${selectedHotel.city}-${selectedHotel.state})`,
      hotelId: selectedHotel.id,
      discountPercent: selectedHotel.discountPercent,
      eventDate,
      guestsCount: Math.max(1, Math.min(10000, Number(eventGuests) || 20)),
      contactPhone: eventPhone.trim(),
      state: selectedHotel.state,
      notes: eventNotes.trim(),
      status: 'confirmed',
    });
    setSaving(false);
    if (ok) {
      setEventTitle('');
      setEventNotes('');
      setFeedback(
        tr(
          `Evento marcado em ${selectedHotel.name} com ${selectedHotel.discountPercent}% OFF de convênio CONAE!`,
          `Event scheduled at ${selectedHotel.name} with ${selectedHotel.discountPercent}% OFF CONAE agreement!`
        )
      );
    }
  };

  const handleSubmitClientOrTree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onRequireAuth();
      return;
    }
    if (clientName.trim().length < 2) {
      setFeedback(
        tr(
          'Informe o nome completo do cliente ou parceiro de vendas.',
          'Enter the full name of the client or sales partner.'
        )
      );
      return;
    }
    setSaving(true);
    setFeedback(null);
    const ok = await onCreateRecord({
      recordType: clientMode,
      title: clientName.trim(),
      companyOrHotel: clientCompany.trim() || 'Rede Empresarial & Hotelaria CONAE',
      parentNodeId: clientParentId || 'root',
      contactPhone: clientPhone.trim(),
      state: clientState,
      notes: clientNotes.trim(),
      status: 'active',
    });
    setSaving(false);
    if (ok) {
      setClientName('');
      setClientCompany('');
      setClientPhone('');
      setClientNotes('');
      setFeedback(
        tr(
          'Cadastro salvo na Árvore de Vendas e carteira de Hotelaria CONAE!',
          'Registration saved in the CONAE Sales Tree and Hospitality directory!'
        )
      );
    }
  };

  const handleRemove = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteRecord(id);
    } finally {
      setDeletingId(null);
    }
  };

  const renderTreeBranch = (parentId: string, depth: number): React.ReactNode => {
    const children = treeChildrenMap.get(parentId) || [];
    if (children.length === 0) return null;
    return (
      <div className={depth > 0 ? 'ml-4 sm:ml-6 pl-3 border-l border-amber-400/35 space-y-2.5 mt-2' : 'space-y-2.5'}>
        {children.map((node) => {
          const subCount = (treeChildrenMap.get(node.id) || []).length;
          return (
            <div key={node.id} className="space-y-1.5">
              <div className="rounded-lg bg-black/50 border border-amber-400/25 hover:border-amber-400/55 p-3 flex flex-wrap items-center justify-between gap-2 transition-colors">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold shrink-0">
                      N{depth + 1}
                    </span>
                    <p className="text-sm font-semibold text-white truncate">{node.title}</p>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/35 text-emerald-200">
                      {node.recordType === 'sales_tree'
                        ? tr('Rede de Vendas', 'Sales Network')
                        : tr('Cliente Hotelaria', 'Hospitality Client')}
                    </span>
                    <span className="text-[11px] font-mono text-amber-300">{node.state}</span>
                  </div>
                  <p className="text-xs text-emerald-200/80 mt-1">
                    {node.companyOrHotel || tr('Empresarial CONAE', 'CONAE Corporate')}
                    {node.contactPhone ? ` · ${node.contactPhone}` : ''}
                    {subCount > 0 ? ` · ${subCount} ${tr('indicado(s)', 'referral(s)')}` : ''}
                  </p>
                  {node.notes && (
                    <p className="text-[11px] text-emerald-100/65 mt-0.5">{node.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setClientParentId(node.id);
                      setClientMode('sales_tree');
                    }}
                    className="px-2.5 py-1 rounded-md bg-emerald-800/70 hover:bg-emerald-700 text-emerald-100 text-[11px] font-medium cursor-pointer"
                  >
                    + {tr('Vincular abaixo', 'Link below')}
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === node.id}
                    onClick={() => handleRemove(node.id)}
                    aria-label={tr('Remover registro', 'Remove record')}
                    className="p-1.5 rounded-md bg-red-950/60 hover:bg-red-900/70 border border-red-400/30 text-red-200 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {renderTreeBranch(node.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Hero */}
      <section className="conae-panel rounded-2xl p-5 sm:p-6 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-500/15 blur-3xl"
        />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300">
              <Briefcase className="w-4 h-4" />
              <span>{tr('Portal do Empresário · CONAE', 'Entrepreneur Portal · CONAE')}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
              {tr(
                'Gestão Empresarial, Hotelaria & Planos 10% CONAE',
                'Business Management, Hospitality & CONAE 10% Plans'
              )}
            </h1>
            <p className="text-sm text-emerald-100/80 leading-relaxed">
              {tr(
                'Cadastre clientes e hotéis, marque eventos nos hotéis conveniados com desconto exclusivo, estruture sua Árvore de Cadastro de Vendas e invista no Plano 10% CONAE com 3 meses de mensalidade do Cartão de Desconto (Farmácia + Hotelaria) e 50% de acesso nos Cursos CONAE.',
                'Register corporate and hotel clients, book discounted events at partner hotels, build your Sales Registration Tree, and invest in the CONAE 10% Plan with 3 months of Discount Card membership (Pharmacy + Hospitality) and 50% access to CONAE Courses.'
              )}
            </p>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-3 gap-2.5 shrink-0">
            <div className="rounded-xl bg-black/50 border border-amber-400/30 px-3 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-emerald-200/75">
                {tr('Plano 10%', '10% Plan')}
              </p>
              <p className="font-mono font-bold text-amber-300 text-sm sm:text-base mt-0.5 tabular-nums">
                R$ {totalInvestedPlan10.toLocaleString(locale, { minimumFractionDigits: 0 })}
              </p>
            </div>
            <div className="rounded-xl bg-black/50 border border-amber-400/30 px-3 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-emerald-200/75">
                {tr('Eventos', 'Events')}
              </p>
              <p className="font-mono font-bold text-emerald-300 text-sm sm:text-base mt-0.5 tabular-nums">
                {hotelEvents.length}
              </p>
            </div>
            <div className="rounded-xl bg-black/50 border border-amber-400/30 px-3 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-emerald-200/75">
                {tr('Árvore Vendas', 'Sales Tree')}
              </p>
              <p className="font-mono font-bold text-white text-sm sm:text-base mt-0.5 tabular-nums">
                {salesNodes.length}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="relative z-10 mt-5 pt-4 border-t border-amber-400/20 flex flex-wrap gap-2">
          {(
            [
              {
                id: 'plano10' as BusinessSubTab,
                label: tr('Investir Plano 10% & Cartão 3 Meses', 'Invest 10% Plan & 3-Mo Card'),
                icon: TrendingUp,
              },
              {
                id: 'hotelaria_eventos' as BusinessSubTab,
                label: tr('Marcar Eventos em Hotéis Conveniados', 'Schedule Partner Hotel Events'),
                icon: Hotel,
              },
              {
                id: 'arvore_vendas' as BusinessSubTab,
                label: tr('Cadastro Clientes & Árvore de Vendas', 'Client Sign-Up & Sales Tree'),
                icon: GitBranch,
              },
              {
                id: 'beneficios_empresa' as BusinessSubTab,
                label: tr('Farmácias, Hotelaria & 50% Cursos', 'Pharmacies, Hotels & 50% Courses'),
                icon: Award,
              },
            ]
          ).map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSubTab(tab.id);
                  setFeedback(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 shadow-md'
                    : 'bg-black/45 border border-amber-400/25 text-emerald-100 hover:border-amber-400/60 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {feedback && (
        <div className="rounded-xl bg-emerald-950/90 border border-emerald-400/50 px-4 py-3 text-sm text-emerald-100 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {!profile && (
        <div className="rounded-xl bg-amber-950/45 border border-amber-400/45 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-amber-100">
            {tr(
              'Entre com sua conta de afiliado/empresário para salvar investimentos, eventos de hotelaria e sua Árvore de Vendas na nuvem.',
              'Sign in with your affiliate/entrepreneur account to save investments, hotel events, and your Sales Tree to the cloud.'
            )}
          </p>
          <button
            type="button"
            onClick={onRequireAuth}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold cursor-pointer shrink-0"
          >
            {tr('Entrar Agora', 'Sign In Now')}
          </button>
        </div>
      )}

      {/* SUBTAB 1: PLANO 10% CONAE */}
      {subTab === 'plano10' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 conae-panel rounded-2xl p-5 space-y-5">
            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold text-amber-200 flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-400" />
                {tr('Investimento Empresarial · Plano 10% CONAE', 'Corporate Investment · CONAE 10% Plan')}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/80">
                {tr(
                  'Invista no projeto CONAE com participação de 10% e assegure automaticamente 3 meses de mensalidade do Cartão de Desconto na Rede de Farmácias e Rede de Hotelaria + 50% de acesso nos Cursos CONAE.',
                  'Invest in the CONAE project with a 10% plan share and automatically secure 3 months of Discount Card membership across Pharmacy & Hospitality networks + 50% access to CONAE Courses.'
                )}
              </p>
            </div>

            {/* Guaranteed Benefits Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-black/45 border border-amber-400/35 p-3.5 space-y-1.5">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300">
                  <CreditCard className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-amber-200">
                  {tr('3 Meses de Mensalidade', '3 Months Membership')}
                </p>
                <p className="text-[11px] text-emerald-100/75 leading-relaxed">
                  {tr(
                    'Uso garantido do Cartão de Desconto CONAE sem mensalidade por 3 meses.',
                    'Guaranteed use of the CONAE Discount Card with 3 months covered.'
                  )}
                </p>
              </div>
              <div className="rounded-xl bg-black/45 border border-emerald-400/35 p-3.5 space-y-1.5">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300">
                  <Pill className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-emerald-200">
                  {tr('Farmácias & Hotelaria', 'Pharmacies & Hotels')}
                </p>
                <p className="text-[11px] text-emerald-100/75 leading-relaxed">
                  {tr(
                    'Descontos ativos em toda a rede de farmácias e hotéis conveniados CONAE.',
                    'Active discounts across the entire CONAE pharmacy and hotel network.'
                  )}
                </p>
              </div>
              <div className="rounded-xl bg-black/45 border border-amber-400/35 p-3.5 space-y-1.5">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-amber-200">
                  {tr('50% nos Cursos CONAE', '50% off CONAE Courses')}
                </p>
                <p className="text-[11px] text-emerald-100/75 leading-relaxed">
                  {tr(
                    'Acesso com 50% de desconto em cursos disponíveis para sua empresa e equipe.',
                    '50% discount access on available courses for your business and team.'
                  )}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitPlan10} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">
                    {tr('Valor do Investimento no Projeto (R$)', 'Project Investment Amount (R$)')}
                  </label>
                  <input
                    type="number"
                    min={100}
                    step="100"
                    required
                    value={planAmount}
                    onChange={(e) => setPlanAmount(e.target.value)}
                    className="w-full rounded-lg bg-black/60 border border-amber-400/35 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="rounded-lg bg-emerald-950/60 border border-emerald-400/35 px-3.5 py-2 flex flex-col justify-center">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-200/80">
                    {tr('Projeção Plano 10% CONAE', 'CONAE 10% Plan Projection')}
                  </span>
                  <span className="font-mono text-lg font-bold text-amber-300 tabular-nums">
                    + R$ {projectedTenPercent.toLocaleString(locale, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-emerald-200 mb-1">
                    {tr('Empresa / Nome do Empresário', 'Company / Entrepreneur Name')}
                  </label>
                  <input
                    type="text"
                    value={planCompany}
                    onChange={(e) => setPlanCompany(e.target.value)}
                    placeholder={profile?.displayName || tr('Ex: Hotel & Eventos Silva Ltda', 'e.g. Silva Hospitality Ltd')}
                    className="w-full rounded-lg bg-black/60 border border-amber-400/30 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">{tr('Estado (UF)', 'State')}</label>
                  <select
                    value={planState}
                    onChange={(e) => setPlanState(e.target.value)}
                    className="w-full rounded-lg bg-black/70 border border-amber-400/30 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    {UF_LIST.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">
                    {tr('WhatsApp / Telefone', 'WhatsApp / Phone')}
                  </label>
                  <input
                    type="text"
                    value={planPhone}
                    onChange={(e) => setPlanPhone(e.target.value)}
                    placeholder="(62) 99999-0000"
                    className="w-full rounded-lg bg-black/60 border border-amber-400/30 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">
                    {tr('Observações do Projeto', 'Project Notes')}
                  </label>
                  <input
                    type="text"
                    value={planNotes}
                    onChange={(e) => setPlanNotes(e.target.value)}
                    placeholder={tr('Benefício 3 meses cartão + 50% cursos', '3-mo card + 50% courses benefit')}
                    className="w-full rounded-lg bg-black/60 border border-amber-400/30 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Official Samuel PIX Reference */}
              <div className="rounded-xl bg-black/55 border border-amber-400/35 p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                    {tr('PIX Oficial CONAE · Executivo Samuel', 'Official CONAE PIX · Executive Samuel')}
                  </p>
                  <p className="font-mono text-sm text-white mt-0.5">
                    CPF: 330.048.558-44
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopySamuelPix}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-semibold cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedPix ? tr('PIX Copiado!', 'PIX Copied!') : tr('Copiar CPF PIX', 'Copy PIX CPF')}
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 text-sm font-bold cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {saving
                    ? tr('Registrando...', 'Saving...')
                    : tr('Investir no Plano 10% & Garantir Benefícios', 'Invest in 10% Plan & Secure Benefits')}
                </button>
                <button
                  type="button"
                  onClick={onGoToBank}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-400/35 text-emerald-100 text-xs font-semibold cursor-pointer"
                >
                  {tr('Abrir Banco de Ações', 'Open Shares Bank')}
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Recorded Plan 10% Investments */}
          <div className="lg:col-span-5 conae-panel-soft rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                {tr('Meus Investimentos Plano 10%', 'My 10% Plan Investments')}
              </h3>
              {planInvestments.length === 0 ? (
                <div className="rounded-xl bg-black/40 border border-amber-400/20 p-5 text-center space-y-2">
                  <p className="text-sm text-emerald-100/80">
                    {tr(
                      'Nenhum investimento Plano 10% registrado ainda.',
                      'No 10% Plan investment recorded yet.'
                    )}
                  </p>
                  <p className="text-xs text-emerald-200/60">
                    {tr(
                      'Ao investir no projeto CONAE, seus 3 meses do Cartão de Desconto (Farmácia + Hotelaria) e 50% nos Cursos ficam registrados aqui.',
                      'When you invest in the CONAE project, your 3-month Discount Card (Pharmacy + Hotels) and 50% Courses access appear here.'
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto conae-scroll pr-1">
                  {planInvestments.map((item) => {
                    const amt = Number(item.investmentAmountBRL) || 0;
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl bg-black/50 border border-amber-400/30 p-3.5 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                            <p className="text-xs font-mono text-amber-300 mt-0.5 tabular-nums">
                              R$ {amt.toLocaleString(locale, { minimumFractionDigits: 2 })} · +10% (R${' '}
                              {(amt * 0.1).toLocaleString(locale, { minimumFractionDigits: 2 })})
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={deletingId === item.id}
                            onClick={() => handleRemove(item.id)}
                            className="p-1.5 rounded-md bg-red-950/60 hover:bg-red-900/70 border border-red-400/30 text-red-200 cursor-pointer shrink-0"
                            aria-label={tr('Apagar registro', 'Delete record')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-emerald-200/80">
                          {tr(
                            'Benefícios ativos: 3 meses Cartão Desconto (Farmácia + Hotelaria) · 50% Cursos CONAE',
                            'Active benefits: 3-mo Discount Card (Pharmacy + Hotels) · 50% CONAE Courses'
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-emerald-950/55 border border-emerald-400/30 p-3.5 text-xs text-emerald-100/85 space-y-1">
              <p className="font-semibold text-amber-200">
                {tr('Resumo Garantido ao Empresário:', 'Guaranteed Entrepreneur Summary:')}
              </p>
              <p>• {tr('Participação de 10% no Projeto CONAE', '10% share in the CONAE Project')}</p>
              <p>• {tr('3 meses de mensalidade do Cartão de Desconto (Farmácias + Hotéis)', '3 months of Discount Card fees (Pharmacies + Hotels)')}</p>
              <p>• {tr('50% de desconto nos Cursos CONAE disponíveis', '50% discount on available CONAE Courses')}</p>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: HOTELARIA & MARCAR EVENTOS COM DESCONTO */}
      {subTab === 'hotelaria_eventos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 conae-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-xl font-bold text-amber-200 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                {tr('Marcar Evento em Hotel Conveniado', 'Schedule Partner Hotel Event')}
              </h2>
              <button
                type="button"
                onClick={onGoToHotels}
                className="text-xs text-emerald-300 hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer"
              >
                {tr('Ver Rede Hotelaria', 'View Hotel Network')}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSubmitHotelEvent} className="space-y-3.5">
              <div>
                <label className="block text-xs text-emerald-200 mb-1">
                  {tr('Selecione o Hotel Conveniado com Desconto', 'Select Discounted Partner Hotel')}
                </label>
                <select
                  value={selectedHotel?.id || ''}
                  onChange={(e) => setSelectedHotelId(e.target.value)}
                  className="w-full rounded-lg bg-black/70 border border-amber-400/35 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  {activeHotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} · {h.city}-{h.state} ({h.discountPercent}% OFF)
                    </option>
                  ))}
                </select>
              </div>

              {selectedHotel && (
                <div className="rounded-xl bg-emerald-950/60 border border-emerald-400/35 p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{selectedHotel.name}</p>
                    <p className="text-xs text-emerald-200/80">
                      {selectedHotel.city}-{selectedHotel.state} · {selectedHotel.category}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-amber-500 text-neutral-950 font-mono font-bold text-xs shrink-0">
                    {selectedHotel.discountPercent}% OFF
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs text-emerald-200 mb-1">
                  {tr('Nome / Título do Evento Empresarial', 'Corporate Event Title')}
                </label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder={tr('Ex: Convenção Regional de Vendas & Hotelaria', 'e.g. Regional Sales & Hospitality Summit')}
                  className="w-full rounded-lg bg-black/60 border border-amber-400/30 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">{tr('Data do Evento', 'Event Date')}</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full rounded-lg bg-black/60 border border-amber-400/30 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">{tr('Participantes', 'Guests')}</label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={eventGuests}
                    onChange={(e) => setEventGuests(e.target.value)}
                    className="w-full rounded-lg bg-black/60 border border-amber-400/30 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">{tr('WhatsApp Contato', 'Contact Phone')}</label>
                  <input
                    type="text"
                    value={eventPhone}
                    onChange={(e) => setEventPhone(e.target.value)}
                    placeholder="(62) 99999-0000"
                    className="w-full rounded-lg bg-black/60 border border-amber-400/30 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-emerald-200 mb-1">
                  {tr('Estrutura Desejada (Auditório, Coffee Break, Hospedagem)', 'Requested Setup (Auditorium, Catering, Lodging)')}
                </label>
                <textarea
                  rows={2}
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  placeholder={tr('Detalhes de salão, diárias com desconto e equipamentos...', 'Hall details, discounted rooms and equipment...')}
                  className="w-full rounded-lg bg-black/60 border border-amber-400/30 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-sm cursor-pointer disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4" />
                {saving
                  ? tr('Agendando...', 'Scheduling...')
                  : tr('Confirmar Marcação de Evento com Desconto', 'Confirm Discounted Event Booking')}
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 conae-panel-soft rounded-2xl p-5 space-y-4">
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              {tr('Eventos Marcados nos Hotéis Conveniados', 'Scheduled Partner Hotel Events')} ({hotelEvents.length})
            </h3>
            {hotelEvents.length === 0 ? (
              <div className="rounded-xl bg-black/40 border border-amber-400/20 p-6 text-center text-sm text-emerald-100/75">
                {tr(
                  'Nenhum evento empresarial marcado ainda. Escolha um hotel conveniado ao lado para garantir o desconto.',
                  'No corporate event scheduled yet. Pick a partner hotel on the left to lock in your discount.'
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[430px] overflow-y-auto conae-scroll pr-1">
                {hotelEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-xl bg-black/50 border border-amber-400/25 p-3.5 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{ev.title}</p>
                        {ev.discountPercent ? (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500 text-neutral-950">
                            {ev.discountPercent}% OFF
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-emerald-200/85">
                        {ev.companyOrHotel} · {ev.eventDate || 'A definir'} · {ev.guestsCount || 0}{' '}
                        {tr('pessoas', 'guests')}
                      </p>
                      {ev.notes && <p className="text-[11px] text-emerald-100/65">{ev.notes}</p>}
                    </div>
                    <button
                      type="button"
                      disabled={deletingId === ev.id}
                      onClick={() => handleRemove(ev.id)}
                      className="p-1.5 rounded-md bg-red-950/60 hover:bg-red-900/70 border border-red-400/30 text-red-200 cursor-pointer shrink-0"
                      aria-label={tr('Cancelar evento', 'Cancel event')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: CADASTRO DE CLIENTES & ÁRVORE DE VENDAS */}
      {subTab === 'arvore_vendas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 conae-panel rounded-2xl p-5 space-y-4">
            <h2 className="font-display text-xl font-bold text-amber-200 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-400" />
              {tr('Cadastrar Cliente / Nó na Árvore de Vendas', 'Register Client / Sales Tree Node')}
            </h2>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setClientMode('sales_tree')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                  clientMode === 'sales_tree'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'bg-black/45 border border-amber-400/25 text-emerald-100'
                }`}
              >
                {tr('Parceiro Árvore de Vendas', 'Sales Tree Partner')}
              </button>
              <button
                type="button"
                onClick={() => setClientMode('client')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                  clientMode === 'client'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'bg-black/45 border border-amber-400/25 text-emerald-100'
                }`}
              >
                {tr('Cliente Hotelaria', 'Hospitality Client')}
              </button>
            </div>

            <form onSubmit={handleSubmitClientOrTree} className="space-y-3">
              <div>
                <label className="block text-xs text-emerald-200 mb-1">
                  {tr('Nome Completo do Cliente / Vendedor', 'Client / Seller Full Name')}
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={tr('Ex: Marcos Almeida', 'e.g. Marcos Almeida')}
                  className="w-full rounded-lg bg-black/60 border border-amber-400/30 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs text-emerald-200 mb-1">
                  {tr('Empresa / Hotel / Rede', 'Company / Hotel / Network')}
                </label>
                <input
                  type="text"
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder={tr('Ex: Pousada Sol Nascente', 'e.g. Sol Nascente Inn')}
                  className="w-full rounded-lg bg-black/60 border border-amber-400/30 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs text-emerald-200 mb-1">
                  {tr('Vinculado abaixo de (Nó Pai na Árvore)', 'Linked under (Parent Node in Tree)')}
                </label>
                <select
                  value={clientParentId}
                  onChange={(e) => setClientParentId(e.target.value)}
                  className="w-full rounded-lg bg-black/70 border border-amber-400/30 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="root">
                    {tr('Raiz · Empresário Titular', 'Root · Lead Entrepreneur')} (
                    {profile?.displayName || 'CONAE'})
                  </option>
                  {salesNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      ↳ {n.title} ({n.state})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">{tr('WhatsApp', 'WhatsApp')}</label>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(62) 99999-0000"
                    className="w-full rounded-lg bg-black/60 border border-amber-400/30 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">{tr('UF', 'State')}</label>
                  <select
                    value={clientState}
                    onChange={(e) => setClientState(e.target.value)}
                    className="w-full rounded-lg bg-black/70 border border-amber-400/30 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    {UF_LIST.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-emerald-200 mb-1">
                  {tr('Observações / Meta de Vendas', 'Notes / Sales Target')}
                </label>
                <input
                  type="text"
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder={tr('Ex: Indicação de convênio hotelaria e vendas', 'e.g. Hospitality & sales referral')}
                  className="w-full rounded-lg bg-black/60 border border-amber-400/30 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-sm cursor-pointer disabled:opacity-50"
              >
                {saving
                  ? tr('Salvando na Árvore...', 'Saving to Tree...')
                  : tr('Adicionar à Árvore de Vendas', 'Add to Sales Tree')}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 conae-panel-soft rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-amber-400" />
                {tr('Árvore de Cadastro & Vendas', 'Sales & Registration Tree')}
              </h3>
              <span className="text-xs font-mono text-amber-300">
                {salesNodes.length} {tr('cadastrado(s)', 'registered')}
              </span>
            </div>

            {/* Root Entrepreneur Node */}
            <div className="rounded-xl bg-gradient-to-r from-amber-950/70 via-emerald-950/70 to-black/70 border border-amber-400/55 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-amber-500 text-neutral-950 font-bold flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                    {tr('Raiz da Árvore Empresarial', 'Business Tree Root')}
                  </p>
                  <p className="text-sm font-bold text-white truncate">
                    {profile?.displayName || tr('Empresário CONAE', 'CONAE Entrepreneur')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClientParentId('root')}
                className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-400/45 text-amber-200 text-xs font-semibold cursor-pointer shrink-0"
              >
                {tr('Selecionar Raiz', 'Select Root')}
              </button>
            </div>

            {salesNodes.length === 0 ? (
              <div className="rounded-xl bg-black/40 border border-amber-400/20 p-6 text-center text-sm text-emerald-100/75">
                {tr(
                  'Sua Árvore de Cadastro de Vendas está pronta. Cadastre seu primeiro cliente ou parceiro ao lado para iniciar a ramificação.',
                  'Your Sales Registration Tree is ready. Register your first client or partner on the left to start branching.'
                )}
              </div>
            ) : (
              <div className="max-h-[430px] overflow-y-auto conae-scroll pr-1">
                {renderTreeBranch('root', 0)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 4: BENEFÍCIOS INCLUSOS (FARMÁCIAS, HOTÉIS & 50% CURSOS) */}
      {subTab === 'beneficios_empresa' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Farmácias Conveniadas */}
          <div className="conae-panel rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-amber-200 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-emerald-400" />
                  {tr('Rede de Farmácias', 'Pharmacy Network')}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-400/40 text-emerald-200">
                  3 MESES
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                {tr(
                  'Cartão de Desconto CONAE válido por 3 meses de mensalidade garantida pelo Plano 10%.',
                  'CONAE Discount Card valid for 3 guaranteed months with the 10% Plan.'
                )}
              </p>
              <div className="space-y-2">
                {pharmacyPartners.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg bg-black/45 border border-emerald-400/25 p-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                      <p className="text-[11px] text-emerald-200/75">
                        {p.city}-{p.state}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-300 shrink-0">
                      {p.discountPercent}% OFF
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={onGoToBenefits}
              className="w-full py-2 rounded-lg bg-emerald-800/70 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {tr('Ver Cartão & Rede de Farmácias', 'View Card & Pharmacies')}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rede de Hotelaria */}
          <div className="conae-panel rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-amber-200 flex items-center gap-2">
                  <Hotel className="w-5 h-5 text-amber-400" />
                  {tr('Rede de Hotelaria', 'Hotel Network')}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-200">
                  {activeHotels.length} {tr('Hotéis', 'Hotels')}
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                {tr(
                  'Hospedagens e eventos corporativos com tarifas conveniadas CONAE em todo o Brasil.',
                  'Lodging and corporate events with CONAE partner rates across Brazil.'
                )}
              </p>
              <div className="space-y-2">
                {activeHotels.slice(0, 4).map((h) => (
                  <div
                    key={h.id}
                    className="rounded-lg bg-black/45 border border-amber-400/25 p-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{h.name}</p>
                      <p className="text-[11px] text-emerald-200/75">
                        {h.city}-{h.state}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-300 shrink-0">
                      {h.discountPercent}% OFF
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={onGoToHotels}
              className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {tr('Abrir Hotéis Conveniados', 'Open Partner Hotels')}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 50% nos Cursos CONAE */}
          <div className="conae-panel rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-amber-200 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  {tr('Cursos CONAE · 50% OFF', 'CONAE Courses · 50% OFF')}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500 text-neutral-950 font-bold">
                  50% ACESSO
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                {tr(
                  'Acesso com 50% de desconto nos cursos de capacitação e liderança à sua disposição.',
                  '50% discount access on leadership and professional training courses available to you.'
                )}
              </p>
              <div className="space-y-2">
                {activeCourses.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg bg-black/45 border border-amber-400/25 p-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {translateDynamic(c.title)}
                      </p>
                      <p className="text-[11px] text-emerald-200/75">
                        {translateDynamic(c.modality)} · {translateDynamic(c.duration)}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-300 shrink-0">
                      50% OFF
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={onGoToCourses}
              className="w-full py-2 rounded-lg bg-emerald-800/70 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {tr('Acessar Cursos com 50% OFF', 'Access Courses at 50% OFF')}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
