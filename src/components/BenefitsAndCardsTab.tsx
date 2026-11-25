import React, { useState } from 'react';
import {
  Building2,
  CreditCard,
  Crown,
  HeartPulse,
  MapPin,
  Printer,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  Stethoscope,
} from 'lucide-react';
import { CONAE_ASSETS } from '../data/conaeSeed';
import { useLanguage } from '../i18n/LanguageContext';
import type {
  BenefitPartner,
  BenefitPartnerCategory,
  CredentialPass,
  PartnerHotel,
  UserProfile,
} from '../types';

interface BenefitsAndCardsTabProps {
  profile: UserProfile | null;
  hotels: PartnerHotel[];
  benefitPartners: BenefitPartner[];
  userCredentialPasses: CredentialPass[];
  onGoToHotels: () => void;
  onGoToBank: () => void;
}

const CATEGORIES: ('Todos' | BenefitPartnerCategory)[] = [
  'Todos',
  'Farmácia',
  'Supermercado',
  'Clínica & Laboratório',
  'Comércio',
  'Clube Conveniado',
];

export const BenefitsAndCardsTab: React.FC<BenefitsAndCardsTabProps> = ({
  profile,
  hotels,
  benefitPartners,
  userCredentialPasses,
  onGoToHotels,
  onGoToBank,
}) => {
  const { tr, translateDynamic } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<'Todos' | BenefitPartnerCategory>('Todos');
  const [selectedState, setSelectedState] = useState<string>('TODOS');
  const [selectedHotelForCard, setSelectedHotelForCard] = useState<PartnerHotel | null>(hotels[0] || null);

  const states = ['TODOS', ...Array.from(new Set(benefitPartners.map((p) => p.state))).sort()];
  const filteredPartners = benefitPartners.filter((p) => {
    const catOk = selectedCategory === 'Todos' || p.category === selectedCategory;
    const stateOk = selectedState === 'TODOS' || p.state === selectedState;
    return p.active && catOk && stateOk;
  });

  const isExecutiveGolden =
    Boolean(profile?.executiveCardActive) ||
    profile?.role === 'executive' ||
    profile?.role === 'president' ||
    userCredentialPasses.some((cp) => cp.goldenCardActive);

  const holderDisplay = (profile?.displayName || tr('MEMBRO CREDENCIADO CONAE', 'CONAE ACCREDITED MEMBER')).toUpperCase();
  const cardDigits = profile?.cardNumber || '4916 2091 7740 2026';

  return (
    <div className="space-y-6">
      {/* Header Banner for Hoteliers & Affiliates */}
      <div className="conae-panel rounded-xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <p className="text-xs font-medium text-amber-300">
            {tr('Exclusividade Hoteleiros, Afiliados Mensais & Investidores', 'Exclusive for Hoteliers, Monthly Affiliates & Investors')}
          </p>
          <h2 className="text-2xl font-bold text-white">
            {tr(
              'Benefícios em Farmácias, Supermercados, Clínicas & Cartões Credenciados',
              'Benefits at Pharmacies, Supermarkets, Clinics & Accredited Cards'
            )}
          </h2>
          <p className="text-sm text-emerald-100/80 leading-relaxed">
            {tr(
              'Todos os hoteleiros conveniados, integrantes dos hotéis e afiliados com pacote ou mensalidade ativa recebem acesso a Cursos CONAE, Investimentos no Bank CONAE, Clubes por afiliação, Clínicas e Exames Laboratoriais, além de descontos em Farmácias e Supermercados em todo o Brasil.',
              'All partner hoteliers, hotel members, and affiliates with an active package or monthly plan receive access to CONAE Courses, CONAE Bank Investments, Partner Clubs, Clinics & Lab Exams, plus discounts at Pharmacies and Supermarkets nationwide.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onGoToBank}
            className="px-4 py-2 rounded-lg bg-amber-500 text-neutral-950 font-semibold text-xs hover:bg-amber-400 cursor-pointer whitespace-nowrap"
          >
            {tr('Ativar Pacote / Mensalidade', 'Activate Package / Plan')}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg conae-panel-soft text-xs font-semibold text-white hover:border-amber-400/60 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            {tr('Imprimir Credenciais', 'Print Credentials')}
          </button>
        </div>
      </div>

      {/* Golden Executive Card + Per-Hotel Generated Credential Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Official Golden Executive / Convention Card */}
        <div className="lg:col-span-5 conae-panel rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-amber-300 font-medium">
                {tr('Credencial Suprema da Convenção', 'Supreme Convention Credential')}
              </p>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <span>{tr('Cartão Dourado Executivo CONAE', 'CONAE Executive Golden Card')}</span>
              </h3>
            </div>
            <span className="text-xs font-mono text-amber-200">
              {isExecutiveGolden ? tr('Credenciado Ouro', 'Gold Accredited') : tr('Exclusivo Executivos', 'Executives Only')}
            </span>
          </div>

          <div className="conae-gold-card rounded-xl p-5 text-amber-50 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <img
                  src={CONAE_ASSETS.emblemHeart}
                  alt={tr('CONAE Emblema Dourado', 'CONAE Golden Emblem')}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-amber-200"
                />
                <div className="leading-tight">
                  <p className="text-xs font-bold tracking-wider text-amber-100">
                    {tr('CONVENÇÃO MUNDIAL CONAE', 'CONAE WORLD CONVENTION')}
                  </p>
                  <p className="text-[11px] text-amber-200/90">
                    {tr('Cartão Dourado Executivo & Presidência', 'Executive & Presidency Golden Card')}
                  </p>
                </div>
              </div>
              <Crown className="w-6 h-6 text-amber-200 shrink-0" />
            </div>

            <p className="font-mono text-lg tracking-widest text-white tabular-nums">
              {isExecutiveGolden ? cardDigits : tr('4916 •••• •••• OURO', '4916 •••• •••• GOLD')}
            </p>

            <div className="flex items-end justify-between gap-3 text-xs">
              <div className="min-w-0">
                <p className="text-[10px] text-amber-100/80">{tr('Titular Credenciado', 'Accredited Holder')}</p>
                <p className="font-bold text-white truncate">{holderDisplay}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-amber-100/80">{tr('Validade Rede', 'Network Validity')}</p>
                <p className="font-mono font-semibold text-white">
                  {tr('HOTÉIS · FARMÁCIA · BANK', 'HOTELS · PHARMACY · BANK')}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-emerald-100/80 leading-relaxed">
            {isExecutiveGolden
              ? tr(
                  'Seu Cartão Dourado Executivo está ativo para acesso à Sala VIP, hotéis 2★ a 5★, clínicas, laboratórios, farmácias e supermercados.',
                  'Your Executive Golden Card is active for VIP Room access, 2★ to 5★ hotels, clinics, labs, pharmacies, and supermarkets.'
                )
              : tr(
                  'Os executivos credenciados e membros autorizados pela Presidência recebem o Cartão Dourado oficial com senha individual de Sala VIP.',
                  'Accredited executives and members authorized by the Presidency receive the official Golden Card with an individual VIP Room password.'
                )}
          </p>
        </div>

        {/* Dynamic Per-Hotel Credential Card Generator */}
        <div className="lg:col-span-7 conae-panel rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs text-amber-300 font-medium">
                {tr('Geração Automática por Hotel Cadastrado', 'Automatic Issuance per Registered Hotel')}
              </p>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <span>{tr('Cartões Credenciados por Hotel & Rede CONAE', 'Accredited Cards by Hotel & CONAE Network')}</span>
              </h3>
            </div>
            <button
              type="button"
              onClick={onGoToHotels}
              className="text-xs font-semibold text-amber-300 hover:text-amber-200 cursor-pointer"
            >
              {tr(`Ver Hotéis (${hotels.length}) →`, `View Hotels (${hotels.length}) →`)}
            </button>
          </div>

          {/* Hotel Selector Tabs */}
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {hotels.filter((h) => h.active).map((h) => {
              const isSelected = (selectedHotelForCard?.id || hotels[0]?.id) === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setSelectedHotelForCard(h)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-amber-500 text-neutral-950 font-semibold'
                      : 'conae-panel-soft text-emerald-100/85 hover:text-white'
                  }`}
                >
                  {h.state} · {h.name.slice(0, 26)}
                </button>
              );
            })}
          </div>

          {/* Selected Hotel Generated Card */}
          {(selectedHotelForCard || hotels[0]) && (() => {
            const h = selectedHotelForCard || hotels[0];
            return (
              <div className="rounded-xl p-5 bg-gradient-to-br from-[#0d3b29] via-[#061f16] to-[#030a07] border border-amber-400/55 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={h.photoUrl || CONAE_ASSETS.emblemHeart}
                      alt={h.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-cover border border-amber-400/60 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono text-amber-300">
                        {tr('CARTÃO CREDENCIADO HOTEL', 'ACCREDITED HOTEL CARD')} · {h.city.toUpperCase()} / {h.state}
                      </p>
                      <h4 className="text-base font-bold text-white truncate">{h.name}</h4>
                      <div className="flex items-center gap-1 text-amber-400 text-xs">
                        {Array.from({ length: h.stars }).map((_, idx) => (
                          <Star key={idx} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                        <span className="text-emerald-200/80 ml-1 font-mono">
                          {tr(`Até ${h.discountPercent}% OFF`, `Up to ${h.discountPercent}% OFF`)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-emerald-300 shrink-0">
                    ID #{h.id.slice(-6).toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-black/40 border border-amber-400/20 rounded-lg p-2.5 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white block">{tr('Cursos & Bank CONAE', 'CONAE Courses & Bank')}</strong>
                      {tr(
                        'Acesso a cursos EAD/Capelania e investimentos CNEC com aporte a clubes por afiliação.',
                        'Access to online/Chaplaincy courses and CNEC investments with affiliate club benefits.'
                      )}
                    </span>
                  </div>
                  <div className="bg-black/40 border border-amber-400/20 rounded-lg p-2.5 flex items-start gap-2">
                    <Stethoscope className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white block">{tr('Clínicas & Laboratórios', 'Clinics & Laboratories')}</strong>
                      {tr(
                        'Consultas médicas, exames laboratoriais, farmácias e supermercados conveniados.',
                        'Medical appointments, lab exams, pharmacies, and partner supermarkets.'
                      )}
                    </span>
                  </div>
                </div>

                {h.hotelBenefits && (
                  <p className="text-xs text-amber-200/90 border-t border-amber-400/20 pt-2">
                    {tr('Benefícios extras do hotel:', 'Extra hotel benefits:')} {h.hotelBenefits}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Filters for Benefit Partners */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-neutral-950 font-semibold'
                  : 'conae-panel-soft text-emerald-100/85 hover:text-white'
              }`}
            >
              {translateDynamic(cat)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {states.map((uf) => (
            <button
              key={uf}
              type="button"
              onClick={() => setSelectedState(uf)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
                selectedState === uf
                  ? 'bg-emerald-700 text-white border border-amber-400/60'
                  : 'conae-panel-soft text-emerald-100/75 hover:text-white'
              }`}
            >
              {translateDynamic(uf)}
            </button>
          ))}
        </div>
      </div>

      {/* Partner Establishments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPartners.map((partner) => (
          <div key={partner.id} className="conae-panel rounded-xl overflow-hidden flex flex-col justify-between">
            <div className="h-36 bg-black/50 border-b border-amber-400/20 relative overflow-hidden">
              <img
                src={partner.photoUrl || CONAE_ASSETS.emblemHeart}
                alt={partner.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-300 flex items-center gap-1">
                  {partner.category === 'Farmácia' ? (
                    <HeartPulse className="w-3.5 h-3.5" />
                  ) : partner.category === 'Supermercado' ? (
                    <ShoppingCart className="w-3.5 h-3.5" />
                  ) : partner.category === 'Clínica & Laboratório' ? (
                    <Stethoscope className="w-3.5 h-3.5" />
                  ) : partner.category === 'Clube Conveniado' ? (
                    <Building2 className="w-3.5 h-3.5" />
                  ) : (
                    <Store className="w-3.5 h-3.5" />
                  )}
                  {translateDynamic(partner.category)}
                </span>
                <span className="font-mono font-bold text-emerald-300">
                  {partner.discountPercent}% OFF
                </span>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">{partner.name}</h3>
                <p className="text-xs text-emerald-200/80 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    {partner.city} · {partner.state}
                    {partner.hotelExclusive ? tr(' · Exclusivo Hoteleiros & Filiados', ' · Exclusive Hoteliers & Affiliates') : ''}
                  </span>
                </p>
                <p className="text-xs text-emerald-100/75 leading-relaxed">{partner.description}</p>
              </div>

              <div className="pt-2 border-t border-amber-400/15 flex items-center justify-between text-[11px] font-mono text-amber-200">
                <span>{tr('Válido com Cartão CONAE', 'Valid with CONAE Card')}</span>
                <span className="text-emerald-300">{tr('Ativo', 'Active')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
