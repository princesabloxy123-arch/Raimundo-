import React, { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Copy,
  CreditCard,
  Crown,
  Database,
  Download,
  FileUp,
  GitBranch,
  Images,
  KeyRound,
  Landmark,
  Lock,
  LogIn,
  Pencil,
  Percent,
  Scale,
  Search,
  ShieldAlert,
  Store,
  Trash2,
  Unlock,
  Upload,
  UserCog,
  X,
  XCircle,
} from 'lucide-react';
import { BRAZILIAN_STATES, CONAE_ASSETS, EXECUTIVES_TEAM } from '../data/conaeSeed';
import { BOOTSTRAPPED_ADMIN_EMAIL, isPresidentMasterPassword, sha256Hex } from '../firebase';
import { compressImageFile, downloadCsvFile, downloadJsonFile } from '../utils/imageUpload';
import { DEFAULT_BOOKING_PUBLIC, generateHotelBookingToken } from '../utils/bookingTokenHelper';
import { useLanguage } from '../i18n/LanguageContext';
import { SimpleQuotationBoard } from './SimpleQuotationBoard';
import { MandatesAndReportsPanel } from './MandatesAndReportsPanel';
import type {
  QuotationMathBreakdown,
  ShareholderValuationRecord,
} from '../utils/treasuryStateStats';
import { VisitAgentAdminPanel } from './VisitAgentAdminPanel';
import type {
  BenefitPartner,
  BenefitPartnerCategory,
  BookingPublicConfig,
  BookingSecretConfig,
  CourseEnrollment,
  CourseItem,
  CredentialPass,
  ExecutiveMandate,
  ExecutiveMandateArea,
  ExecutiveMandateStatus,
  ExecutivePix,
  HotelBooking,
  PackageOrder,
  PartnerHotel,
  ShareholderOrder,
  ShareholderOrderStatus,
  ShareholderTreeNode,
  SponsorItem,
  TreasuryEntry,
  TreasuryEntryType,
  TreasuryProbabilityTier,
  UsdInvestment,
  UserProfile,
  UserRole,
  VipExecutiveHash,
  VipRoomPublic,
  VipRoomSecret,
  VipTier,
} from '../types';

