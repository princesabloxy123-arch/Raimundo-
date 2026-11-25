import React, { useMemo, useState } from 'react';
import {
  Calculator,
  CheckCircle2,
  FileCheck2,
  Landmark,
  PhoneCall,
  Scale,
  ShieldCheck,
  Smartphone,
  Stamp,
  Users,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import type {
  PartnerHotel,
  ShareholderOrder,
  ShareholderOrderStatus,
  ShareholderSummary,
  ShareholderTreeNode,
  UserProfile,
} from '../types';
import { HotelGpsGalleryPanel } from './HotelGpsGalleryPanel';
import { ShareholderBranchTree } from './ShareholderBranchTree';

interface ShareholdersTabProps {
  profile: UserProfile | null;
  hotels: PartnerHotel[];
  userOrders: ShareholderOrder[];
  summary: ShareholderSummary | null;
  shareholderTree?: ShareholderTreeNode[];
  isAdmin?: boolean;
  onCreateShareholderOrder: (params: {
    userPhone: string;
    userDocument: string;
    divisionLabel: string;
    lotCount: number;
    sharesPerLot: number;
    totalShares: number;
    percentOwnership: number;
    estimatedValueBRL: number;
  }) => Promise<void>;
  onRequireAuth: () => void;
  onGoToHotels?: () => void;
  onGoToCourses?: () => void;
  onGoToBank?: () => void;
  onGoToAdmin?: () => void;
}

interface DivisionPreset {
  id: string;
  labelPt: string;
  labelEn: string;
  sharesPerLot: number;
  totalDivisions: number;
  percentPerLot: number;
}

const TOTAL_CAPITAL_SHARES = 100000;
const SHARE_UNIT_BRL = 5.0;

const DIVISION_PRESETS: DivisionPreset[] = [
  {
    id: 'div_100',
    labelPt: 'Divisória Micro · 1.000 lotes de 100 ações',
    labelEn: 'Micro Tier · 1,000 lots of 100 shares',
    sharesPerLot: 100,
    totalDivisions: 1000,
    percentPerLot: 0.1,
  },
  {
    id: 'div_250',
    labelPt: 'Divisória Inicial · 400 lotes de 250 ações',
    labelEn: 'Starter Tier · 400 lots of 250 shares',
    sharesPerLot: 250,
    totalDivisions: 400,
    percentPerLot: 0.25,
  },
  {
    id: 'div_500',
    labelPt: 'Divisória Padrão · 200 lotes de 500 ações',
    labelEn: 'Standard Tier · 200 lots of 500 shares',
    sharesPerLot: 500,
    totalDivisions: 200,
    percentPerLot: 0.5,
  },
  {
    id: 'div_1000',
    labelPt: 'Divisória Sênior · 100 lotes de 1.000 ações',
    labelEn: 'Senior Tier · 100 lots of 1,000 shares',
    sharesPerLot: 1000,
    totalDivisions: 100,
    percentPerLot: 1.0,
  },
  {
    id: 'div_2500',
    labelPt: 'Divisória Conselho · 40 lotes de 2.500 ações',
    labelEn: 'Council Tier · 40 lots of 2,500 shares',
    sharesPerLot: 2500,
    totalDivisions: 40,
    percentPerLot: 2.5,
  },
  {
    id: 'div_5000',
    labelPt: 'Divisória Diretoria · 20 lotes de 5.000 ações',
    labelEn: 'Board Tier · 20 lots of 5,000 shares',
    sharesPerLot: 5000,
    totalDivisions: 20,
    percentPerLot: 5.0,
  },
];

export const ShareholdersTab: React.FC<ShareholdersTabProps> = ({
  profile,
  hotels,
  userOrders,
  summary,
  shareholderTree = [],
  isAdmin = false,
  onCreateShareholderOrder,
  onRequireAuth,
  onGoToHotels,
  onGoToCourses,
  onGoToBank,
  onGoToAdmin,
}) => {
  const { isEn, tr } = useLanguage();
  const [selectedPresetId, setSelectedPresetId] = useState<string>('div_500');
  const [lotCount, setLotCount] = useState<number>(1);
  const [customSharesMode, setCustomSharesMode] = useState(false);
  const [customShares, setCustomShares] = useState<number>(500);
  const [userPhone, setUserPhone] = useState(profile?.phone || '');
  const [userDocument, setUserDocument] = useState(profile?.cpf || '');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const statusLabels: Record<ShareholderOrderStatus, string> = {
    pending: tr('1/4 · Aguardando Análise Presidência & Mesa Diretora', '1/4 · Awaiting Presidency & Executive Board Review'),
    documentacao: tr('2/4 · Organização de Documentação Societária', '2/4 · Corporate Documentation Preparation'),
    cartorio: tr('3/4 · Em Lavratura & Registro em Cartório', '3/4 · Under Notary Deed Registration'),
    approved: tr('4/4 · Oficializada em Cartório · Ações Liberadas', '4/4 · Registered at Notary · Shares Credited'),
    rejected: tr('Solicitação Encerrada / Recusada', 'Request Closed / Rejected'),
  };

  const selectedPreset = useMemo(
    () => DIVISION_PRESETS.find((p) => p.id === selectedPresetId) || DIVISION_PRESETS[2],
    [selectedPresetId]
  );

  const allocatedShares = summary?.allocatedShares ?? 18500;
  const inProcessShares = summary?.inProcessShares ?? 6500;
  const availableShares = Math.max(0, TOTAL_CAPITAL_SHARES - allocatedShares - inProcessShares);

  const calc = useMemo(() => {
    const safeLots = Math.max(1, Math.min(1000, Math.floor(lotCount) || 1));
    const total = customSharesMode
      ? Math.max(10, Math.min(50000, Math.floor(customShares) || 100))
      : Math.min(TOTAL_CAPITAL_SHARES, safeLots * selectedPreset.sharesPerLot);

    const sharesPerLotValue = customSharesMode ? total : selectedPreset.sharesPerLot;
    const lotsValue = customSharesMode ? 1 : safeLots;
    const pct = Number(((total / TOTAL_CAPITAL_SHARES) * 100).toFixed(4));
    const divisorRatio = Math.max(1, Number((TOTAL_CAPITAL_SHARES / total).toFixed(2)));
    const estBRL = Number((total * SHARE_UNIT_BRL).toFixed(2));
    const presetLabel = isEn ? selectedPreset.labelEn : selectedPreset.labelPt;
    const label = customSharesMode
      ? tr(
          `Divisória Personalizada (${total.toLocaleString('pt-BR')} / 100.000 ações)`,
          `Custom Split (${total.toLocaleString('en-US')} / 100,000 shares)`
        )
      : `${presetLabel} · ${lotsValue} ${tr('lote(s)', 'lot(s)')}`;

    return {
      lotsValue,
      sharesPerLotValue,
      total,
      pct,
      divisorRatio,
      estBRL,
      label,
    };
  }, [customSharesMode, customShares, lotCount, selectedPreset, isEn, tr]);

  const capBlocks = useMemo(() => {
    const blockSize = 5000;
    const allocatedBlocks = Math.floor(allocatedShares / blockSize);
    const processBlocks = Math.ceil(inProcessShares / blockSize);
    return Array.from({ length: 20 }, (_, idx) => {
      if (idx < allocatedBlocks) return 'allocated';
      if (idx < allocatedBlocks + processBlocks) return 'process';
      return 'available';
    });
  }, [allocatedShares, inProcessShares]);

  const ownedShares = profile?.sharesOwned ?? 0;
  const ownedPercent = ((ownedShares / TOTAL_CAPITAL_SHARES) * 100).toFixed(3);
  const numLocale = isEn ? 'en-US' : 'pt-BR';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onRequireAuth();
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      await onCreateShareholderOrder({
        userPhone: (userPhone || profile.phone || '').trim(),
        userDocument: (userDocument || profile.cpf || '').trim(),
        divisionLabel: calc.label,
        lotCount: calc.lotsValue,
        sharesPerLot: calc.sharesPerLotValue,
        totalShares: calc.total,
        percentOwnership: calc.pct,
        estimatedValueBRL: calc.estBRL,
      });
      setFeedback(
        tr(
          `Solicitação de ${calc.total.toLocaleString('pt-BR')} ações (${calc.pct}%) registrada! Entre em contato com a Presidência e Mesa Diretora para análise, documentação e escritura em cartório.`,
          `Request for ${calc.total.toLocaleString('en-US')} shares (${calc.pct}%) registered! Contact the Presidency and Executive Board for review, documentation, and notary deed.`
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24">
        <HotelGpsGalleryPanel hotels={hotels} onGoToHotels={onGoToHotels} />
      </div>

      <div className="lg:col-span-8 xl:col-span-9 space-y-6">
        {/* Header Capital Social 100,000 Shares */}
      <div className="conae-panel rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <p className="text-xs font-medium text-amber-300">
              {tr('Quadro Societário Oficial CONAE · Capital Social Dividido em Lotes Matemáticos', 'Official CONAE Cap Table · Share Capital Divided into Mathematical Lots')}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              {tr('Acionistas CONAE · 100.000 Ações em Divisórias Matemáticas', 'CONAE Shareholders · 100,000 Shares in Mathematical Lots')}
            </h2>
            <p className="text-sm text-emerald-100/80 leading-relaxed">
              {tr(
                'Escolha o lote matemático desejado dentro das 100.000 ações da CONAE Convenção & Banco. Sua solicitação segue para análise direta do Presidente e da Mesa Diretora, organização da documentação e registro oficial em cartório — liberando suas ações diretamente no seu painel do celular.',
                'Choose your desired mathematical lot out of 100,000 CONAE Convention & Bank shares. Your request goes directly to the President and Executive Board for review, documentation, and official notary registration — crediting shares straight to your mobile dashboard.'
              )}
            </p>
          </div>

          <div className="conae-panel-soft rounded-xl p-4 shrink-0 min-w-[230px] space-y-1">
            <p className="text-[11px] font-mono text-amber-300">{tr('CAPITAL TOTAL CONAE', 'TOTAL CONAE CAPITAL')}</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-white">
              {tr('100.000 Ações', '100,000 Shares')}
            </p>
            <p className="text-xs font-mono tabular-nums text-emerald-300">
              {tr('Cota ref.:', 'Ref. price:')} R$ {SHARE_UNIT_BRL.toFixed(2)} / {tr('ação', 'share')}
            </p>
          </div>
        </div>

        {/* 4 Cap Table KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="conae-panel-soft rounded-lg p-3.5 space-y-1">
            <p className="text-emerald-200/75">{tr('Escrituradas em Cartório', 'Registered at Notary')}</p>
            <p className="text-lg font-bold font-mono tabular-nums text-amber-300">
              {allocatedShares.toLocaleString(numLocale)} {tr('ações', 'shares')}
            </p>
            <p className="text-[11px] font-mono text-emerald-200/65">
              {((allocatedShares / TOTAL_CAPITAL_SHARES) * 100).toFixed(2)}% {tr('do capital', 'of capital')}
            </p>
          </div>

          <div className="conae-panel-soft rounded-lg p-3.5 space-y-1">
            <p className="text-emerald-200/75">{tr('Em Análise / Cartório', 'In Review / Notary')}</p>
            <p className="text-lg font-bold font-mono tabular-nums text-white">
              {inProcessShares.toLocaleString(numLocale)} {tr('ações', 'shares')}
            </p>
            <p className="text-[11px] font-mono text-emerald-200/65">
              {tr('Mesa Diretora & Documentação', 'Executive Board & Docs')}
            </p>
          </div>

          <div className="conae-panel-soft rounded-lg p-3.5 space-y-1">
            <p className="text-emerald-200/75">{tr('Disponíveis em Lotes', 'Available in Lots')}</p>
            <p className="text-lg font-bold font-mono tabular-nums text-emerald-300">
              {availableShares.toLocaleString(numLocale)} {tr('ações', 'shares')}
            </p>
            <p className="text-[11px] font-mono text-emerald-200/65">
              {((availableShares / TOTAL_CAPITAL_SHARES) * 100).toFixed(2)}% {tr('abertas', 'open')}
            </p>
          </div>

          <div className="conae-gold-card rounded-lg p-3.5 space-y-1 text-amber-50">
            <p className="text-amber-100/90 flex items-center gap-1.5 font-medium">
              <Smartphone className="w-3.5 h-3.5" />
              {tr('Suas Ações no Painel', 'Your Dashboard Shares')}
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-white">
              {ownedShares.toLocaleString(numLocale)} {tr('ações', 'shares')}
            </p>
            <p className="text-[11px] font-mono text-amber-100/90">
              {ownedPercent}% · {profile?.sharesNotaryCode || tr('Aguardando cartório', 'Awaiting notary')}
            </p>
          </div>
        </div>

        {/* Visual Mathematical Partition Matrix */}
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-white">
              {tr('Mapa Matemático do Capital (20 Blocos de 5.000 ações = 100.000 ações)', 'Mathematical Capital Map (20 Blocks of 5,000 shares = 100,000 shares)')}
            </span>
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-emerald-100/80">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />
                {tr('Cartório Aprovado', 'Notary Approved')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                {tr('Em Documentação', 'In Documentation')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-950 border border-amber-400/35 inline-block" />
                {tr('Disponível p/ Lote', 'Available for Lot')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-20 gap-1.5">
            {capBlocks.map((state, i) => (
              <div
                key={i}
                title={tr(`Bloco ${i + 1}/20 · 5.000 ações (5%)`, `Block ${i + 1}/20 · 5,000 shares (5%)`)}
                className={`h-8 rounded flex items-center justify-center text-[10px] font-mono tabular-nums border ${
                  state === 'allocated'
                    ? 'bg-amber-400 text-neutral-950 font-bold border-amber-300'
                    : state === 'process'
                    ? 'bg-emerald-600 text-white font-semibold border-emerald-400'
                    : 'bg-black/45 text-emerald-200/70 border-amber-400/25'
                }`}
              >
                5k
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Compact Visual Branching Shareholder Tree inside Shareholders Tab */}
      <ShareholderBranchTree
        nodes={shareholderTree}
        isAdmin={isAdmin}
        onGoToHotels={() => onGoToHotels && onGoToHotels()}
        onGoToCourses={() => onGoToCourses && onGoToCourses()}
        onGoToBank={() => onGoToBank && onGoToBank()}
        onGoToAdmin={onGoToAdmin}
      />

      {/* Main Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 conae-panel rounded-xl p-5 sm:p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/20 pb-3">
            <div>
              <p className="text-xs text-amber-300 font-medium">
                {tr('Passo 1 · Escolha a Divisória Matemática', 'Step 1 · Choose Mathematical Division')}
              </p>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-400" />
                <span>{tr('Solicitar Lote de Ações à Presidência', 'Request Share Lot from Presidency')}</span>
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setCustomSharesMode((v) => !v)}
              className="px-3 py-1.5 rounded-lg conae-panel-soft text-xs font-semibold text-amber-300 hover:text-white cursor-pointer"
            >
              {customSharesMode
                ? tr('Usar Divisórias Padrão', 'Use Standard Tiers')
                : tr('Digitar Quantidade Personalizada', 'Enter Custom Amount')}
            </button>
          </div>

          {feedback && (
            <div className="rounded-lg bg-emerald-900/60 border border-amber-400/45 px-4 py-3 text-xs sm:text-sm text-emerald-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {!customSharesMode ? (
            <div className="space-y-3">
              <label className="block text-xs text-emerald-100/80 font-medium">
                {tr('Selecione uma Divisória Matemática sobre 100.000 ações:', 'Select a Mathematical Split out of 100,000 shares:')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DIVISION_PRESETS.map((preset) => {
                  const active = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`rounded-lg p-3 text-left border transition-colors cursor-pointer space-y-1 ${
                        active
                          ? 'bg-amber-500/20 border-amber-400 text-white'
                          : 'conae-panel-soft text-emerald-100/85 hover:border-amber-400/50'
                      }`}
                    >
                      <p className="text-xs font-bold text-white">{isEn ? preset.labelEn : preset.labelPt}</p>
                      <p className="text-[11px] font-mono text-amber-300 tabular-nums">
                        {preset.sharesPerLot.toLocaleString(numLocale)} {tr('ações/lote', 'shares/lot')} · {preset.percentPerLot.toFixed(2)}% {tr('cada', 'each')} · 1/{preset.totalDivisions}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs text-emerald-100/80 mb-1">
                  {tr('Quantidade de Lotes desejados (máximo 100 lotes por solicitação)', 'Number of Lots desired (max 100 lots per request)')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={lotCount}
                  onChange={(e) => setLotCount(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs text-emerald-100/80">
                {tr('Quantidade exata de ações desejada (entre 10 e 50.000 ações de 100.000):', 'Exact number of shares desired (between 10 and 50,000 of 100,000):')}
              </label>
              <input
                type="number"
                min={10}
                max={50000}
                step={10}
                value={customShares}
                onChange={(e) => setCustomShares(Math.max(10, Number(e.target.value) || 10))}
                className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-base text-amber-300 font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          {/* Mathematical Summary Box */}
          <div className="rounded-xl bg-black/45 border border-amber-400/30 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-emerald-200/70">{tr('Total Solicitado', 'Total Requested')}</p>
              <p className="text-base font-bold font-mono tabular-nums text-white">
                {calc.total.toLocaleString(numLocale)} {tr('ações', 'shares')}
              </p>
            </div>
            <div>
              <p className="text-emerald-200/70">{tr('Fração Matemática', 'Math Fraction')}</p>
              <p className="text-base font-bold font-mono tabular-nums text-amber-300">
                1 / {calc.divisorRatio}
              </p>
            </div>
            <div>
              <p className="text-emerald-200/70">{tr('Participação (%)', 'Ownership (%)')}</p>
              <p className="text-base font-bold font-mono tabular-nums text-emerald-300">
                {calc.pct}%
              </p>
            </div>
            <div>
              <p className="text-emerald-200/70">{tr('Referência Patrimonial', 'Equity Reference')}</p>
              <p className="text-base font-bold font-mono tabular-nums text-white">
                R$ {calc.estBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Contact & Cartório Document Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-emerald-100/80 mb-1">
                {tr('WhatsApp / Telefone p/ Contato Direto *', 'WhatsApp / Direct Phone *')}
              </label>
              <input
                required
                type="text"
                maxLength={30}
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                placeholder="(62) 99999-0000"
                className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-emerald-100/80 mb-1">
                {tr('CPF / CNPJ para Documentação em Cartório *', 'Tax ID / Document for Notary Deed *')}
              </label>
              <input
                required
                type="text"
                maxLength={30}
                value={userDocument}
                onChange={(e) => setUserDocument(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-bold text-sm hover:from-amber-400 hover:to-amber-300 cursor-pointer disabled:opacity-50"
          >
            {submitting
              ? tr('Enviando Solicitação...', 'Sending Request...')
              : tr('Solicitar Lote & Encaminhar p/ Presidência e Cartório', 'Request Lot & Send to Presidency & Notary')}
          </button>
        </form>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-5">
          <div className="conae-panel rounded-xl p-5 space-y-4">
            <div>
              <p className="text-xs text-amber-300 font-medium">{tr('Fluxo Jurídico & Societário', 'Legal & Corporate Flow')}</p>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                <span>{tr('Presidência, Documentação & Cartório', 'Presidency, Documentation & Notary')}</span>
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="conae-panel-soft rounded-lg p-3 flex items-start gap-2.5">
                <Users className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">
                    {tr('1. Análise com Presidente & Mesa Diretora', '1. Review with President & Executive Board')}
                  </p>
                  <p className="text-emerald-100/75">
                    {tr(
                      'Após solicitar seu lote matemático, você entra em contato com o Presidente Mundial e a Mesa Diretora para análise da compra das ações.',
                      'After requesting your mathematical lot, you contact the World President and Executive Board to review the share purchase.'
                    )}
                  </p>
                </div>
              </div>

              <div className="conae-panel-soft rounded-lg p-3 flex items-start gap-2.5">
                <FileCheck2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">
                    {tr('2. Organização da Documentação', '2. Documentation Preparation')}
                  </p>
                  <p className="text-emerald-100/75">
                    {tr(
                      'Conferência de CPF/CNPJ, contrato de cessão de cotas e reserva da fração exata sobre as 100.000 ações.',
                      'Verification of Tax ID, share transfer agreement, and reservation of the exact fraction of the 100,000 shares.'
                    )}
                  </p>
                </div>
              </div>

              <div className="conae-panel-soft rounded-lg p-3 flex items-start gap-2.5">
                <Stamp className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">
                    {tr('3. Registro em Cartório & Tela do Celular', '3. Notary Deed & Mobile Screen')}
                  </p>
                  <p className="text-emerald-100/75">
                    {tr(
                      'Concluída a escritura/registro em cartório, o Presidente libera sua parte das ações e você visualiza tudo no seu login de painel no celular.',
                      'Once the notary deed is finalized, the President releases your share portion and everything displays on your mobile dashboard login.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-400/20 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-emerald-200/80 flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
                {tr('Atendimento Presidência: Garavelo · Goiânia-GO', 'Presidency Desk: Garavelo · Goiânia-GO')}
              </span>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  tr(
                    `Olá Presidência e Mesa Diretora CONAE! Solicitei o lote de ${calc.total} ações (${calc.pct}%) e gostaria de organizar a documentação para o registro em cartório.`,
                    `Hello CONAE Presidency & Executive Board! I requested a lot of ${calc.total} shares (${calc.pct}%) and would like to arrange the notary deed documentation.`
                  )
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold"
              >
                {tr('Falar com Presidência', 'Contact Presidency')}
              </a>
            </div>
          </div>

          {/* Mobile Screen Shareholder Preview & Orders */}
          <div className="conae-panel rounded-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Landmark className="w-4 h-4 text-amber-400" />
                <span>{tr('Meu Extrato de Acionista (Painel Mobile)', 'My Shareholder Statement (Mobile)')}</span>
              </h3>
              <span className="text-[11px] font-mono text-amber-300">
                {ownedShares > 0 ? tr('Acionista Oficial', 'Official Shareholder') : tr('Pré-Cadastro', 'Pre-Registration')}
              </span>
            </div>

            <div className="rounded-xl bg-black/50 border border-amber-400/35 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-emerald-200/75">{tr('Titular no Painel', 'Account Holder')}</span>
                <span className="font-semibold text-white">
                  {profile?.displayName || tr('Conecte sua conta para ver', 'Sign in to view')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-200/75">{tr('Ações Oficializadas', 'Registered Shares')}</span>
                <span className="font-mono font-bold text-amber-300 tabular-nums">
                  {ownedShares.toLocaleString(numLocale)} / 100.000 ({ownedPercent}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-200/75">{tr('Protocolo / Cartório', 'Protocol / Notary')}</span>
                <span className="font-mono text-emerald-300">
                  {profile?.sharesNotaryCode || tr('Aguardando averbação em cartório', 'Awaiting notary filing')}
                </span>
              </div>
            </div>

            {userOrders.length === 0 ? (
              <p className="text-xs text-emerald-100/65">
                {tr('Você ainda não enviou solicitações de lotes de ações nesta conta.', 'You have not submitted any share lot requests on this account yet.')}
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {userOrders.map((ord) => (
                  <div key={ord.id} className="conae-panel-soft rounded-lg p-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white font-mono">
                        {ord.totalShares.toLocaleString(numLocale)} {tr('ações', 'shares')} ({ord.percentOwnership}%)
                      </span>
                      <span
                        className={`font-semibold ${
                          ord.status === 'approved'
                            ? 'text-emerald-300'
                            : ord.status === 'rejected'
                            ? 'text-red-300'
                            : 'text-amber-300'
                        }`}
                      >
                        {ord.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-200/80">{statusLabels[ord.status]}</p>
                    {ord.notaryCode && (
                      <p className="text-[11px] font-mono text-amber-200 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                        {tr('Cartório:', 'Notary:')} {ord.notaryCode}
                      </p>
                    )}
                    {ord.presidentNotes && (
                      <p className="text-[11px] text-emerald-100/75">{tr('Nota Diretoria:', 'Board Note:')} {ord.presidentNotes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
