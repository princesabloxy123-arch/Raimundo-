import { BRAZILIAN_STATES, CONAE_ASSETS } from '../data/conaeSeed';
import { BRAZILIAN_STATE_NAMES } from '../components/BrazilStateFlag';
import type {
  PackageOrder,
  PublicAffiliate,
  ShareholderOrder,
  ShareholderTreeNode,
  TreasuryEntry,
  UsdInvestment,
  UserProfile,
} from '../types';

export interface StateTreasuryStat {
  uf: string;
  name: string;
  salesCount: number;
  volumeBRL: number;
  percent: number;
  waitingForSale: boolean;
}

const VIP_TIER_WEIGHT_BRL: Record<string, number> = {
  Padrao: 0,
  Prata: 600,
  Ouro: 1800,
  Diamante: 4500,
};

export const BASE_CNEC_PRICE_BRL = 5.0;
export const TOTAL_SHARES_CAPITAL = 100000;
export const BASE_CAPITAL_BRL = TOTAL_SHARES_CAPITAL * BASE_CNEC_PRICE_BRL; // R$ 500.000,00

export interface TreasuryBuyerHighlight {
  id: string;
  buyerName: string;
  buyerPhotoUrl?: string;
  state: string;
  sharesCount: number;
  amountBRL: number;
  entryDate: string;
}

export interface DailyQuoteDayRecord {
  date: string;
  label: string;
  openingPriceBRL: number;
  purchasesBRL: number;
  sharesSold: number;
  buyersCount: number;
  salePercent: number;
  manualQuotePercent: number;
  appliedDayPercent: number;
  closingPriceBRL: number;
  hadPurchase: boolean;
}

export interface ShareholderDailyStep {
  date: string;
  label: string;
  indexPriceBRL: number;
  dayChangePercent: number;
  equityBRL: number;
  cumulativeDeltaBRL: number;
  cumulativeDeltaPercent: number;
  increased: boolean;
  carriedOver: boolean;
}

export interface ShareholderSourceRef {
  collection: 'treasury_ledger' | 'shareholder_tree' | 'shareholder_orders' | 'package_orders';
  docId: string;
}

export interface ShareholderValuationRecord {
  id: string;
  name: string;
  photoUrl: string;
  state: string;
  sourceLabel: string;
  purchaseDate: string;
  daysHeld: number;
  sharesCount: number;
  sharePercent: number;
  initialEquityBRL: number;
  purchaseIndexPriceBRL: number;
  currentIndexPriceBRL: number;
  currentEquityBRL: number;
  totalDeltaBRL: number;
  totalDeltaPercent: number;
  dailyDeltaBRL: number;
  dailyDeltaPercent: number;
  equityStatus: 'up' | 'down' | 'flat';
  dailyTimeline: ShareholderDailyStep[];
  sourceRefs?: ShareholderSourceRef[];
}

export interface QuotationMathBreakdown {
  basePriceBRL: number;
  baseCapitalBRL: number;
  totalSharesCapital: number;
  previousDayPriceBRL: number;
  todayPurchasesBRL: number;
  todaySharesSold: number;
  todayBuyersCount: number;
  todaySalePercent: number;
  todayManualQuotePercent: number;
  todayAppliedPercent: number;
  todayHasPurchase: boolean;
  allPurchasesTotalBRL: number;
  recordedExecutiveTotalBRL: number;
  totalEquityBRL: number;
  totalShareSalesBRL: number;
  totalSharesSold: number;
  equityFactorPercent: number;
  sharesFactorPercent: number;
  dailyQuoteFactorPercent: number;
  valuationBoostPercent: number;
  currentUnitPriceBRL: number;
  quoteHistoryCount: number;
  todayIso: string;
  dailyLedger: DailyQuoteDayRecord[];
}

function parseIsoDateFromUnknown(val: unknown, fallbackIso: string): string {
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val.trim())) {
    return val.trim().slice(0, 10);
  }
  if (val && typeof val === 'object') {
    const asObj = val as { toDate?: () => Date; seconds?: number };
    if (typeof asObj.toDate === 'function') {
      const d = asObj.toDate();
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    if (typeof asObj.seconds === 'number') {
      const d = new Date(asObj.seconds * 1000);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }
  return fallbackIso;
}

function formatShortDateBR(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + days));
  return dt.toISOString().slice(0, 10);
}

function diffDaysIso(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  const a = Date.UTC(fy, (fm || 1) - 1, fd || 1);
  const b = Date.UTC(ty, (tm || 1) - 1, td || 1);
  return Math.max(0, Math.round((b - a) / 86400000));
}

