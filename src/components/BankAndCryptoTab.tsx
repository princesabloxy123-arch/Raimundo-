import React, { useState } from 'react';
import {
  Coins,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { INVESTMENT_PACKAGES } from '../data/conaeSeed';
import { useLanguage } from '../i18n/LanguageContext';
import type {
  ExecutivePix,
  InvestmentPackage,
  PackageOrder,
  PartnerHotel,
  UsdInvestment,
  UserProfile,
} from '../types';
import { CnecChart } from './CnecChart';
import { VirtualCard } from './VirtualCard';
import { PixInterModal, SAMUEL_EXECUTIVE_PIX } from './PixInterModal';
import { HotelGpsGalleryPanel } from './HotelGpsGalleryPanel';
import type {
  QuotationMathBreakdown,
  ShareholderValuationRecord,
  StateTreasuryStat,
  TreasuryBuyerHighlight,
} from '../utils/treasuryStateStats';

interface BankAndCryptoTabProps {
  profile: UserProfile | null;
  hotels?: PartnerHotel[];
  executivePixList: ExecutivePix[];
  userOrders: PackageOrder[];
  userUsdInvestments: UsdInvestment[];
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
  onCreatePackageOrder: (params: {
    pkg: InvestmentPackage;
    paymentMethod: 'PIX_INTER' | 'PIX_MULTI' | 'CONTA_GLOBAL_USD' | 'DERIV_P2P';
    executivePix: ExecutivePix;
    contactEmail?: string;
  }) => Promise<void>;
  onCreateUsdInvestment: (params: {
    amountUSD: number;
    quoteBRL: number;
    platform: 'DERIV_P2P' | 'INTER_GLOBAL' | 'CDB_INTER';
  }) => Promise<void>;
  onGenerateBankToken: () => Promise<string>;
  onRequireAuth: () => void;
  onGoToHotels?: () => void;
}

export const BankAndCryptoTab: React.FC<BankAndCryptoTabProps> = ({
  profile,
  hotels = [],
  userOrders,
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
  onCreatePackageOrder,
  onRequireAuth,
  onGoToHotels,
}) => {
  const { isEn, tr, translateDynamic } = useLanguage();
  const numLocale = isEn ? 'en-US' : 'pt-BR';
  const [selectedPkg, setSelectedPkg] = useState<InvestmentPackage | null>(null);
  const [submittingPkg, setSubmittingPkg] = useState(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const hasPendingOrder = userOrders.some((o) => o.status === 'pending');
  const operatingQuotePercent =
    latestDailyQuotePercent !== 0
      ? latestDailyQuotePercent
      : Number((8.93 + valuationBoostPercent).toFixed(2));
  const operatingYieldBRL =
    todayQuotePayoutBRL > 0
      ? todayQuotePayoutBRL
      : totalEquityBRL > 0
      ? Number(((totalEquityBRL * Math.max(0, operatingQuotePercent)) / 100).toFixed(2))
      : 0;
  const operatingSharesCount = totalSharesForSale > 0 ? totalSharesForSale : totalSharesSold;
  const formattedQuotePercent = isEn
    ? operatingQuotePercent.toFixed(2)
    : operatingQuotePercent.toFixed(2).replace('.', ',');

  const handleOpenPackageCheckout = (pkg: InvestmentPackage) => {
    if (!profile) {
      onRequireAuth();
      return;
    }
    setSelectedPkg(pkg);
  };

  const handleConfirmPackageOrder = async (contactEmail: string) => {
    if (!selectedPkg) return;
    const samuelPix: ExecutivePix = {
      id: SAMUEL_EXECUTIVE_PIX.id,
      executiveName: SAMUEL_EXECUTIVE_PIX.executiveName,
      executiveRole: SAMUEL_EXECUTIVE_PIX.executiveRole,
      bankName: SAMUEL_EXECUTIVE_PIX.bankName,
      pixKey: SAMUEL_EXECUTIVE_PIX.pixKeyDisplay,
      pixType: SAMUEL_EXECUTIVE_PIX.pixType,
      city: SAMUEL_EXECUTIVE_PIX.city,
      active: true,
    };

    setSubmittingPkg(true);
    setStatusMessage(null);
    try {
      await onCreatePackageOrder({
        pkg: selectedPkg,
        paymentMethod: 'PIX_INTER',
        executivePix: samuelPix,
        contactEmail,
      });
      setStatusMessage(
        tr(
          `Solicitação do "${selectedPkg.name}" enviada ao Executivo Samuel! Após a confirmação do PIX, seu acesso será liberado e o Cartão para os Hotéis será enviado para ${contactEmail}.`,
          `Request for "${translateDynamic(selectedPkg.name)}" sent to Executive Samuel! After PIX confirmation, your access will be unlocked and your Hotel Card will be sent to ${contactEmail}.`
        )
      );
      setSelectedPkg(null);
    } finally {
      setSubmittingPkg(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24">
        <HotelGpsGalleryPanel hotels={hotels} onGoToHotels={onGoToHotels} />
      </div>

      <div className="lg:col-span-8 xl:col-span-9 space-y-6">
        {statusMessage && (
        <div className="rounded-lg bg-emerald-900/55 border border-amber-400/45 px-4 py-3 text-sm text-emerald-50 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Top Row: Live Patrimony + Virtual Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
          <div className="conae-panel rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-amber-300 font-medium">
                  {tr('Banco de Ações CONAE', 'CONAE Equity Bank')}
                </p>
                <h2 className="text-2xl font-bold text-white">
                  {tr('Patrimônio & Rendimento em Tempo Real', 'Real-Time Equity & Yield')}
                </h2>
              </div>
              <span className="text-xs font-mono text-emerald-300">
                {tr('Nível:', 'Tier:')} {profile ? translateDynamic(profile.vipTier) : tr('Visitante', 'Visitor')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="conae-panel-soft rounded-lg p-3.5 border border-amber-400/30 space-y-1">
                <p className="text-xs text-amber-300/90 font-medium">
                  {tr('Valor do Patrimônio (Presidência)', 'Equity Value (Presidency)')}
                </p>
                <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white">
                  R$ {totalEquityBRL.toLocaleString(numLocale, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] font-mono text-emerald-200/80">
                  {tr('Ações à venda:', 'Shares for sale:')}{' '}
                  <strong className="text-amber-300">
                    {totalSharesForSale.toLocaleString(numLocale)} {tr('ações', 'shares')}
                  </strong>
                  {(profile?.balanceBRL ?? 0) > 0 && (
                    <span className="block text-[10px] text-emerald-300/80 mt-0.5">
                      {tr('Seu saldo:', 'Your balance:')} R${' '}
                      {(profile?.balanceBRL ?? 0).toLocaleString(numLocale, { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </p>
              </div>
              <div className="conae-panel-soft rounded-lg p-3.5 border border-emerald-400/35 space-y-1">
                <div className="flex items-center justify-between gap-1.5">
                  <p className="text-xs text-emerald-300 font-medium">
                    {tr('Nossas Ações Operando na Cota', 'Our Shares Operating on Quote')}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    {tr('Ativo', 'Live')}
                  </span>
                </div>
                <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-emerald-300">
                  {operatingQuotePercent > 0 ? '+' : ''}
                  {formattedQuotePercent}%{' '}
                  <span className="text-xs font-semibold text-amber-300">
                    · R$ {shareUnitPriceBRL.toLocaleString(numLocale, { minimumFractionDigits: 2 })}
                  </span>
                </p>
                <p className="text-[11px] font-mono text-emerald-100/85">
                  {operatingSharesCount > 0
                    ? `${operatingSharesCount.toLocaleString(numLocale)} ${tr('ações operando', 'shares operating')}`
                    : `${(profile?.cnecTokens ?? 0).toLocaleString(numLocale, { minimumFractionDigits: 2 })} CNEC`}
                  {operatingYieldBRL > 0 && (
                    <span className="text-amber-300">
                      {' '}
                      · +R$ {operatingYieldBRL.toLocaleString(numLocale, { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <CnecChart
            compact
            stateStats={stateStats}
            totalSalesCount={totalSalesCount}
            activeStatesCount={activeStatesCount}
            totalEquityBRL={totalEquityBRL}
            totalShareSalesBRL={totalShareSalesBRL}
            totalSharesSold={totalSharesSold}
            totalSharesForSale={totalSharesForSale}
            todayVolumeBRL={todayVolumeBRL}
            latestDailyQuotePercent={latestDailyQuotePercent}
            todayQuotePayoutBRL={todayQuotePayoutBRL}
            executiveEntriesCount={executiveEntriesCount}
            valuationBoostPercent={valuationBoostPercent}
            shareUnitPriceBRL={shareUnitPriceBRL}
            buyerHighlights={buyerHighlights}
            shareholderValuations={shareholderValuations}
            quotationMath={quotationMath}
            onBuyPackageClick={() => handleOpenPackageCheckout(INVESTMENT_PACKAGES[0])}
          />
        </div>

        <div className="lg:col-span-5 flex flex-col justify-start space-y-5">
          <VirtualCard
            profile={profile}
            hasPendingOrder={hasPendingOrder}
            onRequestPackage={() => handleOpenPackageCheckout(INVESTMENT_PACKAGES[0])}
          />
        </div>
      </div>

      {/* Investment Packages */}
      <div className="space-y-3">
        <div>
          <p className="text-xs text-amber-300 font-medium">
            {tr('Ações, Cotas em Hotéis, Cursos & Cartão Virtual', 'Shares, Hotel Quotas, Courses & Virtual Card')}
          </p>
          <h3 className="text-xl font-bold text-white">
            {tr('Pacotes do Banco de Ações CONAE', 'CONAE Equity Bank Packages')}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INVESTMENT_PACKAGES.map((pkg) => (
            <div key={pkg.id} className="conae-panel rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-200/75">{translateDynamic(pkg.audience)}</span>
                  <span className="font-mono font-semibold text-amber-300">
                    {tr(`Nível ${translateDynamic(pkg.vipTierGrant)}`, `${translateDynamic(pkg.vipTierGrant)} Tier`)}
                  </span>
                </div>
                <h4 className="text-lg font-semibold text-white">{translateDynamic(pkg.name)}</h4>
                <p className="text-2xl font-bold font-mono tabular-nums text-amber-300">
                  {translateDynamic(pkg.monthlyLabel)}
                </p>
                <p className="text-xs text-emerald-300 font-medium">{translateDynamic(pkg.hotelStarsAccess)}</p>
                <ul className="space-y-1.5 text-xs text-emerald-100/80 pt-1">
                  {pkg.highlights.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{translateDynamic(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleOpenPackageCheckout(pkg)}
                className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-semibold text-xs sm:text-sm hover:from-amber-400 hover:to-amber-300 transition-colors cursor-pointer"
              >
                {tr('Solicitar Pacote via PIX', 'Request Package via PIX')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* User's Recent Package Orders */}
      <div className="conae-panel rounded-xl p-5 space-y-2.5">
        <p className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5" />
          <span>{tr('Minhas Solicitações Recentes', 'My Recent Requests')}</span>
        </p>
        {userOrders.length === 0 ? (
          <p className="text-xs text-emerald-100/60">
            {tr(
              'Nenhuma solicitação registrada ainda. Selecione um pacote acima.',
              'No requests submitted yet. Select a package above.'
            )}
          </p>
        ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {userOrders.slice(0, 6).map((ord) => (
                  <div
                    key={ord.id}
                    className="flex items-center justify-between text-xs bg-black/35 border border-amber-400/15 rounded-lg px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{translateDynamic(ord.packageName)}</p>
                      <p className="text-[11px] text-emerald-200/65 truncate font-mono">
                        {tr('Cód:', 'Code:')} {ord.id} · {ord.executiveName || tr('Presidência', 'Presidency')} · R$ {ord.amountBRL}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-mono font-semibold shrink-0 ${
                        ord.status === 'approved'
                          ? 'text-emerald-400'
                          : ord.status === 'rejected'
                          ? 'text-red-400'
                          : 'text-amber-300'
                      }`}
                    >
                      {ord.status === 'approved' ? tr('Aprovado', 'Approved') : ord.status === 'rejected' ? tr('Recusado', 'Rejected') : tr('Pendente', 'Pending')}
                    </span>
                  </div>
                ))}
              </div>
        )}
      </div>

      {/* Executivo Samuel PIX CPF Checkout Modal */}
      <PixInterModal
        isOpen={Boolean(selectedPkg)}
        onClose={() => setSelectedPkg(null)}
        amountBRL={selectedPkg?.amountBRL || 0}
        title={selectedPkg?.name || tr('Solicitação CONAE', 'CONAE Request')}
        userName={profile?.displayName || tr('Filiado CONAE', 'CONAE Affiliate')}
        defaultEmail={profile?.email || ''}
        onConfirmRequest={handleConfirmPackageOrder}
        submitting={submittingPkg}
      />
      </div>
    </div>
  );
};