interface AdminPanelTabProps {
  isAdmin: boolean;
  isLoggedIn: boolean;
  onGoogleLogin: () => Promise<void>;
  usersList: UserProfile[];
  ordersList: PackageOrder[];
  usdList: UsdInvestment[];
  enrollmentsList: CourseEnrollment[];
  bookingsList: HotelBooking[];
  shareholderOrders: ShareholderOrder[];
  executivePixList: ExecutivePix[];
  hotels: PartnerHotel[];
  courses: CourseItem[];
  sponsors: SponsorItem[];
  benefitPartners: BenefitPartner[];
  credentialPasses: CredentialPass[];
  vipExecutiveHashes: VipExecutiveHash[];
  vipPublic: VipRoomPublic | null;
  vipSecret: VipRoomSecret | null;
  onApprovePackageOrder: (order: PackageOrder, approve: boolean) => Promise<void>;
  onApproveUsdInvestment: (inv: UsdInvestment, approve: boolean) => Promise<void>;
  onLookupPackageOrder?: (orderId: string) => Promise<PackageOrder | null>;
  onLookupUsdInvestment?: (invId: string) => Promise<UsdInvestment | null>;
  onUpdateEnrollmentStatus: (enroll: CourseEnrollment, status: 'active' | 'certified') => Promise<void>;
  onUpdateBookingStatus: (booking: HotelBooking, status: 'confirmed' | 'cancelled') => Promise<void>;
  onUpdateShareholderOrder: (
    order: ShareholderOrder,
    params: {
      status: ShareholderOrderStatus;
      notaryCode: string;
      presidentNotes: string;
    }
  ) => Promise<void>;
  onUpdateUserPatrimony: (
    user: UserProfile,
    patch: {
      balanceBRL: number;
      balanceUSD: number;
      cnecTokens: number;
      vipTier: VipTier;
      monthlyPlanActive: boolean;
      virtualCardActive: boolean;
      executiveCardActive: boolean;
      sharesOwned: number;
      sharesNotaryCode: string;
      role: UserRole;
    }
  ) => Promise<void>;
  onDeleteUnpaidUser: (user: UserProfile) => Promise<void>;
  onDeleteAllUnpaidUsers: (targets: UserProfile[]) => Promise<number>;
  onDeleteAnyUser?: (uid: string) => Promise<void>;
  onSaveExecutivePix: (pix: Omit<ExecutivePix, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDeleteExecutivePix: (id: string) => Promise<void>;
  onUpdateVipSettings: (params: {
    monthLabel: string;
    plainPassword: string;
    buySignalTitle: string;
    buySignalAsset: string;
    buySignalTargetBRL: number;
  }) => Promise<void>;
  onCreateHotel: (hotel: Omit<PartnerHotel, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onSaveHotelGpsAndPhotos?: (hotel: PartnerHotel) => Promise<void>;
  onDeleteHotel: (id: string) => Promise<void>;
  onCreateCourse: (course: Omit<CourseItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDeleteCourse: (id: string) => Promise<void>;
  onCreateSponsor: (sponsor: Omit<SponsorItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDeleteSponsor: (id: string) => Promise<void>;
  onCreateBenefitPartner: (partner: Omit<BenefitPartner, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDeleteBenefitPartner: (id: string) => Promise<void>;
  onCreateCredentialPass: (params: {
    targetUid?: string;
    holderName: string;
    holderEmail?: string;
    passType: 'Afiliado' | 'Executivo VIP' | 'Hoteleiro';
    issuedPasswordPlain: string;
    hotelName?: string;
    goldenCardActive: boolean;
    monthlyPaid: boolean;
    notes?: string;
  }) => Promise<void>;
  onDeleteCredentialPass: (id: string) => Promise<void>;
  onSeedDefaultsToFirestore: () => Promise<void>;
  bookingPublic?: BookingPublicConfig | null;
  bookingSecret?: BookingSecretConfig | null;
  onUpdateBookingTokenConfig?: (params: {
    connected: boolean;
    partnerAid: string;
    tokenPrefix: string;
    activeBookingToken: string;
    bookingApiToken: string;
    defaultDiscountPercent: number;
  }) => Promise<void>;
  shareholderTree?: ShareholderTreeNode[];
  onSaveShareholderTreeNode?: (
    node: Omit<ShareholderTreeNode, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => Promise<void>;
  onDeleteShareholderTreeNode?: (id: string) => Promise<void>;
  treasuryEntries?: TreasuryEntry[];
  onCreateTreasuryEntry?: (entry: {
    entryType: TreasuryEntryType;
    title: string;
    buyerName?: string;
    buyerPhotoUrl?: string;
    state: string;
    amountBRL: number;
    sharesCount: number;
    sharesForSaleCount?: number;
    dailyQuotePercent?: number;
    dailyQuotePayoutBRL?: number;
    entryDate: string;
    recordedBy: string;
    notes?: string;
  }) => Promise<void>;
  onDeleteTreasuryEntry?: (id: string) => Promise<void>;
  onDeleteAllTreasuryEntries?: (ids: string[]) => Promise<void>;
  onDeleteShareholderBuyer?: (holder: ShareholderValuationRecord) => Promise<void>;
  quotationMath?: QuotationMathBreakdown;
  shareholderValuations?: ShareholderValuationRecord[];
  executiveMandates?: ExecutiveMandate[];
  onCreateMandate?: (mandate: {
    assigneeUid?: string;
    assigneeName: string;
    assigneeRole: 'Executivo' | 'Afiliado';
    area: ExecutiveMandateArea;
    missionTitle: string;
    scopeDescription: string;
    state: string;
    city?: string;
    grantedBy: string;
  }) => Promise<void>;
  onSubmitMandateReport?: (params: {
    mandate: ExecutiveMandate;
    city: string;
    partnerName: string;
    partnerDiscountPercent: number;
    partnerStars?: number;
    executionReport: string;
    submittedBy: string;
    status: 'em_execucao' | 'relatorio_enviado';
  }) => Promise<void>;
  onApproveMandateAndInsert?: (params: {
    mandate: ExecutiveMandate;
    insertIntoCatalog: boolean;
  }) => Promise<void>;
  onUpdateMandateStatus?: (mandate: ExecutiveMandate, status: ExecutiveMandateStatus) => Promise<void>;
  onDeleteMandate?: (id: string) => Promise<void>;
}

export const AdminPanelTab: React.FC<AdminPanelTabProps> = ({
  isAdmin,
  isLoggedIn,
  onGoogleLogin,
  usersList,
  ordersList,
  usdList,
  enrollmentsList,
  bookingsList,
  shareholderOrders,
  executivePixList,
  hotels,
  courses,
  sponsors,
  benefitPartners,
  credentialPasses,
  vipExecutiveHashes,
  vipPublic,
  vipSecret,
  onApprovePackageOrder,
  onApproveUsdInvestment,
  onLookupPackageOrder,
  onLookupUsdInvestment,
  onUpdateEnrollmentStatus,
  onUpdateBookingStatus,
  onUpdateShareholderOrder,
  onUpdateUserPatrimony,
  onDeleteUnpaidUser,
  onDeleteAllUnpaidUsers,
  onDeleteAnyUser,
  onSaveExecutivePix,
  onDeleteExecutivePix,
  onUpdateVipSettings,
  onCreateHotel,
  onSaveHotelGpsAndPhotos,
  onDeleteHotel,
  onCreateCourse,
  onDeleteCourse,
  onCreateSponsor,
  onDeleteSponsor,
  onCreateBenefitPartner,
  onDeleteBenefitPartner,
  onCreateCredentialPass,
  onDeleteCredentialPass,
  onSeedDefaultsToFirestore,
  bookingPublic,
  bookingSecret,
  onUpdateBookingTokenConfig,
  shareholderTree = [],
  onSaveShareholderTreeNode,
  onDeleteShareholderTreeNode,
  treasuryEntries = [],
  onCreateTreasuryEntry,
  onDeleteTreasuryEntry,
  onDeleteAllTreasuryEntries,
  onDeleteShareholderBuyer,
  quotationMath,
  shareholderValuations = [],
  executiveMandates = [],
  onCreateMandate,
  onSubmitMandateReport,
  onApproveMandateAndInsert,
  onUpdateMandateStatus,
  onDeleteMandate,
}) => {
  const { isEn, tr, translateDynamic } = useLanguage();
  const numLocale = isEn ? 'en-US' : 'pt-BR';

  // Dual-mode Secret Gate: President Master Password OR President-issued Executive Password
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<number>(0);
  const [accessMode, setAccessMode] = useState<'president' | 'executive' | null>(null);
  const [authorizedLabel, setAuthorizedLabel] = useState<string | null>(null);

  const [adminSection, setAdminSection] = useState<
    | 'pedidos'
    | 'lancamentos'
    | 'outorgacao'
    | 'acionistas'
    | 'patrimonio'
    | 'senhas'
    | 'pix_vip'
    | 'cadastros'
    | 'agente_visitas'
  >('pedidos');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Executive & President Patrimônio, Compra de Ações (c/ Foto) & Cotação do Dia Form
  const [ledgerType, setLedgerType] = useState<TreasuryEntryType>('venda_acoes');
  const [ledgerTitle, setLedgerTitle] = useState('');
  const [ledgerBuyerName, setLedgerBuyerName] = useState('');
  const [ledgerBuyerPhoto, setLedgerBuyerPhoto] = useState('');
  const [ledgerState, setLedgerState] = useState('GO');
  const [ledgerAmountBRL, setLedgerAmountBRL] = useState('');
  const [ledgerSharesCount, setLedgerSharesCount] = useState('');
  const [ledgerSharesForSale, setLedgerSharesForSale] = useState('');
  const [ledgerDailyQuotePercent, setLedgerDailyQuotePercent] = useState('');
  const [ledgerDailyQuotePayoutBRL, setLedgerDailyQuotePayoutBRL] = useState('');
  const [ledgerDate, setLedgerDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ledgerNotes, setLedgerNotes] = useState('');
  const [ledgerSaving, setLedgerSaving] = useState(false);
  const [confirmClearLedger, setConfirmClearLedger] = useState(false);
  const [deletingLedgerId, setDeletingLedgerId] = useState<string | null>(null);
  const [clearingLedger, setClearingLedger] = useState(false);

  // Order / USD Investment Lookup for Executives
  const [lookupId, setLookupId] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookedUpOrders, setLookedUpOrders] = useState<PackageOrder[]>([]);
  const [lookedUpUsd, setLookedUpUsd] = useState<UsdInvestment[]>([]);

  // Unpaid Monthly Quota Filter & Safe Deletion States
  const [userFilter, setUserFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deletingUsers, setDeletingUsers] = useState(false);

  // Shareholder review local fields per order ID
  const [notaryInputs, setNotaryInputs] = useState<Record<string, string>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  // Patrimony Editor State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editBRL, setEditBRL] = useState('0');
  const [editUSD, setEditUSD] = useState('0');
  const [editCNEC, setEditCNEC] = useState('0');
  const [editTier, setEditTier] = useState<VipTier>('Padrao');
  const [editMonthly, setEditMonthly] = useState(false);
  const [editCard, setEditCard] = useState(false);
  const [editGoldCard, setEditGoldCard] = useState(false);
  const [editShares, setEditShares] = useState('0');
  const [editNotaryCode, setEditNotaryCode] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('affiliate');

  // Password Manager (Gerenciador de Senhas) Form — defaults to Executivo VIP
  const [passTargetUid, setPassTargetUid] = useState('');
  const [passHolderName, setPassHolderName] = useState('');
  const [passHolderEmail, setPassHolderEmail] = useState('');
  const [passType, setPassType] = useState<'Afiliado' | 'Executivo VIP' | 'Hoteleiro'>('Executivo VIP');
  const [passPlain, setPassPlain] = useState('');
  const [passHotelName, setPassHotelName] = useState('');
  const [passGoldCard, setPassGoldCard] = useState(true);
  const [passMonthlyPaid, setPassMonthlyPaid] = useState(true);
  const [passNotes, setPassNotes] = useState('');

  // Executive PIX Form
  const [pixExecName, setPixExecName] = useState('');
  const [pixExecRole, setPixExecRole] = useState('Executivo Mesa Diretora');
  const [pixBank, setPixBank] = useState('Banco Inter (077)');
  const [pixKey, setPixKey] = useState('');
  const [pixType, setPixType] = useState<'Email' | 'CPF' | 'CNPJ' | 'Telefone' | 'Aleatoria'>('Email');
  const [pixCity, setPixCity] = useState('Aparecida de Goiania');

  // VIP Monthly Password Form
  const [vipMonth, setVipMonth] = useState(vipPublic?.monthLabel || 'Novembro 2026');
  const [vipPass, setVipPass] = useState(vipSecret?.plainPassword || 'CONAE2026VIP');
  const [vipSignalTitle, setVipSignalTitle] = useState(
    vipPublic?.buySignalTitle || 'Acumulação Estratégica Tesouro CONAE & Hotéis 5★'
  );
  const [vipSignalAsset, setVipSignalAsset] = useState(vipPublic?.buySignalAsset || 'CNEC / TESOURO');
  const [vipSignalTarget, setVipSignalTarget] = useState(String(vipPublic?.buySignalTargetBRL ?? 6.4));

  // New / Edit Hotel Form + Multi-Photo Gallery
  const [editingHotelId, setEditingHotelId] = useState<string | null>(null);
  const [hotelName, setHotelName] = useState('');
  const [hotelCity, setHotelCity] = useState('');
  const [hotelState, setHotelState] = useState('GO');
  const [hotelCategory, setHotelCategory] = useState<'Hotel' | 'Clube de Eventos' | 'Resort Conveniado'>('Hotel');
  const [hotelStars, setHotelStars] = useState(5);
  const [hotelDiscount, setHotelDiscount] = useState(50);
  const [hotelDesc, setHotelDesc] = useState('');
  const [hotelBenefits, setHotelBenefits] = useState('Cursos CONAE, Bank CNEC, Clínicas, Laboratórios & Farmácias');
  const [hotelPhotoUrl, setHotelPhotoUrl] = useState('');
  const [hotelGalleryPhotos, setHotelGalleryPhotos] = useState<string[]>([]);

  // Booking.com Token Connection Form
  const [bookingConnected, setBookingConnected] = useState<boolean>(
    bookingPublic?.connected ?? DEFAULT_BOOKING_PUBLIC.connected
  );
  const [bookingAid, setBookingAid] = useState(
    bookingPublic?.partnerAid || DEFAULT_BOOKING_PUBLIC.partnerAid
  );
  const [bookingPrefix, setBookingPrefix] = useState(
    bookingPublic?.tokenPrefix || DEFAULT_BOOKING_PUBLIC.tokenPrefix
  );
  const [bookingActiveToken, setBookingActiveToken] = useState(
    bookingPublic?.activeBookingToken || DEFAULT_BOOKING_PUBLIC.activeBookingToken
  );
  const [bookingApiTokenInput, setBookingApiTokenInput] = useState(
    bookingSecret?.bookingApiToken || ''
  );
  const [bookingDefaultDiscount, setBookingDefaultDiscount] = useState(
    bookingPublic?.defaultDiscountPercent ?? DEFAULT_BOOKING_PUBLIC.defaultDiscountPercent
  );
  const [savingBookingCfg, setSavingBookingCfg] = useState(false);

  useEffect(() => {
    if (bookingPublic) {
      setBookingConnected(bookingPublic.connected);
      setBookingAid(bookingPublic.partnerAid);
      setBookingPrefix(bookingPublic.tokenPrefix);
      setBookingActiveToken(bookingPublic.activeBookingToken);
      setBookingDefaultDiscount(bookingPublic.defaultDiscountPercent);
    }
  }, [bookingPublic]);

  useEffect(() => {
    if (bookingSecret?.bookingApiToken) {
      setBookingApiTokenInput(bookingSecret.bookingApiToken);
    }
  }, [bookingSecret]);

  // New Course Form
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCat, setCourseCat] = useState('Capelania & Liderança');
  const [courseDur, setCourseDur] = useState('120h · Certificado Nacional');
  const [courseMod, setCourseMod] = useState<'Presencial' | 'Online EAD' | 'Hibrido'>('Online EAD');
  const [courseFee, setCourseFee] = useState('R$ 290,00 ou Incluso no Pacote');
  const [courseDesc, setCourseDesc] = useState('');
  const [coursePhotoUrl, setCoursePhotoUrl] = useState('');

  // New Sponsor Form
  const [spName, setSpName] = useState('');
  const [spSegment, setSpSegment] = useState('Patrocinador Ouro · Convenção Mundial');
  const [spBenefit, setSpBenefit] = useState('');
  const [spDesc, setSpDesc] = useState('');
  const [spPhotoUrl, setSpPhotoUrl] = useState('');

  // New Benefit Partner Form (Farmácia, Supermercado, Clínica/Lab, Comércio, Clube)
  const [bpName, setBpName] = useState('');
  const [bpCategory, setBpCategory] = useState<BenefitPartnerCategory>('Farmácia');
  const [bpCity, setBpCity] = useState('');
  const [bpState, setBpState] = useState('GO');
  const [bpDiscount, setBpDiscount] = useState(30);
  const [bpDesc, setBpDesc] = useState('');
  const [bpPhotoUrl, setBpPhotoUrl] = useState('');
  const [bpHotelExcl, setBpHotelExcl] = useState(true);

  // Branching Shareholder Tree Form (Linked to Master Hélio & Executives)
  const [editingTreeId, setEditingTreeId] = useState<string | null>(null);
  const [treeFullName, setTreeFullName] = useState('');
  const [treeBranchTitle, setTreeBranchTitle] = useState('Acionista Estratégico · Conselheiro CONAE');
  const [treeState, setTreeState] = useState('GO');
  const [treePhotoUrl, setTreePhotoUrl] = useState('');
  const [treeParentNodeId, setTreeParentNodeId] = useState('exec_helio');
  const [treeSharesCount, setTreeSharesCount] = useState(1500);
  const [treeExecutionPowers, setTreeExecutionPowers] = useState(
    'Poderes outorgados na Convenção CONAE e área de utilidade do aplicativo, com credenciamento para hotéis VIP, cursos e títulos do Tesouro.'
  );
  const [treeHotelDiscount, setTreeHotelDiscount] = useState(true);
  const [treeCoursesAccess, setTreeCoursesAccess] = useState(true);
  const [treeTreasuryEligible, setTreeTreasuryEligible] = useState(true);
  const [treeTreasuryProb, setTreeTreasuryProb] = useState(85);
  const [treeTreasuryTier, setTreeTreasuryTier] = useState<TreasuryProbabilityTier>('Alta');
  const [treeNotaryCode, setTreeNotaryCode] = useState('');
  const [savingTreeNode, setSavingTreeNode] = useState(false);

  if (!isAdmin) {
    return (
      <div className="conae-panel rounded-xl p-8 text-center space-y-4 max-w-xl mx-auto">
        <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">
          {tr('Painel do Presidente & Mesa Diretora', 'President & Executive Board Panel')}
        </h2>
        <p className="text-sm text-emerald-100/75">
          {isLoggedIn
            ? tr(
                'Sua conta atual não está vinculada como Presidente ou Executivo. Peça à Presidência para vincular seu cadastro ao gerar uma senha de Executivo VIP.',
                'Your current account is not linked as President or Executive. Ask the Presidency to link your profile when generating a VIP Executive password.'
              )
            : tr(
                'Conecte sua conta Google da Presidência (ou conta de Executivo vinculada) para abrir o painel de gestão completo e digitar a senha do cofre.',
                'Connect your Presidency Google account (or linked Executive account) to open the full management panel and enter the vault password.'
              )}
        </p>
        {!isLoggedIn && (
          <button
            type="button"
            onClick={onGoogleLogin}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-semibold text-sm hover:from-amber-400 hover:to-amber-300 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            {tr('Entrar com Google da Presidência', 'Sign In with Presidency Google')}
          </button>
        )}
      </div>
    );
  }

  const isTemporarilyBlocked = blockedUntil > Date.now();

  const handleUnlockPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    const now = Date.now();
    if (blockedUntil > now) {
      const secs = Math.ceil((blockedUntil - now) / 1000);
      setPinError(
        tr(
          `Painel bloqueado por segurança. Aguarde ${secs}s para tentar novamente.`,
          `Panel locked for security. Wait ${secs}s to try again.`
        )
      );
      return;
    }

    const cleaned = pinInput.trim();
    const isPresident = await isPresidentMasterPassword(cleaned);
    if (isPresident) {
      setAccessMode('president');
      setAuthorizedLabel(tr('Presidente Mundial CONAE', 'CONAE World President'));
      setAdminSection('pedidos');
      setPinInput('');
      setFailedAttempts(0);
      setBlockedUntil(0);
      return;
    }

    const hash = await sha256Hex(cleaned);
    const matchedExec = vipExecutiveHashes.find((eh) => eh.active && eh.passwordHash === hash);
    if (matchedExec) {
      setAccessMode('executive');
      setAuthorizedLabel(matchedExec.executiveName);
      setAdminSection('pedidos');
      setPinInput('');
      setFailedAttempts(0);
      setBlockedUntil(0);
      return;
    }

    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    setPinInput('');
    if (nextAttempts >= 3) {
      setBlockedUntil(Date.now() + 30000);
      setPinError(
        tr(
          'Senha inválida 3 vezes. Painel bloqueado por 30 segundos.',
          'Invalid password 3 times. Panel locked for 30 seconds.'
        )
      );
    } else {
      setPinError(
        tr(
          `Senha incorreta (${nextAttempts}/3). O painel será bloqueado sem a senha válida da Presidência ou Executivo.`,
          `Incorrect password (${nextAttempts}/3). The panel remains locked without a valid President or Executive password.`
        )
      );
    }
  };

  if (!accessMode) {
    return (
      <div className="conae-panel rounded-xl p-6 sm:p-8 max-w-md mx-auto space-y-5">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-400/50 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-amber-400" />
          </div>
          <p className="text-xs font-medium text-amber-300">
            {isTemporarilyBlocked
              ? tr('Acesso Bloqueado', 'Access Locked')
              : tr('Painel Bloqueado · Cofre da Presidência', 'Panel Locked · Presidency Vault')}
          </p>
          <h2 className="text-xl font-bold text-white">
            {tr('Senha Obrigatória para Entrar', 'Password Required to Enter')}
          </h2>
          <p className="text-xs text-emerald-100/75 leading-relaxed">
            {isEn ? (
              <>
                Enter the <strong className="text-amber-300">Presidency secret password</strong> for full access or an{' '}
                <strong className="text-emerald-300">Executive password</strong> (registrations and package/card/crypto release only). Without the right password the panel stays locked.
              </>
            ) : (
              <>
                Informe a <strong className="text-amber-300">senha secreta da Presidência</strong> para acesso total ou uma{' '}
                <strong className="text-emerald-300">senha de Executivo</strong> (somente cadastros e liberação de pacotes/cartão/cripto). Sem a senha correta o painel permanece bloqueado.
              </>
            )}
          </p>
        </div>

        <form onSubmit={handleUnlockPin} className="space-y-3">
          <input
            type="password"
            required
            autoComplete="off"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder={tr('Digite a senha secreta para desbloquear', 'Enter secret password to unlock')}
            className="w-full rounded-lg bg-black/55 border border-amber-400/35 px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
          />
          {pinError && <p className="text-xs text-red-300 font-medium">{pinError}</p>}
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-semibold text-sm hover:from-amber-400 hover:to-amber-300 cursor-pointer"
          >
            {tr('Entrar no Painel', 'Enter Panel')}
          </button>
        </form>
      </div>
    );
  }

  const isPresidentMode = accessMode === 'president';
  const unpaidDeletableUsers = usersList.filter(
    (u) => !u.monthlyPlanActive && u.role !== 'president' && u.email !== BOOTSTRAPPED_ADMIN_EMAIL
  );
  const paidUsersCount = usersList.filter((u) => Boolean(u.monthlyPlanActive)).length;
  const filteredUsersList = usersList.filter((u) => {
    if (userFilter === 'unpaid') return !u.monthlyPlanActive;
    if (userFilter === 'paid') return Boolean(u.monthlyPlanActive);
    return true;
  });

  const mergedOrders: PackageOrder[] = [
    ...lookedUpOrders,
    ...ordersList.filter((o) => !lookedUpOrders.some((lo) => lo.id === o.id)),
  ];
  const mergedUsd: UsdInvestment[] = [
    ...lookedUpUsd,
    ...usdList.filter((u) => !lookedUpUsd.some((lu) => lu.id === u.id)),
  ];

  const handleLookupByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = lookupId.trim();
    if (!code) return;
    setLookupBusy(true);
    setFeedback(null);
    try {
      if (code.startsWith('usd_') && onLookupUsdInvestment) {
        const foundUsd = await onLookupUsdInvestment(code);
        if (foundUsd) {
          setLookedUpUsd((prev) => [foundUsd, ...prev.filter((u) => u.id !== foundUsd.id)]);
          setFeedback(
            tr(
              `Aporte em Dólar ${foundUsd.id} localizado e pronto para liberação.`,
              `USD Deposit ${foundUsd.id} located and ready for approval.`
            )
          );
        } else {
          setFeedback(
            tr(
              `Nenhum depósito USD encontrado com o código "${code}".`,
              `No USD deposit found with code "${code}".`
            )
          );
        }
      } else if (onLookupPackageOrder) {
        const foundOrder = await onLookupPackageOrder(code);
        if (foundOrder) {
          setLookedUpOrders((prev) => [foundOrder, ...prev.filter((o) => o.id !== foundOrder.id)]);
          setFeedback(
            tr(
              `Pedido ${foundOrder.id} localizado! Confirme o PIX abaixo para liberar pacote, cartão e CNEC.`,
              `Order ${foundOrder.id} located! Confirm PIX below to unlock package, card and CNEC.`
            )
          );
        } else if (onLookupUsdInvestment) {
          const foundUsd = await onLookupUsdInvestment(code);
          if (foundUsd) {
            setLookedUpUsd((prev) => [foundUsd, ...prev.filter((u) => u.id !== foundUsd.id)]);
            setFeedback(
              tr(
                `Aporte em Dólar ${foundUsd.id} localizado e pronto para liberação.`,
                `USD Deposit ${foundUsd.id} located and ready for approval.`
              )
            );
          } else {
            setFeedback(
              tr(
                `Nenhum pedido encontrado com o código "${code}".`,
                `No order found with code "${code}".`
              )
            );
          }
        } else {
          setFeedback(
            tr(
              `Nenhum pedido encontrado com o código "${code}".`,
              `No order found with code "${code}".`
            )
          );
        }
      }
    } finally {
      setLookupBusy(false);
    }
  };

  const openPatrimonyEditor = (u: UserProfile) => {
    setEditingUser(u);
    setEditBRL(String(u.balanceBRL ?? 0));
    setEditUSD(String(u.balanceUSD ?? 0));
    setEditCNEC(String(u.cnecTokens ?? 0));
    setEditTier(u.vipTier);
    setEditMonthly(Boolean(u.monthlyPlanActive));
    setEditCard(Boolean(u.virtualCardActive));
    setEditGoldCard(Boolean(u.executiveCardActive));
    setEditShares(String(u.sharesOwned ?? 0));
    setEditNotaryCode(u.sharesNotaryCode || '');
    setEditRole(u.role);
  };

  const handleSavePatrimony = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    await onUpdateUserPatrimony(editingUser, {
      balanceBRL: Math.max(0, Number(editBRL) || 0),
      balanceUSD: Math.max(0, Number(editUSD) || 0),
      cnecTokens: Math.max(0, Number(editCNEC) || 0),
      vipTier: editTier,
      monthlyPlanActive: editMonthly,
      virtualCardActive: editCard,
      executiveCardActive: editGoldCard,
      sharesOwned: Math.min(100000, Math.max(0, Math.floor(Number(editShares) || 0))),
      sharesNotaryCode: editNotaryCode.trim(),
      role: editRole,
    });
    setFeedback(
      tr(
        `Patrimônio, Ações e Cartão de ${editingUser.displayName} atualizados.`,
        `Equity, Shares and Card updated for ${editingUser.displayName}.`
      )
    );
    setEditingUser(null);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = 'CN-';
    for (let i = 0; i < 6; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    setPassPlain(out);
  };

  const handleImportJsonCatalog = async (
    file: File,
    kind: 'hotels' | 'courses' | 'sponsors' | 'benefit_partners'
  ) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      let count = 0;

      for (const item of list) {
        if (kind === 'hotels' && item.name) {
          const parsedGallery = Array.isArray(item.galleryPhotos)
            ? item.galleryPhotos
                .filter((g: unknown): g is string => typeof g === 'string' && g.trim().length > 0)
                .slice(0, 5)
                .map((g: string) => g.slice(0, 60000))
            : undefined;
          await onCreateHotel({
            name: String(item.name).slice(0, 120),
            city: String(item.city || 'Goiânia').slice(0, 80),
            state: String(item.state || 'GO').slice(0, 4),
            category: item.category === 'Clube de Eventos' || item.category === 'Resort Conveniado' ? item.category : 'Hotel',
            stars: Math.min(5, Math.max(2, Number(item.stars) || 4)),
            discountPercent: Math.min(80, Math.max(0, Number(item.discountPercent) || 40)),
            description: String(item.description || 'Hotel conveniado CONAE').slice(0, 400),
            hotelBenefits: item.hotelBenefits ? String(item.hotelBenefits).slice(0, 300) : undefined,
            photoUrl: item.photoUrl ? String(item.photoUrl).slice(0, 60000) : undefined,
            galleryPhotos: parsedGallery && parsedGallery.length > 0 ? parsedGallery : undefined,
            active: true,
          });
          count++;
        } else if (kind === 'courses' && item.title) {
          await onCreateCourse({
            title: String(item.title).slice(0, 120),
            category: String(item.category || 'Formação CONAE').slice(0, 60),
            duration: String(item.duration || '120h').slice(0, 40),
            modality: item.modality === 'Presencial' || item.modality === 'Hibrido' ? item.modality : 'Online EAD',
            feeLabel: String(item.feeLabel || 'Incluso no pacote').slice(0, 100),
            description: String(item.description || 'Curso oficial CONAE').slice(0, 400),
            photoUrl: item.photoUrl ? String(item.photoUrl).slice(0, 60000) : undefined,
            active: true,
          });
          count++;
        } else if (kind === 'sponsors' && item.name) {
          await onCreateSponsor({
            name: String(item.name).slice(0, 120),
            segment: String(item.segment || 'Patrocinador Oficial').slice(0, 80),
            benefit: String(item.benefit || 'Benefícios exclusivos aos conveniados').slice(0, 200),
            description: String(item.description || 'Parceiro patrocinador CONAE').slice(0, 400),
            photoUrl: item.photoUrl ? String(item.photoUrl).slice(0, 60000) : undefined,
            active: true,
          });
          count++;
        } else if (kind === 'benefit_partners' && item.name) {
          const validCats: BenefitPartnerCategory[] = [
            'Farmácia',
            'Supermercado',
            'Clínica & Laboratório',
            'Comércio',
            'Clube Conveniado',
          ];
          const cat = validCats.includes(item.category) ? item.category : 'Comércio';
          await onCreateBenefitPartner({
            name: String(item.name).slice(0, 120),
            category: cat,
            city: String(item.city || 'Goiânia').slice(0, 80),
            state: String(item.state || 'GO').slice(0, 4),
            discountPercent: Math.min(90, Math.max(0, Number(item.discountPercent) || 25)),
            description: String(item.description || 'Desconto exclusivo rede CONAE').slice(0, 400),
            photoUrl: item.photoUrl ? String(item.photoUrl).slice(0, 60000) : undefined,
            hotelExclusive: Boolean(item.hotelExclusive ?? true),
            active: true,
          });
          count++;
        }
      }

      setFeedback(
        tr(
          `${count} registro(s) importados via JSON com sucesso.`,
          `${count} record(s) imported via JSON successfully.`
        )
      );
    } catch {
      setFeedback(
        tr(
          'Arquivo JSON inválido. Verifique os campos do catálogo antes de enviar.',
          'Invalid JSON file. Verify the catalog fields before uploading.'
        )
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="conae-panel rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-amber-300 font-medium">
            {isPresidentMode
              ? tr(
                  'Modo Presidente · Acesso Total & Gerenciador de Senhas',
                  'President Mode · Full Access & Password Manager'
                )
              : tr(
                  `Modo Executivo (${authorizedLabel}) · Somente Salvar Cadastros e Liberar Pacotes, Cartão, Cripto & Investimento`,
                  `Executive Mode (${authorizedLabel}) · Save Registrations & Release Packages, Card, Crypto & Investments Only`
                )}
          </p>
          <h2 className="text-2xl font-bold text-white">
            {isPresidentMode
              ? tr('Painel do Presidente CONAE', 'CONAE President Panel')
              : tr('Painel Operacional de Executivo CONAE', 'CONAE Executive Operations Panel')}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPresidentMode && (
            <>
              <a
                href="/manual-hospedagem-dns-conae.pdf"
                download="Manual-Hospedagem-DNS-CONAE.pdf"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold cursor-pointer whitespace-nowrap transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {tr('Baixar Manual (PDF)', 'Download Guide (PDF)')}
              </a>
              <a
                href="/manual-hospedagem-dns-conae.doc"
                download="Manual-Hospedagem-DNS-CONAE.doc"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/55 hover:bg-black/75 border border-amber-400/45 text-amber-200 hover:text-white text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                {tr('Baixar Manual (Word)', 'Download Guide (Word)')}
              </a>
              <button
                type="button"
                onClick={async () => {
                  await onSeedDefaultsToFirestore();
                  setFeedback(
                    tr(
                      'Catálogo completo (Cursos, Hotéis, Farmácias, Supermercados, Patrocinadores, PIX e Senha VIP) sincronizado.',
                      'Full catalog (Courses, Hotels, Pharmacies, Supermarkets, Sponsors, PIX & VIP Password) synced.'
                    )
                  );
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
              >
                <Database className="w-4 h-4 text-amber-300" />
                {tr('Sincronizar Padrão', 'Sync Defaults')}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setAccessMode(null);
              setAuthorizedLabel(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg conae-panel-soft text-xs font-semibold text-amber-300 hover:text-white cursor-pointer whitespace-nowrap"
          >
            <Unlock className="w-3.5 h-3.5" />
            {tr('Bloquear Painel', 'Lock Panel')}
          </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg bg-emerald-900/60 border border-amber-400/45 px-4 py-3 text-sm text-emerald-100 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* President Command Overview Strip (everything managed in one glance) */}
      {isPresidentMode && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {[
            {
              id: 'pedidos' as const,
              title: tr('PIX & Pacotes', 'PIX & Packages'),
              value: `${ordersList.filter((o) => o.status === 'pending').length} ${tr('pend.', 'pend.')}`,
              sub: `${ordersList.length} ${tr('pedidos', 'orders')} · ${usdList.length} USD`,
            },
            {
              id: 'acionistas' as const,
              title: tr('Acionistas 100k & Árvore', 'Shareholders 100k & Tree'),
              value: `${shareholderOrders.length} ${tr('lotes', 'lots')} · ${shareholderTree.filter((n) => n.active !== false).length} ${tr('ramos', 'nodes')}`,
              sub: tr('Árvore Master Hélio & Cartório', 'Master Hélio Tree & Notary'),
            },
            {
              id: 'patrimonio' as const,
              title: tr('Cadastrados & Cota', 'Members & Quota'),
              value: `${usersList.length} ${tr('total', 'total')}`,
              sub: `${unpaidDeletableUsers.length} ${tr('sem cota mensal', 'unpaid quota')}`,
            },
            {
              id: 'senhas' as const,
              title: tr('Senhas Executivos', 'Executive Passwords'),
              value: `${credentialPasses.length} ${tr('ativas', 'active')}`,
              sub: tr('Gerar & Cartão Dourado', 'Issue & Gold Card'),
            },
            {
              id: 'pix_vip' as const,
              title: tr('PIX & Sala VIP', 'PIX & VIP Room'),
              value: `${executivePixList.length} PIX`,
              sub: translateDynamic(vipPublic?.monthLabel || tr('Senha Mensal', 'Monthly Password')),
            },
            {
              id: 'outorgacao' as const,
              title: tr('Outorgação & Relatórios', 'Mandates & Reports'),
              value: `${executiveMandates.length} ${tr('outorgas', 'mandates')}`,
              sub: `${executiveMandates.filter((m) => m.status === 'relatorio_enviado').length} ${tr('relatórios p/ aprovar', 'pending review')}`,
            },
            {
              id: 'cadastros' as const,
              title: tr('Hotéis, Cursos & Loja', 'Hotels, Courses & Store'),
              value: `${hotels.length + courses.length + benefitPartners.length + sponsors.length} ${tr('itens', 'items')}`,
              sub: tr('Fotos, Uploads & Baixar', 'Photos, Uploads & Export'),
            },
            {
              id: 'agente_visitas' as const,
              title: tr('Agente Visitas & Zap', 'Visit Agent & WhatsApp'),
              value: 'Terminal 254',
              sub: '(96) 98115-3517',
            },
          ].map((tile) => (
            <button
              key={tile.id}
              type="button"
              onClick={() => setAdminSection(tile.id)}
              className={`rounded-xl p-3 text-left transition-colors cursor-pointer border ${
                adminSection === tile.id
                  ? 'conae-panel border-amber-400/75'
                  : 'conae-panel-soft border-amber-400/20 hover:border-amber-400/50'
              }`}
            >
              <p className="text-[11px] text-amber-300 font-semibold truncate">{tile.title}</p>
              <p className="text-sm font-bold text-white font-mono tabular-nums mt-0.5">{tile.value}</p>
              <p className="text-[10px] text-emerald-200/70 truncate">{tile.sub}</p>
            </button>
          ))}
        </div>
      )}

      {/* Admin Sub-Navigation */}
      <div className="flex flex-wrap gap-2">
        {(isPresidentMode
          ? [
              { id: 'pedidos', label: tr('Aprovações PIX & Pacotes', 'PIX & Package Approvals') },
              {
                id: 'lancamentos',
                label: tr(
                  `Patrimônio & Cotação (${treasuryEntries.filter((e) => e.active !== false).length})`,
                  `Equity & Quote (${treasuryEntries.filter((e) => e.active !== false).length})`
                ),
              },
              {
                id: 'outorgacao',
                label: tr(
                  `Outorgação & Relatórios (${executiveMandates.length})`,
                  `Mandates & Reports (${executiveMandates.length})`
                ),
              },
              {
                id: 'acionistas',
                label: tr(
                  `Acionistas & Cartório (${shareholderOrders.length})`,
                  `Shareholders & Notary (${shareholderOrders.length})`
                ),
              },
              {
                id: 'patrimonio',
                label: tr(
                  `Cadastrados, Cota Mensal & Patrimônio (${usersList.length})`,
                  `Members, Monthly Quota & Equity (${usersList.length})`
                ),
              },
              { id: 'senhas', label: tr('Gerenciador de Senhas (Executivos)', 'Password Manager (Executives)') },
              { id: 'pix_vip', label: tr('PIX & Sala VIP', 'PIX & VIP Room') },
              { id: 'cadastros', label: tr('Cadastros, Fotos & Downloads', 'Catalogs, Photos & Downloads') },
              { id: 'agente_visitas', label: tr('Agente Visitas & Terminal 254', 'Visit Agent & Terminal 254') },
            ]
          : [
              {
                id: 'lancamentos',
                label: tr(
                  `Inserir Patrimônio / Cotação (${treasuryEntries.filter((e) => e.active !== false).length})`,
                  `Record Equity / Quote (${treasuryEntries.filter((e) => e.active !== false).length})`
                ),
              },
              {
                id: 'outorgacao',
                label: tr(
                  `Outorgação & Relatórios (${executiveMandates.length})`,
                  `Mandates & Reports (${executiveMandates.length})`
                ),
              },
              {
                id: 'pedidos',
                label: tr(
                  'Liberar Pacotes, Cartão & Investimento',
                  'Release Packages, Card & Investment'
                ),
              },
              {
                id: 'cadastros',
                label: tr(
                  'Salvar Cadastros (Hotéis, Cursos, Comércios)',
                  'Save Listings (Hotels, Courses, Businesses)'
                ),
              },
            ]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setAdminSection(t.id as typeof adminSection)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              adminSection === t.id
                ? 'bg-amber-500 text-neutral-950'
                : 'conae-panel-soft text-emerald-100/80 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SECTION 1: PIX Confirmations & Releases (Package + Discount Card + CNEC + USD Investment) */}
      {adminSection === 'pedidos' && (
        <div className="space-y-5">
          {/* Quick Lookup by Order Code for Executives */}
          {(onLookupPackageOrder || onLookupUsdInvestment) && (
            <form
              onSubmit={handleLookupByCode}
              className="conae-panel rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs"
            >
              <div className="flex items-center gap-2 text-amber-300 font-semibold shrink-0">
                <Search className="w-4 h-4" />
                <span>
                  {tr(
                    'Buscar Pedido por Código (ord_... / usd_...):',
                    'Lookup Order by Code (ord_... / usd_...):'
                  )}
                </span>
              </div>
              <input
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                placeholder={tr(
                  'Cole o código do pedido ou depósito USD enviado pelo filiado',
                  'Paste the order or USD deposit code sent by the member'
                )}
                className="flex-1 rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={lookupBusy}
                className="px-4 py-2 rounded-lg bg-amber-500 text-neutral-950 font-semibold hover:bg-amber-400 cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {lookupBusy ? tr('Buscando...', 'Searching...') : tr('Localizar & Liberar', 'Locate & Release')}
              </button>
            </form>
          )}

          <div className="conae-panel rounded-xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <span>
                  {tr(
                    'Liberação de Pacotes, Cartão de Desconto, Cripto CNEC & Investimentos',
                    'Release Packages, Discount Card, CNEC Crypto & Investments'
                  )}
                </span>
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    downloadCsvFile(
                      'conae_pedidos_pix.csv',
                      isEn
                        ? ['ID', 'Member', 'Package', 'Amount BRL', 'CNEC', 'PIX Executive', 'Status']
                        : ['ID', 'Filiado', 'Pacote', 'Valor BRL', 'CNEC', 'Executivo PIX', 'Status'],
                      mergedOrders.map((o) => [
                        o.id,
                        o.userName,
                        o.packageName,
                        o.amountBRL,
                        o.cnecAmount,
                        o.executiveName || '',
                        o.status,
                      ])
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded conae-panel-soft text-amber-300 hover:text-white cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  {tr('CSV Pedidos', 'Orders CSV')}
                </button>
                <button
                  type="button"
                  onClick={() => downloadJsonFile('conae_pedidos_pix.json', mergedOrders)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded conae-panel-soft text-emerald-200 hover:text-white cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  JSON
                </button>
              </div>
            </div>

            {mergedOrders.length === 0 ? (
              <p className="text-xs text-emerald-100/65">
                {tr(
                  'Nenhum pedido listado nesta conta. Use a busca acima com o código (ord_...) do afiliado para localizar e liberar o pacote.',
                  'No orders listed on this account. Use the search above with the member code (ord_...) to locate and approve the package.'
                )}
              </p>
            ) : (
              <div className="space-y-2.5">
                {mergedOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="conae-panel-soft rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-white">
                        {ord.userName} · <span className="text-amber-300">{translateDynamic(ord.packageName)}</span>
                      </p>
                      <p className="text-emerald-200/75 font-mono">
                        {tr('Cód:', 'Code:')} {ord.id} · R$ {ord.amountBRL.toFixed(2)} · +{ord.cnecAmount} CNEC · PIX:{' '}
                        {ord.executiveName || tr('Presidência', 'Presidency')} · Status: {ord.status.toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          await onApprovePackageOrder(ord, true);
                          setLookedUpOrders((prev) =>
                            prev.map((item) => (item.id === ord.id ? { ...item, status: 'approved' } : item))
                          );
                          setFeedback(
                            tr(
                              `PIX de ${ord.userName} confirmado! Pacote, Cartão de Desconto, Investimento e CNEC liberados.`,
                              `PIX from ${ord.userName} confirmed! Package, Discount Card, Investment and CNEC released.`
                            )
                          );
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {tr('Confirmar PIX & Liberar', 'Confirm PIX & Release')}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await onApprovePackageOrder(ord, false);
                          setLookedUpOrders((prev) =>
                            prev.map((item) => (item.id === ord.id ? { ...item, status: 'rejected' } : item))
                          );
                          setFeedback(
                            tr(
                              `Pedido de ${ord.userName} marcado como recusado.`,
                              `Order from ${ord.userName} marked as rejected.`
                            )
                          );
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-900/70 hover:bg-red-800 text-red-100 font-semibold cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        {tr('Recusar', 'Reject')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`grid grid-cols-1 ${isPresidentMode ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-4`}>
            <div className="conae-panel rounded-xl p-4 space-y-2.5">
              <h4 className="text-sm font-semibold text-amber-300">
                {tr('Depósitos em Dólar / Investimentos (Deriv/Inter)', 'USD Deposits / Investments (Deriv/Inter)')}
              </h4>
              {mergedUsd.length === 0 ? (
                <p className="text-xs text-emerald-100/60">
                  {tr(
                    'Sem depósitos USD pendentes na lista. Use o código (usd_...) acima se necessário.',
                    'No pending USD deposits in list. Use the (usd_...) code above if needed.'
                  )}
                </p>
              ) : (
                mergedUsd.map((inv) => (
                  <div key={inv.id} className="conae-panel-soft rounded-lg p-3 space-y-2 text-xs">
                    <p className="font-semibold text-white">{inv.userName} · US$ {inv.amountUSD}</p>
                    <p className="text-emerald-200/70 font-mono">
                      {tr('Cód:', 'Code:')} {inv.id} · {inv.platform} · {inv.status}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await onApproveUsdInvestment(inv, true);
                          setLookedUpUsd((prev) =>
                            prev.map((u) => (u.id === inv.id ? { ...u, status: 'approved' } : u))
                          );
                          setFeedback(
                            tr(
                              `Investimento USD de ${inv.userName} confirmado!`,
                              `USD investment from ${inv.userName} confirmed!`
                            )
                          );
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold cursor-pointer"
                      >
                        {tr('Confirmar USD', 'Confirm USD')}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await onApproveUsdInvestment(inv, false);
                          setLookedUpUsd((prev) =>
                            prev.map((u) => (u.id === inv.id ? { ...u, status: 'rejected' } : u))
                          );
                        }}
                        className="px-2.5 py-1 rounded bg-red-900/70 text-red-100 cursor-pointer"
                      >
                        {tr('Recusar', 'Reject')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {isPresidentMode && (
              <>
                <div className="conae-panel rounded-xl p-4 space-y-2.5">
                  <h4 className="text-sm font-semibold text-amber-300">
                    {tr('Matrículas CONAE Cursos', 'CONAE Course Enrollments')}
                  </h4>
                  {enrollmentsList.length === 0 ? (
                    <p className="text-xs text-emerald-100/60">
                      {tr('Sem matrículas registradas.', 'No enrollments recorded.')}
                    </p>
                  ) : (
                    enrollmentsList.map((en) => (
                      <div key={en.id} className="conae-panel-soft rounded-lg p-3 space-y-2 text-xs">
                        <p className="font-semibold text-white">{en.userName}</p>
                        <p className="text-emerald-200/75">
                          {translateDynamic(en.courseTitle)} · {en.status}
                        </p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => onUpdateEnrollmentStatus(en, 'active')} className="px-2.5 py-1 rounded bg-emerald-700 text-white cursor-pointer">
                            {tr('Ativar', 'Activate')}
                          </button>
                          <button type="button" onClick={() => onUpdateEnrollmentStatus(en, 'certified')} className="px-2.5 py-1 rounded bg-amber-500 text-neutral-950 font-semibold cursor-pointer">
                            {tr('Emitir Credencial', 'Issue Credential')}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="conae-panel rounded-xl p-4 space-y-2.5">
                  <h4 className="text-sm font-semibold text-amber-300">
                    {tr('Reservas de Hotéis VIP', 'VIP Hotel Bookings')}
                  </h4>
                  {bookingsList.length === 0 ? (
                    <p className="text-xs text-emerald-100/60">
                      {tr('Sem reservas registradas.', 'No bookings recorded.')}
                    </p>
                  ) : (
                    bookingsList.map((bk) => {
                      const bkToken =
                        bk.bookingToken ||
                        generateHotelBookingToken(
                          bookingPublic?.tokenPrefix || DEFAULT_BOOKING_PUBLIC.tokenPrefix,
                          bk.state,
                          bk.id
                        );
                      return (
                        <div key={bk.id} className="conae-panel-soft rounded-lg p-3 space-y-2 text-xs">
                          <p className="font-semibold text-white">{bk.userName} · {bk.hotelName}</p>
                          <p className="text-emerald-200/75">{bk.state} · {bk.checkInDate} · {bk.status}</p>
                          <p className="font-mono text-[11px] text-amber-300">
                            Token Booking: {bkToken}
                          </p>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => onUpdateBookingStatus(bk, 'confirmed')} className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold cursor-pointer">
                              {tr('Confirmar', 'Confirm')}
                            </button>
                            <button type="button" onClick={() => onUpdateBookingStatus(bk, 'cancelled')} className="px-2.5 py-1 rounded bg-red-900/70 text-red-100 cursor-pointer">
                              {tr('Cancelar', 'Cancel')}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: Shareholders 100,000 Shares & Cartório Review (President Only) */}
      {isPresidentMode && adminSection === 'acionistas' && (
        <div className="conae-panel rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                <span>
                  {tr(
                    'Mesa Diretora & Cartório · Solicitações de Lotes (100.000 Ações)',
                    'Executive Board & Notary · Share Lot Requests (100,000 Shares)'
                  )}
                </span>
              </h3>
              <p className="text-xs text-emerald-100/75">
                {tr(
                  'Analise o pedido de compra do acionista, organize a documentação, informe o registro do Cartório e oficialize para que as ações apareçam na tela do celular do usuário.',
                  'Review the shareholder purchase request, organize documentation, enter the Notary record and finalize so shares appear on the member’s mobile screen.'
                )}
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() =>
                  downloadCsvFile(
                    'conae_acionistas_lotes.csv',
                    isEn
                      ? ['ID', 'Shareholder', 'Phone', 'Tax ID', 'Division', 'Shares', '% Equity', 'Status', 'Notary']
                      : ['ID', 'Acionista', 'Telefone', 'CPF/CNPJ', 'Divisória', 'Ações', '% Capital', 'Status', 'Cartório'],
                    shareholderOrders.map((s) => [
                      s.id,
                      s.userName,
                      s.userPhone || '',
                      s.userDocument || '',
                      s.divisionLabel,
                      s.totalShares,
                      s.percentOwnership,
                      s.status,
                      s.notaryCode || '',
                    ])
                  )
                }
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded conae-panel-soft text-amber-300 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {tr('CSV Acionistas', 'Shareholders CSV')}
              </button>
              <button
                type="button"
                onClick={() => downloadJsonFile('conae_acionistas_lotes.json', shareholderOrders)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded conae-panel-soft text-emerald-200 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                JSON
              </button>
            </div>
          </div>

          {shareholderOrders.length === 0 ? (
            <p className="text-xs text-emerald-100/65">
              {tr(
                'Nenhuma solicitação de lote de ações registrada até o momento.',
                'No share lot requests recorded so far.'
              )}
            </p>
          ) : (
            <div className="space-y-3">
              {shareholderOrders.map((ord) => {
                const notaryVal = notaryInputs[ord.id] ?? ord.notaryCode ?? '';
                const notesVal = noteInputs[ord.id] ?? ord.presidentNotes ?? '';
                return (
                  <div key={ord.id} className="conae-panel-soft rounded-xl p-4 space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-white">
                          {ord.userName} ·{' '}
                          <span className="text-amber-300 font-mono">
                            {ord.totalShares.toLocaleString(numLocale)} {tr('ações', 'shares')} ({ord.percentOwnership}%)
                          </span>
                        </p>
                        <p className="text-emerald-200/80">
                          {ord.divisionLabel} · WhatsApp: {ord.userPhone || '—'} · Doc: {ord.userDocument || '—'}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-amber-300">
                        STATUS: {ord.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        placeholder={tr(
                          'Nº Registro / Livro / Folha no Cartório',
                          'Notary Registry / Book / Page Number'
                        )}
                        value={notaryVal}
                        onChange={(e) => setNotaryInputs({ ...notaryInputs, [ord.id]: e.target.value })}
                        className="rounded bg-black/55 border border-amber-400/30 px-2.5 py-1.5 text-white font-mono"
                      />
                      <input
                        placeholder={tr(
                          'Observação da Presidência / Mesa Diretora',
                          'Presidency / Executive Board Notes'
                        )}
                        value={notesVal}
                        onChange={(e) => setNoteInputs({ ...noteInputs, [ord.id]: e.target.value })}
                        className="rounded bg-black/55 border border-amber-400/30 px-2.5 py-1.5 text-white"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(['documentacao', 'cartorio'] as ShareholderOrderStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={async () => {
                            await onUpdateShareholderOrder(ord, {
                              status: st,
                              notaryCode: notaryVal,
                              presidentNotes: notesVal,
                            });
                            setFeedback(
                              tr(
                                `Solicitação de ${ord.userName} atualizada para: ${st.toUpperCase()}.`,
                                `Request from ${ord.userName} updated to: ${st.toUpperCase()}.`
                              )
                            );
                          }}
                          className="px-3 py-1.5 rounded bg-emerald-800/80 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                        >
                          {st === 'documentacao'
                            ? tr('2. Em Documentação', '2. In Documentation')
                            : tr('3. Enviar p/ Cartório', '3. Send to Notary')}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={async () => {
                          await onUpdateShareholderOrder(ord, {
                            status: 'approved',
                            notaryCode: notaryVal || `CARTORIO-CONAE-${ord.id.slice(-4).toUpperCase()}`,
                            presidentNotes:
                              notesVal ||
                              tr(
                                'Escritura registrada em cartório e ações creditadas no painel.',
                                'Deed registered at the notary office and shares credited to panel.'
                              ),
                          });
                          setFeedback(
                            tr(
                              `Ações de ${ord.userName} oficializadas em Cartório e liberadas no painel mobile!`,
                              `Shares for ${ord.userName} notarized and released to mobile panel!`
                            )
                          );
                        }}
                        className="px-3 py-1.5 rounded bg-amber-500 text-neutral-950 font-bold cursor-pointer"
                      >
                        {tr('4. Oficializar Cartório & Liberar Ações', '4. Finalize Notary & Release Shares')}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await onUpdateShareholderOrder(ord, {
                            status: 'rejected',
                            notaryCode: notaryVal,
                            presidentNotes: notesVal,
                          });
                          setFeedback(
                            tr(
                              `Solicitação de ${ord.userName} marcada como recusada.`,
                              `Request from ${ord.userName} marked as rejected.`
                            )
                          );
                        }}
                        className="px-3 py-1.5 rounded bg-red-900/70 text-red-100 cursor-pointer"
                      >
                        {tr('Recusar', 'Reject')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Branching Shareholder Tree Manager (Photos, Master Hélio link, Powers & Treasury Odds) */}
          {onSaveShareholderTreeNode && (
            <div className="pt-5 border-t border-amber-400/25 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-amber-400" />
                    <span>
                      {tr(
                        'Árvore Ramificada de Acionistas & Fotos (Ligação Master Hélio César)',
                        'Branching Shareholder Tree & Portraits (Master Hélio César Link)'
                      )}
                    </span>
                  </h4>
                  <p className="text-xs text-emerald-100/75">
                    {tr(
                      'Insira fotos dos acionistas como modelos de ramificação ligados ao Master Hélio ou Executivos, defina % de ações, poderes de execução na Convenção/app, descontos em hotéis/cursos e probabilidade nos títulos do Tesouro CONAE.',
                      'Insert shareholder portraits as branching models linked to Master Hélio or Executives, set equity %, Convention/app execution powers, hotel/course discounts and CONAE Treasury title probability.'
                    )}
                  </p>
                </div>
                {editingTreeId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTreeId(null);
                      setTreeFullName('');
                      setTreePhotoUrl('');
                      setTreeNotaryCode('');
                    }}
                    className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-xs text-amber-200 cursor-pointer"
                  >
                    {tr('Cancelar Edição', 'Cancel Edit')}
                  </button>
                )}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!treeFullName.trim()) return;
                  setSavingTreeNode(true);
                  try {
                    const clampedShares = Math.min(100000, Math.max(0, Math.floor(Number(treeSharesCount) || 0)));
                    const computedPercent = Number(((clampedShares / 100000) * 100).toFixed(4));
                    await onSaveShareholderTreeNode({
                      id: editingTreeId || undefined,
                      fullName: treeFullName.trim(),
                      branchTitle: treeBranchTitle.trim() || 'Acionista Ramificado CONAE',
                      state: treeState,
                      photoUrl: treePhotoUrl.trim() || undefined,
                      parentNodeId: treeParentNodeId || 'exec_helio',
                      sharesCount: clampedShares,
                      sharePercent: computedPercent,
                      executionPowers: treeExecutionPowers.trim(),
                      hotelDiscountAccess: treeHotelDiscount,
                      coursesAccess: treeCoursesAccess,
                      treasuryTitlesEligible: treeTreasuryEligible,
                      treasuryProbabilityPercent: Math.min(100, Math.max(0, Number(treeTreasuryProb) || 0)),
                      treasuryProbabilityTier: treeTreasuryTier,
                      notaryCode: treeNotaryCode.trim() || undefined,
                      active: true,
                    });
                    setFeedback(
                      tr(
                        `Modelo de acionista "${treeFullName.trim()}" salvo na árvore ramificada!`,
                        `Shareholder model "${treeFullName.trim()}" saved to branching tree!`
                      )
                    );
                    setEditingTreeId(null);
                    setTreeFullName('');
                    setTreePhotoUrl('');
                    setTreeNotaryCode('');
                  } finally {
                    setSavingTreeNode(false);
                  }
                }}
                className="conae-panel-soft rounded-xl p-4 space-y-3 text-xs border border-amber-400/25"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
                  {/* Photo Upload & Live Avatar Preview */}
                  <div className="flex items-center gap-3">
                    <img
                      src={treePhotoUrl || CONAE_ASSETS.emblemHeart}
                      alt={treeFullName || 'Preview'}
                      className="w-14 h-14 rounded-full object-cover border-2 border-amber-400/80 shrink-0 bg-black/50"
                    />
                    <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-black/55 border border-amber-400/35 text-amber-300 hover:bg-emerald-950/60 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{treePhotoUrl ? tr('Foto OK ✓', 'Photo OK ✓') : tr('Inserir Foto', 'Upload Photo')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setTreePhotoUrl(await compressImageFile(f));
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-emerald-100/80 mb-1">
                      {tr('Nome Completo do Acionista', 'Shareholder Full Name')}
                    </label>
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      value={treeFullName}
                      onChange={(e) => setTreeFullName(e.target.value)}
                      placeholder={tr('Ex: Bispo Marcos Aurélio', 'Ex: Bishop Marcos Aurélio')}
                      className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-emerald-100/80 mb-1">
                      {tr('Cargo / Título no Ramo', 'Branch Role / Title')}
                    </label>
                    <input
                      required
                      minLength={2}
                      maxLength={120}
                      value={treeBranchTitle}
                      onChange={(e) => setTreeBranchTitle(e.target.value)}
                      placeholder={tr('Acionista Estratégico CONAE', 'CONAE Strategic Shareholder')}
                      className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-emerald-100/80 mb-1">
                      {tr('Ligado ao Nó Superior (Ramificação)', 'Linked to Parent Node (Branch)')}
                    </label>
                    <select
                      value={treeParentNodeId}
                      onChange={(e) => setTreeParentNodeId(e.target.value)}
                      className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white"
                    >
                      <option value="exec_helio">
                        ★ {EXECUTIVES_TEAM[0].name} (Master Presidente)
                      </option>
                      <option value="exec_samuel">
                        ↳ {EXECUTIVES_TEAM[2].name} (Executivo Financeiro)
                      </option>
                      <option value="exec_cleonice">
                        ↳ {EXECUTIVES_TEAM[1].name} (Executiva Mesa Diretora)
                      </option>
                      {shareholderTree
                        .filter((n) => n.active !== false && n.id !== editingTreeId)
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            ↳ {tr('Sub-ramo de:', 'Sub-branch of:')} {n.fullName}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-emerald-100/80 mb-1">{tr('Estado (UF)', 'State')}</label>
                    <select
                      value={treeState}
                      onChange={(e) => setTreeState(e.target.value)}
                      className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white"
                    >
                      {BRAZILIAN_STATES.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-emerald-100/80 mb-1">
                      {tr('Ações (Base 100.000)', 'Shares (100,000 Basis)')}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      value={treeSharesCount}
                      onChange={(e) => setTreeSharesCount(Math.min(100000, Math.max(0, Number(e.target.value) || 0)))}
                      className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <div className="rounded-lg bg-black/45 border border-amber-400/25 px-3 py-2 flex items-center justify-between text-amber-300 font-mono">
                      <span className="flex items-center gap-1 text-[11px] text-emerald-100/75">
                        <Percent className="w-3 h-3 text-amber-400" />
                        % {tr('Árvore:', 'Tree:')}
                      </span>
                      <strong>{((treeSharesCount / 100000) * 100).toFixed(2)}%</strong>
                    </div>
                  </div>

                  <div>
                    <label className="block text-emerald-100/80 mb-1">
                      {tr('Nível Tesouro Próprio', 'Own Treasury Tier')}
                    </label>
                    <select
                      value={treeTreasuryTier}
                      onChange={(e) => setTreeTreasuryTier(e.target.value as TreasuryProbabilityTier)}
                      className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white"
                    >
                      <option value="Maxima">{tr('Máxima Prioridade', 'Maximum Priority')}</option>
                      <option value="Alta">{tr('Alta Probabilidade', 'High Probability')}</option>
                      <option value="Padrao">{tr('Padrão Elegível', 'Standard Eligible')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-emerald-100/80 mb-1">
                      {tr('Probabilidade Tesouro (%)', 'Treasury Odds (%)')}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={treeTreasuryProb}
                      onChange={(e) => setTreeTreasuryProb(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                      className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="lg:col-span-2">
                    <label className="block text-emerald-100/80 mb-1">
                      {tr(
                        'Poderes de Execução Outorgados (Convenção & Utilidade do App)',
                        'Granted Execution Powers (Convention & App Utilities)'
                      )}
                    </label>
                    <textarea
                      required
                      minLength={4}
                      maxLength={250}
                      rows={2}
                      value={treeExecutionPowers}
                      onChange={(e) => setTreeExecutionPowers(e.target.value)}
                      className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-emerald-100/80 mb-1">
                      {tr('Nº Registro Cartório (Opcional)', 'Notary Registry Code (Optional)')}
                    </label>
                    <input
                      maxLength={80}
                      value={treeNotaryCode}
                      onChange={(e) => setTreeNotaryCode(e.target.value)}
                      placeholder="LIVRO-01-FLS-CONAE"
                      className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-4 text-emerald-100">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={treeHotelDiscount}
                        onChange={(e) => setTreeHotelDiscount(e.target.checked)}
                        className="accent-amber-500"
                      />
                      <span>{tr('Credenciado Descontos Hotéis', 'Accredited Hotel Discounts')}</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={treeCoursesAccess}
                        onChange={(e) => setTreeCoursesAccess(e.target.checked)}
                        className="accent-amber-500"
                      />
                      <span>{tr('Acesso aos Cursos CONAE', 'CONAE Courses Access')}</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={treeTreasuryEligible}
                        onChange={(e) => setTreeTreasuryEligible(e.target.checked)}
                        className="accent-amber-500"
                      />
                      <span>{tr('Contemplado Títulos do Tesouro', 'Treasury Titles Eligible')}</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={savingTreeNode}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold cursor-pointer disabled:opacity-50"
                  >
                    {savingTreeNode
                      ? tr('Salvando...', 'Saving...')
                      : editingTreeId
                      ? tr('Atualizar Acionista na Árvore', 'Update Tree Shareholder')
                      : tr('Inserir Foto & Acionista na Árvore', 'Insert Photo & Tree Shareholder')}
                  </button>
                </div>
              </form>

              {/* List of current active tree nodes (compact scrollable area) */}
              <div className="max-h-72 overflow-y-auto conae-scroll pr-1.5 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {shareholderTree
                  .filter((n) => n.active !== false)
                  .map((node) => (
                    <div
                      key={node.id}
                      className="conae-panel-soft rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs border border-amber-400/20"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <img
                          src={node.photoUrl || CONAE_ASSETS.emblemHeart}
                          alt={node.fullName}
                          className="w-12 h-12 rounded-full object-cover border border-amber-400/70 shrink-0"
                        />
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-bold text-white truncate">
                            {node.fullName}{' '}
                            <span className="text-amber-300 font-mono">({node.sharePercent.toFixed(2)}%)</span>
                          </p>
                          <p className="text-[11px] text-emerald-200/80 truncate">{node.branchTitle}</p>
                          <p className="text-[10px] text-amber-200/80 font-mono">
                            {tr('Tesouro:', 'Treasury:')} {node.treasuryProbabilityPercent}% ({node.treasuryProbabilityTier}) · {node.state}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTreeId(node.id);
                            setTreeFullName(node.fullName);
                            setTreeBranchTitle(node.branchTitle);
                            setTreeState(node.state);
                            setTreePhotoUrl(node.photoUrl || '');
                            setTreeParentNodeId(node.parentNodeId);
                            setTreeSharesCount(node.sharesCount);
                            setTreeExecutionPowers(node.executionPowers);
                            setTreeHotelDiscount(node.hotelDiscountAccess);
                            setTreeCoursesAccess(node.coursesAccess);
                            setTreeTreasuryEligible(node.treasuryTitlesEligible);
                            setTreeTreasuryProb(node.treasuryProbabilityPercent);
                            setTreeTreasuryTier(node.treasuryProbabilityTier);
                            setTreeNotaryCode(node.notaryCode || '');
                          }}
                          className="p-1.5 rounded bg-emerald-800/75 hover:bg-emerald-700 text-white cursor-pointer"
                          title={tr('Editar acionista na árvore', 'Edit tree shareholder')}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteShareholderTreeNode && (
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteShareholderTreeNode(node.id);
                              setFeedback(
                                tr(
                                  `Acionista "${node.fullName}" removido da árvore ramificada.`,
                                  `Shareholder "${node.fullName}" removed from branching tree.`
                                )
                              );
                            }}
                            className="p-1.5 rounded bg-red-900/75 hover:bg-red-800 text-red-100 cursor-pointer"
                            title={tr('Remover da árvore', 'Remove from tree')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: Registered Users, Monthly Quota Cleanup, Bank CONAE Patrimony & Gold Cards (President Only) */}
      {isPresidentMode && adminSection === 'patrimonio' && (
        <div className="conae-panel rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <UserCog className="w-5 h-5 text-amber-400" />
                <span>
                  {tr(
                    'Cadastrados, Cota Mensal, Investimentos & Cartão Dourado',
                    'Members, Monthly Quota, Investments & Gold Card'
                  )}
                </span>
              </h3>
              <p className="text-xs text-emerald-100/75">
                {tr(
                  'Gerencie patrimônio, Cartão Dourado, cota mensal e exclua cadastros que não pagaram a cota mensalmente.',
                  'Manage equity, Gold Card, monthly quota and remove registrations that have not paid their monthly quota.'
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() =>
                  downloadCsvFile(
                    'conae_investimentos_afiliados.csv',
                    isEn
                      ? ['UID', 'Name', 'Email', 'State', 'Role', 'Tier', 'Monthly Quota', 'BRL', 'USD', 'CNEC', 'Shares', 'Virtual Card', 'Gold Card']
                      : ['UID', 'Nome', 'Email', 'UF', 'Cargo', 'Tier', 'Cota Mensal', 'BRL', 'USD', 'CNEC', 'Ações', 'Cartão Virtual', 'Cartão Dourado'],
                    usersList.map((u) => [
                      u.uid,
                      u.displayName,
                      u.email,
                      u.state,
                      u.role,
                      u.vipTier,
                      u.monthlyPlanActive ? tr('Paga', 'Paid') : tr('Não Paga', 'Unpaid'),
                      u.balanceBRL ?? 0,
                      u.balanceUSD ?? 0,
                      u.cnecTokens ?? 0,
                      u.sharesOwned ?? 0,
                      u.virtualCardActive ? tr('Sim', 'Yes') : tr('Não', 'No'),
                      u.executiveCardActive ? tr('Sim', 'Yes') : tr('Não', 'No'),
                    ])
                  )
                }
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded conae-panel-soft text-amber-300 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {tr('Baixar CSV Bank CONAE', 'Download Bank CONAE CSV')}
              </button>
              <button
                type="button"
                onClick={() => downloadJsonFile('conae_investimentos_afiliados.json', usersList)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded conae-panel-soft text-emerald-200 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                JSON
              </button>
            </div>
          </div>

          {/* Monthly Quota Filter & Bulk Delete Unpaid Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-amber-400/15 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setUserFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  userFilter === 'all'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'conae-panel-soft text-emerald-100/80 hover:text-white'
                }`}
              >
                {tr('Todos', 'All')} ({usersList.length})
              </button>
              <button
                type="button"
                onClick={() => setUserFilter('unpaid')}
                className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  userFilter === 'unpaid'
                    ? 'bg-red-600 text-white'
                    : 'conae-panel-soft text-red-200 hover:text-white'
                }`}
              >
                {tr('Não Pagaram Cota Mensal', 'Unpaid Monthly Quota')} ({unpaidDeletableUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setUserFilter('paid')}
                className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  userFilter === 'paid'
                    ? 'bg-emerald-600 text-white'
                    : 'conae-panel-soft text-emerald-200 hover:text-white'
                }`}
              >
                {tr('Cota Mensal Paga', 'Monthly Quota Paid')} ({paidUsersCount})
              </button>
            </div>

            {unpaidDeletableUsers.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {!confirmBulkDelete ? (
                  <button
                    type="button"
                    disabled={deletingUsers}
                    onClick={() => setConfirmBulkDelete(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/80 hover:bg-red-800 border border-red-400/40 text-red-100 font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {tr('Deletar Todos sem Cota Mensal', 'Delete All Without Monthly Quota')} ({unpaidDeletableUsers.length})
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-red-950/80 border border-red-400/50 rounded-lg px-3 py-1.5">
                    <span className="text-red-200 font-semibold">
                      {tr(
                        `Excluir ${unpaidDeletableUsers.length} não pagante(s)?`,
                        `Delete ${unpaidDeletableUsers.length} unpaid member(s)?`
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={deletingUsers}
                      onClick={async () => {
                        setDeletingUsers(true);
                        try {
                          const removed = await onDeleteAllUnpaidUsers(unpaidDeletableUsers);
                          setFeedback(
                            tr(
                              `${removed} cadastro(s) sem pagamento da cota mensal foram deletados.`,
                              `${removed} registration(s) without monthly quota payment were deleted.`
                            )
                          );
                        } finally {
                          setDeletingUsers(false);
                          setConfirmBulkDelete(false);
                        }
                      }}
                      className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer"
                    >
                      {deletingUsers ? tr('Deletando...', 'Deleting...') : tr('Confirmar', 'Confirm')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmBulkDelete(false)}
                      className="px-2 py-1 rounded bg-black/50 text-emerald-100 cursor-pointer"
                    >
                      {tr('Cancelar', 'Cancel')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-amber-400/20 text-amber-300">
                <tr>
                  <th className="py-2 pr-3">{tr('Filiado / Executivo', 'Member / Executive')}</th>
                  <th className="py-2 pr-3">{tr('UF · Cargo', 'State · Role')}</th>
                  <th className="py-2 pr-3">{tr('Cota Mensal', 'Monthly Quota')}</th>
                  <th className="py-2 pr-3 text-right">{tr('Saldo BRL', 'BRL Balance')}</th>
                  <th className="py-2 pr-3 text-right">USD</th>
                  <th className="py-2 pr-3 text-right">CNEC</th>
                  <th className="py-2 pr-3 text-right">{tr('Ações', 'Shares')}</th>
                  <th className="py-2 pr-3">{tr('Cartões', 'Cards')}</th>
                  <th className="py-2 text-right">{tr('Ação', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-400/10">
                {filteredUsersList.map((u) => {
                  const canDeleteUnpaid =
                    !u.monthlyPlanActive &&
                    u.role !== 'president' &&
                    u.email !== BOOTSTRAPPED_ADMIN_EMAIL;
                  return (
                    <tr key={u.uid} className="hover:bg-white/5">
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold text-white">{u.displayName}</p>
                        <p className="text-[11px] text-emerald-200/65 font-mono">{u.email} · {u.uid.slice(0, 8)}...</p>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-emerald-100">
                        {u.state} · {u.role} · {translateDynamic(u.vipTier)}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[11px]">
                        {u.monthlyPlanActive || u.role === 'president' || u.email === BOOTSTRAPPED_ADMIN_EMAIL ? (
                          <span className="text-emerald-400 font-semibold">{tr('Cota Paga ✓', 'Quota Paid ✓')}</span>
                        ) : (
                          <span className="text-red-300 font-semibold">{tr('Não Pagou ✕', 'Unpaid ✕')}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-white">
                        R$ {(u.balanceBRL ?? 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-amber-300">
                        US$ {(u.balanceUSD ?? 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-emerald-300">
                        {(u.cnecTokens ?? 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-amber-200">
                        {(u.sharesOwned ?? 0).toLocaleString(numLocale)}
                      </td>
                      <td className="py-2.5 pr-3 text-[11px]">
                        {u.executiveCardActive
                          ? tr('Dourado Executivo', 'Executive Gold')
                          : u.virtualCardActive
                          ? tr('Virtual Ativo', 'Active Virtual')
                          : tr('Bloqueado', 'Locked')}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openPatrimonyEditor(u)}
                            className="px-2.5 py-1 rounded bg-amber-500 text-neutral-950 font-semibold cursor-pointer"
                          >
                            {tr('Editar', 'Edit')}
                          </button>
                          {canDeleteUnpaid && (
                            confirmDeleteUid === u.uid ? (
                              <span className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={deletingUsers}
                                  onClick={async () => {
                                    setDeletingUsers(true);
                                    try {
                                      await onDeleteUnpaidUser(u);
                                      setFeedback(
                                        tr(
                                          `Cadastro de ${u.displayName} deletado por falta de pagamento mensal.`,
                                          `Registration for ${u.displayName} deleted for missed monthly payment.`
                                        )
                                      );
                                    } finally {
                                      setDeletingUsers(false);
                                      setConfirmDeleteUid(null);
                                    }
                                  }}
                                  className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer"
                                >
                                  {tr('Confirmar', 'Confirm')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteUid(null)}
                                  className="px-2 py-1 rounded bg-black/60 text-emerald-100 cursor-pointer"
                                >
                                  {tr('Não', 'No')}
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteUid(u.uid)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-900/80 hover:bg-red-800 text-red-100 font-semibold cursor-pointer"
                                title={tr(
                                  'Deletar cadastrado que não pagou a cota mensal',
                                  'Delete member who did not pay monthly quota'
                                )}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {tr('Deletar', 'Delete')}
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {editingUser && (
            <form onSubmit={handleSavePatrimony} className="conae-panel-soft rounded-xl p-4 space-y-3 border border-amber-400/40">
              <h4 className="text-sm font-bold text-amber-300">
                {tr(
                  `Configurar Investimento, Ações e Cartões: ${editingUser.displayName}`,
                  `Configure Investment, Shares and Cards: ${editingUser.displayName}`
                )}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div>
                  <label className="block text-emerald-100/80 mb-1">{tr('Saldo BRL', 'BRL Balance')}</label>
                  <input type="number" step="0.01" value={editBRL} onChange={(e) => setEditBRL(e.target.value)} className="w-full rounded bg-black/60 border border-amber-400/30 px-2.5 py-1.5 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-emerald-100/80 mb-1">{tr('Saldo USD', 'USD Balance')}</label>
                  <input type="number" step="0.01" value={editUSD} onChange={(e) => setEditUSD(e.target.value)} className="w-full rounded bg-black/60 border border-amber-400/30 px-2.5 py-1.5 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-emerald-100/80 mb-1">{tr('Moedas CNEC', 'CNEC Coins')}</label>
                  <input type="number" step="0.01" value={editCNEC} onChange={(e) => setEditCNEC(e.target.value)} className="w-full rounded bg-black/60 border border-amber-400/30 px-2.5 py-1.5 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-emerald-100/80 mb-1">{tr('Ações (de 100k)', 'Shares (of 100k)')}</label>
                  <input type="number" min={0} max={100000} value={editShares} onChange={(e) => setEditShares(e.target.value)} className="w-full rounded bg-black/60 border border-amber-400/30 px-2.5 py-1.5 text-amber-300 font-mono" />
                </div>
                <div>
                  <label className="block text-emerald-100/80 mb-1">{tr('Cartório Registro', 'Notary Record')}</label>
                  <input value={editNotaryCode} onChange={(e) => setEditNotaryCode(e.target.value)} placeholder={tr('Livro/Folha', 'Book/Page')} className="w-full rounded bg-black/60 border border-amber-400/30 px-2.5 py-1.5 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-emerald-100/80 mb-1">{tr('Nível VIP', 'VIP Tier')}</label>
                  <select value={editTier} onChange={(e) => setEditTier(e.target.value as VipTier)} className="w-full rounded bg-black/60 border border-amber-400/30 px-2.5 py-1.5 text-white">
                    {(['Padrao', 'Prata', 'Ouro', 'Diamante'] as VipTier[]).map((t) => (
                      <option key={t} value={t} className="bg-[#061610]">{translateDynamic(t)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-xs pt-1">
                <label className="inline-flex items-center gap-2 text-white cursor-pointer">
                  <input type="checkbox" checked={editCard} onChange={(e) => setEditCard(e.target.checked)} className="accent-amber-400" />
                  {tr('Cartão Virtual Liberado', 'Virtual Card Enabled')}
                </label>
                <label className="inline-flex items-center gap-2 text-amber-300 font-semibold cursor-pointer">
                  <input type="checkbox" checked={editGoldCard} onChange={(e) => setEditGoldCard(e.target.checked)} className="accent-amber-400" />
                  {tr('Cartão Dourado Executivo Ativo', 'Executive Gold Card Active')}
                </label>
                <label className="inline-flex items-center gap-2 text-white cursor-pointer">
                  <input type="checkbox" checked={editMonthly} onChange={(e) => setEditMonthly(e.target.checked)} className="accent-amber-400" />
                  {tr('Mensalidade Ativa (Hotéis/Farmácias)', 'Active Monthly Plan (Hotels/Pharmacies)')}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-100/80">{tr('Perfil:', 'Role:')}</span>
                  <select value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)} className="rounded bg-black/60 border border-amber-400/30 px-2 py-1 text-white">
                    {(['affiliate', 'staff', 'executive', 'president'] as UserRole[]).map((r) => (
                      <option key={r} value={r} className="bg-[#061610]">{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {onDeleteAnyUser &&
                editingUser.role !== 'president' &&
                editingUser.email !== BOOTSTRAPPED_ADMIN_EMAIL ? (
                  <button
                    type="button"
                    disabled={deletingUsers}
                    onClick={async () => {
                      setDeletingUsers(true);
                      try {
                        await onDeleteAnyUser(editingUser.uid);
                        setFeedback(
                          tr(
                            `Cadastro de ${editingUser.displayName} excluído com sucesso.`,
                            `Registration for ${editingUser.displayName} deleted successfully.`
                          )
                        );
                        setEditingUser(null);
                      } finally {
                        setDeletingUsers(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-900/80 hover:bg-red-800 text-red-100 font-semibold text-xs cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {tr('Excluir Cadastro', 'Delete Registration')}
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditingUser(null)} className="px-3 py-1.5 text-xs text-emerald-200 cursor-pointer">
                    {tr('Cancelar', 'Cancel')}
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded bg-amber-500 text-neutral-950 font-semibold text-xs cursor-pointer">
                    {tr('Salvar Alterações', 'Save Changes')}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* SECTION 4: Password Manager (Gerenciador de Senhas) & Gold Executive VIP Passes (President Only) */}
      {isPresidentMode && adminSection === 'senhas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onCreateCredentialPass({
                targetUid: passTargetUid.trim() || undefined,
                holderName: passHolderName.trim(),
                holderEmail: passHolderEmail.trim() || undefined,
                passType,
                issuedPasswordPlain: passPlain.trim(),
                hotelName: passHotelName.trim() || undefined,
                goldenCardActive: passGoldCard || passType === 'Executivo VIP',
                monthlyPaid: passMonthlyPaid,
                notes: passNotes.trim() || undefined,
              });
              setPassHolderName('');
              setPassHolderEmail('');
              setPassPlain('');
              setPassHotelName('');
              setPassNotes('');
              setFeedback(
                passType === 'Executivo VIP'
                  ? tr(
                      'Senha de Executivo gerada! O Executivo poderá salvar cadastros e liberar pacotes, cartão de desconto, cripto e investimentos.',
                      'Executive password issued! The Executive can save listings and release packages, discount card, crypto and investments.'
                    )
                  : tr(
                      'Senha gerada e registrada no Gerenciador da Presidência!',
                      'Password generated and saved in Presidency Manager!'
                    )
              );
            }}
            className="lg:col-span-5 conae-panel rounded-xl p-5 space-y-3 text-xs"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span>
                {tr(
                  'Gerar Senha aos Executivos & Credencial Dourada',
                  'Issue Executive Password & Gold Credential'
                )}
              </span>
            </h3>
            <p className="text-[11px] text-emerald-100/75 leading-relaxed">
              {isEn ? (
                <>
                  Link a registered user and choose <strong className="text-amber-300">VIP Room Executive (Gold)</strong> to issue their Executive password (for saving listings and releasing packages, discount cards, crypto and investments only).
                </>
              ) : (
                <>
                  Vincule um usuário cadastrado e escolha <strong className="text-amber-300">Executivo Sala VIP (Dourado)</strong> para liberar sua senha de Executivo (somente salvar cadastros e liberar pacotes, cartão de desconto, cripto e investimentos).
                </>
              )}
            </p>

            <div>
              <label className="block text-emerald-100/80 mb-1">
                {tr('Vincular a Cadastrado (Opcional)', 'Link to Registered User (Optional)')}
              </label>
              <select
                value={passTargetUid}
                onChange={(e) => {
                  const uid = e.target.value;
                  setPassTargetUid(uid);
                  const found = usersList.find((u) => u.uid === uid);
                  if (found) {
                    setPassHolderName(found.displayName);
                    setPassHolderEmail(found.email);
                  }
                }}
                className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white"
              >
                <option value="" className="bg-[#061610]">
                  {tr('Selecionar cadastrado (ou digitar abaixo)', 'Select registered user (or type below)')}
                </option>
                {usersList.map((u) => (
                  <option key={u.uid} value={u.uid} className="bg-[#061610]">
                    {u.displayName} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input required placeholder={tr('Nome do Titular', 'Holder Name')} value={passHolderName} onChange={(e) => setPassHolderName(e.target.value)} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
              <select value={passType} onChange={(e) => setPassType(e.target.value as typeof passType)} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white">
                <option value="Afiliado" className="bg-[#061610]">{tr('Afiliado Mensal', 'Monthly Affiliate')}</option>
                <option value="Executivo VIP" className="bg-[#061610]">{tr('Executivo Sala VIP (Dourado)', 'VIP Room Executive (Gold)')}</option>
                <option value="Hoteleiro" className="bg-[#061610]">{tr('Hoteleiro / Rede Hotel', 'Hotelier / Hotel Network')}</option>
              </select>
            </div>

            <div className="flex gap-2">
              <input required minLength={4} placeholder={tr('Senha Gerada (ex: CN-8X2K91)', 'Generated Password (e.g. CN-8X2K91)')} value={passPlain} onChange={(e) => setPassPlain(e.target.value)} className="flex-1 rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-amber-300 font-mono" />
              <button type="button" onClick={generateRandomPassword} className="px-3 py-2 rounded-lg conae-panel-soft text-amber-300 hover:text-white font-semibold cursor-pointer whitespace-nowrap">
                {tr('Gerar Aleatória', 'Generate Random')}
              </button>
            </div>

            <input placeholder={tr('Hotel vinculado (Opcional)', 'Linked hotel (Optional)')} value={passHotelName} onChange={(e) => setPassHotelName(e.target.value)} className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
            <input placeholder={tr('E-mail / Notas de acesso (Opcional)', 'Email / Access notes (Optional)')} value={passNotes} onChange={(e) => setPassNotes(e.target.value)} className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />

            <div className="flex flex-wrap gap-4 pt-1">
              <label className="inline-flex items-center gap-2 text-amber-300 font-semibold cursor-pointer">
                <input type="checkbox" checked={passGoldCard || passType === 'Executivo VIP'} onChange={(e) => setPassGoldCard(e.target.checked)} className="accent-amber-400" />
                {tr('Cartão Dourado Ativo', 'Active Gold Card')}
              </label>
              <label className="inline-flex items-center gap-2 text-white cursor-pointer">
                <input type="checkbox" checked={passMonthlyPaid} onChange={(e) => setPassMonthlyPaid(e.target.checked)} className="accent-amber-400" />
                {tr('Mensalidade Paga (Cursos/Descontos)', 'Monthly Plan Paid (Courses/Discounts)')}
              </label>
            </div>

            <button type="submit" className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-bold cursor-pointer">
              {tr('Salvar & Liberar Senha no Cofre', 'Save & Issue Password to Vault')}
            </button>
          </form>

          <div className="lg:col-span-7 conae-panel rounded-xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>
                  {tr(
                    `Gerenciador de Senhas Emitidas (${credentialPasses.length})`,
                    `Issued Password Manager (${credentialPasses.length})`
                  )}
                </span>
              </h3>
              <button
                type="button"
                onClick={() =>
                  downloadCsvFile(
                    'conae_senhas_emitidas.csv',
                    isEn
                      ? ['ID', 'Holder', 'Type', 'Password', 'Hotel', 'Gold Card', 'Monthly Paid']
                      : ['ID', 'Titular', 'Tipo', 'Senha', 'Hotel', 'Cartão Dourado', 'Mensalidade Paga'],
                    credentialPasses.map((c) => [
                      c.id,
                      c.holderName,
                      c.passType,
                      c.issuedPasswordPlain,
                      c.hotelName || '',
                      c.goldenCardActive ? tr('Sim', 'Yes') : tr('Não', 'No'),
                      c.monthlyPaid ? tr('Sim', 'Yes') : tr('Não', 'No'),
                    ])
                  )
                }
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded conae-panel-soft text-xs text-amber-300 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {tr('Exportar CSV', 'Export CSV')}
              </button>
            </div>

            {credentialPasses.length === 0 ? (
              <p className="text-xs text-emerald-100/65">
                {tr('Nenhuma senha individual emitida ainda.', 'No individual passwords issued yet.')}
              </p>
            ) : (
              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {credentialPasses.map((cp) => (
                  <div key={cp.id} className="conae-panel-soft rounded-lg p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-semibold text-white truncate">
                        {cp.holderName} · <span className="text-amber-300">{translateDynamic(cp.passType)}</span>
                        {cp.goldenCardActive ? tr(' · Cartão Dourado', ' · Gold Card') : ''}
                      </p>
                      <p className="font-mono text-emerald-200/80">
                        {tr('Senha:', 'Password:')} <strong className="text-white">{cp.issuedPasswordPlain}</strong>
                        {cp.hotelName ? ` · Hotel: ${cp.hotelName}` : ''} ·{' '}
                        {cp.monthlyPaid ? tr('Mensalidade OK', 'Monthly OK') : tr('Pendente', 'Pending')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(cp.issuedPasswordPlain)}
                        aria-label={tr('Copiar senha', 'Copy password')}
                        className="p-1.5 rounded bg-black/40 text-amber-300 hover:text-white cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCredentialPass(cp.id)}
                        aria-label={tr('Revogar senha', 'Revoke password')}
                        className="p-1.5 rounded bg-red-900/50 text-red-300 hover:text-white cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 5: Executive PIX & Monthly VIP Password (President Only) */}
      {isPresidentMode && adminSection === 'pix_vip' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="conae-panel rounded-xl p-5 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Landmark className="w-5 h-5 text-amber-400" />
              <span>{tr('Cadastro de Chaves PIX (Recebimentos Diretoria)', 'PIX Keys Registry (Board Receipts)')}</span>
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onSaveExecutivePix({
                  executiveName: pixExecName,
                  executiveRole: pixExecRole,
                  bankName: pixBank,
                  pixKey,
                  pixType,
                  city: pixCity,
                  active: true,
                });
                setPixExecName('');
                setPixKey('');
                setFeedback(
                  tr(
                    'Chave PIX executiva cadastrada para recebimento de pacotes.',
                    'Executive PIX key saved for package receipts.'
                  )
                );
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input required placeholder={tr('Nome do Executivo', 'Executive Name')} value={pixExecName} onChange={(e) => setPixExecName(e.target.value)} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
                <input required placeholder={tr('Cargo', 'Role')} value={pixExecRole} onChange={(e) => setPixExecRole(e.target.value)} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
                <input required placeholder={tr('Banco (ex: Banco Inter 077)', 'Bank (e.g. Banco Inter 077)')} value={pixBank} onChange={(e) => setPixBank(e.target.value)} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
                <select value={pixType} onChange={(e) => setPixType(e.target.value as typeof pixType)} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white">
                  {(['Email', 'CPF', 'CNPJ', 'Telefone', 'Aleatoria'] as const).map((t) => (
                    <option key={t} value={t} className="bg-[#061610]">{t}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input required placeholder={tr('Chave PIX', 'PIX Key')} value={pixKey} onChange={(e) => setPixKey(e.target.value)} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white font-mono" />
                <input required placeholder={tr('Cidade', 'City')} value={pixCity} onChange={(e) => setPixCity(e.target.value)} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
              </div>
              <button type="submit" className="w-full py-2 rounded-lg bg-amber-500 text-neutral-950 font-semibold cursor-pointer">
                {tr('Adicionar PIX Executivo', 'Add Executive PIX')}
              </button>
            </form>

            <div className="space-y-2 pt-2">
              {executivePixList.map((ep) => (
                <div key={ep.id} className="conae-panel-soft rounded-lg p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-white">{ep.executiveName} · {ep.bankName}</p>
                    <p className="font-mono text-emerald-200/75">{ep.pixType}: {ep.pixKey}</p>
                  </div>
                  <button type="button" onClick={() => onDeleteExecutivePix(ep.id)} aria-label={tr('Remover PIX', 'Remove PIX')} className="p-1.5 text-red-300 hover:text-red-200 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="conae-panel rounded-xl p-5 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <span>
                {tr(
                  'Senha Mensal da Sala VIP & Sinal dos Acionistas',
                  'Monthly VIP Room Password & Shareholder Signal'
                )}
              </span>
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onUpdateVipSettings({
                  monthLabel: vipMonth,
                  plainPassword: vipPass,
                  buySignalTitle: vipSignalTitle,
                  buySignalAsset: vipSignalAsset,
                  buySignalTargetBRL: Number(vipSignalTarget) || 6.4,
                });
                setFeedback(
                  tr(
                    `Senha mensal da Sala VIP (${vipMonth}) atualizada com segurança.`,
                    `VIP Room monthly password (${vipMonth}) updated securely.`
                  )
                );
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-emerald-100/80 mb-1">{tr('Mês de Vigência', 'Active Month')}</label>
                <input required value={vipMonth} onChange={(e) => setVipMonth(e.target.value)} className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-emerald-100/80 mb-1">
                  {tr('Senha Mensal de Acesso à Sala VIP', 'Monthly VIP Room Access Password')}
                </label>
                <input required minLength={4} value={vipPass} onChange={(e) => setVipPass(e.target.value)} className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-amber-300 font-mono" />
              </div>
              <div>
                <label className="block text-emerald-100/80 mb-1">
                  {tr('Indicativo de Compra (Acionistas)', 'Buy Signal (Shareholders)')}
                </label>
                <input required value={vipSignalTitle} onChange={(e) => setVipSignalTitle(e.target.value)} className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-emerald-100/80 mb-1">{tr('Ativo', 'Asset')}</label>
                  <input required value={vipSignalAsset} onChange={(e) => setVipSignalAsset(e.target.value)} className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-emerald-100/80 mb-1">{tr('Alvo (R$)', 'Target (BRL)')}</label>
                  <input required type="number" step="0.01" value={vipSignalTarget} onChange={(e) => setVipSignalTarget(e.target.value)} className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white font-mono" />
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-semibold cursor-pointer">
                {tr('Atualizar Senha Mensal & Sinal VIP', 'Update Monthly Password & VIP Signal')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 6: Insert, Upload Photos, JSON Import & CSV/JSON Downloads */}
      {adminSection === 'cadastros' && (
        <div className="space-y-6">
          {!isPresidentMode && (
            <div className="conae-panel-soft rounded-xl px-4 py-3 text-xs text-emerald-100 border border-amber-400/35">
              {isEn ? (
                <>
                  Executive Mode ({authorizedLabel}): active permission to <strong className="text-amber-300">save new listings</strong> for Hotels, Courses, Businesses/Pharmacies and Sponsors. Deletions remain restricted to the President.
                </>
              ) : (
                <>
                  Modo Executivo ({authorizedLabel}): permissão ativa para <strong className="text-amber-300">salvar novos cadastros</strong> de Hotéis, Cursos, Comércios/Farmácias e Patrocinadores. Exclusões permanecem restritas ao Presidente.
                </>
              )}
            </div>
          )}

          {/* Booking.com Partner Token Connection Panel */}
          {onUpdateBookingTokenConfig && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSavingBookingCfg(true);
                try {
                  await onUpdateBookingTokenConfig({
                    connected: bookingConnected,
                    partnerAid: bookingAid.trim(),
                    tokenPrefix: bookingPrefix.trim(),
                    activeBookingToken: bookingActiveToken.trim(),
                    bookingApiToken: bookingApiTokenInput.trim() || bookingSecret?.bookingApiToken || 'CONAE_BOOKING_LIVE',
                    defaultDiscountPercent: bookingDefaultDiscount,
                  });
                  setFeedback(
                    tr(
                      'Conexão Token Booking.com salva e sincronizada na aba flutuante!',
                      'Booking.com Token connection saved and synced to the floating tab!'
                    )
                  );
                } finally {
                  setSavingBookingCfg(false);
                }
              }}
              className="conae-panel rounded-xl p-5 space-y-3 text-xs border border-[#006CE4]/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-[#003580] border border-[#006CE4] text-white font-bold text-xs">
                    Booking.com
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {tr('Conexão Token Booking.com (Hospedagem CONAE)', 'Booking.com Token Connection (CONAE Lodging)')}
                  </h3>
                </div>
                <span className="font-mono text-[11px] text-sky-200">
                  {bookingSecret?.tokenMasked
                    ? tr(`Token salvo: ${bookingSecret.tokenMasked}`, `Saved token: ${bookingSecret.tokenMasked}`)
                    : tr('Configure seu Token API / AID', 'Configure your API Token / AID')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                <div>
                  <label className="block text-emerald-100/80 mb-1">{tr('Partner AID (Booking)', 'Partner AID (Booking)')}</label>
                  <input
                    required
                    value={bookingAid}
                    onChange={(e) => setBookingAid(e.target.value)}
                    placeholder="2408915"
                    className="w-full rounded-lg bg-black/55 border border-[#006CE4]/40 px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-emerald-100/80 mb-1">{tr('Prefixo Token Reserva', 'Booking Token Prefix')}</label>
                  <input
                    required
                    value={bookingPrefix}
                    onChange={(e) => setBookingPrefix(e.target.value)}
                    placeholder="BKG-CNEC"
                    className="w-full rounded-lg bg-black/55 border border-[#006CE4]/40 px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-emerald-100/80 mb-1">{tr('Token Mestre Flutuante', 'Floating Master Token')}</label>
                  <input
                    required
                    value={bookingActiveToken}
                    onChange={(e) => setBookingActiveToken(e.target.value)}
                    placeholder="BKG-CNEC-2026-VIP"
                    className="w-full rounded-lg bg-black/55 border border-[#006CE4]/40 px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-emerald-100/80 mb-1">{tr('Token Secreto API Booking', 'Booking Secret API Token')}</label>
                  <input
                    type="password"
                    value={bookingApiTokenInput}
                    onChange={(e) => setBookingApiTokenInput(e.target.value)}
                    placeholder={bookingSecret?.tokenMasked || tr('Cole o token da Booking.com', 'Paste Booking.com API token')}
                    className="w-full rounded-lg bg-black/55 border border-[#006CE4]/40 px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-emerald-100/80 mb-1">{tr('Desconto Padrão (%)', 'Default Discount (%)')}</label>
                  <input
                    type="number"
                    min={0}
                    max={80}
                    value={bookingDefaultDiscount}
                    onChange={(e) => setBookingDefaultDiscount(Number(e.target.value) || 0)}
                    className="w-full rounded-lg bg-black/55 border border-[#006CE4]/40 px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-emerald-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bookingConnected}
                    onChange={(e) => setBookingConnected(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span>{tr('Conexão Booking.com ativa na aba flutuante esquerda', 'Booking.com connection active in left floating tab')}</span>
                </label>

                <button
                  type="submit"
                  disabled={savingBookingCfg}
                  className="px-4 py-2 rounded-lg bg-[#003580] hover:bg-[#0048a8] border border-[#006CE4] text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {savingBookingCfg
                    ? tr('Salvando...', 'Saving...')
                    : tr('Conectar & Salvar Token Booking', 'Connect & Save Booking Token')}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1. Partner Hotel Form with Multi-Photo Gallery + Export/Import */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const cleanGallery = hotelGalleryPhotos.filter(Boolean).slice(0, 4);

                if (editingHotelId && onSaveHotelGpsAndPhotos) {
                  const original = hotels.find((h) => h.id === editingHotelId);
                  await onSaveHotelGpsAndPhotos({
                    id: editingHotelId,
                    name: hotelName.trim(),
                    city: hotelCity.trim(),
                    state: hotelState,
                    category: hotelCategory,
                    stars: hotelStars,
                    discountPercent: hotelDiscount,
                    description: hotelDesc.trim(),
                    hotelBenefits: hotelBenefits.trim() || undefined,
                    photoUrl: hotelPhotoUrl.trim() || undefined,
                    galleryPhotos: cleanGallery.length > 0 ? cleanGallery : undefined,
                    active: original?.active ?? true,
                  });
                  setFeedback(
                    tr(
                      `Hotel "${hotelName.trim()}" atualizado com Galeria de Fotos!`,
                      `Hotel "${hotelName.trim()}" updated with Photo Gallery!`
                    )
                  );
                } else {
                  await onCreateHotel({
                    name: hotelName.trim(),
                    city: hotelCity.trim(),
                    state: hotelState,
                    category: hotelCategory,
                    stars: hotelStars,
                    discountPercent: hotelDiscount,
                    description: hotelDesc.trim(),
                    hotelBenefits: hotelBenefits.trim() || undefined,
                    photoUrl: hotelPhotoUrl.trim() || undefined,
                    galleryPhotos: cleanGallery.length > 0 ? cleanGallery : undefined,
                    active: true,
                  });
                  setFeedback(
                    tr(
                      'Hotel cadastrado com galeria de fotos e cartão credenciado!',
                      'Hotel published with photo gallery and accredited card!'
                    )
                  );
                }

                setEditingHotelId(null);
                setHotelName('');
                setHotelCity('');
                setHotelDesc('');
                setHotelPhotoUrl('');
                setHotelGalleryPhotos([]);
              }}
              className="conae-panel rounded-xl p-5 space-y-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-white">
                  {tr(`Hotéis & Galeria de Fotos (${hotels.length})`, `Hotels & Photo Gallery (${hotels.length})`)}
                </h3>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => downloadJsonFile('conae_hoteis.json', hotels)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded conae-panel-soft text-amber-300 cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> JSON
                  </button>
                  <label className="inline-flex items-center gap-1 px-2 py-1 rounded conae-panel-soft text-emerald-300 cursor-pointer">
                    <FileUp className="w-3 h-3" /> {tr('Importar JSON', 'Import JSON')}
                    <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && handleImportJsonCatalog(e.target.files[0], 'hotels')} />
                  </label>
                </div>
              </div>

              {editingHotelId && (
                <div className="rounded-lg bg-amber-500/15 border border-amber-400/50 px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-amber-200 font-semibold truncate">
                    {tr('Editando Fotos & Dados:', 'Editing Photos & Details:')} {hotelName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingHotelId(null);
                      setHotelName('');
                      setHotelCity('');
                      setHotelDesc('');
                      setHotelPhotoUrl('');
                      setHotelGalleryPhotos([]);
                    }}
                    className="text-xs text-red-300 hover:text-white font-semibold cursor-pointer shrink-0"
                  >
                    {tr('Cancelar Edição', 'Cancel Edit')}
                  </button>
                </div>
              )}

              <input required placeholder={tr('Nome do Hotel ou Clube', 'Hotel or Club Name')} value={hotelName} onChange={(e) => setHotelName(e.target.value)} className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
              <div className="grid grid-cols-2 gap-2.5">
                <input required placeholder={tr('Cidade', 'City')} value={hotelCity} onChange={(e) => setHotelCity(e.target.value)} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
                <select value={hotelState} onChange={(e) => setHotelState(e.target.value)} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white">
                  {BRAZILIAN_STATES.map((uf) => <option key={uf} value={uf} className="bg-[#061610]">{uf}</option>)}
                </select>
                <select value={hotelCategory} onChange={(e) => setHotelCategory(e.target.value as typeof hotelCategory)} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white">
                  <option value="Hotel" className="bg-[#061610]">{translateDynamic('Hotel')}</option>
                  <option value="Clube de Eventos" className="bg-[#061610]">{translateDynamic('Clube de Eventos')}</option>
                  <option value="Resort Conveniado" className="bg-[#061610]">{translateDynamic('Resort Conveniado')}</option>
                </select>
                <select value={hotelStars} onChange={(e) => setHotelStars(Number(e.target.value))} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white">
                  {[5, 4, 3, 2].map((s) => <option key={s} value={s} className="bg-[#061610]">{s} {tr('Estrelas', 'Stars')}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input type="number" min={5} max={80} value={hotelDiscount} onChange={(e) => setHotelDiscount(Number(e.target.value))} placeholder={tr('Desconto (%)', 'Discount (%)')} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white font-mono" />
                <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg conae-panel-soft text-amber-300 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  {hotelPhotoUrl ? tr('Foto Principal OK ✓', 'Main Photo OK ✓') : tr('Upload Foto Principal', 'Upload Main Photo')}
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setHotelPhotoUrl(await compressImageFile(f));
                  }} />
                </label>
              </div>

              {/* Extra Multi-Photo Gallery Uploader (up to 4 extra photos) */}
              <div className="conae-panel-soft rounded-lg p-3 space-y-2 border border-amber-400/20">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                    <Images className="w-3.5 h-3.5" />
                    {tr(`Galeria Extra do Hotel (${hotelGalleryPhotos.length}/4 fotos)`, `Hotel Extra Gallery (${hotelGalleryPhotos.length}/4 photos)`)}
                  </span>
                  {hotelGalleryPhotos.length < 4 && (
                    <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-800/80 hover:bg-emerald-700 text-white font-semibold cursor-pointer">
                      <Upload className="w-3 h-3" />
                      {tr('Adicionar Foto Galeria', 'Add Gallery Photo')}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const compressed = await compressImageFile(f);
                            setHotelGalleryPhotos((prev) => [...prev, compressed].slice(0, 4));
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>
                {hotelGalleryPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {hotelGalleryPhotos.map((src, idx) => (
                      <div key={`gal_edit_${idx}`} className="relative w-14 h-11 rounded overflow-hidden border border-amber-400/40">
                        <img src={src} alt={`Galeria ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() =>
                            setHotelGalleryPhotos((prev) => prev.filter((_, i) => i !== idx))
                          }
                          aria-label={tr('Remover foto da galeria', 'Remove gallery photo')}
                          className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 text-red-300 hover:text-white cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <input placeholder={tr('Benefícios do Cartão Hotel (Cursos, Bank, Clínicas, Farmácias)', 'Hotel Card Benefits (Courses, Bank, Clinics, Pharmacies)')} value={hotelBenefits} onChange={(e) => setHotelBenefits(e.target.value)} className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
              <textarea required rows={2} placeholder={tr('Descrição completa do hotel (exibida na aba flutuante e galeria)...', 'Full hotel description (shown in floating carousel & gallery)...')} value={hotelDesc} onChange={(e) => setHotelDesc(e.target.value)} className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
              <button type="submit" className="w-full py-2 rounded-lg bg-amber-500 text-neutral-950 font-semibold cursor-pointer">
                {editingHotelId
                  ? tr('Salvar Alterações & Galeria do Hotel', 'Save Hotel & Gallery Changes')
                  : tr('Publicar Hotel & Gerar Cartão', 'Publish Hotel & Issue Card')}
              </button>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pt-2 border-t border-amber-400/15">
                {hotels.map((h) => (
                  <div key={h.id} className="flex items-center justify-between gap-2 bg-black/35 rounded px-2.5 py-1.5">
                    <span className="truncate text-emerald-100">{h.state} · {h.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onSaveHotelGpsAndPhotos && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingHotelId(h.id);
                            setHotelName(h.name);
                            setHotelCity(h.city);
                            setHotelState(h.state);
                            setHotelCategory(h.category);
                            setHotelStars(h.stars);
                            setHotelDiscount(h.discountPercent);
                            setHotelDesc(h.description);
                            setHotelBenefits(h.hotelBenefits || '');
                            setHotelPhotoUrl(h.photoUrl || '');
                            setHotelGalleryPhotos(Array.isArray(h.galleryPhotos) ? h.galleryPhotos.slice(0, 4) : []);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:text-white text-[10px] font-semibold cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          {tr('Fotos / Editar', 'Photos / Edit')}
                        </button>
                      )}
                      {isPresidentMode && (
                        <button type="button" onClick={() => onDeleteHotel(h.id)} aria-label={tr('Excluir hotel', 'Delete hotel')} className="text-red-300 hover:text-white cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </form>

            {/* 2. Course Form with Photo Upload + Export/Import */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onCreateCourse({
                  title: courseTitle,
                  category: courseCat,
                  duration: courseDur,
                  modality: courseMod,
                  feeLabel: courseFee,
                  description: courseDesc,
                  photoUrl: coursePhotoUrl.trim() || undefined,
                  active: true,
                });
                setCourseTitle('');
                setCourseDesc('');
                setCoursePhotoUrl('');
                setFeedback(
                  tr(
                    'Curso adicionado ao catálogo CONAE Cursos!',
                    'Course added to the CONAE Courses catalog!'
                  )
                );
              }}
              className="conae-panel rounded-xl p-5 space-y-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-white">
                  {tr(`Cursos CONAE (${courses.length})`, `CONAE Courses (${courses.length})`)}
                </h3>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => downloadJsonFile('conae_cursos.json', courses)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded conae-panel-soft text-amber-300 cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> JSON
                  </button>
                  <label className="inline-flex items-center gap-1 px-2 py-1 rounded conae-panel-soft text-emerald-300 cursor-pointer">
                    <FileUp className="w-3 h-3" /> {tr('Importar JSON', 'Import JSON')}
                    <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && handleImportJsonCatalog(e.target.files[0], 'courses')} />
                  </label>
                </div>
              </div>

              <input required placeholder={tr('Título do Curso', 'Course Title')} value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
              <div className="grid grid-cols-2 gap-2.5">
                <input required placeholder={tr('Categoria', 'Category')} value={courseCat} onChange={(e) => setCourseCat(e.target.value)} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
                <input required placeholder={tr('Carga Horária', 'Duration / Hours')} value={courseDur} onChange={(e) => setCourseDur(e.target.value)} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
                <select value={courseMod} onChange={(e) => setCourseMod(e.target.value as typeof courseMod)} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white">
                  <option value="Online EAD" className="bg-[#061610]">{translateDynamic('Online EAD')}</option>
                  <option value="Presencial" className="bg-[#061610]">{translateDynamic('Presencial')}</option>
                  <option value="Hibrido" className="bg-[#061610]">{translateDynamic('Hibrido')}</option>
                </select>
                <input required placeholder={tr('Taxa / Condição', 'Fee / Condition')} value={courseFee} onChange={(e) => setCourseFee(e.target.value)} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
              </div>
              <label className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg conae-panel-soft text-amber-300 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                {coursePhotoUrl ? tr('Foto do Curso Carregada ✓', 'Course Photo Loaded ✓') : tr('Upload Foto / Cartaz do Curso', 'Upload Course Photo / Poster')}
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setCoursePhotoUrl(await compressImageFile(f));
                }} />
              </label>
              <textarea required rows={2} placeholder={tr('Descrição completa do curso...', 'Full course description...')} value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
              <button type="submit" className="w-full py-2 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer">
                {tr('Publicar Curso CONAE', 'Publish CONAE Course')}
              </button>

              <div className="space-y-1.5 max-h-32 overflow-y-auto pt-2 border-t border-amber-400/15">
                {courses.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 bg-black/35 rounded px-2.5 py-1.5">
                    <span className="truncate text-emerald-100">{translateDynamic(c.title)}</span>
                    {isPresidentMode && (
                      <button type="button" onClick={() => onDeleteCourse(c.id)} aria-label={tr('Excluir curso', 'Delete course')} className="text-red-300 hover:text-white cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </form>

            {/* 3. Pharmacies, Supermarkets, Clinics/Labs & Commerce Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onCreateBenefitPartner({
                  name: bpName,
                  category: bpCategory,
                  city: bpCity,
                  state: bpState,
                  discountPercent: bpDiscount,
                  description: bpDesc,
                  photoUrl: bpPhotoUrl.trim() || undefined,
                  hotelExclusive: bpHotelExcl,
                  active: true,
                });
                setBpName('');
                setBpCity('');
                setBpDesc('');
                setBpPhotoUrl('');
                setFeedback(
                  tr(
                    'Parceiro cadastrado na Rede de Benefícios & Aba Flutuante!',
                    'Partner published to Benefits Network & Floating Carousel!'
                  )
                );
              }}
              className="conae-panel rounded-xl p-5 space-y-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-amber-400" />
                  <span>
                    {tr(
                      `Farmácias, Supermercados, Clínicas & Comércios (${benefitPartners.length})`,
                      `Pharmacies, Supermarkets, Clinics & Commerce (${benefitPartners.length})`
                    )}
                  </span>
                </h3>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => downloadJsonFile('conae_rede_beneficios.json', benefitPartners)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded conae-panel-soft text-amber-300 cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> JSON
                  </button>
                  <label className="inline-flex items-center gap-1 px-2 py-1 rounded conae-panel-soft text-emerald-300 cursor-pointer">
                    <FileUp className="w-3 h-3" /> {tr('Importar JSON', 'Import JSON')}
                    <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && handleImportJsonCatalog(e.target.files[0], 'benefit_partners')} />
                  </label>
                </div>
              </div>

              <input required placeholder={tr('Nome da Farmácia, Supermercado, Clínica ou Comércio', 'Pharmacy, Supermarket, Clinic or Store Name')} value={bpName} onChange={(e) => setBpName(e.target.value)} className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
              <div className="grid grid-cols-2 gap-2.5">
                <select value={bpCategory} onChange={(e) => setBpCategory(e.target.value as BenefitPartnerCategory)} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white">
                  {(['Farmácia', 'Supermercado', 'Clínica & Laboratório', 'Comércio', 'Clube Conveniado'] as BenefitPartnerCategory[]).map((cat) => (
                    <option key={cat} value={cat} className="bg-[#061610]">{translateDynamic(cat)}</option>
                  ))}
                </select>
                <input type="number" min={5} max={90} value={bpDiscount} onChange={(e) => setBpDiscount(Number(e.target.value))} placeholder={tr('Desconto %', 'Discount %')} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white font-mono" />
                <input required placeholder={tr('Cidade', 'City')} value={bpCity} onChange={(e) => setBpCity(e.target.value)} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
                <select value={bpState} onChange={(e) => setBpState(e.target.value)} className="rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white">
                  {BRAZILIAN_STATES.map((uf) => <option key={uf} value={uf} className="bg-[#061610]">{uf}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-white cursor-pointer">
                  <input type="checkbox" checked={bpHotelExcl} onChange={(e) => setBpHotelExcl(e.target.checked)} className="accent-amber-400" />
                  {tr('Exclusivo Hoteleiros & Filiados', 'Hoteliers & Affiliates Exclusive')}
                </label>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg conae-panel-soft text-amber-300 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  {bpPhotoUrl ? tr('Foto OK ✓', 'Photo OK ✓') : tr('Upload Foto', 'Upload Photo')}
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setBpPhotoUrl(await compressImageFile(f));
                  }} />
                </label>
              </div>
              <textarea required rows={2} placeholder={tr('Descrição do benefício / desconto (exibido na aba flutuante)...', 'Benefit / discount description (shown in floating carousel)...')} value={bpDesc} onChange={(e) => setBpDesc(e.target.value)} className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
              <button type="submit" className="w-full py-2 rounded-lg bg-amber-500 text-neutral-950 font-semibold cursor-pointer">
                {tr('Publicar Comércio / Farmácia / Clínica', 'Publish Business / Pharmacy / Clinic')}
              </button>

              <div className="space-y-1.5 max-h-32 overflow-y-auto pt-2 border-t border-amber-400/15">
                {benefitPartners.map((bp) => (
                  <div key={bp.id} className="flex items-center justify-between gap-2 bg-black/35 rounded px-2.5 py-1.5">
                    <span className="truncate text-emerald-100">{translateDynamic(bp.category)} · {bp.name} ({bp.discountPercent}% OFF)</span>
                    {isPresidentMode && (
                      <button type="button" onClick={() => onDeleteBenefitPartner(bp.id)} aria-label={tr('Excluir parceiro', 'Delete partner')} className="text-red-300 hover:text-white cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </form>

            {/* 4. Sponsors Form with Photo Upload + Export/Import */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onCreateSponsor({
                  name: spName,
                  segment: spSegment,
                  benefit: spBenefit,
                  description: spDesc,
                  photoUrl: spPhotoUrl.trim() || undefined,
                  active: true,
                });
                setSpName('');
                setSpBenefit('');
                setSpDesc('');
                setSpPhotoUrl('');
                setFeedback(
                  tr(
                    'Patrocinador cadastrado e exibido na Aba Flutuante & Mídia!',
                    'Sponsor registered and displayed in Floating Carousel & Media!'
                  )
                );
              }}
              className="conae-panel rounded-xl p-5 space-y-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>{tr(`Patrocinadores Oficiais (${sponsors.length})`, `Official Sponsors (${sponsors.length})`)}</span>
                </h3>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => downloadJsonFile('conae_patrocinadores.json', sponsors)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded conae-panel-soft text-amber-300 cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> JSON
                  </button>
                  <label className="inline-flex items-center gap-1 px-2 py-1 rounded conae-panel-soft text-emerald-300 cursor-pointer">
                    <FileUp className="w-3 h-3" /> {tr('Importar JSON', 'Import JSON')}
                    <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && handleImportJsonCatalog(e.target.files[0], 'sponsors')} />
                  </label>
                </div>
              </div>

              <input required placeholder={tr('Nome da Empresa / Patrocinador', 'Company / Sponsor Name')} value={spName} onChange={(e) => setSpName(e.target.value)} className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
              <input required placeholder={tr('Segmento (ex: Patrocinador Diamante · Saúde)', 'Segment (e.g. Diamond Sponsor · Healthcare)')} value={spSegment} onChange={(e) => setSpSegment(e.target.value)} className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
              <input required placeholder={tr('Benefício para Conveniados', 'Benefit for Accredited Members')} value={spBenefit} onChange={(e) => setSpBenefit(e.target.value)} className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
              <label className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg conae-panel-soft text-amber-300 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                {spPhotoUrl ? tr('Logo / Foto Carregada ✓', 'Logo / Photo Loaded ✓') : tr('Upload Foto / Logo do Patrocinador', 'Upload Sponsor Photo / Logo')}
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setSpPhotoUrl(await compressImageFile(f));
                }} />
              </label>
              <textarea required rows={2} placeholder={tr('Descrição do patrocinador (exibida na aba flutuante)...', 'Sponsor description (shown in floating carousel)...')} value={spDesc} onChange={(e) => setSpDesc(e.target.value)} className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white" />
              <button type="submit" className="w-full py-2 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer">
                {tr('Publicar Patrocinador', 'Publish Sponsor')}
              </button>

              <div className="space-y-1.5 max-h-32 overflow-y-auto pt-2 border-t border-amber-400/15">
                {sponsors.map((sp) => (
                  <div key={sp.id} className="flex items-center justify-between gap-2 bg-black/35 rounded px-2.5 py-1.5">
                    <span className="truncate text-emerald-100">{sp.name} · {translateDynamic(sp.segment)}</span>
                    {isPresidentMode && (
                      <button type="button" onClick={() => onDeleteSponsor(sp.id)} aria-label={tr('Excluir patrocinador', 'Delete sponsor')} className="text-red-300 hover:text-white cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECTION: President & Executive Patrimônio, Ações (c/ Foto) & Cotação do Dia Ledger */}
      {adminSection === 'lancamentos' && (
        <div className="space-y-5">
          {(() => {
            const activeEntries = treasuryEntries.filter((e) => e.active !== false);
            const totalEquity = activeEntries
              .filter((e) => e.entryType === 'patrimonio')
              .reduce((acc, e) => acc + (Number(e.amountBRL) || 0), 0);
            const totalSharesForSaleSum = activeEntries.reduce(
              (acc, e) => acc + (Number(e.sharesForSaleCount) || 0),
              0
            );
            const totalShares = activeEntries.reduce(
              (acc, e) => acc + (Number(e.sharesCount) || 0),
              0
            );
            const totalQuotePayout = activeEntries.reduce(
              (acc, e) => acc + (Number(e.dailyQuotePayoutBRL) || 0),
              0
            );

            // Live calculation preview for share buyer insertion (auto-shows closing day %)
            const currentSharePrice = quotationMath?.currentUnitPriceBRL || 5.0;
            const baseCapitalBRL = quotationMath?.baseCapitalBRL || 500000;
            const totalSharesCapital = quotationMath?.totalSharesCapital || 100000;
            const typedShares = Math.max(0, Math.floor(Number(ledgerSharesCount) || 0));
            const typedAmount = Math.max(
              0,
              Number(String(ledgerAmountBRL || '0').replace(',', '.')) || 0
            );
            const typedManualQuotePct =
              Number(String(ledgerDailyQuotePercent || '0').replace(',', '.')) || 0;
            const effectivePreviewAmount =
              typedAmount > 0
                ? typedAmount
                : typedShares > 0
                ? Number((typedShares * currentSharePrice).toFixed(2))
                : 0;
            const effectivePreviewShares =
              typedShares > 0
                ? typedShares
                : effectivePreviewAmount > 0
                ? Math.max(1, Math.round(effectivePreviewAmount / currentSharePrice))
                : 0;
            const previewOwnershipPercent =
              (effectivePreviewShares / totalSharesCapital) * 100;
            const previewAutoClosingPercent =
              effectivePreviewAmount > 0
                ? (effectivePreviewAmount / baseCapitalBRL) * 100
                : 0;
            const previewTotalClosingPercent =
              previewAutoClosingPercent + typedManualQuotePct;
            const previewClosingSharePrice = Number(
              (currentSharePrice * (1 + previewTotalClosingPercent / 100)).toFixed(2)
            );
            const fmtPct = (v: number) =>
              isEn ? v.toFixed(2) : v.toFixed(2).replace('.', ',');
            const fmtBRLVal = (v: number) =>
              `R$ ${v.toLocaleString(numLocale, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`;

            return (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="conae-panel rounded-xl p-4">
                    <p className="text-emerald-200/75">
                      {tr('Valor do Patrimônio', 'Equity Value')}
                    </p>
                    <p className="text-lg sm:text-xl font-bold font-mono text-amber-300 tabular-nums mt-1">
                      R$ {totalEquity.toLocaleString(numLocale, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="conae-panel rounded-xl p-4">
                    <p className="text-emerald-200/75">
                      {tr('Ações à Venda (Patrimônio)', 'Shares For Sale')}
                    </p>
                    <p className="text-lg sm:text-xl font-bold font-mono text-white tabular-nums mt-1">
                      {totalSharesForSaleSum.toLocaleString(numLocale)}{' '}
                      <span className="text-xs text-emerald-300">{tr('ações', 'shares')}</span>
                    </p>
                  </div>
                  <div className="conae-panel rounded-xl p-4">
                    <p className="text-emerald-200/75">
                      {tr('Ações Compradas (Acionistas)', 'Purchased Shares')}
                    </p>
                    <p className="text-lg sm:text-xl font-bold font-mono text-emerald-300 tabular-nums mt-1">
                      {totalShares.toLocaleString(numLocale)}{' '}
                      <span className="text-xs text-amber-300">
                        ({((totalShares / 100000) * 100).toFixed(2)}%)
                      </span>
                    </p>
                  </div>
                  <div className="conae-panel rounded-xl p-4">
                    <p className="text-emerald-200/75">
                      {tr('Dado por Cotação no Dia', 'Daily Quote Payout')}
                    </p>
                    <p className="text-lg sm:text-xl font-bold font-mono text-amber-300 tabular-nums mt-1">
                      R$ {totalQuotePayout.toLocaleString(numLocale, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!onCreateTreasuryEntry) return;
                      const parsedAmount = Math.max(
                        0,
                        Number(String(ledgerAmountBRL || '0').replace(',', '.')) || 0
                      );
                      const parsedShares = Math.max(0, Math.floor(Number(ledgerSharesCount) || 0));
                      const parsedForSale = Math.max(0, Math.floor(Number(ledgerSharesForSale) || 0));
                      const parsedQuotePct = Number(String(ledgerDailyQuotePercent || '0').replace(',', '.')) || 0;
                      const parsedQuotePayout = Math.max(
                        0,
                        Number(String(ledgerDailyQuotePayoutBRL || '0').replace(',', '.')) || 0
                      );

                      const finalTitle =
                        ledgerTitle.trim() ||
                        (ledgerType === 'venda_acoes' && ledgerBuyerName.trim()
                          ? `${tr('Compra de Ações', 'Share Purchase')} · ${ledgerBuyerName.trim()}`
                          : ledgerType === 'cotacao_dia'
                          ? `${tr('Cotação do Dia', 'Daily Quote')} ${ledgerDate}`
                          : '');

                      if (finalTitle.length < 2) {
                        setFeedback(
                          tr(
                            'Informe o nome da pessoa ou uma descrição para registrar o lançamento.',
                            'Enter the person name or a description to record this entry.'
                          )
                        );
                        return;
                      }

                      if (
                        parsedAmount <= 0 &&
                        parsedShares <= 0 &&
                        parsedForSale <= 0 &&
                        parsedQuotePct === 0 &&
                        parsedQuotePayout <= 0
                      ) {
                        setFeedback(
                          tr(
                            'Preencha pelo menos um valor (Patrimônio R$, Ações compradas/à venda ou Cotação do dia).',
                            'Fill at least one value (Equity BRL, Shares bought/for sale, or Daily quote).'
                          )
                        );
                        return;
                      }

                      setLedgerSaving(true);
                      try {
                        await onCreateTreasuryEntry({
                          entryType: ledgerType,
                          title: finalTitle,
                          buyerName: ledgerBuyerName.trim() || undefined,
                          buyerPhotoUrl: ledgerBuyerPhoto || undefined,
                          state: ledgerState,
                          amountBRL: Number(parsedAmount.toFixed(2)),
                          sharesCount: parsedShares,
                          sharesForSaleCount: parsedForSale,
                          dailyQuotePercent: Number(parsedQuotePct.toFixed(2)),
                          dailyQuotePayoutBRL: Number(parsedQuotePayout.toFixed(2)),
                          entryDate: ledgerDate || new Date().toISOString().slice(0, 10),
                          recordedBy: authorizedLabel || tr('Presidência / Executivo CONAE', 'CONAE Presidency / Executive'),
                          notes: ledgerNotes.trim() || undefined,
                        });
                        setLedgerTitle('');
                        setLedgerBuyerName('');
                        setLedgerBuyerPhoto('');
                        setLedgerAmountBRL('');
                        setLedgerSharesCount('');
                        setLedgerSharesForSale('');
                        setLedgerDailyQuotePercent('');
                        setLedgerDailyQuotePayoutBRL('');
                        setLedgerNotes('');
                        setFeedback(
                          tr(
                            'Lançamento salvo! A foto, ações, patrimônio e cotação do dia já aparecem em tempo real na tela principal.',
                            'Entry saved! The photo, shares, equity, and daily quote now appear live on the main screen.'
                          )
                        );
                      } catch {
                        setFeedback(
                          tr(
                            'Erro ao salvar lançamento. Verifique se sua conta possui permissão de Presidente/Executivo.',
                            'Error saving entry. Verify your account has President/Executive permissions.'
                          )
                        );
                      } finally {
                        setLedgerSaving(false);
                      }
                    }}
                    className="lg:col-span-5 conae-panel rounded-xl p-5 space-y-3 text-xs"
                  >
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Percent className="w-4 h-4 text-amber-400" />
                        <span>
                          {tr(
                            'Inserir Patrimônio, Ações (c/ Foto) & Cotação do Dia',
                            'Insert Equity, Shares (w/ Photo) & Daily Quote'
                          )}
                        </span>
                      </h3>
                      <p className="text-[11px] text-emerald-100/75 mt-0.5">
                        {tr(
                          'Cadastre compradores de ações com foto, valor do patrimônio, ações à venda para acionistas e o que foi dado por cotação no dia.',
                          'Record share buyers with photo, equity value, shares for sale to shareholders, and daily quote payout.'
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setLedgerType('venda_acoes')}
                        className={`py-2 px-2 rounded-lg font-semibold border text-[11px] transition-colors cursor-pointer ${
                          ledgerType === 'venda_acoes'
                            ? 'bg-emerald-600 border-emerald-400 text-white'
                            : 'bg-black/45 border-amber-400/25 text-emerald-100/80 hover:text-white'
                        }`}
                      >
                        {tr('Compra Ações', 'Share Buyer')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLedgerType('patrimonio')}
                        className={`py-2 px-2 rounded-lg font-semibold border text-[11px] transition-colors cursor-pointer ${
                          ledgerType === 'patrimonio'
                            ? 'bg-amber-500 border-amber-300 text-neutral-950'
                            : 'bg-black/45 border-amber-400/25 text-emerald-100/80 hover:text-white'
                        }`}
                      >
                        {tr('Patrimônio', 'Equity')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLedgerType('cotacao_dia')}
                        className={`py-2 px-2 rounded-lg font-semibold border text-[11px] transition-colors cursor-pointer ${
                          ledgerType === 'cotacao_dia'
                            ? 'bg-sky-600 border-sky-400 text-white'
                            : 'bg-black/45 border-amber-400/25 text-emerald-100/80 hover:text-white'
                        }`}
                      >
                        {tr('Cotação Dia', 'Daily Quote')}
                      </button>
                    </div>

                    {/* Person Name & Photo Upload (shown prominently for Share Buyer & optional for all) */}
                    <div className="rounded-lg bg-black/40 border border-amber-400/25 p-2.5 space-y-2">
                      <p className="text-[11px] font-semibold text-amber-300">
                        {tr('Foto e Nome da Pessoa (aparece na Tela Principal)', 'Person Photo & Name (shown on Main Screen)')}
                      </p>
                      <div className="flex items-center gap-2.5">
                        <img
                          src={ledgerBuyerPhoto || CONAE_ASSETS.emblemHeart}
                          alt={ledgerBuyerName || 'Preview'}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-full object-cover border-2 border-amber-400/70 shrink-0"
                        />
                        <div className="flex-1 space-y-1.5">
                          <input
                            type="text"
                            maxLength={100}
                            value={ledgerBuyerName}
                            onChange={(e) => setLedgerBuyerName(e.target.value)}
                            placeholder={tr('Nome do acionista / comprador...', 'Shareholder / buyer name...')}
                            className="w-full rounded-lg bg-black/60 border border-amber-400/30 px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400"
                          />
                          <div className="flex items-center gap-2">
                            <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 border border-amber-400/50 text-amber-200 hover:text-white text-[11px] font-semibold cursor-pointer">
                              <Upload className="w-3 h-3" />
                              {ledgerBuyerPhoto
                                ? tr('Trocar Foto ✓', 'Change Photo ✓')
                                : tr('Enviar Foto da Pessoa', 'Upload Person Photo')}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const f = e.target.files?.[0];
                                  if (f) setLedgerBuyerPhoto(await compressImageFile(f));
                                }}
                              />
                            </label>
                            {ledgerBuyerPhoto && (
                              <button
                                type="button"
                                onClick={() => setLedgerBuyerPhoto('')}
                                className="text-[10px] text-red-300 hover:text-white cursor-pointer"
                              >
                                {tr('Remover foto', 'Remove photo')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-emerald-100/80 mb-1">
                        {ledgerType === 'patrimonio'
                          ? tr('Descrição do Patrimônio', 'Equity / Asset Description')
                          : ledgerType === 'cotacao_dia'
                          ? tr('Título da Cotação do Dia', 'Daily Quote Title')
                          : tr('Descrição da Compra / Lote de Ações', 'Share Purchase / Lot Description')}
                      </label>
                      <input
                        type="text"
                        maxLength={120}
                        value={ledgerTitle}
                        onChange={(e) => setLedgerTitle(e.target.value)}
                        placeholder={
                          ledgerType === 'patrimonio'
                            ? tr('Ex: Hotel Conveniado / Sede Patrimonial GO', 'E.g., Partner Hotel / HQ Property')
                            : ledgerType === 'cotacao_dia'
                            ? tr('Ex: Fechamento Cotação Diária CNEC', 'E.g., Daily CNEC Quote Closing')
                            : tr('Ex: Compra Lote 500 Ações CNEC', 'E.g., Purchase of 500 CNEC Shares')
                        }
                        className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-emerald-100/80 mb-1">
                          {tr('Quanto Comprou de Ações', 'Shares Bought Qty')}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100000}
                          step={1}
                          value={ledgerSharesCount}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setLedgerSharesCount(raw);
                            if (ledgerType === 'venda_acoes') {
                              const qty = Math.max(0, Math.floor(Number(raw) || 0));
                              setLedgerAmountBRL(
                                qty > 0 ? (qty * currentSharePrice).toFixed(2) : ''
                              );
                            }
                          }}
                          placeholder={tr('Ex: 1000 ações', 'E.g., 1000 shares')}
                          className="w-full rounded-lg bg-black/55 border border-amber-400/35 px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-emerald-100/80 mb-1">
                          {ledgerType === 'patrimonio'
                            ? tr('Valor do Patrimônio (R$)', 'Equity Value (R$)')
                            : tr('Valor da Compra / Aporte (R$)', 'Purchase Value (R$)')}
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={ledgerAmountBRL}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setLedgerAmountBRL(raw);
                            if (ledgerType === 'venda_acoes') {
                              const amt = Math.max(
                                0,
                                Number(String(raw || '0').replace(',', '.')) || 0
                              );
                              setLedgerSharesCount(
                                amt > 0
                                  ? String(Math.max(1, Math.round(amt / currentSharePrice)))
                                  : ''
                              );
                            }
                          }}
                          placeholder="0.00"
                          className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    {/* Instant Live Preview: Closing-Day Quotation Percentage as Shares are Typed */}
                    {(ledgerType === 'venda_acoes' ||
                      effectivePreviewShares > 0 ||
                      effectivePreviewAmount > 0 ||
                      typedManualQuotePct !== 0) && (
                      <div className="rounded-xl bg-emerald-950/65 border border-emerald-400/45 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-amber-300">
                            {tr(
                              'Porcentagem na Cotação do Dia do Fechamento (Prévia)',
                              'Closing-Day Quotation Percentage (Live Preview)'
                            )}
                          </span>
                          <span className="text-[11px] font-mono text-emerald-200/80">
                            1 {tr('ação', 'share')} = {fmtBRLVal(currentSharePrice)}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 font-mono tabular-nums">
                          <div className="rounded-lg bg-black/45 border border-white/10 p-2">
                            <p className="text-[10px] font-sans text-emerald-200/75">
                              {tr('% das Ações', '% of Shares')}
                            </p>
                            <p className="text-sm font-bold text-amber-300 mt-0.5">
                              {fmtPct(previewOwnershipPercent)}%
                            </p>
                            <p className="text-[10px] font-sans text-emerald-100/65">
                              {effectivePreviewShares.toLocaleString(numLocale)} {tr('ações', 'shares')}
                            </p>
                          </div>

                          <div className="rounded-lg bg-black/45 border border-emerald-400/35 p-2">
                            <p className="text-[10px] font-sans text-emerald-200/80">
                              {tr('% no Fechamento', 'Closing Day %')}
                            </p>
                            <p className="text-sm font-bold text-emerald-300 mt-0.5">
                              {previewTotalClosingPercent > 0 ? '+' : ''}
                              {fmtPct(previewTotalClosingPercent)}%
                            </p>
                            <p className="text-[10px] font-sans text-emerald-100/65">
                              {fmtBRLVal(effectivePreviewAmount)}
                            </p>
                          </div>

                          <div className="rounded-lg bg-black/45 border border-amber-400/30 p-2">
                            <p className="text-[10px] font-sans text-emerald-200/75">
                              {tr('Cota ao Fechar', 'Closing Quote')}
                            </p>
                            <p className="text-sm font-bold text-white mt-0.5">
                              {fmtBRLVal(previewClosingSharePrice)}
                            </p>
                            <p className="text-[10px] font-sans text-amber-200/80">
                              {tr('Atual:', 'Now:')} {fmtBRLVal(currentSharePrice)}
                            </p>
                          </div>
                        </div>

                        {effectivePreviewShares === 0 && effectivePreviewAmount === 0 && (
                          <p className="text-[11px] text-emerald-100/75">
                            {tr(
                              'Digite acima quantas ações a pessoa vai comprar para ver automaticamente o valor em R$ e a porcentagem que será dada na cotação do dia do fechamento.',
                              'Enter above how many shares the buyer is purchasing to automatically see the R$ total and the percentage added to the closing-day quotation.'
                            )}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-amber-200/90 mb-1">
                          {tr('Ações que o Patrimônio vai Vender', 'Shares For Sale (Equity)')}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100000}
                          step={1}
                          value={ledgerSharesForSale}
                          onChange={(e) => setLedgerSharesForSale(e.target.value)}
                          placeholder="0"
                          className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-emerald-200/90 mb-1">
                          {tr('Dado por Cotação no Dia (%)', 'Daily Quote Given (%)')}
                        </label>
                        <input
                          type="number"
                          min={-100}
                          max={1000}
                          step="0.01"
                          value={ledgerDailyQuotePercent}
                          onChange={(e) => setLedgerDailyQuotePercent(e.target.value)}
                          placeholder="Ex: 3.50"
                          className="w-full rounded-lg bg-black/55 border border-emerald-400/35 px-3 py-2 text-emerald-200 font-mono focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] text-emerald-200/90 mb-1">
                          {tr('Cotação Dia (R$)', 'Quote Day (R$)')}
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={ledgerDailyQuotePayoutBRL}
                          onChange={(e) => setLedgerDailyQuotePayoutBRL(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg bg-black/55 border border-emerald-400/35 px-2.5 py-2 text-emerald-200 font-mono focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-emerald-100/80 mb-1">
                          {tr('Estado (UF)', 'State (UF)')}
                        </label>
                        <select
                          value={ledgerState}
                          onChange={(e) => setLedgerState(e.target.value)}
                          className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-2.5 py-2 text-white focus:outline-none focus:border-amber-400"
                        >
                          {BRAZILIAN_STATES.map((uf) => (
                            <option key={uf} value={uf} className="bg-neutral-950 text-white">
                              {uf}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-emerald-100/80 mb-1">
                          {tr('Data', 'Date')}
                        </label>
                        <input
                          type="date"
                          required
                          value={ledgerDate}
                          onChange={(e) => setLedgerDate(e.target.value)}
                          className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-2 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-emerald-100/80 mb-1">
                        {tr('Observações (opcional)', 'Notes (optional)')}
                      </label>
                      <input
                        type="text"
                        maxLength={240}
                        value={ledgerNotes}
                        onChange={(e) => setLedgerNotes(e.target.value)}
                        placeholder={tr('Referência de contrato, cartório ou recibo...', 'Contract, notary or receipt reference...')}
                        className="w-full rounded-lg bg-black/55 border border-amber-400/30 px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={ledgerSaving}
                      className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-bold text-xs sm:text-sm hover:from-amber-400 hover:to-amber-300 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {ledgerSaving
                        ? tr('Salvando na Cotação...', 'Saving to Quote...')
                        : tr('Salvar & Publicar na Tela Principal', 'Save & Publish to Main Screen')}
                    </button>
                  </form>

                  <div className="lg:col-span-7 conae-panel rounded-xl p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Landmark className="w-4 h-4 text-amber-400" />
                          <span>
                            {tr(
                              'Registros de Patrimônio, Cotas & Compradores',
                              'Equity, Quotes & Buyers Ledger'
                            )}
                          </span>
                        </h3>
                        <p className="text-[11px] text-emerald-100/70">
                          {tr(
                            'Clique em "Excluir" em qualquer lançamento para apagar imediatamente e recalcular a tela principal.',
                            'Click "Delete" on any entry to immediately remove it and recalculate the main screen.'
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono text-amber-300">
                          {activeEntries.length} {tr('registros', 'entries')}
                        </span>
                        {isPresidentMode && activeEntries.length > 0 && onDeleteAllTreasuryEntries && (
                          confirmClearLedger ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={clearingLedger}
                                onClick={async () => {
                                  setClearingLedger(true);
                                  try {
                                    await onDeleteAllTreasuryEntries(activeEntries.map((x) => x.id));
                                    setConfirmClearLedger(false);
                                    setFeedback(
                                      tr(
                                        'Todos os lançamentos de patrimônio e cota foram apagados e a página foi atualizada.',
                                        'All equity and quote entries have been deleted and the page has been updated.'
                                      )
                                    );
                                  } catch {
                                    setFeedback(
                                      tr(
                                        'Não foi possível apagar os registros. Verifique sua conexão e permissão de Presidente.',
                                        'Could not delete the entries. Check your connection and President permission.'
                                      )
                                    );
                                  } finally {
                                    setClearingLedger(false);
                                  }
                                }}
                                className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-bold cursor-pointer disabled:opacity-60"
                              >
                                {clearingLedger
                                  ? tr('Apagando...', 'Deleting...')
                                  : tr('Confirmar Apagar Tudo', 'Confirm Delete All')}
                              </button>
                              <button
                                type="button"
                                disabled={clearingLedger}
                                onClick={() => setConfirmClearLedger(false)}
                                className="px-2 py-1 rounded bg-black/50 border border-white/20 text-emerald-100 text-[11px] cursor-pointer"
                              >
                                {tr('Cancelar', 'Cancel')}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmClearLedger(true)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/75 border border-red-400/45 text-red-200 hover:bg-red-800 hover:text-white text-[11px] font-semibold cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              {tr('Apagar Todos', 'Delete All')}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[480px] overflow-y-auto conae-scroll pr-1.5">
                      {activeEntries.length === 0 ? (
                        <p className="text-xs text-emerald-200/70 py-8 text-center">
                          {tr(
                            'Nenhum lançamento inserido ainda. Use o formulário ao lado para adicionar patrimônio, comprador com foto ou cotação do dia.',
                            'No entries recorded yet. Use the form beside to add equity, a buyer with photo, or the daily quote.'
                          )}
                        </p>
                      ) : (
                        activeEntries.map((item) => (
                          <div
                            key={item.id}
                            className="conae-panel-soft rounded-lg p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {(item.buyerPhotoUrl || item.buyerName) && (
                                <img
                                  src={item.buyerPhotoUrl || CONAE_ASSETS.emblemHeart}
                                  alt={item.buyerName || item.title}
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 rounded-full object-cover border border-amber-400/60 shrink-0"
                                />
                              )}
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                      item.entryType === 'patrimonio'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                                        : item.entryType === 'cotacao_dia'
                                        ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                    }`}
                                  >
                                    {item.entryType === 'patrimonio'
                                      ? tr('Patrimônio', 'Equity')
                                      : item.entryType === 'cotacao_dia'
                                      ? tr('Cotação do Dia', 'Daily Quote')
                                      : tr('Compra de Ações', 'Share Purchase')}
                                  </span>
                                  <span className="font-mono text-[10px] text-emerald-200/80">
                                    {item.entryDate} · {item.state}
                                  </span>
                                </div>
                                <p className="font-semibold text-white truncate">
                                  {item.buyerName ? `${item.buyerName} — ${item.title}` : item.title}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-mono">
                                  {item.amountBRL > 0 && (
                                    <span className="text-amber-300 font-bold">
                                      R$ {(Number(item.amountBRL) || 0).toLocaleString(numLocale, { minimumFractionDigits: 2 })}
                                    </span>
                                  )}
                                  {item.sharesCount > 0 && (
                                    <span className="text-emerald-300">
                                      {item.sharesCount.toLocaleString(numLocale)} {tr('ações compradas', 'shares bought')}
                                    </span>
                                  )}
                                  {(item.sharesForSaleCount ?? 0) > 0 && (
                                    <span className="text-white">
                                      {item.sharesForSaleCount?.toLocaleString(numLocale)} {tr('ações à venda', 'shares for sale')}
                                    </span>
                                  )}
                                  {(item.dailyQuotePercent ?? 0) !== 0 && (
                                    <span className="text-sky-300">
                                      {tr('Cotação:', 'Quote:')} {(item.dailyQuotePercent ?? 0) > 0 ? '+' : ''}{item.dailyQuotePercent}%
                                    </span>
                                  )}
                                  {(item.dailyQuotePayoutBRL ?? 0) > 0 && (
                                    <span className="text-emerald-200">
                                      {tr('Dado no dia:', 'Daily payout:')} R$ {(item.dailyQuotePayoutBRL ?? 0).toLocaleString(numLocale, { minimumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-emerald-100/65 truncate">
                                  {tr('Por:', 'By:')} {item.recordedBy}
                                  {item.notes ? ` · ${item.notes}` : ''}
                                </p>
                              </div>
                            </div>

                            {onDeleteTreasuryEntry && (
                              <button
                                type="button"
                                disabled={deletingLedgerId === item.id || clearingLedger}
                                onClick={async () => {
                                  setDeletingLedgerId(item.id);
                                  try {
                                    await onDeleteTreasuryEntry(item.id);
                                    setFeedback(
                                      tr(
                                        'Lançamento apagado do banco e valores de patrimônio/cotação atualizados na página.',
                                        'Entry deleted from database and equity/quote values updated on the page.'
                                      )
                                    );
                                  } catch {
                                    setFeedback(
                                      tr(
                                        'Erro ao apagar lançamento. Verifique sua permissão de Presidente/Executivo.',
                                        'Error deleting entry. Verify your President/Executive permission.'
                                      )
                                    );
                                  } finally {
                                    setDeletingLedgerId(null);
                                  }
                                }}
                                aria-label={tr('Excluir lançamento', 'Delete entry')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-950/75 border border-red-400/45 text-red-200 hover:bg-red-700 hover:text-white text-[11px] font-semibold cursor-pointer shrink-0 disabled:opacity-55"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>
                                  {deletingLedgerId === item.id
                                    ? tr('Apagando...', 'Deleting...')
                                    : tr('Excluir', 'Delete')}
                                </span>
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Simple Quotation Board in President Panel */}
                {quotationMath && (
                  <SimpleQuotationBoard
                    variant="president"
                    quotationMath={quotationMath}
                    shareholderValuations={shareholderValuations}
                    canDelete={isPresidentMode && Boolean(onDeleteShareholderBuyer)}
                    onDeleteBuyer={
                      onDeleteShareholderBuyer
                        ? async (holder) => {
                            await onDeleteShareholderBuyer(holder);
                            setFeedback(
                              tr(
                                `${holder.name} foi deletado(a) da lista de compradores e a cotação foi atualizada.`,
                                `${holder.name} was deleted from the share buyers list and the quotation was updated.`
                              )
                            );
                          }
                        : undefined
                    }
                    canReset={isPresidentMode && activeEntries.length > 0 && Boolean(onDeleteAllTreasuryEntries)}
                    onResetQuotation={
                      onDeleteAllTreasuryEntries
                        ? async () => {
                            await onDeleteAllTreasuryEntries(activeEntries.map((x) => x.id));
                            setFeedback(
                              tr(
                                'Cotação zerada para o valor padrão de R$ 5,00 por ação.',
                                'Quotation reset to the standard R$ 5.00 per share value.'
                              )
                            );
                          }
                        : undefined
                    }
                  />
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* SECTION: President-Granted Mandates (Outorgação) & Executive/Affiliate Execution Reports */}
      {adminSection === 'outorgacao' && (
        <MandatesAndReportsPanel
          isPresidentMode={isPresidentMode}
          authorizedLabel={authorizedLabel}
          usersList={usersList}
          mandates={executiveMandates}
          onCreateMandate={onCreateMandate}
          onSubmitMandateReport={onSubmitMandateReport}
          onApproveMandateAndInsert={onApproveMandateAndInsert}
          onUpdateMandateStatus={onUpdateMandateStatus}
          onDeleteMandate={onDeleteMandate}
        />
      )}

      {/* SECTION: Server Visit Agent, Live Region/Link Tracker & WhatsApp Alerts (Terminal 254) */}
      {isPresidentMode && adminSection === 'agente_visitas' && (
        <VisitAgentAdminPanel
          isAdmin={isAdmin}
          isPresidentMode={isPresidentMode}
          authorizedLabel={authorizedLabel}
        />
      )}
    </div>
  );
};
