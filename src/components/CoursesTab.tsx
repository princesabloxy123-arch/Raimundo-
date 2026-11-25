import React, { useState } from 'react';
import { Award, BookOpen, CheckCircle2, MapPin, Calendar, Clock, ShieldCheck, Search } from 'lucide-react';
import { CONAE_ASSETS } from '../data/conaeSeed';
import { useLanguage } from '../i18n/LanguageContext';
import type { CourseEnrollment, CourseItem, UserProfile } from '../types';

interface CoursesTabProps {
  courses: CourseItem[];
  enrollments: CourseEnrollment[];
  profile: UserProfile | null;
  onEnroll: (course: CourseItem) => Promise<void>;
  onRequireAuth: () => void;
}

const VERIFIED_REGISTRY: Record<string, { holder: string; course: string; status: string }> = {
  'CONAE-CAP-2026-001': {
    holder: 'Apóstolo Hélio César',
    course: 'Capelania Eclesiástica & Hospitalar',
    status: 'Credencial Nacional Ativa · Nº 2091',
  },
  'CONAE-JPZ-2026-044': {
    holder: 'Pr. Marcos Vinícius Oliveira',
    course: 'Juiz de Paz Eclesiástico',
    status: 'Certificado Válido em Território Nacional',
  },
};

export const CoursesTab: React.FC<CoursesTabProps> = ({
  courses,
  enrollments,
  profile,
  onEnroll,
  onRequireAuth,
}) => {
  const { tr, translateDynamic } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const categories = ['Todos', ...Array.from(new Set(courses.map((c) => c.category)))];
  const filteredCourses =
    selectedCategory === 'Todos'
      ? courses
      : courses.filter((c) => c.category === selectedCategory);

  const handleEnrollClick = async (course: CourseItem) => {
    if (!profile) {
      onRequireAuth();
      return;
    }
    setEnrollingId(course.id);
    setFeedback(null);
    try {
      await onEnroll(course);
      setFeedback(
        tr(
          `Matrícula registrada para "${course.title}". Acompanhe a liberação da sua credencial abaixo.`,
          `Enrollment registered for "${translateDynamic(course.title)}". Track your credential issuance below.`
        )
      );
    } finally {
      setEnrollingId(null);
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const code = verifyCode.trim().toUpperCase();
    if (!code) return;
    const fromUser = enrollments.find((en) => en.credentialCode?.toUpperCase() === code);
    if (fromUser) {
      setVerifyResult(
        tr(
          `AUTÊNTICA · Titular: ${fromUser.userName} · Curso: ${fromUser.courseTitle} · Status: ${fromUser.status}`,
          `VERIFIED · Holder: ${fromUser.userName} · Course: ${translateDynamic(fromUser.courseTitle)} · Status: ${fromUser.status}`
        )
      );
      return;
    }
    const found = VERIFIED_REGISTRY[code];
    if (found) {
      setVerifyResult(
        tr(
          `AUTÊNTICA · Titular: ${found.holder} · ${found.course} · ${found.status}`,
          `VERIFIED · Holder: ${found.holder} · ${found.course} · ${found.status}`
        )
      );
    } else {
      setVerifyResult(
        tr(
          'Código não localizado. Exemplo válido para consulta: CONAE-CAP-2026-001',
          'Code not found. Valid example to look up: CONAE-CAP-2026-001'
        )
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Official Poster Spotlight */}
      <div className="conae-panel rounded-xl p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-amber-300">
              {tr('CONAE Cursos Brasil · conaecursos.com.br · Desde 2010', 'CONAE Courses Brazil · conaecursos.com.br · Since 2010')}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              {tr('Formação Eclesiástica, Capelania e Credencial Nacional', 'Ecclesiastical Training, Chaplaincy & National Credential')}
            </h2>
            <p className="text-sm text-emerald-100/80 leading-relaxed">
              {tr(
                'Cursos 100% online EAD e presenciais na Sede da Convenção CONAE com videoaulas, apostilas digitais, certificado reconhecido em todo o território nacional e validação pública de credencial.',
                '100% online and in-person courses at CONAE Convention Headquarters with video lessons, digital study guides, nationally recognized certificates, and public credential validation.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="conae-panel-soft rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <Calendar className="w-4 h-4" />
                <span>{tr('Próxima Turma Capelania', 'Next Chaplaincy Class')}</span>
              </div>
              <p className="text-white font-mono">{tr('12/10/2026 · 19:30h às 22:30h', '10/12/2026 · 7:30 PM to 10:30 PM')}</p>
              <p className="text-emerald-100/70">
                {tr('Matrícula Solidária: 5KG de alimentos não perecíveis', 'Solidarity Enrollment: 5KG non-perishable food')}
              </p>
            </div>
            <div className="conae-panel-soft rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <MapPin className="w-4 h-4" />
                <span>{tr('Sede Presencial CONAE', 'CONAE In-Person Headquarters')}</span>
              </div>
              <p className="text-white">Rua 15-C, Quadra 104, Lt 10, Loja 03</p>
              <p className="text-emerald-100/70">Garavelo · Aparecida de Goiânia-GO</p>
            </div>
          </div>

          {/* Public Credential Verification Tool */}
          <form onSubmit={handleVerify} className="pt-2 space-y-2">
            <label className="block text-xs font-medium text-amber-200">
              {tr('Validador Público de Credencial & Certificado CONAE', 'Public CONAE Credential & Certificate Validator')}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-emerald-300/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder={tr('Digite o nº da credencial (ex: CONAE-CAP-2026-001)', 'Enter credential number (e.g., CONAE-CAP-2026-001)')}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/50 border border-amber-400/30 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-500 text-neutral-950 font-semibold text-xs sm:text-sm hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap"
              >
                {tr('Validar Credencial', 'Validate Credential')}
              </button>
            </div>
            {verifyResult && (
              <p className="text-xs font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-400/30 rounded-lg px-3 py-2">
                {verifyResult}
              </p>
            )}
          </form>
        </div>

        <div className="lg:col-span-5 flex items-center justify-center">
          <div className="w-full max-w-sm rounded-xl overflow-hidden border border-amber-400/45 bg-black/50">
            <img
              src={CONAE_ASSETS.coursePosterCapelania}
              alt={tr('Cartaz oficial do Curso de Capelania CONAE Cursos Brasil', 'Official CONAE Cursos Brasil Chaplaincy Course Poster')}
              referrerPolicy="no-referrer"
              className="w-full h-full max-h-[380px] object-contain bg-white/5"
            />
          </div>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg bg-emerald-900/50 border border-emerald-400/40 px-4 py-3 text-sm text-emerald-100 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-amber-500 text-neutral-950 font-semibold'
                : 'conae-panel-soft text-emerald-100/80 hover:text-white'
            }`}
          >
            {translateDynamic(cat)}
          </button>
        ))}
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCourses.map((course) => {
          const enrolled = enrollments.find((e) => e.courseId === course.id);
          return (
            <div key={course.id} className="conae-panel rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                {course.photoUrl && (
                  <div className="h-36 rounded-lg overflow-hidden border border-amber-400/25 bg-black/45">
                    <img
                      src={course.photoUrl}
                      alt={course.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 text-xs text-amber-300/90">
                  <span>{translateDynamic(course.category)}</span>
                  <span>·</span>
                  <span className="font-mono text-emerald-200">{translateDynamic(course.modality)}</span>
                </div>
                <h3 className="text-lg font-semibold text-white">{translateDynamic(course.title)}</h3>
                <p className="text-xs sm:text-sm text-emerald-100/75 leading-relaxed">
                  {course.description}
                </p>

                <div className="pt-2 space-y-1 text-xs text-emerald-200/80 border-t border-amber-400/15">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{translateDynamic(course.duration)} {course.schedule ? `· ${translateDynamic(course.schedule)}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-amber-200 font-medium">{translateDynamic(course.feeLabel)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                {enrolled ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>
                      {tr('Matriculado', 'Enrolled')} (
                      {enrolled.status === 'certified'
                        ? `${tr('Credencial', 'Credential')}: ${enrolled.credentialCode}`
                        : tr('Ativo / Aguardando emissão', 'Active / Awaiting issuance')}
                      )
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-emerald-200/65 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    {tr('Certificado & Carteirinha', 'Certificate & ID Card')}
                  </span>
                )}

                <button
                  type="button"
                  disabled={Boolean(enrolled) || enrollingId === course.id}
                  onClick={() => handleEnrollClick(course)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    enrolled
                      ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-400/30 cursor-default'
                      : 'bg-amber-500 text-neutral-950 hover:bg-amber-400'
                  }`}
                >
                  {enrollingId === course.id
                    ? tr('Matriculando...', 'Enrolling...')
                    : enrolled
                    ? tr('Inscrito', 'Enrolled')
                    : tr('Matricular Agora', 'Enroll Now')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