interface DayPurchaseBucket {
  purchasesBRL: number;
  sharesSold: number;
  buyersCount: number;
  manualQuotePercent: number;
}

export function computeTreasuryStateStats(params: {
  usersList?: UserProfile[];
  publicAffiliates?: PublicAffiliate[];
  ordersList?: PackageOrder[];
  usdList?: UsdInvestment[];
  shareholderOrders?: ShareholderOrder[];
  shareholderTree?: ShareholderTreeNode[];
  treasuryEntries?: TreasuryEntry[];
  currentProfile?: UserProfile | null;
}): {
  states: StateTreasuryStat[];
  totalSalesCount: number;
  totalVolumeBRL: number;
  activeStatesCount: number;
  totalEquityBRL: number;
  totalShareSalesBRL: number;
  totalSharesSold: number;
  totalSharesForSale: number;
  todayVolumeBRL: number;
  todayEntriesCount: number;
  latestDailyQuotePercent: number;
  todayQuotePayoutBRL: number;
  executiveEntriesCount: number;
  valuationBoostPercent: number;
  shareUnitPriceBRL: number;
  buyerHighlights: TreasuryBuyerHighlight[];
  shareholderValuations: ShareholderValuationRecord[];
  quotationMath: QuotationMathBreakdown;
} {
  const {
    usersList = [],
    publicAffiliates = [],
    ordersList = [],
    usdList = [],
    shareholderOrders = [],
    shareholderTree = [],
    treasuryEntries = [],
    currentProfile = null,
  } = params;

  const userStateByUid = new Map<string, string>();
  const userPhotoByUid = new Map<string, string>();
  for (const u of usersList) {
    if (u.uid && u.state) userStateByUid.set(u.uid, u.state.toUpperCase());
    if (u.uid && u.photoUrl) userPhotoByUid.set(u.uid, u.photoUrl);
  }
  for (const aff of publicAffiliates) {
    if (aff.uid && aff.state && !userStateByUid.has(aff.uid)) {
      userStateByUid.set(aff.uid, aff.state.toUpperCase());
    }
    if (aff.uid && aff.photoUrl && !userPhotoByUid.has(aff.uid)) {
      userPhotoByUid.set(aff.uid, aff.photoUrl);
    }
  }
  if (currentProfile?.uid && currentProfile.state) {
    userStateByUid.set(currentProfile.uid, currentProfile.state.toUpperCase());
    if (currentProfile.photoUrl) userPhotoByUid.set(currentProfile.uid, currentProfile.photoUrl);
  }

  const stateTotals = new Map<string, { volumeBRL: number; salesCount: number }>();
  for (const uf of BRAZILIAN_STATES) {
    stateTotals.set(uf, { volumeBRL: 0, salesCount: 0 });
  }

  const addSale = (rawUf: string | undefined, amountBRL: number) => {
    const uf = (rawUf || currentProfile?.state || 'GO').toUpperCase();
    const bucket = stateTotals.get(uf);
    if (!bucket || amountBRL <= 0) return;
    bucket.volumeBRL += amountBRL;
    bucket.salesCount += 1;
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const dailyBuckets = new Map<string, DayPurchaseBucket>();

  const getOrCreateDayBucket = (rawDate: string): DayPurchaseBucket => {
    const safeDate =
      /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && rawDate <= todayIso ? rawDate : todayIso;
    let bucket = dailyBuckets.get(safeDate);
    if (!bucket) {
      bucket = { purchasesBRL: 0, sharesSold: 0, buyersCount: 0, manualQuotePercent: 0 };
      dailyBuckets.set(safeDate, bucket);
    }
    return bucket;
  };

  let totalEquityBRL = 0;
  let totalShareSalesBRL = 0;
  let totalSharesSold = 0;
  let totalSharesForSale = 0;
  let todayVolumeBRL = 0;
  let todayEntriesCount = 0;
  let todayQuotePayoutBRL = 0;
  let totalQuotePayoutBRL = 0;
  let executiveEntriesCount = 0;
  let allPurchasesTotalBRL = 0;
  const buyerHighlights: TreasuryBuyerHighlight[] = [];
  const activeTreasuryEntries = treasuryEntries.filter((e) => e.active !== false);

  // 1. Treasury entries (Venda de Ações, Patrimônio & Cotação do Dia)
  for (const entry of activeTreasuryEntries) {
    const amt = Math.max(0, Number(entry.amountBRL) || 0);
    const shares = Math.max(0, Number(entry.sharesCount) || 0);
    const forSale = Math.max(0, Number(entry.sharesForSaleCount) || 0);
    const quotePct = Number(entry.dailyQuotePercent) || 0;
    const quotePayout = Math.max(0, Number(entry.dailyQuotePayoutBRL) || 0);
    const entryDate = parseIsoDateFromUnknown(entry.entryDate, todayIso);
    const safeDate = entryDate <= todayIso ? entryDate : todayIso;

    executiveEntriesCount += 1;
    if (amt > 0) {
      addSale(entry.state, amt);
    } else if (quotePayout > 0) {
      addSale(entry.state, quotePayout);
    }

    if (entry.entryType === 'patrimonio') {
      totalEquityBRL += amt;
    } else if (entry.entryType === 'venda_acoes') {
      totalShareSalesBRL += amt;
    }

    totalSharesSold += shares;
    totalSharesForSale += forSale;
    totalQuotePayoutBRL += quotePayout;

    // Feed real purchase/sale value into that exact day's quotation bucket
    const effectivePurchaseBRL =
      amt > 0 ? amt : entry.entryType === 'venda_acoes' && shares > 0 ? shares * BASE_CNEC_PRICE_BRL : 0;
    const effectiveShares =
      shares > 0
        ? shares
        : effectivePurchaseBRL > 0
        ? Math.max(1, Math.round(effectivePurchaseBRL / BASE_CNEC_PRICE_BRL))
        : 0;

    if (effectivePurchaseBRL > 0 || quotePct !== 0) {
      const dayBucket = getOrCreateDayBucket(safeDate);
      if (effectivePurchaseBRL > 0) {
        dayBucket.purchasesBRL += effectivePurchaseBRL;
        dayBucket.sharesSold += effectiveShares;
        dayBucket.buyersCount += 1;
        allPurchasesTotalBRL += effectivePurchaseBRL;
      }
      if (quotePct !== 0) {
        dayBucket.manualQuotePercent += quotePct;
      }
    }

    if (safeDate === todayIso) {
      todayVolumeBRL += effectivePurchaseBRL;
      todayQuotePayoutBRL += quotePayout;
      todayEntriesCount += 1;
    }

    if (
      (entry.buyerName && entry.buyerName.trim()) ||
      (entry.buyerPhotoUrl && entry.buyerPhotoUrl.trim()) ||
      (entry.entryType === 'venda_acoes' && (shares > 0 || amt > 0))
    ) {
      buyerHighlights.push({
        id: entry.id,
        buyerName: (entry.buyerName && entry.buyerName.trim()) || entry.title,
        buyerPhotoUrl: entry.buyerPhotoUrl,
        state: entry.state || 'GO',
        sharesCount: effectiveShares,
        amountBRL: effectivePurchaseBRL,
        entryDate: safeDate,
      });
    }
  }

  // 2. Package & CNEC purchases (non-rejected)
  for (const ord of ordersList) {
    if (ord.status === 'rejected') continue;
    const amt = Math.max(0, Number(ord.amountBRL) || 0);
    const shares = Math.max(0, Number(ord.cnecAmount) || 0);
    const weight = ord.status === 'approved' ? 1 : 0.9;
    addSale(userStateByUid.get(ord.userId), amt * weight);

    const effectiveAmt = amt > 0 ? amt : shares * BASE_CNEC_PRICE_BRL;
    if (effectiveAmt > 0) {
      const ordDate = parseIsoDateFromUnknown(ord.createdAt, todayIso);
      const safeDate = ordDate <= todayIso ? ordDate : todayIso;
      const dayBucket = getOrCreateDayBucket(safeDate);
      dayBucket.purchasesBRL += effectiveAmt;
      dayBucket.sharesSold +=
        shares > 0 ? shares : Math.max(1, Math.round(effectiveAmt / BASE_CNEC_PRICE_BRL));
      dayBucket.buyersCount += 1;
      allPurchasesTotalBRL += effectiveAmt;
      totalShareSalesBRL += effectiveAmt;
      totalSharesSold +=
        shares > 0 ? shares : Math.max(1, Math.round(effectiveAmt / BASE_CNEC_PRICE_BRL));
      if (safeDate === todayIso) {
        todayVolumeBRL += effectiveAmt;
      }
    }
  }

  // 3. USD & Inter purchases
  for (const inv of usdList) {
    if (inv.status === 'rejected') continue;
    const weight = inv.status === 'approved' ? 1 : 0.9;
    addSale(userStateByUid.get(inv.userId), (inv.amountBRL || 0) * weight);
  }

  // 4. Shareholder 100k-Lot Orders (non-rejected)
  for (const shr of shareholderOrders) {
    if (shr.status === 'rejected') continue;
    const amt = Math.max(0, Number(shr.estimatedValueBRL) || 0);
    const shares = Math.max(0, Number(shr.totalShares) || 0);
    const weight = shr.status === 'approved' ? 1 : 0.9;
    addSale(userStateByUid.get(shr.userId), amt * weight);

    const effectiveAmt = amt > 0 ? amt : shares * BASE_CNEC_PRICE_BRL;
    if (effectiveAmt > 0) {
      const shrDate = parseIsoDateFromUnknown(shr.createdAt, todayIso);
      const safeDate = shrDate <= todayIso ? shrDate : todayIso;
      const dayBucket = getOrCreateDayBucket(safeDate);
      dayBucket.purchasesBRL += effectiveAmt;
      dayBucket.sharesSold +=
        shares > 0 ? shares : Math.max(1, Math.round(effectiveAmt / BASE_CNEC_PRICE_BRL));
      dayBucket.buyersCount += 1;
      allPurchasesTotalBRL += effectiveAmt;
      totalShareSalesBRL += effectiveAmt;
      totalSharesSold +=
        shares > 0 ? shares : Math.max(1, Math.round(effectiveAmt / BASE_CNEC_PRICE_BRL));
      if (safeDate === todayIso) {
        todayVolumeBRL += effectiveAmt;
      }
    }
  }

  // Upgraded non-seed affiliates represent completed package activations visible publicly in state stats
  const usersWithDirectOrder = new Set<string>([
    ...ordersList.filter((o) => o.status !== 'rejected').map((o) => o.userId),
    ...usdList.filter((u) => u.status !== 'rejected').map((u) => u.userId),
    ...shareholderOrders.filter((s) => s.status !== 'rejected').map((s) => s.userId),
  ]);

  for (const aff of publicAffiliates) {
    if (aff.uid.startsWith('seed_')) continue;
    if (usersWithDirectOrder.has(aff.uid)) continue;
    const bonusBRL = VIP_TIER_WEIGHT_BRL[aff.vipTier] || 0;
    if (bonusBRL > 0) {
      addSale(aff.state, bonusBRL);
    }
  }

  let totalVolumeBRL = 0;
  let totalSalesCount = 0;
  let activeStatesCount = 0;
  for (const bucket of stateTotals.values()) {
    totalVolumeBRL += bucket.volumeBRL;
    totalSalesCount += bucket.salesCount;
    if (bucket.volumeBRL > 0) activeStatesCount += 1;
  }

  const states: StateTreasuryStat[] = BRAZILIAN_STATES.map((uf) => {
    const bucket = stateTotals.get(uf) || { volumeBRL: 0, salesCount: 0 };
    const percent =
      totalVolumeBRL > 0
        ? Number(((bucket.volumeBRL / totalVolumeBRL) * 100).toFixed(1))
        : 0;
    return {
      uf,
      name: BRAZILIAN_STATE_NAMES[uf] || uf,
      salesCount: bucket.salesCount,
      volumeBRL: Number(bucket.volumeBRL.toFixed(2)),
      percent,
      waitingForSale: bucket.volumeBRL <= 0,
    };
  });

  // =========================================================================
  // CHRONOLOGICAL DAILY QUOTATION LEDGER (Reset Base = R$ 5,00)
  // - Standard share price: R$ 5,00 (100.000 shares = R$ 500.000,00 base capital)
  // - Whenever someone buys: purchase % = (valorCompra / R$ 500.000,00) * 100
  // - That % is automatically attributed to that day's quotation & added to share price
  // - If NO purchase happens on a day: 0,00% -> price stays EXACTLY equal to previous day
  // =========================================================================
  const eventDates = Array.from(dailyBuckets.keys()).sort();
  const sixDaysAgo = addDaysIso(todayIso, -6);
  const earliestDate =
    eventDates.length > 0 && eventDates[0] < sixDaysAgo ? eventDates[0] : sixDaysAgo;

  // Build ordered dates to walk cleanly (every day in recent window + all exact event dates)
  const dateSet = new Set<string>();
  const totalSpanDays = diffDaysIso(earliestDate, todayIso);
  if (totalSpanDays <= 45) {
    for (let i = 0; i <= totalSpanDays; i++) {
      dateSet.add(addDaysIso(earliestDate, i));
    }
  } else {
    // Include all event dates + day after each event (to show carry-over) + last 14 days
    for (const d of eventDates) {
      dateSet.add(d);
      const nextD = addDaysIso(d, 1);
      if (nextD <= todayIso) dateSet.add(nextD);
    }
    for (let i = 13; i >= 0; i--) {
      dateSet.add(addDaysIso(todayIso, -i));
    }
  }
  dateSet.add(todayIso);
  const chronologicalDates = Array.from(dateSet).sort();

  const dailyLedger: DailyQuoteDayRecord[] = [];
  const priceByDate = new Map<string, DailyQuoteDayRecord>();
  let runningPriceBRL = BASE_CNEC_PRICE_BRL;

  for (const d of chronologicalDates) {
    const bucket = dailyBuckets.get(d);
    const openingPriceBRL = Number(runningPriceBRL.toFixed(4));
    const purchasesBRL = Number((bucket?.purchasesBRL || 0).toFixed(2));
    const sharesSold = Math.round(bucket?.sharesSold || 0);
    const buyersCount = bucket?.buyersCount || 0;
    const manualQuotePercent = Number((bucket?.manualQuotePercent || 0).toFixed(4));

    // Exact automatic percentage of what was purchased on this day relative to R$ 500.000,00 base capital
    const salePercent =
      purchasesBRL > 0 ? Number(((purchasesBRL / BASE_CAPITAL_BRL) * 100).toFixed(4)) : 0;
    const appliedDayPercent = Number((salePercent + manualQuotePercent).toFixed(4));
    const hadPurchase = purchasesBRL > 0 || manualQuotePercent !== 0;

    // Carry-over rule: if NO purchase today, closing price remains IDENTICAL to opening/previous day price!
    const closingPriceBRL = hadPurchase
      ? Number((openingPriceBRL * (1 + appliedDayPercent / 100)).toFixed(4))
      : openingPriceBRL;

    const record: DailyQuoteDayRecord = {
      date: d,
      label: d === todayIso ? `${formatShortDateBR(d)} (Hoje)` : formatShortDateBR(d),
      openingPriceBRL,
      purchasesBRL,
      sharesSold,
      buyersCount,
      salePercent: Number(salePercent.toFixed(2)),
      manualQuotePercent: Number(manualQuotePercent.toFixed(2)),
      appliedDayPercent: Number(appliedDayPercent.toFixed(2)),
      closingPriceBRL,
      hadPurchase,
    };

    dailyLedger.push(record);
    priceByDate.set(d, record);
    runningPriceBRL = closingPriceBRL;
  }

  const todayRecord = dailyLedger[dailyLedger.length - 1] || {
    date: todayIso,
    label: `${formatShortDateBR(todayIso)} (Hoje)`,
    openingPriceBRL: BASE_CNEC_PRICE_BRL,
    purchasesBRL: 0,
    sharesSold: 0,
    buyersCount: 0,
    salePercent: 0,
    manualQuotePercent: 0,
    appliedDayPercent: 0,
    closingPriceBRL: BASE_CNEC_PRICE_BRL,
    hadPurchase: false,
  };

  const previousDayPriceBRL = Number(todayRecord.openingPriceBRL.toFixed(2));
  const shareUnitPriceBRL = Number(todayRecord.closingPriceBRL.toFixed(2));
  const valuationBoostPercent = Number(
    (((todayRecord.closingPriceBRL - BASE_CNEC_PRICE_BRL) / BASE_CNEC_PRICE_BRL) * 100).toFixed(2)
  );
  const latestDailyQuotePercent = Number(todayRecord.appliedDayPercent.toFixed(2));

  // =========================================================================
  // UNIFIED PER-SHAREHOLDER DAILY VALUATION RECORDS (Purchase Day -> Today)
  // - Existing shareholders are quoted daily by the exact % of each day's sales
  // - On days with NO sales (0,00%), their equity stays identical to the previous day
  // =========================================================================
  interface RawHolderAgg {
    id: string;
    name: string;
    photoUrl: string;
    state: string;
    sourceLabel: string;
    purchaseDate: string;
    sharesCount: number;
    sharePercent: number;
    investedBRL: number;
    isExistingTreeHolder?: boolean;
    sourceRefs: ShareholderSourceRef[];
  }

  const holdersMap = new Map<string, RawHolderAgg>();

  const upsertHolder = (item: {
    id: string;
    name: string;
    photoUrl?: string;
    state?: string;
    sourceLabel: string;
    purchaseDate: string;
    sharesCount: number;
    sharePercent?: number;
    investedBRL: number;
    isExistingTreeHolder?: boolean;
    sourceRef?: ShareholderSourceRef;
  }) => {
    const cleanName = item.name.trim();
    if (!cleanName) return;
    const key = cleanName.toLowerCase();
    const existing = holdersMap.get(key);
    const safeDate =
      /^\d{4}-\d{2}-\d{2}$/.test(item.purchaseDate) && item.purchaseDate <= todayIso
        ? item.purchaseDate
        : todayIso;

    if (!existing) {
      holdersMap.set(key, {
        id: item.id,
        name: cleanName,
        photoUrl: item.photoUrl && item.photoUrl.trim() ? item.photoUrl : CONAE_ASSETS.emblemHeart,
        state: (item.state || 'GO').toUpperCase(),
        sourceLabel: item.sourceLabel,
        purchaseDate: safeDate,
        sharesCount: Math.max(0, Math.round(item.sharesCount || 0)),
        sharePercent: Math.max(0, Number(item.sharePercent || 0)),
        investedBRL: Math.max(0, Number(item.investedBRL || 0)),
        isExistingTreeHolder: item.isExistingTreeHolder,
        sourceRefs: item.sourceRef ? [item.sourceRef] : [],
      });
    } else {
      existing.sharesCount += Math.max(0, Math.round(item.sharesCount || 0));
      existing.investedBRL += Math.max(0, Number(item.investedBRL || 0));
      if ((item.sharePercent || 0) > existing.sharePercent) {
        existing.sharePercent = Number(item.sharePercent || 0);
      }
      if (safeDate < existing.purchaseDate) {
        existing.purchaseDate = safeDate;
      }
      if (
        existing.photoUrl === CONAE_ASSETS.emblemHeart &&
        item.photoUrl &&
        item.photoUrl.trim()
      ) {
        existing.photoUrl = item.photoUrl;
      }
      if (
        item.sourceRef &&
        !existing.sourceRefs.some(
          (r) => r.collection === item.sourceRef!.collection && r.docId === item.sourceRef!.docId
        )
      ) {
        existing.sourceRefs.push(item.sourceRef);
      }
    }
  };

  // 1. Treasury buyer entries (every person inserted as buying shares)
  for (const bh of buyerHighlights) {
    upsertHolder({
      id: `val_bh_${bh.id}`,
      name: bh.buyerName,
      photoUrl: bh.buyerPhotoUrl,
      state: bh.state,
      sourceLabel: 'Compra de Ações',
      purchaseDate: bh.entryDate || todayIso,
      sharesCount: bh.sharesCount,
      investedBRL: bh.amountBRL,
      sourceRef: { collection: 'treasury_ledger', docId: bh.id },
    });
  }

  // 2. Existing Shareholder Tree nodes (existing shareholders quoted by every new sale %)
  const earliestPurchaseDate = eventDates[0] || todayIso;
  for (const node of shareholderTree) {
    if (node.active === false) continue;
    const rawNodeDate = parseIsoDateFromUnknown(node.createdAt, earliestPurchaseDate);
    const nodeDate = rawNodeDate > earliestPurchaseDate ? earliestPurchaseDate : rawNodeDate;
    const derivedShares =
      node.sharesCount > 0
        ? node.sharesCount
        : Math.max(0, Math.round(((node.sharePercent || 0) / 100) * TOTAL_SHARES_CAPITAL));
    upsertHolder({
      id: `val_tree_${node.id}`,
      name: node.fullName,
      photoUrl: node.photoUrl,
      state: node.state,
      sourceLabel: node.branchTitle || 'Árvore Acionista',
      purchaseDate: nodeDate,
      sharesCount: derivedShares,
      sharePercent: node.sharePercent,
      investedBRL: Number((derivedShares * BASE_CNEC_PRICE_BRL).toFixed(2)),
      isExistingTreeHolder: true,
      sourceRef: { collection: 'shareholder_tree', docId: node.id },
    });
  }

  // 3. 100k-Lot Shareholder Orders (non-rejected)
  for (const shr of shareholderOrders) {
    if (shr.status === 'rejected') continue;
    upsertHolder({
      id: `val_shr_${shr.id}`,
      name: shr.userName,
      photoUrl: userPhotoByUid.get(shr.userId),
      state: userStateByUid.get(shr.userId) || 'GO',
      sourceLabel: `Lote ${shr.divisionLabel}`,
      purchaseDate: parseIsoDateFromUnknown(shr.createdAt, todayIso),
      sharesCount: shr.totalShares,
      sharePercent: shr.percentOwnership,
      investedBRL: shr.estimatedValueBRL,
      sourceRef: { collection: 'shareholder_orders', docId: shr.id },
    });
  }

  // 4. Package Orders with CNEC shares (non-rejected)
  for (const ord of ordersList) {
    if (ord.status === 'rejected') continue;
    if ((ord.cnecAmount || 0) <= 0 && (ord.amountBRL || 0) <= 0) continue;
    upsertHolder({
      id: `val_ord_${ord.id}`,
      name: ord.userName,
      photoUrl: userPhotoByUid.get(ord.userId),
      state: userStateByUid.get(ord.userId) || 'GO',
      sourceLabel: ord.packageName || 'Pacote CNEC',
      purchaseDate: parseIsoDateFromUnknown(ord.createdAt, todayIso),
      sharesCount:
        ord.cnecAmount > 0
          ? ord.cnecAmount
          : Math.round((ord.amountBRL || 0) / BASE_CNEC_PRICE_BRL),
      investedBRL: ord.amountBRL || 0,
      sourceRef: { collection: 'package_orders', docId: ord.id },
    });
  }

  const getOpeningPriceOnDate = (dateIso: string): number => {
    const exact = priceByDate.get(dateIso);
    if (exact) return exact.openingPriceBRL;
    let lastClosing = BASE_CNEC_PRICE_BRL;
    for (const row of dailyLedger) {
      if (row.date < dateIso) lastClosing = row.closingPriceBRL;
      else break;
    }
    return lastClosing;
  };

  const shareholderValuations: ShareholderValuationRecord[] = Array.from(holdersMap.values()).map(
    (h) => {
      const sharesCount =
        h.sharesCount > 0
          ? h.sharesCount
          : Math.max(1, Math.round((h.investedBRL || BASE_CNEC_PRICE_BRL) / BASE_CNEC_PRICE_BRL));
      const sharePercent =
        h.sharePercent > 0
          ? Number(h.sharePercent.toFixed(2))
          : Number(((sharesCount / TOTAL_SHARES_CAPITAL) * 100).toFixed(2));
      const initialEquityBRL = Number(
        (h.investedBRL > 0 ? h.investedBRL : sharesCount * BASE_CNEC_PRICE_BRL).toFixed(2)
      );

      // Opening quotation price at the moment this shareholder entered
      const purchaseIndexPriceBRL = h.isExistingTreeHolder
        ? BASE_CNEC_PRICE_BRL
        : getOpeningPriceOnDate(h.purchaseDate);
      const currentExactPrice = todayRecord.closingPriceBRL;
      const daysHeld = diffDaysIso(h.purchaseDate, todayIso);

      // Select chronological checkpoints from dailyLedger starting at purchaseDate through todayIso
      const relevantDays = dailyLedger.filter(
        (row) => row.date >= h.purchaseDate && row.date <= todayIso
      );
      const slicedDays =
        relevantDays.length > 10
          ? [
              relevantDays[0],
              ...relevantDays
                .slice(1, -1)
                .filter((r, i, arr) => r.hadPurchase || i % Math.max(1, Math.floor(arr.length / 6)) === 0)
                .slice(-8),
              relevantDays[relevantDays.length - 1],
            ]
          : relevantDays;

      const dailyTimeline: ShareholderDailyStep[] = [];
      let prevEquity = initialEquityBRL;

      // Baseline purchase entry point
      dailyTimeline.push({
        date: h.purchaseDate,
        label: `${formatShortDateBR(h.purchaseDate)} (Base)`,
        indexPriceBRL: Number(purchaseIndexPriceBRL.toFixed(2)),
        dayChangePercent: 0,
        equityBRL: initialEquityBRL,
        cumulativeDeltaBRL: 0,
        cumulativeDeltaPercent: 0,
        increased: false,
        carriedOver: false,
      });

      for (const row of slicedDays) {
        const ratio = purchaseIndexPriceBRL > 0 ? row.closingPriceBRL / purchaseIndexPriceBRL : 1;
        const equityBRL = Number((initialEquityBRL * ratio).toFixed(2));
        const cumulativeDeltaBRL = Number((equityBRL - initialEquityBRL).toFixed(2));
        const cumulativeDeltaPercent =
          initialEquityBRL > 0
            ? Number(((cumulativeDeltaBRL / initialEquityBRL) * 100).toFixed(2))
            : 0;
        const dayChangePercent = row.hadPurchase ? row.appliedDayPercent : 0;

        dailyTimeline.push({
          date: row.date,
          label: row.label,
          indexPriceBRL: Number(row.closingPriceBRL.toFixed(2)),
          dayChangePercent,
          equityBRL,
          cumulativeDeltaBRL,
          cumulativeDeltaPercent,
          increased: cumulativeDeltaBRL > 0.005,
          carriedOver: !row.hadPurchase,
        });
        prevEquity = equityBRL;
      }

      const finalRatio = purchaseIndexPriceBRL > 0 ? currentExactPrice / purchaseIndexPriceBRL : 1;
      const currentEquityBRL = Number((initialEquityBRL * finalRatio).toFixed(2));
      const totalDeltaBRL = Number((currentEquityBRL - initialEquityBRL).toFixed(2));
      const totalDeltaPercent =
        initialEquityBRL > 0
          ? Number(((totalDeltaBRL / initialEquityBRL) * 100).toFixed(2))
          : 0;

      // Today's exact daily gain: 0,00% and R$ 0,00 if NO purchase happened today!
      const prevDayRatio =
        purchaseIndexPriceBRL > 0 ? todayRecord.openingPriceBRL / purchaseIndexPriceBRL : 1;
      const prevDayEquityBRL = Number((initialEquityBRL * prevDayRatio).toFixed(2));
      const dailyDeltaPercent = todayRecord.hadPurchase ? todayRecord.appliedDayPercent : 0;
      const dailyDeltaBRL = todayRecord.hadPurchase
        ? Number((currentEquityBRL - prevDayEquityBRL).toFixed(2))
        : 0;

      const equityStatus: 'up' | 'down' | 'flat' =
        totalDeltaBRL > 0.005 ? 'up' : totalDeltaBRL < -0.005 ? 'down' : 'flat';

      // Keep prevEquity referenced cleanly
      void prevEquity;

      return {
        id: h.id,
        name: h.name,
        photoUrl: h.photoUrl,
        state: h.state,
        sourceLabel: h.sourceLabel,
        purchaseDate: h.purchaseDate,
        daysHeld,
        sharesCount,
        sharePercent,
        initialEquityBRL,
        purchaseIndexPriceBRL: Number(purchaseIndexPriceBRL.toFixed(2)),
        currentIndexPriceBRL: shareUnitPriceBRL,
        currentEquityBRL,
        totalDeltaBRL,
        totalDeltaPercent,
        dailyDeltaBRL,
        dailyDeltaPercent,
        equityStatus,
        dailyTimeline,
        sourceRefs: h.sourceRefs,
      };
    }
  );

  shareholderValuations.sort((a, b) => b.currentEquityBRL - a.currentEquityBRL);

  const recordedExecutiveTotalBRL = totalEquityBRL + totalShareSalesBRL;
  const totalAutoSalesPercent = Number(((allPurchasesTotalBRL / BASE_CAPITAL_BRL) * 100).toFixed(2));

  const quotationMath: QuotationMathBreakdown = {
    basePriceBRL: BASE_CNEC_PRICE_BRL,
    baseCapitalBRL: BASE_CAPITAL_BRL,
    totalSharesCapital: TOTAL_SHARES_CAPITAL,
    previousDayPriceBRL,
    todayPurchasesBRL: todayRecord.purchasesBRL,
    todaySharesSold: todayRecord.sharesSold,
    todayBuyersCount: todayRecord.buyersCount,
    todaySalePercent: todayRecord.salePercent,
    todayManualQuotePercent: todayRecord.manualQuotePercent,
    todayAppliedPercent: todayRecord.appliedDayPercent,
    todayHasPurchase: todayRecord.hadPurchase,
    allPurchasesTotalBRL: Number(allPurchasesTotalBRL.toFixed(2)),
    recordedExecutiveTotalBRL: Number(recordedExecutiveTotalBRL.toFixed(2)),
    totalEquityBRL: Number(totalEquityBRL.toFixed(2)),
    totalShareSalesBRL: Number(totalShareSalesBRL.toFixed(2)),
    totalSharesSold,
    equityFactorPercent: totalAutoSalesPercent,
    sharesFactorPercent: Number(((totalSharesSold / TOTAL_SHARES_CAPITAL) * 100).toFixed(2)),
    dailyQuoteFactorPercent: latestDailyQuotePercent,
    valuationBoostPercent,
    currentUnitPriceBRL: shareUnitPriceBRL,
    quoteHistoryCount: dailyLedger.filter((d) => d.hadPurchase).length,
    todayIso,
    dailyLedger,
  };

  return {
    states,
    totalSalesCount,
    totalVolumeBRL: Number(totalVolumeBRL.toFixed(2)),
    activeStatesCount,
    totalEquityBRL: Number(totalEquityBRL.toFixed(2)),
    totalShareSalesBRL: Number(totalShareSalesBRL.toFixed(2)),
    totalSharesSold,
    totalSharesForSale,
    todayVolumeBRL: Number(todayVolumeBRL.toFixed(2)),
    todayEntriesCount,
    latestDailyQuotePercent,
    todayQuotePayoutBRL: Number(
      (todayQuotePayoutBRL > 0 ? todayQuotePayoutBRL : totalQuotePayoutBRL).toFixed(2)
    ),
    executiveEntriesCount,
    valuationBoostPercent,
    shareUnitPriceBRL,
    buyerHighlights,
    shareholderValuations,
    quotationMath,
  };
}
