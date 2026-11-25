import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Church,
  GraduationCap,
  Hotel,
  MapPin,
  Plane,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import type {
  CourseItem,
  EcclesiasticalPortalRecord,
  PartnerHotel,
  UserProfile,
} from '../types';
import { GOL_PROMO_FLIGHTS } from '../data/golFlightsData';
import { LATAM_PROMO_FLIGHTS } from '../data/latamFlightsData';
import { useLanguage } from '../i18n/LanguageContext';

const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const MINISTRY_ROLES = [
  'Pastor Presidente',
  'Pastor Auxiliar',
  'Bispo',
  'Apóstolo',
  'Evangelista',
  'Presbítero',
  'Diácono / Diaconisa',
  'Missionário(a)',
  'Obreiro(a) Credenciado(a)',
];

type EcclesiasticalSubTab = 'obreiros' | 'eventos_ministerio' | 'pacotes_aereos' | 'beneficios_sessao';

interface EcclesiasticalManagementTabProps {
  profile: UserProfile | null;
  hotels: PartnerHotel[];
  courses: CourseItem[];
  records: EcclesiasticalPortalRecord[];
  onCreateRecord: (params: {
    recordType: EcclesiasticalPortalRecord['recordType'];
    fullNameOrTitle: string;
    ministryRole?: string;
    churchName?: string;
    contactPhone?: string;
    city?: string;
    state: string;
    eventDate?: string;
    expectedAttendees?: number;
    credentialCode?: string;
    notes?: string;
    status?: EcclesiasticalPortalRecord['status'];
  }) => Promise<boolean>;
  onDeleteRecord: (id: string) => Promise<void>;
  onEnrollCourse: (course: CourseItem) => Promise<void>;
  onRequireAuth: () => void;
  onGoToHotels: () => void;
  onGoToCourses: () => void;
  onGoToGolFlights: () => void;
  onGoToTamFlights: () => void;
}

