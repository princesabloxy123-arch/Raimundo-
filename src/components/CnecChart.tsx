import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Minus,
  TrendingUp,
  X,
} from 'lucide-react';
import { BrazilStateFlag } from './BrazilStateFlag';
import { CONAE_ASSETS } from '../data/conaeSeed';
import type {
  QuotationMathBreakdown,
  ShareholderValuationRecord,
  StateTreasuryStat,
  TreasuryBuyerHighlight,
} from '../utils/treasuryStateStats';
import { useLanguage } from '../i18n/LanguageContext';

interface CnecChartProps {
  compact?: boolean;
  topBanner?: boolean;
  stateStats?: StateTreasuryStat[];
  totalSalesCount?: number;
  activeStatesCount?: number;
  totalEquityBRL?: number;
  totalShareSalesBRL?: number;
  totalSharesSold?: number;
  totalSharesForSale?: number;
  todayVolumeBRL?: number;
  latestDailyQuotePercent?: number;
  todayQuotePayoutBRL?: number;
  executiveEntriesCount?: number;
  valuationBoostPercent?: number;
  shareUnitPriceBRL?: number;
  buyerHighlights?: TreasuryBuyerHighlight[];
  shareholderValuations?: ShareholderValuationRecord[];
  quotationMath?: QuotationMathBreakdown;
  onBuyPackageClick?: () => void;
}

const SERIES_BY_RANGE: Record<
  '1H' | '24H' | '7D' | '30D',
  { labelPt: string; labelEn: string; points: number[]; baseDelta: number }
