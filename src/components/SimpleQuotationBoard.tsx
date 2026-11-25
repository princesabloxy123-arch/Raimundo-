import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { BrazilStateFlag } from './BrazilStateFlag';
import { useLanguage } from '../i18n/LanguageContext';
import type { UserProfile } from '../types';
import type {
  QuotationMathBreakdown,
  ShareholderValuationRecord,
} from '../utils/treasuryStateStats';

interface SimpleQuotationBoardProps {
  variant: 'home' | 'president';
  quotationMath: QuotationMathBreakdown;
  shareholderValuations: ShareholderValuationRecord[];
  currentProfile?: UserProfile | null;
  onBuyShares?: () => void;
  onResetQuotation?: () => Promise<void>;
  canReset?: boolean;
  onDeleteBuyer?: (holder: ShareholderValuationRecord) => Promise<void>;
  canDelete?: boolean;
}

export const SimpleQuotationBoard: React.FC<SimpleQuotationBoardProps> = ({
  variant,
  quotationMath,
  shareholderValuations,
  currentProfile = null,
  onBuyShares,
  onResetQuotation,
  canReset = false,
  onDeleteBuyer,
  canDelete = false,
}) => {
  const { isEn, tr } = useLanguage();
  const locale = isEn ? 'en-US' : 'pt-BR';
  const [search, setSearch] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showDeleteColumn = variant === 'president' && canDelete && Boolean(onDeleteBuyer);

  const fmtNum = (val: number, decimals = 2) =>
    isEn ? val.toFixed(decimals) : val.toFixed(decimals).replace('.', ',');

  const fmtBRL = (val: number) =>
    `R$ ${val.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Match logged-in shareholder so they immediately see their own shares & gains
  const myHolder = useMemo(() => {
    if (!currentProfile) return null;
    const myName = (currentProfile.displayName || '').trim().toLowerCase();
    const matched = myName
      ? shareholderValuations.find((h) => h.name.trim().toLowerCase() === myName)
      : undefined;
    if (matched) return matched;
    if ((currentProfile.sharesOwned || 0) > 0) {
      const shares = currentProfile.sharesOwned || 0;
      const initial = Number((shares * quotationMath.basePriceBRL).toFixed(2));
      const current = Number((shares * quotationMath.currentUnitPriceBRL).toFixed(2));
      const delta = Number((current - initial).toFixed(2));
      const pct = initial > 0 ? Number(((delta / initial) * 100).toFixed(2)) : 0;
      return {
        id: `me_${currentProfile.uid}`,
        name: currentProfile.displayName || tr('Você', 'You'),
        photoUrl: currentProfile.photoUrl || '',
        state: currentProfile.state || 'GO',
        sourceLabel: tr('Suas Ações', 'Your Shares'),
        purchaseDate: quotationMath.todayIso,
        daysHeld: 0,
        sharesCount: shares,
        sharePercent: Number(((shares / 100000) * 100).toFixed(2)),
        initialEquityBRL: initial,
        purchaseIndexPriceBRL: quotationMath.basePriceBRL,
        currentIndexPriceBRL: quotationMath.currentUnitPriceBRL,
        currentEquityBRL: current,
        totalDeltaBRL: delta,
        totalDeltaPercent: pct,
        dailyDeltaBRL: 0,
        dailyDeltaPercent: quotationMath.todayAppliedPercent,
        equityStatus: delta > 0.005 ? 'up' : delta < -0.005 ? 'down' : 'flat',
        dailyTimeline: [],
        sourceRefs: [],
      } as ShareholderValuationRecord;
    }
    return null;
  }, [currentProfile, shareholderValuations, quotationMath, tr]);

  const filteredHolders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return shareholderValuations;
    return shareholderValuations.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.state.toLowerCase().includes(q)
    );
  }, [shareholderValuations, search]);

  const visibleHolders = variant === 'home' ? filteredHolders.slice(0, 10) : filteredHolders;

  return (
    <section className="conae-panel rounded-xl p-4 sm:p-5 border border-amber-400/35 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="space-y-0.5">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {variant === 'president'
                ? tr('Cotação Simples das Ações · Painel do Presidente', 'Simple Share Quotation · President Panel')
                : tr('Cotação Simples das Ações CONAE', 'Simple CONAE Share Quotation')}
            </span>
          </h3>
          <p className="text-xs text-emerald-100/75">
            {tr(
              'Base de R$ 5,00 por ação. A cada compra ou venda registrada, a ação sobe e atualiza automaticamente o valor de cada acionista.',
              'R$ 5.00 standard share price. Each recorded purchase or sale raises the quote and updates every shareholder automatically.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {variant === 'president' && canReset && onResetQuotation && (
            confirmReset ? (
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  disabled={resetting}
                  onClick={async () => {
                    setResetting(true);
                    try {
                      await onResetQuotation();
                    } finally {
                      setResetting(false);
                      setConfirmReset(false);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer whitespace-nowrap"
                >
                  {resetting ? tr('Zerando...', 'Resetting...') : tr('Confirmar Zerar R$ 5,00', 'Confirm Reset R$ 5.00')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-black/55 border border-white/15 text-emerald-100 cursor-pointer"
                >
                  {tr('Cancelar', 'Cancel')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/55 border border-amber-400/35 hover:border-amber-300 text-amber-200 text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {tr('Zerar para R$ 5,00', 'Reset to R$ 5.00')}
              </button>
            )
          )}

          {variant === 'home' && onBuyShares && (
            <button
              type="button"
              onClick={onBuyShares}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              {tr('Comprar Ações', 'Buy Shares')}
            </button>
          )}
        </div>
      </div>

      {/* 3 Simple Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono tabular-nums">
        <div className="rounded-lg bg-black/50 border border-amber-400/30 p-3">
          <p className="text-[11px] font-sans text-emerald-200/75">
            {tr('Valor da Ação Agora', 'Current Share Price')}
          </p>
          <p className="text-xl font-bold text-amber-300 mt-0.5">
            {fmtBRL(quotationMath.currentUnitPriceBRL)}
          </p>
          <p className="text-[11px] font-sans text-emerald-100/65 mt-0.5">
            {quotationMath.valuationBoostPercent > 0
              ? tr(
                  `Subiu +${fmtNum(quotationMath.valuationBoostPercent, 2)}% desde R$ 5,00`,
                  `Up +${fmtNum(quotationMath.valuationBoostPercent, 2)}% from R$ 5.00`
                )
              : tr('Valor padrão inicial: R$ 5,00', 'Initial standard value: R$ 5.00')}
          </p>
        </div>

        <div className="rounded-lg bg-black/50 border border-white/10 p-3">
          <p className="text-[11px] font-sans text-emerald-200/75">
            {tr('Total Comprado e Vendido', 'Total Bought & Sold')}
          </p>
          <p className="text-xl font-bold text-white mt-0.5">
            {fmtBRL(quotationMath.allPurchasesTotalBRL)}
          </p>
          <p className="text-[11px] font-sans text-emerald-100/65 mt-0.5">
            {quotationMath.totalSharesSold.toLocaleString(locale)} {tr('ações negociadas', 'shares traded')} · {shareholderValuations.length} {tr('acionistas', 'shareholders')}
          </p>
        </div>

        <div className="rounded-lg bg-black/50 border border-emerald-400/25 p-3">
          <p className="text-[11px] font-sans text-emerald-200/75">
            {tr('Movimento de Hoje', 'Today’s Movement')}
          </p>
          <p
            className={`text-xl font-bold mt-0.5 ${
              quotationMath.todayAppliedPercent > 0
                ? 'text-emerald-300'
                : quotationMath.todayAppliedPercent < 0
                ? 'text-red-300'
                : 'text-amber-200'
            }`}
          >
            {quotationMath.todayAppliedPercent > 0 ? '+' : ''}
            {fmtNum(quotationMath.todayAppliedPercent, 2)}%
          </p>
          <p className="text-[11px] font-sans text-emerald-100/65 mt-0.5">
            {quotationMath.todayHasPurchase
              ? `${fmtBRL(quotationMath.todayPurchasesBRL)} ${tr('vendidos hoje', 'sold today')}`
              : tr('Sem compra hoje · Cotação mantida', 'No buy today · Quote held')}
          </p>
        </div>
      </div>

      {/* Logged-in Shareholder's Own Instant Card */}
      {myHolder && (
        <div className="rounded-lg bg-emerald-950/60 border border-emerald-400/40 p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-emerald-300">
              {tr('Suas Ações Agora', 'Your Shares Now')} · {myHolder.name}
            </p>
            <p className="text-xs text-emerald-100/80 font-mono tabular-nums">
              {myHolder.sharesCount.toLocaleString(locale)} {tr('ações', 'shares')} · {tr('Comprou:', 'Bought:')} {fmtBRL(myHolder.initialEquityBRL)}
            </p>
          </div>
          <div className="text-right font-mono tabular-nums">
            <p className="text-base font-bold text-white">{fmtBRL(myHolder.currentEquityBRL)}</p>
            <p
              className={`text-xs font-bold inline-flex items-center gap-0.5 ${
                myHolder.equityStatus === 'up'
                  ? 'text-emerald-300'
                  : myHolder.equityStatus === 'down'
                  ? 'text-red-300'
                  : 'text-amber-200'
              }`}
            >
              {myHolder.equityStatus === 'up' && <ArrowUpRight className="w-3.5 h-3.5" />}
              {myHolder.equityStatus === 'down' && <ArrowDownRight className="w-3.5 h-3.5" />}
              {myHolder.equityStatus === 'flat' && <Minus className="w-3.5 h-3.5" />}
              {myHolder.equityStatus === 'up'
                ? `${tr('Subiu', 'Up')} +${fmtBRL(myHolder.totalDeltaBRL)} (+${fmtNum(myHolder.totalDeltaPercent, 2)}%)`
                : myHolder.equityStatus === 'down'
                ? `-${fmtBRL(Math.abs(myHolder.totalDeltaBRL))} (${fmtNum(myHolder.totalDeltaPercent, 2)}%)`
                : tr('Aguardando próxima compra', 'Waiting for next purchase')}
            </p>
          </div>
        </div>
      )}

      {/* Simple List of Every Shareholder & Their Current Quoted Value */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>
              {tr(
                `Cotação de Cada Acionista (${shareholderValuations.length})`,
                `Each Shareholder’s Quotation (${shareholderValuations.length})`
              )}
            </span>
          </p>

          {shareholderValuations.length > 4 && (
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-emerald-300/70 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr('Buscar acionista...', 'Search shareholder...')}
                className="w-full rounded-lg bg-black/55 border border-white/15 pl-8 pr-3 py-1 text-xs text-white placeholder:text-emerald-200/45 focus:outline-none focus:border-amber-400"
              />
            </div>
          )}
        </div>

        {visibleHolders.length === 0 ? (
          <p className="text-xs text-emerald-200/75 text-center py-4 rounded-lg bg-black/40 border border-white/10">
            {tr(
              'Nenhum acionista comprador registrado ainda. Assim que alguém comprar ações, o valor aparece e sobe aqui automaticamente.',
              'No share buyers recorded yet. As soon as someone buys shares, values appear and update here automatically.'
            )}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-black/45 border border-white/10">
            <table className="w-full text-xs font-mono tabular-nums border-collapse">
              <thead>
                <tr className="text-left text-emerald-200/70 border-b border-white/10 font-sans text-[11px]">
                  <th className="py-2 px-3">{tr('Acionista', 'Shareholder')}</th>
                  <th className="py-2 px-2">{tr('Ações', 'Shares')}</th>
                  <th className="py-2 px-2">{tr('Comprou', 'Bought')}</th>
                  <th className="py-2 px-2">{tr('Vale Agora', 'Worth Now')}</th>
                  <th className="py-2 px-3 text-right">{tr('Situação', 'Status')}</th>
                  {showDeleteColumn && (
                    <th className="py-2 px-3 text-right">{tr('Excluir', 'Delete')}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleHolders.map((h) => (
                  <tr key={h.id} className="border-b border-white/5 last:border-b-0">
                    <td className="py-2 px-3 font-sans">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={h.photoUrl}
                          alt={h.name}
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 rounded-full object-cover border border-amber-400/70 shrink-0"
                        />
                        <BrazilStateFlag uf={h.state} size="xs" />
                        <span className="text-white font-semibold truncate max-w-[160px]">
                          {h.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-amber-200 whitespace-nowrap">
                      {h.sharesCount.toLocaleString(locale)}
                    </td>
                    <td className="py-2 px-2 text-emerald-100/80 whitespace-nowrap">
                      {fmtBRL(h.initialEquityBRL)}
                    </td>
                    <td className="py-2 px-2 text-white font-bold whitespace-nowrap">
                      {fmtBRL(h.currentEquityBRL)}
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-0.5 font-bold ${
                          h.equityStatus === 'up'
                            ? 'text-emerald-300'
                            : h.equityStatus === 'down'
                            ? 'text-red-300'
                            : 'text-amber-200/80'
                        }`}
                      >
                        {h.equityStatus === 'up' && <ArrowUpRight className="w-3.5 h-3.5" />}
                        {h.equityStatus === 'down' && <ArrowDownRight className="w-3.5 h-3.5" />}
                        {h.equityStatus === 'flat' && <Minus className="w-3.5 h-3.5" />}
                        {h.equityStatus === 'up'
                          ? `+${fmtBRL(h.totalDeltaBRL)} (+${fmtNum(h.totalDeltaPercent, 2)}%)`
                          : h.equityStatus === 'down'
                          ? `-${fmtBRL(Math.abs(h.totalDeltaBRL))} (${fmtNum(h.totalDeltaPercent, 2)}%)`
                          : tr('Mantido', 'Held')}
                      </span>
                    </td>
                    {showDeleteColumn && (
                      <td className="py-2 px-3 text-right whitespace-nowrap font-sans">
                        {confirmDeleteId === h.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={deletingId === h.id}
                              onClick={async () => {
                                if (!onDeleteBuyer) return;
                                setDeletingId(h.id);
                                try {
                                  await onDeleteBuyer(h);
                                } finally {
                                  setDeletingId(null);
                                  setConfirmDeleteId(null);
                                }
                              }}
                              className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold cursor-pointer disabled:opacity-60"
                            >
                              {deletingId === h.id ? tr('Excluindo...', 'Deleting...') : tr('Confirmar', 'Confirm')}
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === h.id}
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded bg-black/55 border border-white/15 text-emerald-100 text-[11px] cursor-pointer"
                            >
                              {tr('Não', 'No')}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(h.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-600/20 hover:bg-red-600/40 border border-red-400/40 text-red-200 hover:text-white text-[11px] font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{tr('Excluir', 'Delete')}</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