export const EcclesiasticalManagementTab: React.FC<EcclesiasticalManagementTabProps> = ({
  profile,
  hotels,
  courses,
  records,
  onCreateRecord,
  onDeleteRecord,
  onEnrollCourse,
  onRequireAuth,
  onGoToHotels,
  onGoToCourses,
  onGoToGolFlights,
  onGoToTamFlights,
}) => {
  const { isEn, tr, translateDynamic } = useLanguage();
  const locale = isEn ? 'en-US' : 'pt-BR';

  const [subTab, setSubTab] = useState<EcclesiasticalSubTab>('obreiros');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  // Worker / Affiliate credential form
  const [workerName, setWorkerName] = useState('');
  const [workerRole, setWorkerRole] = useState(MINISTRY_ROLES[0]);
  const [workerChurch, setWorkerChurch] = useState('');
  const [workerPhone, setWorkerPhone] = useState('');
  const [workerCity, setWorkerCity] = useState('');
  const [workerState, setWorkerState] = useState(profile?.state || 'GO');
  const [workerNotes, setWorkerNotes] = useState('');

  // Ministry Event promotion form
  const [eventTitle, setEventTitle] = useState('');
  const [eventChurchOrVenue, setEventChurchOrVenue] = useState('');
  const [eventCity, setEventCity] = useState('');
  const [eventState, setEventState] = useState(profile?.state || 'GO');
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 21);
    return d.toISOString().slice(0, 10);
  });
  const [eventAttendees, setEventAttendees] = useState('250');
  const [eventPhone, setEventPhone] = useState('');
  const [eventNotes, setEventNotes] = useState('');

  const workersList = useMemo(
    () => records.filter((r) => r.recordType === 'worker_affiliate'),
    [records]
  );
  const eventsList = useMemo(
    () => records.filter((r) => r.recordType === 'ministry_event'),
    [records]
  );

  const activeHotels = useMemo(() => hotels.filter((h) => h.active !== false), [hotels]);
  const activeCourses = useMemo(() => courses.filter((c) => c.active !== false), [courses]);

  const handleSubmitWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onRequireAuth();
      return;
    }
    if (workerName.trim().length < 2) {
      setFeedback(
        tr(
          'Informe o nome completo do obreiro ou ministro.',
          'Enter the full name of the minister or church worker.'
        )
      );
      return;
    }
    setSaving(true);
    setFeedback(null);
    const credCode = `CONAE-ECL-${workerState}-${Math.floor(1000 + Math.random() * 9000)}`;
    const ok = await onCreateRecord({
      recordType: 'worker_affiliate',
      fullNameOrTitle: workerName.trim(),
      ministryRole: workerRole,
      churchName: workerChurch.trim() || 'Convenção Mundial CONAE',
      contactPhone: workerPhone.trim(),
      city: workerCity.trim(),
      state: workerState,
      credentialCode: credCode,
      notes:
        workerNotes.trim() ||
        'Conveniado afiliado com acesso a cursos, pacotes aéreos e hotelaria CONAE',
      status: 'accredited',
    });
    setSaving(false);
    if (ok) {
      setWorkerName('');
      setWorkerChurch('');
      setWorkerPhone('');
      setWorkerCity('');
      setWorkerNotes('');
      setFeedback(
        tr(
          `Obreiro aliado e credenciado na Convenção CONAE! Código da credencial: ${credCode}`,
          `Minister allied and accredited in the CONAE Convention! Credential code: ${credCode}`
        )
      );
    }
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onRequireAuth();
      return;
    }
    if (eventTitle.trim().length < 2) {
      setFeedback(
        tr(
          'Informe o título do evento de ministério.',
          'Enter the ministry event title.'
        )
      );
      return;
    }
    setSaving(true);
    setFeedback(null);
    const ok = await onCreateRecord({
      recordType: 'ministry_event',
      fullNameOrTitle: eventTitle.trim(),
      churchName: eventChurchOrVenue.trim() || 'Sede Ministerial / Hotel Conveniado CONAE',
      city: eventCity.trim(),
      state: eventState,
      eventDate,
      expectedAttendees: Math.max(1, Math.min(100000, Number(eventAttendees) || 100)),
      contactPhone: eventPhone.trim(),
      notes: eventNotes.trim(),
      status: 'active',
    });
    setSaving(false);
    if (ok) {
      setEventTitle('');
      setEventChurchOrVenue('');
      setEventCity('');
      setEventNotes('');
      setFeedback(
        tr(
          'Evento de Ministério publicado e promovido na Gestão Eclesiástica CONAE!',
          'Ministry Event published and promoted in CONAE Ecclesiastical Management!'
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

  const handleQuickEnroll = async (course: CourseItem) => {
    if (!profile) {
      onRequireAuth();
      return;
    }
    setEnrollingId(course.id);
    try {
      await onEnrollCourse(course);
      setFeedback(
        tr(
          `Matrícula solicitada no curso "${course.title}" com benefícios de conveniado eclesiástico CONAE!`,
          `Enrollment requested for "${course.title}" with CONAE ecclesiastical affiliate benefits!`
        )
      );
    } finally {
      setEnrollingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="conae-panel rounded-2xl p-5 sm:p-6 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-500/18 blur-3xl"
        />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-300">
              <Church className="w-4 h-4 text-amber-300" />
              <span>{tr('Convenção Ministerial · Credenciamento CONAE', 'Ministerial Convention · CONAE Accreditation')}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
              {tr(
                'Gestão Eclesiástica, Obreiros & Eventos de Ministério',
                'Ecclesiastical Management, Ministers & Ministry Events'
              )}
            </h1>
            <p className="text-sm text-emerald-100/80 leading-relaxed">
              {tr(
                'Credencie afiliados e obreiros para se aliarem à Convenção CONAE, promova eventos de ministério e disponibilize acesso direto aos benefícios de cursos teológicos/ministeriais, pacotes aéreos com desconto (GOL e TAM/LATAM) e rede de hotelaria conveniada.',
                'Accredit affiliates and ministers to join the CONAE Convention, promote ministry events, and provide direct access to theological/leadership courses, discounted airfare packages (GOL & TAM/LATAM), and partner hotels.'
              )}
            </p>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-3 gap-2.5 shrink-0">
            <div className="rounded-xl bg-black/50 border border-emerald-400/35 px-3 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-emerald-200/75">
                {tr('Obreiros', 'Ministers')}
              </p>
              <p className="font-mono font-bold text-emerald-300 text-sm sm:text-base mt-0.5 tabular-nums">
                {workersList.length}
              </p>
            </div>
            <div className="rounded-xl bg-black/50 border border-emerald-400/35 px-3 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-emerald-200/75">
                {tr('Eventos', 'Events')}
              </p>
              <p className="font-mono font-bold text-amber-300 text-sm sm:text-base mt-0.5 tabular-nums">
                {eventsList.length}
              </p>
            </div>
            <div className="rounded-xl bg-black/50 border border-emerald-400/35 px-3 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-emerald-200/75">
                {tr('Cursos', 'Courses')}
              </p>
              <p className="font-mono font-bold text-white text-sm sm:text-base mt-0.5 tabular-nums">
                {activeCourses.length}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="relative z-10 mt-5 pt-4 border-t border-emerald-400/20 flex flex-wrap gap-2">
          {(
            [
              {
                id: 'obreiros' as EcclesiasticalSubTab,
                label: tr('Sessão de Cadastro & Credenciamento de Obreiros', 'Ministers Sign-Up & Accreditation'),
                icon: UserPlus,
              },
              {
                id: 'eventos_ministerio' as EcclesiasticalSubTab,
                label: tr('Promover Eventos de Ministério', 'Promote Ministry Events'),
                icon: Calendar,
              },
              {
                id: 'pacotes_aereos' as EcclesiasticalSubTab,
                label: tr('Pacotes Aéreos com Desconto (GOL & TAM)', 'Discounted Airfare (GOL & TAM)'),
                icon: Plane,
              },
              {
                id: 'beneficios_sessao' as EcclesiasticalSubTab,
                label: tr('Hotelaria & Cursos Disponíveis', 'Available Hotels & Courses'),
                icon: GraduationCap,
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
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-neutral-950 shadow-md'
                    : 'bg-black/45 border border-emerald-400/30 text-emerald-100 hover:border-emerald-300/70 hover:text-white'
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
              'Entre com sua conta de afiliado CONAE para credenciar obreiros e publicar eventos de ministério na sua sessão.',
              'Sign in with your CONAE affiliate account to accredit ministers and publish ministry events in your session.'
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

      {/* SUBTAB 1: CREDENCIAMENTO & SESSÃO DE CADASTRO DE OBREIROS */}
      {subTab === 'obreiros' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 conae-panel rounded-2xl p-5 space-y-4">
            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold text-amber-200 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                {tr('Trazer Obreiros & Credenciar Afiliados', 'Bring Ministers & Accredit Affiliates')}
              </h2>
              <p className="text-xs text-emerald-100/75">
                {tr(
                  'Cadastre obreiros e líderes ministeriais para se aliarem à Convenção CONAE com acesso imediato aos benefícios de cursos, passagens aéreas com desconto e hotelaria.',
                  'Register ministers and church leaders to join the CONAE Convention with immediate access to courses, discounted flights, and partner hotels.'
                )}
              </p>
            </div>

            <form onSubmit={handleSubmitWorker} className="space-y-3">
              <div>
                <label className="block text-xs text-emerald-200 mb-1">
                  {tr('Nome Completo do Obreiro / Ministro', 'Minister / Worker Full Name')}
                </label>
                <input
                  type="text"
                  required
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  placeholder={tr('Ex: Pr. José Carlos Mendes', 'e.g. Ps. José Carlos Mendes')}
                  className="w-full rounded-lg bg-black/60 border border-emerald-400/35 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">
                    {tr('Cargo / Função Ministerial', 'Ecclesiastical Role')}
                  </label>
                  <select
                    value={workerRole}
                    onChange={(e) => setWorkerRole(e.target.value)}
                    className="w-full rounded-lg bg-black/70 border border-emerald-400/35 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                  >
                    {MINISTRY_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">
                    {tr('Igreja / Ministério', 'Church / Ministry')}
                  </label>
                  <input
                    type="text"
                    value={workerChurch}
                    onChange={(e) => setWorkerChurch(e.target.value)}
                    placeholder={tr('Ex: Assembleia de Deus Sede', 'e.g. Assembly of God HQ')}
                    className="w-full rounded-lg bg-black/60 border border-emerald-400/35 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">{tr('WhatsApp', 'WhatsApp')}</label>
                  <input
                    type="text"
                    value={workerPhone}
                    onChange={(e) => setWorkerPhone(e.target.value)}
                    placeholder="(62) 99999-0000"
                    className="w-full rounded-lg bg-black/60 border border-emerald-400/35 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">{tr('Cidade', 'City')}</label>
                  <input
                    type="text"
                    value={workerCity}
                    onChange={(e) => setWorkerCity(e.target.value)}
                    placeholder={tr('Aparecida de Goiânia', 'City name')}
                    className="w-full rounded-lg bg-black/60 border border-emerald-400/35 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">{tr('UF', 'State')}</label>
                  <select
                    value={workerState}
                    onChange={(e) => setWorkerState(e.target.value)}
                    className="w-full rounded-lg bg-black/70 border border-emerald-400/35 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
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
                  {tr('Observações / Benefícios de Interesse', 'Notes / Requested Benefits')}
                </label>
                <input
                  type="text"
                  value={workerNotes}
                  onChange={(e) => setWorkerNotes(e.target.value)}
                  placeholder={tr('Cursos teológicos, pacotes aéreos, rede de hotelaria...', 'Theological courses, airfare, partner hotels...')}
                  className="w-full rounded-lg bg-black/60 border border-emerald-400/35 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-neutral-950 font-bold text-sm cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {saving
                  ? tr('Credenciando...', 'Accrediting...')
                  : tr('Credenciar Obreiro na Convenção CONAE', 'Accredit Minister in CONAE Convention')}
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 conae-panel-soft rounded-2xl p-5 space-y-4">
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              {tr('Obreiros & Afiliados Credenciados', 'Accredited Ministers & Affiliates')} ({workersList.length})
            </h3>
            {workersList.length === 0 ? (
              <div className="rounded-xl bg-black/40 border border-emerald-400/20 p-6 text-center space-y-2">
                <p className="text-sm text-emerald-100/80">
                  {tr(
                    'Nenhum obreiro cadastrado na sua sessão ainda.',
                    'No minister registered in your session yet.'
                  )}
                </p>
                <p className="text-xs text-emerald-200/65">
                  {tr(
                    'Cadastre pastores, bispos e obreiros ao lado para gerar a credencial CONAE e liberar benefícios de cursos, voos e hotéis.',
                    'Register pastors, bishops, and ministers on the left to issue CONAE credentials and unlock course, flight, and hotel benefits.'
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[430px] overflow-y-auto conae-scroll pr-1">
                {workersList.map((w) => (
                  <div
                    key={w.id}
                    className="rounded-xl bg-black/50 border border-emerald-400/30 p-3.5 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{w.fullNameOrTitle}</p>
                        {w.ministryRole && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-900/80 border border-emerald-400/40 text-emerald-200">
                            {w.ministryRole}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-emerald-200/80">
                        {w.churchName || 'CONAE'}
                        {w.city ? ` · ${w.city}-${w.state}` : ` · ${w.state}`}
                        {w.contactPhone ? ` · ${w.contactPhone}` : ''}
                      </p>
                      {w.credentialCode && (
                        <p className="text-[11px] font-mono text-amber-300">
                          {tr('Credencial:', 'Credential:')} {w.credentialCode}
                        </p>
                      )}
                      {w.notes && <p className="text-[11px] text-emerald-100/65">{w.notes}</p>}
                    </div>
                    <button
                      type="button"
                      disabled={deletingId === w.id}
                      onClick={() => handleRemove(w.id)}
                      aria-label={tr('Remover obreiro', 'Remove minister')}
                      className="p-1.5 rounded-md bg-red-950/60 hover:bg-red-900/70 border border-red-400/30 text-red-200 cursor-pointer shrink-0"
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

      {/* SUBTAB 2: PROMOVER EVENTOS DE MINISTÉRIO */}
      {subTab === 'eventos_ministerio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 conae-panel rounded-2xl p-5 space-y-4">
            <h2 className="font-display text-xl font-bold text-amber-200 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              {tr('Promover Evento de Ministério', 'Promote Ministry Event')}
            </h2>

            <form onSubmit={handleSubmitEvent} className="space-y-3">
              <div>
                <label className="block text-xs text-emerald-200 mb-1">
                  {tr('Título do Congresso / Cruzada / Culto de Obreiros', 'Congress / Crusade / Event Title')}
                </label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder={tr('Ex: Congresso Nacional de Obreiros CONAE', 'e.g. CONAE National Ministers Congress')}
                  className="w-full rounded-lg bg-black/60 border border-emerald-400/35 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs text-emerald-200 mb-1">
                  {tr('Igreja / Centro de Convenções / Hotel Conveniado', 'Church / Convention Center / Partner Hotel')}
                </label>
                <input
                  type="text"
                  value={eventChurchOrVenue}
                  onChange={(e) => setEventChurchOrVenue(e.target.value)}
                  placeholder={tr('Ex: Sede Garavelo ou Hotel Conveniado CONAE', 'e.g. Garavelo HQ or CONAE Partner Hotel')}
                  className="w-full rounded-lg bg-black/60 border border-emerald-400/35 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">{tr('Cidade', 'City')}</label>
                  <input
                    type="text"
                    value={eventCity}
                    onChange={(e) => setEventCity(e.target.value)}
                    placeholder={tr('Goiânia', 'City')}
                    className="w-full rounded-lg bg-black/60 border border-emerald-400/35 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">{tr('UF', 'State')}</label>
                  <select
                    value={eventState}
                    onChange={(e) => setEventState(e.target.value)}
                    className="w-full rounded-lg bg-black/70 border border-emerald-400/35 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                  >
                    {UF_LIST.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">{tr('Data', 'Date')}</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full rounded-lg bg-black/60 border border-emerald-400/35 px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">{tr('Público Est.', 'Est. Crowd')}</label>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={eventAttendees}
                    onChange={(e) => setEventAttendees(e.target.value)}
                    className="w-full rounded-lg bg-black/60 border border-emerald-400/35 px-2.5 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-emerald-200 mb-1">{tr('WhatsApp', 'WhatsApp')}</label>
                  <input
                    type="text"
                    value={eventPhone}
                    onChange={(e) => setEventPhone(e.target.value)}
                    placeholder="(62) 99999"
                    className="w-full rounded-lg bg-black/60 border border-emerald-400/35 px-2.5 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-emerald-200 mb-1">
                  {tr('Programação / Preletores / Informações', 'Schedule / Speakers / Details')}
                </label>
                <textarea
                  rows={2}
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  placeholder={tr('Horários, caravanas, hospedagem com desconto...', 'Times, caravans, discounted lodging...')}
                  className="w-full rounded-lg bg-black/60 border border-emerald-400/35 px-3 py-2 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-neutral-950 font-bold text-sm cursor-pointer disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4" />
                {saving
                  ? tr('Publicando...', 'Publishing...')
                  : tr('Publicar & Promover Evento', 'Publish & Promote Event')}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 conae-panel-soft rounded-2xl p-5 space-y-4">
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Church className="w-5 h-5 text-amber-400" />
              {tr('Agenda Promovida de Eventos de Ministério', 'Promoted Ministry Events Schedule')} ({eventsList.length})
            </h3>
            {eventsList.length === 0 ? (
              <div className="rounded-xl bg-black/40 border border-emerald-400/20 p-6 text-center text-sm text-emerald-100/75">
                {tr(
                  'Nenhum evento ministerial publicado ainda. Cadastre ao lado para divulgar congressos, cultos de obreiros e convenções.',
                  'No ministry event published yet. Submit one on the left to promote congresses, conventions, and leadership gatherings.'
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-[430px] overflow-y-auto conae-scroll pr-1">
                {eventsList.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-xl bg-black/50 border border-emerald-400/30 p-4 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-bold text-amber-200">{ev.fullNameOrTitle}</p>
                      <p className="text-xs text-emerald-100/85 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          {ev.churchName}
                          {ev.city ? ` · ${ev.city}-${ev.state}` : ` · ${ev.state}`}
                        </span>
                        <span>· {ev.eventDate || 'A definir'}</span>
                        <span>
                          · {ev.expectedAttendees || 0} {tr('obreiros/participantes', 'attendees')}
                        </span>
                      </p>
                      {ev.notes && <p className="text-xs text-emerald-100/70">{ev.notes}</p>}
                    </div>
                    <button
                      type="button"
                      disabled={deletingId === ev.id}
                      onClick={() => handleRemove(ev.id)}
                      aria-label={tr('Remover evento', 'Remove event')}
                      className="p-1.5 rounded-md bg-red-950/60 hover:bg-red-900/70 border border-red-400/30 text-red-200 cursor-pointer shrink-0"
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

      {/* SUBTAB 3: PACOTES AÉREOS COM DESCONTO (GOL & TAM/LATAM) */}
      {subTab === 'pacotes_aereos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* GOL Promo Deals */}
          <div className="conae-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-lg bg-[#FF5A00] text-white flex items-center justify-center shrink-0">
                  <Plane className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    {tr('Pacotes Aéreos GOL · Desconto Conveniado', 'GOL Airfare Packages · Affiliate Discount')}
                  </h3>
                  <p className="text-xs text-emerald-200/75">
                    {tr('Tarifas promocionais para missões, congressos e viagens de obreiros', 'Promo fares for missions, congresses, and ministerial travel')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onGoToGolFlights}
                className="px-3 py-1.5 rounded-lg bg-[#FF5A00] hover:bg-[#ff7326] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                {tr('Ver Todos GOL', 'All GOL')}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {GOL_PROMO_FLIGHTS.slice(0, 4).map((flight) => (
                <div
                  key={flight.id}
                  className="rounded-xl bg-black/50 border border-[#FF5A00]/35 p-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-bold text-white">
                      {flight.originCity} ({flight.originCode}) → {flight.destCity} ({flight.destCode})
                    </p>
                    <p className="text-[11px] text-emerald-200/75">
                      {flight.fareClass} · {isEn ? flight.stopsLabelEn : flight.stopsLabelPt} ·{' '}
                      {tr('Desconto especial', 'Special discount')} -{flight.discountPercent}%
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] line-through text-emerald-200/50 font-mono">
                      R$ {flight.regularPriceBRL.toLocaleString(locale, { minimumFractionDigits: 0 })}
                    </p>
                    <p className="font-mono text-sm font-bold text-amber-300 tabular-nums">
                      R$ {flight.promoPriceBRL.toLocaleString(locale, { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TAM / LATAM Promo Deals */}
          <div className="conae-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-lg bg-[#E8114B] text-white flex items-center justify-center shrink-0">
                  <Plane className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    {tr('Pacotes Aéreos TAM / LATAM · Desconto', 'TAM / LATAM Airfare Packages · Discount')}
                  </h3>
                  <p className="text-xs text-emerald-200/75">
                    {tr('Trechos nacionais e convenções ministeriais com tarifas reduzidas', 'Domestic routes and ministerial conventions at reduced fares')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onGoToTamFlights}
                className="px-3 py-1.5 rounded-lg bg-[#E8114B] hover:bg-[#ff2b65] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                {tr('Ver Todos TAM', 'All TAM')}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {LATAM_PROMO_FLIGHTS.slice(0, 4).map((flight) => (
                <div
                  key={flight.id}
                  className="rounded-xl bg-black/50 border border-[#E8114B]/40 p-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-bold text-white">
                      {flight.originCity} ({flight.originCode}) → {flight.destCity} ({flight.destCode})
                    </p>
                    <p className="text-[11px] text-emerald-200/75">
                      {isEn ? flight.cabinLabelEn : flight.cabinLabelPt} ·{' '}
                      {isEn ? flight.stopsLabelEn : flight.stopsLabelPt} ·{' '}
                      {tr('Desconto especial', 'Special discount')} -{flight.discountPercent}%
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] line-through text-emerald-200/50 font-mono">
                      R$ {flight.regularPriceBRL.toLocaleString(locale, { minimumFractionDigits: 0 })}
                    </p>
                    <p className="font-mono text-sm font-bold text-amber-300 tabular-nums">
                      R$ {flight.promoPriceBRL.toLocaleString(locale, { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: BENEFÍCIOS DISPONÍVEIS NA SESSÃO (HOTELARIA & CURSOS) */}
      {subTab === 'beneficios_sessao' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Cursos Disponíveis */}
          <div className="conae-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-amber-200 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                {tr('Cursos Disponíveis ao Conveniado Eclesiástico', 'Courses Available to Ecclesiastical Affiliates')}
              </h3>
              <button
                type="button"
                onClick={onGoToCourses}
                className="text-xs text-emerald-300 hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                {tr('Ver Catálogo Completo', 'Full Catalog')}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2.5">
              {activeCourses.slice(0, 5).map((course) => (
                <div
                  key={course.id}
                  className="rounded-xl bg-black/50 border border-emerald-400/25 p-3.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {translateDynamic(course.title)}
                    </p>
                    <p className="text-xs text-emerald-200/75 mt-0.5">
                      {translateDynamic(course.modality)} · {translateDynamic(course.duration)} ·{' '}
                      <span className="text-amber-300 font-semibold">
                        {translateDynamic(course.feeLabel)}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={enrollingId === course.id}
                    onClick={() => handleQuickEnroll(course)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {enrollingId === course.id
                      ? tr('Matriculando...', 'Enrolling...')
                      : tr('Solicitar Matrícula', 'Enroll Now')}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Hotelaria Conveniada */}
          <div className="conae-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-amber-200 flex items-center gap-2">
                <Hotel className="w-5 h-5 text-amber-400" />
                {tr('Hotelaria Conveniada para Obreiros & Caravanas', 'Partner Hotels for Ministers & Caravans')}
              </h3>
              <button
                type="button"
                onClick={onGoToHotels}
                className="text-xs text-emerald-300 hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                {tr('Abrir Reservas', 'Open Bookings')}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2.5">
              {activeHotels.slice(0, 5).map((hotel) => (
                <div
                  key={hotel.id}
                  className="rounded-xl bg-black/50 border border-amber-400/25 p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{hotel.name}</p>
                    <p className="text-xs text-emerald-200/75 mt-0.5">
                      {hotel.city}-{hotel.state} · {hotel.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500 text-neutral-950">
                      {hotel.discountPercent}% OFF
                    </span>
                    <button
                      type="button"
                      onClick={onGoToHotels}
                      className="px-2.5 py-1 rounded-md bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 text-xs font-semibold cursor-pointer"
                    >
                      {tr('Reservar', 'Book')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-emerald-950/55 border border-emerald-400/30 p-3 text-xs text-emerald-100/85 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                {tr(
                  'Todos os obreiros credenciados na Gestão Eclesiástica CONAE têm acesso liberado à rede de hotelaria, cursos e pacotes aéreos.',
                  'All ministers accredited in CONAE Ecclesiastical Management receive full access to partner hotels, courses, and discounted airfare.'
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