> = {
  '1H': {
    labelPt: 'Última hora',
    labelEn: 'Last hour',
    points: [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
    baseDelta: 0,
  },
  '24H': {
    labelPt: 'Cotação Diária (Base R$ 5,00)',
    labelEn: 'Daily Quote (R$ 5.00 Base)',
    points: [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
    baseDelta: 0,
  },
  '7D': {
    labelPt: 'Últimos 7 dias',
    labelEn: 'Last 7 days',
    points: [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
    baseDelta: 0,
  },
  '30D': {
    labelPt: 'Últimos 30 dias',
    labelEn: 'Last 30 days',
    points: [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
    baseDelta: 0,
  },
};

function formatDateBR(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export const CnecChart: React.FC<CnecChartProps> = ({
  compact = false,
  topBanner = false,
  stateStats = [],
  totalSalesCount = 0,
  activeStatesCount = 0,
  totalEquityBRL = 0,
  totalShareSalesBRL = 0,
  totalSharesSold = 0,
  totalSharesForSale = 0,
  todayVolumeBRL = 0,
  latestDailyQuotePercent = 0,
  todayQuotePayoutBRL = 0,
  executiveEntriesCount = 0,
  valuationBoostPercent = 0,
  shareUnitPriceBRL = 5.0,
  buyerHighlights = [],
  shareholderValuations = [],
  quotationMath,
}) => {
  const { isEn, tr } = useLanguage();
  const [range, setRange] = useState<'1H' | '24H' | '7D' | '30D'>('24H');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [selectedHolderId, setSelectedHolderId] = useState<string | null>(null);
  const gradId = useId().replace(/:/g, '');
  const numLocale = isEn ? 'en-US' : 'pt-BR';

  const formatNum = (val: number, decimals: number) =>
    isEn ? val.toFixed(decimals) : val.toFixed(decimals).replace('.', ',');

  const formatBRL = (val: number) =>
    `R$ ${val.toLocaleString(numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    setHoverIdx(null);
  }, [range]);

  const currentSeries = SERIES_BY_RANGE[range];

  // Real daily purchase-driven curve: flat at R$ 5,00 when reset, stepping strictly on purchase days & carrying over flat on non-purchase days
  const points = useMemo(() => {
    const ledger = quotationMath?.dailyLedger ?? [];
    if (ledger.length > 0) {
      const sliceCount = range === '1H' ? 5 : range === '24H' ? 7 : range === '7D' ? 7 : 14;
      const sliced = ledger.slice(-sliceCount);
      const rawPrices = sliced.map((d) => Number(d.closingPriceBRL.toFixed(4)));
      if (rawPrices.length === 1) {
        return [Number(sliced[0].openingPriceBRL.toFixed(4)), rawPrices[0]];
      }
      return rawPrices;
    }
    const targetPrice = Number((quotationMath?.currentUnitPriceBRL ?? shareUnitPriceBRL ?? 5.0).toFixed(4));
    return currentSeries.points.map(() => targetPrice);
  }, [quotationMath, range, shareUnitPriceBRL, currentSeries.points]);

  const currentPrice = Number((quotationMath?.currentUnitPriceBRL ?? points[points.length - 1] ?? 5.0).toFixed(2));
  const activePrice = hoverIdx !== null ? Number((points[hoverIdx] ?? currentPrice).toFixed(2)) : currentPrice;
  const liveDeltaPercent = Number(valuationBoostPercent.toFixed(2));
  const sharesCapitalPercent = Number(((totalSharesSold / 100000) * 100).toFixed(2));

  const svgWidth = topBanner ? 130 : 440;
  const svgHeight = topBanner ? 28 : compact ? 155 : 190;

  const { linePath, areaPath, coords } = useMemo(() => {
    const w = svgWidth;
    const h = svgHeight;
    const padX = 12;
    const padY = 16;
    const minVal = Math.min(...points);
    const maxVal = Math.max(...points);
    const isFlat = Math.abs(maxVal - minVal) < 0.0005;
    const min = isFlat ? minVal - 0.1 : minVal * 0.992;
    const max = isFlat ? maxVal + 0.1 : maxVal * 1.008;
    const span = max - min || 1;

    const pts = points.map((val, i) => {
      const x =
        points.length <= 1 ? w / 2 : padX + (i / (points.length - 1)) * (w - padX * 2);
      const y = isFlat ? h / 2 : padY + (1 - (val - min) / span) * (h - padY * 2);
      return { x, y, val };
    });

    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area = `${d} L ${pts[pts.length - 1].x.toFixed(1)} ${h} L ${pts[0].x.toFixed(1)} ${h} Z`;

    return { linePath: d, areaPath: area, coords: pts };
  }, [points, svgHeight, svgWidth]);

  const lastCoord = coords[coords.length - 1];
  const orderedMarqueeStats = useMemo(() => {
    const active = stateStats.filter((s) => s.percent > 0).sort((a, b) => b.percent - a.percent);
    const waiting = stateStats.filter((s) => s.percent <= 0);
    return [...active, ...waiting];
  }, [stateStats]);

  // Unified rolling list of ALL shareholders who bought shares or were inserted
  const rollingShareholders = useMemo<ShareholderValuationRecord[]>(() => {
    if (shareholderValuations.length > 0) return shareholderValuations;
    // Fallback if caller only passed buyerHighlights
    return buyerHighlights.map((b) => {
      const shares = b.sharesCount > 0 ? b.sharesCount : Math.max(1, Math.round((b.amountBRL || 5.0) / 5.0));
      const initial = b.amountBRL > 0 ? b.amountBRL : Number((shares * 5.0).toFixed(2));
      const pct = latestDailyQuotePercent !== 0 ? latestDailyQuotePercent : valuationBoostPercent;
      const current = Number((initial * (1 + pct / 100)).toFixed(2));
      const delta = Number((current - initial).toFixed(2));
      const status: 'up' | 'down' | 'flat' = delta > 0.005 ? 'up' : delta < -0.005 ? 'down' : 'flat';
      return {
        id: b.id,
        name: b.buyerName,
        photoUrl: b.buyerPhotoUrl || CONAE_ASSETS.emblemHeart,
        state: b.state || 'GO',
        sourceLabel: 'Compra de Ações',
        purchaseDate: b.entryDate,
        daysHeld: 0,
        sharesCount: shares,
        sharePercent: Number(((shares / 100000) * 100).toFixed(2)),
        initialEquityBRL: initial,
        purchaseIndexPriceBRL: 5.0,
        currentIndexPriceBRL: shareUnitPriceBRL,
        currentEquityBRL: current,
        totalDeltaBRL: delta,
        totalDeltaPercent: Number(pct.toFixed(2)),
        dailyDeltaBRL: delta,
        dailyDeltaPercent: Number(pct.toFixed(2)),
        equityStatus: status,
        dailyTimeline: [
          {
            date: b.entryDate,
            label: `${formatDateBR(b.entryDate).slice(0, 5)} (Base)`,
            indexPriceBRL: 5.0,
            dayChangePercent: 0,
            equityBRL: initial,
            cumulativeDeltaBRL: 0,
            cumulativeDeltaPercent: 0,
            increased: false,
            carriedOver: false,
          },
          {
            date: b.entryDate,
            label: tr('Hoje', 'Today'),
            indexPriceBRL: shareUnitPriceBRL,
            dayChangePercent: Number(pct.toFixed(2)),
            equityBRL: current,
            cumulativeDeltaBRL: delta,
            cumulativeDeltaPercent: Number(pct.toFixed(2)),
            increased: delta > 0.005,
            carriedOver: pct === 0,
          },
        ],
      };
    });
  }, [shareholderValuations, buyerHighlights, latestDailyQuotePercent, valuationBoostPercent, shareUnitPriceBRL, tr]);

  const selectedHolder = useMemo(() => {
    if (!selectedHolderId) return null;
    return rollingShareholders.find((h) => h.id === selectedHolderId) ?? null;
  }, [selectedHolderId, rollingShareholders]);

  const selectedHolderChart = useMemo(() => {
    if (!selectedHolder || selectedHolder.dailyTimeline.length === 0) return null;
    const steps = selectedHolder.dailyTimeline;
    const w = 320;
    const h = 76;
    const padX = 14;
    const padY = 12;
    const vals = steps.map((s) => s.equityBRL);
    const min = Math.min(...vals) * 0.985;
    const max = Math.max(...vals) * 1.015;
    const span = max - min || 1;
    const pts = steps.map((s, idx) => ({
      ...s,
      x: steps.length === 1 ? w / 2 : padX + (idx / (steps.length - 1)) * (w - padX * 2),
      y: padY + (1 - (s.equityBRL - min) / span) * (h - padY * 2),
    }));
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area =
      pts.length > 1
        ? `${d} L ${pts[pts.length - 1].x.toFixed(1)} ${h} L ${pts[0].x.toFixed(1)} ${h} Z`
        : '';
    return { w, h, pts, d, area };
  }, [selectedHolder]);

  const renderStatusText = (h: ShareholderValuationRecord) => {
    if (h.equityStatus === 'up') {
      return `▲ +${formatNum(h.totalDeltaPercent, 2)}% (+${formatBRL(h.totalDeltaBRL)})`;
    }
    if (h.equityStatus === 'down') {
      return `▼ ${formatNum(h.totalDeltaPercent, 2)}% (-${formatBRL(Math.abs(h.totalDeltaBRL))})`;
    }
    return tr('• Sem aumento 0,00% (R$ 0,00)', '• No gain 0.00% (R$ 0.00)');
  };

  if (topBanner) {
    const holderTrack =
      rollingShareholders.length > 0 && rollingShareholders.length < 4
        ? [...rollingShareholders, ...rollingShareholders]
        : rollingShareholders;

    return (
      <section className="conae-panel rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-1.5 space-y-1.5">
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 sm:gap-2.5">
          {/* Compact Live Stock Market Title + Price + Daily % */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] font-bold text-amber-300 whitespace-nowrap">
              {tr('Mercado de Ações CNEC', 'CNEC Stock Market')}
            </span>
            <span className="text-sm font-bold font-mono tabular-nums text-white whitespace-nowrap">
              R$ {formatNum(activePrice, 2)}
            </span>
            <span className="inline-flex items-center text-[11px] font-semibold font-mono text-emerald-400 whitespace-nowrap">
              <ArrowUpRight className="w-3 h-3" />
              +{formatNum(liveDeltaPercent, 2)}%
            </span>
          </div>

          {/* Ultra-Compact Live Moving Mini-Chart */}
          <div className="flex items-center rounded bg-black/50 border border-emerald-500/25 px-1.5 py-0.5 shrink-0 w-[96px] sm:w-[116px]">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-[20px] sm:h-[22px] overflow-visible"
              onMouseLeave={() => setHoverIdx(null)}
            >
              <defs>
                <linearGradient id={`cnecTopGrad_${gradId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#050907" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={areaPath}
                fill={`url(#cnecTopGrad_${gradId})`}
                className="transition-all duration-700 ease-out"
              />
              <path
                d={linePath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-700 ease-out"
              />
              {linePath && (
                <circle r="2.2" fill="#fef08a">
                  <animateMotion dur="3s" repeatCount="indefinite" path={linePath} />
                </circle>
              )}
              {lastCoord && (
                <circle
                  cx={lastCoord.x}
                  cy={lastCoord.y}
                  r="2.6"
                  fill="#10b981"
                  stroke="#fef08a"
                  strokeWidth="1"
                />
              )}
            </svg>
          </div>

          {/* Inline Continuous Rolling Bar: ALL Inserted Shareholders (Daily Value + Equity %/R$ Status) + 27 State Flags */}
          <div className="marquee-wrapper flex-1 min-w-[180px] overflow-hidden rounded bg-black/45 border border-amber-400/25 py-0.5 px-1">
            <div className="animate-marquee-flags flex items-center gap-2">
              {holderTrack.length > 0 &&
                [...holderTrack, ...holderTrack].map((h, idx) => (
                  <div
                    key={`top_holder_${h.id}_${idx}`}
                    className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[10px] shrink-0 ${
                      h.equityStatus === 'up'
                        ? 'bg-emerald-950/75 border-emerald-400/50'
                        : h.equityStatus === 'down'
                        ? 'bg-red-950/60 border-red-400/45'
                        : 'bg-amber-500/15 border-amber-400/45'
                    }`}
                  >
                    <img
                      src={h.photoUrl}
                      alt={h.name}
                      referrerPolicy="no-referrer"
                      className="w-4 h-4 rounded-full object-cover border border-amber-300 shrink-0"
                    />
                    <BrazilStateFlag uf={h.state} size="xs" />
                    <span className="font-semibold text-white whitespace-nowrap">{h.name}</span>
                    <span className="font-mono text-amber-300 whitespace-nowrap">
                      {h.sharesCount.toLocaleString(numLocale)} {tr('ações', 'sh')} · {formatBRL(h.currentEquityBRL)}
                    </span>
                    <span
                      className={`font-mono font-bold whitespace-nowrap ${
                        h.equityStatus === 'up'
                          ? 'text-emerald-300'
                          : h.equityStatus === 'down'
                          ? 'text-red-300'
                          : 'text-amber-200/85'
                      }`}
                    >
                      {renderStatusText(h)}
                    </span>
                  </div>
                ))}

              {[...orderedMarqueeStats, ...orderedMarqueeStats].map((st, idx) => (
                <div
                  key={`top_marquee_${st.uf}_${idx}`}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 border ${
                    st.percent > 0
                      ? 'bg-amber-500/15 border-amber-400/45 text-amber-200'
                      : 'bg-emerald-950/60 border-emerald-500/20 text-emerald-200/80'
                  }`}
                >
                  <BrazilStateFlag uf={st.uf} size="xs" />
                  <span className="font-bold text-white">{st.uf}</span>
                  <span
                    className={`tabular-nums font-semibold ${
                      st.percent > 0 ? 'text-amber-300' : 'text-emerald-300/75'
                    }`}
                  >
                    {formatNum(st.percent, 1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Compact Range Switcher */}
          <div className="hidden lg:flex items-center gap-0.5 p-0.5 rounded bg-black/45 border border-amber-400/20 shrink-0">
            {(['1H', '24H', '7D', '30D'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                  range === r
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-emerald-100/75 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Ultra-Slim Live Summary Line */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] font-mono text-emerald-100/85 border-t border-amber-400/15 pt-1">
          <span>
            {tr('Patrimônio:', 'Equity:')}{' '}
            <strong className="text-amber-300">{formatBRL(totalEquityBRL)}</strong>
          </span>
          <span>
            {tr('Fechamentos de Ações:', 'Share Closings:')}{' '}
            <strong className="text-emerald-300">
              {rollingShareholders.length} {tr('acionistas', 'holders')} · {formatBRL(totalShareSalesBRL)}
            </strong>
          </span>
          <span>
            {tr('Cotação Hoje:', 'Today’s Quote:')}{' '}
            <strong className={latestDailyQuotePercent > 0 ? 'text-emerald-300' : 'text-amber-200'}>
              {latestDailyQuotePercent !== 0
                ? `${latestDailyQuotePercent > 0 ? '+' : ''}${formatNum(latestDailyQuotePercent, 2)}%`
                : tr('0,00% (Mantida anterior)', '0.00% (Held prior)')}
              {todayQuotePayoutBRL > 0 ? ` · ${formatBRL(todayQuotePayoutBRL)}` : ''}
            </strong>
          </span>
        </div>
      </section>
    );
  }

  return (
    <div className="conae-panel rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300/95 font-medium">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span>
              {tr(
                'Valor das Ações CNEC · Painel Tesouro & Contabilidade',
                'CNEC Shares Value · Equity Treasury & Accounting Panel'
              )}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-400/35 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              {tr('Cotação Diária', 'Daily Quote')}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-white">
              R$ {formatNum(activePrice, 2)}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold font-mono ${
                liveDeltaPercent > 0
                  ? 'text-emerald-400'
                  : liveDeltaPercent < 0
                  ? 'text-red-300'
                  : 'text-amber-200'
              }`}
            >
              {liveDeltaPercent > 0 && <ArrowUpRight className="w-3.5 h-3.5" />}
              {liveDeltaPercent < 0 && <ArrowDownRight className="w-3.5 h-3.5" />}
              {liveDeltaPercent === 0 && <Minus className="w-3.5 h-3.5" />}
              {liveDeltaPercent > 0 ? '+' : ''}
              {formatNum(liveDeltaPercent, 2)}% {tr('(base R$ 5,00)', '(R$ 5.00 base)')}
            </span>
          </div>
          <p className="text-xs text-emerald-100/65 mt-0.5">
            {isEn ? currentSeries.labelEn : currentSeries.labelPt} ·{' '}
            {quotationMath?.todayHasPurchase
              ? tr(
                  `Venda hoje: +${formatNum(quotationMath.todayAppliedPercent, 2)}% (${activeStatesCount}/27 estados · ${rollingShareholders.length} acionistas cotados)`,
                  `Today’s sales: +${formatNum(quotationMath.todayAppliedPercent, 2)}% (${activeStatesCount}/27 states · ${rollingShareholders.length} quoted holders)`
                )
              : tr(
                  `Sem compra hoje: mantida cotação do dia anterior (${activeStatesCount}/27 estados · ${rollingShareholders.length} acionistas)`,
                  `No purchase today: prior day quote held (${activeStatesCount}/27 states · ${rollingShareholders.length} holders)`
                )}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-black/40 border border-amber-400/20">
          {(['1H', '24H', '7D', '30D'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                range === r
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-emerald-100/75 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Live Daily Accounting Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="rounded-lg bg-black/45 border border-amber-400/25 px-3 py-2">
          <p className="text-[10px] text-emerald-200/70">
            {tr('Valor do Patrimônio', 'Equity Value')}
          </p>
          <p className="font-mono font-bold text-amber-300 tabular-nums mt-0.5">
            {formatBRL(totalEquityBRL)}
          </p>
        </div>
        <div className="rounded-lg bg-black/45 border border-emerald-400/25 px-3 py-2">
          <p className="text-[10px] text-emerald-200/70">
            {tr('Ações à Venda (Patrimônio)', 'Shares For Sale')}
          </p>
          <p className="font-mono font-bold text-white tabular-nums mt-0.5">
            {totalSharesForSale.toLocaleString(numLocale)} {tr('ações', 'shares')}
          </p>
        </div>
        <div className="rounded-lg bg-black/45 border border-amber-400/25 px-3 py-2">
          <p className="text-[10px] text-emerald-200/70">
            {tr('Ações Compradas (%)', 'Purchased Shares (%)')}
          </p>
          <p className="font-mono font-bold text-emerald-300 tabular-nums mt-0.5">
            {totalSharesSold.toLocaleString(numLocale)} ({formatNum(sharesCapitalPercent, 2)}%)
          </p>
        </div>
        <div className="rounded-lg bg-black/45 border border-emerald-400/25 px-3 py-2">
          <p className="text-[10px] text-emerald-200/70">
            {tr('Cotação do Dia (Vendas Hoje)', 'Daily Quote (Today’s Sales)')}
          </p>
          <p className="font-mono font-bold text-amber-300 tabular-nums mt-0.5">
            {latestDailyQuotePercent !== 0
              ? `${latestDailyQuotePercent > 0 ? '+' : ''}${formatNum(latestDailyQuotePercent, 2)}%`
              : tr('0,00% · Mantida', '0.00% · Held')}
            {todayQuotePayoutBRL > 0
              ? ` · ${formatBRL(todayQuotePayoutBRL)}`
              : todayVolumeBRL > 0
              ? ` · ${formatBRL(todayVolumeBRL)}`
              : totalShareSalesBRL > 0
              ? ` · ${formatBRL(totalShareSalesBRL)}`
              : ''}
          </p>
        </div>
      </div>

      {/* Main Split: Animated Moving Chart + Rolling Shareholders + Rolling 27 State Flags INSIDE Chart Box (Left) + All 27 States Grid (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
        <div className="md:col-span-7 flex flex-col justify-between rounded-lg bg-black/40 border border-emerald-500/25 p-2.5 space-y-2 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-emerald-200/80 px-1 gap-2">
            <span className="inline-flex items-center gap-1 text-amber-300">
              <span className="w-2 h-0.5 bg-amber-400 inline-block" />
              {tr('Valor das Ações CNEC', 'CNEC Shares Value')}
            </span>
            <span className="text-amber-300/90 text-right">
              {tr('Cotação em Tempo Real (%)', 'Real-Time Quote (%)')}
            </span>
          </div>

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible"
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id={`cnecGrad_${gradId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.42" />
                <stop offset="55%" stopColor="#10b981" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#050907" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75].map((pct) => (
              <line
                key={pct}
                x1={12}
                x2={svgWidth - 12}
                y1={svgHeight * pct}
                y2={svgHeight * pct}
                stroke="rgba(212,175,55,0.12)"
                strokeDasharray="4 4"
              />
            ))}

            <path
              d={areaPath}
              fill={`url(#cnecGrad_${gradId})`}
              className="transition-all duration-700 ease-out"
            />

            <path
              d={linePath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-700 ease-out"
            />

            {linePath && (
              <circle r="3.6" fill="#fef08a" opacity="0.92">
                <animateMotion dur="3.4s" repeatCount="indefinite" path={linePath} />
              </circle>
            )}

            {coords.map((pt, i) => (
              <g key={i}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoverIdx === i ? 5 : 2.4}
                  fill={hoverIdx === i ? '#fde68a' : '#10b981'}
                  stroke="#050907"
                  strokeWidth="1.4"
                  className="transition-all duration-500"
                />
                <rect
                  x={pt.x - 16}
                  y={0}
                  width={32}
                  height={svgHeight}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoverIdx(i)}
                />
              </g>
            ))}

            {lastCoord && (
              <g>
                <circle
                  cx={lastCoord.x}
                  cy={lastCoord.y}
                  r="8"
                  fill="rgba(251, 191, 36, 0.25)"
                  className="animate-ping"
                  style={{ transformOrigin: `${lastCoord.x}px ${lastCoord.y}px` }}
                />
                <circle
                  cx={lastCoord.x}
                  cy={lastCoord.y}
                  r="4.2"
                  fill="#fbbf24"
                  stroke="#050907"
                  strokeWidth="1.5"
                />
              </g>
            )}
          </svg>

          {/* ROLLING BAR INSIDE CHART: ALL Inserted Shareholders / Buyers + Daily Equity Status (% and R$) */}
          {rollingShareholders.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] px-0.5">
                <span className="font-semibold text-amber-300">
                  {tr(
                    'Acionistas na Cotação Diária (clique p/ ver evolução do dia da compra)',
                    'Shareholders in Daily Quote (click for purchase-day evolution)'
                  )}
                </span>
                <span className="font-mono text-emerald-300">
                  {rollingShareholders.length} {tr('pessoas', 'holders')}
                </span>
              </div>
              <div className="marquee-wrapper overflow-hidden rounded-md bg-[#04110b] border border-amber-400/40 py-1.5 px-1">
                <div className="animate-marquee-investors flex items-center gap-2">
                  {(() => {
                    const base =
                      rollingShareholders.length < 4
                        ? [...rollingShareholders, ...rollingShareholders]
                        : rollingShareholders;
                    return [...base, ...base].map((h, idx) => (
                      <button
                        key={`chart_holder_${h.id}_${idx}`}
                        type="button"
                        onClick={() => setSelectedHolderId((prev) => (prev === h.id ? null : h.id))}
                        className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 border text-left transition-colors cursor-pointer shrink-0 ${
                          selectedHolderId === h.id
                            ? 'bg-emerald-900/90 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                            : h.equityStatus === 'up'
                            ? 'bg-emerald-950/75 border-emerald-400/45 hover:border-amber-300'
                            : h.equityStatus === 'down'
                            ? 'bg-red-950/60 border-red-400/45 hover:border-amber-300'
                            : 'bg-black/65 border-amber-400/35 hover:border-amber-300'
                        }`}
                      >
                        <img
                          src={h.photoUrl}
                          alt={h.name}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover border border-amber-400/80 shrink-0"
                        />
                        <div className="leading-tight">
                          <div className="flex items-center gap-1">
                            <BrazilStateFlag uf={h.state} size="xs" />
                            <span className="text-[11px] font-bold text-white whitespace-nowrap">
                              {h.name}
                            </span>
                            <span className="text-[9.5px] font-mono text-amber-300 whitespace-nowrap">
                              · {h.sharesCount.toLocaleString(numLocale)} {tr('ações', 'sh')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[9.5px] font-mono tabular-nums mt-0.5 whitespace-nowrap">
                            <span className="text-white font-semibold">
                              {formatBRL(h.currentEquityBRL)}
                            </span>
                            <span
                              className={`font-bold ${
                                h.equityStatus === 'up'
                                  ? 'text-emerald-300'
                                  : h.equityStatus === 'down'
                                  ? 'text-red-300'
                                  : 'text-amber-200/85'
                              }`}
                            >
                              {renderStatusText(h)}
                            </span>
                          </div>
                        </div>
                      </button>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ROLLING BAR INSIDE CHART: All 27 Brazilian State Flags & Percentages */}
          {orderedMarqueeStats.length > 0 && (
            <div className="marquee-wrapper overflow-hidden rounded-md bg-emerald-950/60 border border-amber-400/25 py-1.5 px-1">
              <div className="animate-marquee-flags flex items-center gap-3">
                {[...orderedMarqueeStats, ...orderedMarqueeStats].map((st, idx) => (
                  <div
                    key={`${st.uf}_${idx}`}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono shrink-0 border ${
                      st.percent > 0
                        ? 'bg-amber-500/15 border-amber-400/45 text-amber-200'
                        : 'bg-black/40 border-emerald-500/20 text-emerald-200/75'
                    }`}
                  >
                    <BrazilStateFlag uf={st.uf} size="xs" />
                    <span className="font-bold text-white">{st.uf}</span>
                    <span
                      className={`tabular-nums font-semibold ${
                        st.percent > 0 ? 'text-amber-300' : 'text-emerald-300/70'
                      }`}
                    >
                      {formatNum(st.percent, 1)}%
                    </span>
                    <span className="text-[9px] text-emerald-100/60">
                      {st.percent > 0 ? '▲' : tr('· Em cotação', '· Quoting')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: All 27 Brazilian State Flags + Live Percentages */}
        <div className="md:col-span-5 conae-panel-soft rounded-lg p-2.5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between gap-1 border-b border-amber-400/20 pb-1.5">
            <span className="text-[11px] font-bold text-amber-300 truncate">
              {tr('Bandeiras dos 27 Estados (%)', 'All 27 State Flags (%)')}
            </span>
            <span className="text-[10px] font-mono text-emerald-300 shrink-0">
              {activeStatesCount}/27 {tr('ativos', 'active')}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 max-h-[245px] overflow-y-auto conae-scroll pr-0.5">
            {stateStats.map((st) => {
              const hasSales = st.percent > 0;
              return (
                <div
                  key={st.uf}
                  title={
                    hasSales
                      ? `${st.name} (${st.uf}): ${formatNum(st.percent, 1)}%`
                      : tr(
                          `${st.name} (${st.uf}): 0,0% — Cotação em andamento`,
                          `${st.name} (${st.uf}): 0.0% — Quote in progress`
                        )
                  }
                  className={`relative overflow-hidden rounded px-1.5 py-1 border transition-colors ${
                    hasSales
                      ? 'bg-amber-500/15 border-amber-400/50'
                      : 'bg-black/40 border-emerald-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <BrazilStateFlag uf={st.uf} size="xs" />
                      <span className="text-[10px] font-bold text-white leading-none">{st.uf}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold tabular-nums leading-none ${
                        hasSales ? 'text-amber-300' : 'text-emerald-200/70'
                      }`}
                    >
                      {formatNum(st.percent, 1)}%
                    </span>
                  </div>

                  <div className="mt-1 h-0.5 w-full rounded-full bg-black/60 overflow-hidden">
                    {hasSales ? (
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-700"
                        style={{ width: `${Math.min(100, Math.max(10, st.percent))}%` }}
                      />
                    ) : (
                      <div className="h-full w-1/3 bg-emerald-400/45 treasury-waiting-bar" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-emerald-100/70 leading-tight">
            {tr(
              'Cotação, fechamentos de compra e bandeiras atualizados em tempo real.',
              'Quotes, share closings, and state flags updated in real time.'
            )}
          </p>
        </div>
      </div>

      {/* Interactive Per-Shareholder Purchase-Day-to-Today Chart Drawer (when clicked from rolling bar) */}
      {selectedHolder && selectedHolderChart && (
        <div className="rounded-xl bg-[#04110b] border border-amber-400/55 p-3.5 space-y-2.5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/20 pb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={selectedHolder.photoUrl}
                alt={selectedHolder.name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover border-2 border-amber-400 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-white truncate">
                  {selectedHolder.name} ·{' '}
                  <span className="text-amber-300">
                    {tr('Valorização do Dia da Compra até Hoje', 'Valuation from Purchase Day to Today')}
                  </span>
                </p>
                <p className="text-[10.5px] font-mono text-emerald-200/80 flex items-center gap-1.5 flex-wrap">
                  <BrazilStateFlag uf={selectedHolder.state} size="xs" />
                  <span>{selectedHolder.state}</span>
                  <span>·</span>
                  <span>
                    {selectedHolder.sharesCount.toLocaleString(numLocale)} {tr('ações', 'shares')}
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-300" />
                    {formatDateBR(selectedHolder.purchaseDate)} → {tr('Hoje', 'Today')}
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedHolderId(null)}
              aria-label={tr('Fechar detalhe do acionista', 'Close shareholder detail')}
              className="p-1 rounded bg-black/55 border border-amber-400/30 text-emerald-200 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-7 rounded-lg bg-black/55 border border-emerald-400/25 p-2">
              <svg
                viewBox={`0 0 ${selectedHolderChart.w} ${selectedHolderChart.h}`}
                className="w-full h-auto overflow-visible"
              >
                <defs>
                  <linearGradient id={`shGrad_${gradId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#050907" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {selectedHolderChart.area && (
                  <path d={selectedHolderChart.area} fill={`url(#shGrad_${gradId})`} />
                )}
                <path
                  d={selectedHolderChart.d}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {selectedHolderChart.pts.map((pt, i) => (
                  <circle
                    key={`sh_pt_${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={i === selectedHolderChart.pts.length - 1 ? 3.8 : 2.3}
                    fill={pt.increased ? '#10b981' : '#fde047'}
                    stroke="#050907"
                    strokeWidth="1"
                  />
                ))}
              </svg>
            </div>

            <div className="md:col-span-5 space-y-1.5 font-mono text-[11px] tabular-nums">
              <div className="flex justify-between rounded bg-black/50 px-2.5 py-1.5 border border-white/10">
                <span className="text-emerald-200/75 font-sans">{tr('Valor na Compra', 'Initial Value')}</span>
                <strong className="text-white">{formatBRL(selectedHolder.initialEquityBRL)}</strong>
              </div>
              <div className="flex justify-between rounded bg-black/50 px-2.5 py-1.5 border border-emerald-400/30">
                <span className="text-emerald-200/75 font-sans">{tr('Valor Hoje', 'Value Today')}</span>
                <strong className="text-emerald-300">{formatBRL(selectedHolder.currentEquityBRL)}</strong>
              </div>
              <div className="flex justify-between rounded bg-amber-950/40 px-2.5 py-1.5 border border-amber-400/35">
                <span className="text-amber-200 font-sans">{tr('Resultado', 'Result')}</span>
                <strong
                  className={
                    selectedHolder.equityStatus === 'up'
                      ? 'text-emerald-300'
                      : selectedHolder.equityStatus === 'down'
                      ? 'text-red-300'
                      : 'text-amber-200'
                  }
                >
                  {renderStatusText(selectedHolder)}
                </strong>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedHolder.dailyTimeline.map((st, idx) => (
              <div
                key={`step_${idx}`}
                className="rounded bg-black/55 border border-white/10 px-2 py-1 text-[10px] font-mono tabular-nums"
              >
                <span className="text-emerald-200/75">{st.label}:</span>{' '}
                <strong className="text-white">{formatBRL(st.equityBRL)}</strong>{' '}
                <span
                  className={
                    st.cumulativeDeltaBRL > 0.005
                      ? 'text-emerald-300'
                      : st.cumulativeDeltaBRL < -0.005
                      ? 'text-red-300'
                      : 'text-amber-200/80'
                  }
                >
                  ({st.cumulativeDeltaPercent > 0 ? '+' : ''}
                  {formatNum(st.cumulativeDeltaPercent, 2)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clean end of CnecChart */}
    </div>
  );
};
