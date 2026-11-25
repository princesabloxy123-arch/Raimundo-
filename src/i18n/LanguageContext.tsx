import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AppLanguage = 'pt' | 'en';

interface LanguageContextValue {
  lang: AppLanguage;
  isEn: boolean;
  setLang: (lang: AppLanguage) => void;
  tr: (pt: string, en: string) => string;
  translateDynamic: (text: string) => string;
}

const DYNAMIC_PHRASE_MAP: Record<string, string> = {
  Todos: 'All',
  TODOS: 'ALL',
  Padrao: 'Standard',
  Padrão: 'Standard',
  Prata: 'Silver',
  Ouro: 'Gold',
  Diamante: 'Diamond',
  Hotel: 'Hotel',
  'Clube de Eventos': 'Event Club',
  'Resort Conveniado': 'Partner Resort',
  Benefício: 'Benefit',
  Patrocinador: 'Sponsor',
  Farmácia: 'Pharmacy',
  Supermercado: 'Supermarket',
  'Clínica & Laboratório': 'Clinic & Lab',
  Comércio: 'Commerce',
  'Clube Conveniado': 'Partner Club',
  Ativo: 'Active',
  Pendente: 'Pending',
  Aprovado: 'Approved',
  Recusado: 'Rejected',
  Confirmado: 'Confirmed',
  Cancelada: 'Cancelled',
  Confirmada: 'Confirmed',
  'Em análise': 'Under review',
  EAD: 'Online',
  Presencial: 'In-Person',
  Hibrido: 'Hybrid',
  'Online EAD': 'Online',
  'EAD / Presencial': 'Online / In-Person',
  Afiliado: 'Affiliate',
  'Executivo VIP': 'VIP Executive',
  Hoteleiro: 'Hotelier',
  // Executive roles & highlights
  'Presidente Mundial da Convenção CONAE': 'CONAE World Convention President',
  'Fundador & Gestor Supremo CNEC': 'Founder & Supreme Manager of CNEC',
  'Executiva da Mesa Diretora CONAE': 'CONAE Executive Board Director',
  'Diretoria de Afiliados & Hotéis VIP': 'Affiliates & VIP Hotels Directorate',
  'Executivo Financeiro CONAE Bank': 'CONAE Bank Financial Executive',
  'Gestão de Câmbio, Cripto & Cotas': 'FX, Crypto & Equity Management',
  'Presidente Mundial CONAE': 'CONAE World President',
  'Executiva Mesa Diretora': 'Executive Board Member',
  'Executivo Banco & Câmbio': 'Bank & FX Executive',
  // Investment packages
  'Pacote Semente Afiliado': 'Seed Affiliate Package',
  'Para novos afiliados e obreiros': 'For new affiliates and ministers',
  'R$ 100,00 / cota mensal': 'R$ 100.00 / monthly quota',
  'Hotéis & Clubes 2★ e 3★ (até 25% OFF)': '2★ & 3★ Hotels & Clubs (up to 25% OFF)',
  'Cartão Virtual CONAE Prata após confirmação executiva': 'CONAE Silver Virtual Card after executive approval',
  'Descontos em hotéis 2★ e 3★ em todo o Brasil': 'Discounts at 2★ & 3★ hotels across Brazil',
  'Acesso liberado ao Banco de Informação & Cursos EAD': 'Unlocked access to Information Bank & Online Courses',
  'Pacote Executivo Convenção': 'Executive Convention Package',
  'Para líderes e investidores ativos': 'For active leaders and investors',
  'R$ 1.200,00 / pacote': 'R$ 1,200.00 / package',
  'Hotéis & Clubes 2★, 3★ e 4★ (até 45% OFF)': '2★, 3★ & 4★ Hotels & Clubs (up to 45% OFF)',
  '280 moedas CNEC + participação no Tesouro CONAE': '280 CNEC coins + CONAE Treasury participation',
  'Cartão Virtual CONAE Ouro com bônus de hospedagem': 'CONAE Gold Virtual Card with lodging bonus',
  'Acesso VIP a clubes de eventos e hotéis 4★': 'VIP access to event clubs & 4★ hotels',
  'Elegível a CDB Banco Inter + Deriv P2P em Dólar': 'Eligible for Banco Inter CDB + Deriv P2P in USD',
  'Cota Supremo Acionista & Hotéis 5★': 'Supreme Shareholder Quota & 5★ Hotels',
  'Para acionistas e investidores patrimoniais': 'For shareholders and equity investors',
  'R$ 5.000,00 / cota patrimonial': 'R$ 5,000.00 / equity quota',
  'Hotéis, Resorts & Clubes 5★ (até 65% OFF + Diária Bônus)': '5★ Hotels, Resorts & Clubs (up to 65% OFF + Bonus Night)',
  '1.250 moedas CNEC + Cotas em Hotéis, Cursos & Clubes': '1,250 CNEC coins + Quotas in Hotels, Courses & Clubs',
  'Cartão Virtual CONAE Diamante com limite de crédito VIP': 'CONAE Diamond Virtual Card with VIP credit limit',
  'Acesso prioritário ao Fundo de Ações & Tesouro CONAE': 'Priority access to Equity Fund & CONAE Treasury',
  'Credencial VIP para Convenção Mundial e Sala VIP': 'VIP Credential for World Convention & VIP Room',
  // CDB Products
  'CDB Liquidez Diária Banco Inter': 'Banco Inter Daily Liquidity CDB',
  '102% do CDI': '102% of CDI',
  'Resgate imediato (D+0)': 'Instant redemption (D+0)',
  'Baixo · Garantia FGC': 'Low · FGC Guaranteed',
  'CDB Pós-Fixado Inter 180 Dias': 'Banco Inter 180-Day Post-Fixed CDB',
  '108% do CDI': '108% of CDI',
  'Vencimento 180 dias': '180-day maturity',
  'CDB Patrimonial CONAE-Inter 360': 'CONAE-Inter 360 Equity CDB',
  '113% do CDI': '113% of CDI',
  'Vencimento 360 dias': '360-day maturity',
  'LCI Banco Inter Imobiliário / Hotéis': 'Banco Inter Real Estate / Hotels LCI',
  '95% do CDI (Isento de IR)': '95% of CDI (Tax-Exempt)',
  'Carência 90 dias': '90-day lock-up',
  'Baixo · Isento IR PF': 'Low · Individual Tax-Exempt',
  // Courses
  'Curso de Capelania Completa CONAE': 'Complete CONAE Chaplaincy Course',
  'Capelania & Autoridade Eclesiástica': 'Chaplaincy & Ecclesiastical Authority',
  '120h · Certificado Nacional': '120h · National Certificate',
  'Matrícula: 5KG de Alimentos não Perecíveis (Presencial) ou Taxa EAD': 'Enrollment: 5KG Non-Perishable Food (In-Person) or Online Fee',
  '12/10/2026 · 19:30h às 22:30h': '10/12/2026 · 7:30 PM to 10:30 PM',
  'Juiz de Paz Eclesiástico': 'Ecclesiastical Justice of the Peace',
  'Direito Eclesiástico & Liturgia': 'Ecclesiastical Law & Liturgy',
  '80h · 100% Online EAD': '80h · 100% Online',
  'R$ 290,00 ou Incluso no Pacote Executivo': 'R$ 290.00 or Included in Executive Package',
  'Acesso Imediato · Videoaulas + Apostilas': 'Instant Access · Video Lessons + Study Guides',
  'Teologia Ministerial (Básico ao Avançado)': 'Ministerial Theology (Basic to Advanced)',
  'Teologia & Liderança': 'Theology & Leadership',
  '360h · Módulos Progressivos': '360h · Progressive Modules',
  'R$ 99,00/mês ou Bolsa Afiliado CONAE': 'R$ 99.00/mo or CONAE Affiliate Scholarship',
  'Aulas Gravadas & Mentorias ao Vivo': 'Recorded Classes & Live Mentoring',
  'Formação de Liderança Ministerial CONAE': 'CONAE Ministerial Leadership Training',
  'Liderança & Carreira Ministerial': 'Leadership & Ministerial Career',
  '60h · Banco de Informação CONAE': '60h · CONAE Information Bank',
  'Acesso Exclusivo para Filiados & Colaboradores': 'Exclusive Access for Affiliates & Staff',
  'Turmas Mensais · Avaliações Digitais': 'Monthly Cohorts · Digital Assessments',
  // Radio Schedule & Sponsors
  'Devocional Manhã da Convenção': 'Convention Morning Devotional',
  'Boletim Mercado CNEC & Tesouro CONAE': 'CNEC Market & CONAE Treasury Bulletin',
  'Executivo Samuel': 'Executive Samuel',
  'CONAE Mulher, Hotéis VIP & Afiliados': 'CONAE Women, VIP Hotels & Affiliates',
  'Aula Aberta de Capelania & Bastidores': 'Open Chaplaincy Class & Backstage',
  'Equipe CONAE Cursos': 'CONAE Courses Team',
  'Educação Teológica & Capelania': 'Theological Education & Chaplaincy',
  'Bolsas e Certificação Nacional para Filiados': 'Scholarships & National Certification for Affiliates',
  'Hotelaria & Eventos Eclesiásticos': 'Hospitality & Ecclesiastical Events',
  'Até 65% OFF em 2★ a 5★ com Cartão Virtual': 'Up to 65% OFF at 2★ to 5★ with Virtual Card',
  'Câmbio em Dólar & Tesouro': 'USD Exchange & Treasury',
  'Cotação USD/BRL transparente e liquidez em conta': 'Transparent USD/BRL quotes & account liquidity',
  'Ação Social & Assistência': 'Social Action & Assistance',
  'Matrículas solidárias com 5kg de alimentos': 'Charity enrollments with 5kg of food',
  'Novembro 2026': 'November 2026',
  'Acumulação Estratégica Tesouro CONAE & Hotéis 5★': 'Strategic Accumulation: CONAE Treasury & 5★ Hotels',
};

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'pt',
  isEn: false,
  setLang: () => {},
  tr: (pt) => pt,
  translateDynamic: (text) => text,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<AppLanguage>(() => {
    try {
      const saved = window.localStorage.getItem('conae_lang');
      return saved === 'en' ? 'en' : 'pt';
    } catch {
      return 'pt';
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('conae_lang', lang);
    } catch {
      // ignore storage errors
    }
    document.documentElement.lang = lang === 'en' ? 'en-US' : 'pt-BR';
  }, [lang]);

  const value = useMemo<LanguageContextValue>(() => {
    const isEn = lang === 'en';
    return {
      lang,
      isEn,
      setLang: setLangState,
      tr: (pt: string, en: string) => (isEn ? en : pt),
      translateDynamic: (text: string) => {
        if (!isEn || !text) return text;
        return DYNAMIC_PHRASE_MAP[text] || text;
      },
    };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

export const BrazilRealFlag: React.FC<{ className?: string }> = ({ className = 'w-6 h-4' }) => (
  <svg viewBox="0 0 36 24" className={`${className} rounded-[2px] shadow-sm shrink-0`} aria-hidden="true">
    <rect width="36" height="24" fill="#009b3a" />
    <polygon points="18,2.4 33,12 18,21.6 3,12" fill="#fedf00" />
    <circle cx="18" cy="12" r="5.6" fill="#002776" />
    <path d="M 12.6 10.7 A 8.5 8.5 0 0 1 23.4 13.1" fill="none" stroke="#ffffff" strokeWidth="1.25" strokeLinecap="round" />
    <circle cx="15.5" cy="13.6" r="0.45" fill="#ffffff" />
    <circle cx="18" cy="14.3" r="0.45" fill="#ffffff" />
    <circle cx="20.2" cy="13.5" r="0.45" fill="#ffffff" />
    <circle cx="17.2" cy="9.4" r="0.45" fill="#ffffff" />
  </svg>
);

export const UsaRealFlag: React.FC<{ className?: string }> = ({ className = 'w-6 h-4' }) => (
  <svg viewBox="0 0 36 24" className={`${className} rounded-[2px] shadow-sm shrink-0`} aria-hidden="true">
    <rect width="36" height="24" fill="#ffffff" />
    <rect y="0" width="36" height="1.85" fill="#b22234" />
    <rect y="3.7" width="36" height="1.85" fill="#b22234" />
    <rect y="7.4" width="36" height="1.85" fill="#b22234" />
    <rect y="11.1" width="36" height="1.85" fill="#b22234" />
    <rect y="14.8" width="36" height="1.85" fill="#b22234" />
    <rect y="18.5" width="36" height="1.85" fill="#b22234" />
    <rect y="22.15" width="36" height="1.85" fill="#b22234" />
    <rect width="15.5" height="12.95" fill="#3c3b6e" />
    <g fill="#ffffff">
      <circle cx="2.5" cy="2.2" r="0.65" />
      <circle cx="5.5" cy="2.2" r="0.65" />
      <circle cx="8.5" cy="2.2" r="0.65" />
      <circle cx="11.5" cy="2.2" r="0.65" />
      <circle cx="14" cy="2.2" r="0.65" />
      <circle cx="4" cy="4.4" r="0.65" />
      <circle cx="7" cy="4.4" r="0.65" />
      <circle cx="10" cy="4.4" r="0.65" />
      <circle cx="13" cy="4.4" r="0.65" />
      <circle cx="2.5" cy="6.6" r="0.65" />
      <circle cx="5.5" cy="6.6" r="0.65" />
      <circle cx="8.5" cy="6.6" r="0.65" />
      <circle cx="11.5" cy="6.6" r="0.65" />
      <circle cx="14" cy="6.6" r="0.65" />
      <circle cx="4" cy="8.8" r="0.65" />
      <circle cx="7" cy="8.8" r="0.65" />
      <circle cx="10" cy="8.8" r="0.65" />
      <circle cx="13" cy="8.8" r="0.65" />
      <circle cx="2.5" cy="11" r="0.65" />
      <circle cx="5.5" cy="11" r="0.65" />
      <circle cx="8.5" cy="11" r="0.65" />
      <circle cx="11.5" cy="11" r="0.65" />
      <circle cx="14" cy="11" r="0.65" />
    </g>
  </svg>
);

export const LanguageFlags: React.FC = () => {
  const { lang, setLang } = useLanguage();
  return (
    <div
      className="inline-flex items-center gap-1 rounded-md bg-black/55 border border-amber-400/30 p-0.5 shrink-0"
      role="group"
      aria-label="Language / Idioma"
    >
      <button
        type="button"
        onClick={() => setLang('pt')}
        title="Português Brasileiro (Brasil)"
        aria-pressed={lang === 'pt'}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer ${
          lang === 'pt'
            ? 'bg-amber-500/25 border border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.35)]'
            : 'border border-transparent opacity-70 hover:opacity-100'
        }`}
      >
        <BrazilRealFlag className="w-5 h-3.5" />
        <span className="text-[10px] font-mono font-bold text-white hidden sm:inline">PT</span>
      </button>

      <button
        type="button"
        onClick={() => setLang('en')}
        title="American English (USA)"
        aria-pressed={lang === 'en'}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer ${
          lang === 'en'
            ? 'bg-amber-500/25 border border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.35)]'
            : 'border border-transparent opacity-70 hover:opacity-100'
        }`}
      >
        <UsaRealFlag className="w-5 h-3.5" />
        <span className="text-[10px] font-mono font-bold text-white hidden sm:inline">EN</span>
      </button>
    </div>
  );
};
