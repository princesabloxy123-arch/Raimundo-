export type TabId =
  | 'inicio'
  | 'cursos'
  | 'banco'
  | 'hoteis'
  | 'voos_gol'
  | 'voos_tam'
  | 'beneficios'
  | 'acionistas'
  | 'vip'
  | 'midia'
  | 'afiliado'
  | 'gestao_empresarial'
  | 'gestao_eclesiastica'
  | 'admin';

export type UserRole = 'affiliate' | 'staff' | 'executive' | 'president';
export type VipTier = 'Padrao' | 'Prata' | 'Ouro' | 'Diamante';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  state: string;
  cpf?: string;
  loginUsername?: string;
  loginSecretHash?: string;
  photoUrl?: string;
  role: UserRole;
  vipTier: VipTier;
  balanceBRL: number;
  balanceUSD: number;
  cnecTokens: number;
  monthlyPlanActive: boolean;
  virtualCardActive: boolean;
  executiveCardActive?: boolean;
  sharesOwned?: number;
  sharesNotaryCode?: string;
  cardNumber?: string;
  bankToken?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PublicAffiliate {
  uid: string;
  displayName: string;
  state: string;
  photoUrl?: string;
  vipTier: VipTier;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ExecutivePix {
  id: string;
  executiveName: string;
  executiveRole: string;
  bankName: string;
  pixKey: string;
  pixType: 'CNPJ' | 'CPF' | 'Email' | 'Telefone' | 'Aleatoria';
  city: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PackageOrder {
  id: string;
  userId: string;
  userName: string;
  packageId: string;
  packageName: string;
  amountBRL: number;
  cnecAmount: number;
  paymentMethod: 'PIX_INTER' | 'PIX_MULTI' | 'CONTA_GLOBAL_USD' | 'DERIV_P2P';
  executivePixId?: string;
  executiveName?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UsdInvestment {
  id: string;
  userId: string;
  userName: string;
  amountUSD: number;
  quoteBRL: number;
  amountBRL: number;
  platform: 'DERIV_P2P' | 'INTER_GLOBAL' | 'CDB_INTER';
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CourseEnrollment {
  id: string;
  userId: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  modality: 'Presencial' | 'Online EAD' | 'Hibrido';
  status: 'pending' | 'active' | 'certified';
  credentialCode?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface HotelBooking {
  id: string;
  userId: string;
  userName: string;
  hotelId: string;
  hotelName: string;
  state: string;
  stars: number;
  checkInDate: string;
  guests: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  bookingToken?: string;
  bookingChannel?: 'CONAE_BOOKING_TOKEN' | 'HOTEL_DIRECT';
  bookingUrl?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PartnerHotel {
  id: string;
  name: string;
  city: string;
  state: string;
  category: 'Hotel' | 'Clube de Eventos' | 'Resort Conveniado';
  stars: number;
  discountPercent: number;
  description: string;
  photoUrl?: string;
  galleryPhotos?: string[];
  hotelBenefits?: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CourseItem {
  id: string;
  title: string;
  category: string;
  duration: string;
  modality: 'Presencial' | 'Online EAD' | 'Hibrido';
  feeLabel: string;
  schedule?: string;
  location?: string;
  description: string;
  photoUrl?: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SponsorItem {
  id: string;
  name: string;
  segment: string;
  benefit: string;
  description: string;
  photoUrl?: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type BenefitPartnerCategory =
  | 'Farmácia'
  | 'Supermercado'
  | 'Clínica & Laboratório'
  | 'Comércio'
  | 'Clube Conveniado';

export interface BenefitPartner {
  id: string;
  name: string;
  category: BenefitPartnerCategory;
  city: string;
  state: string;
  discountPercent: number;
  description: string;
  photoUrl?: string;
  hotelExclusive: boolean;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CredentialPass {
  id: string;
  targetUid?: string;
  holderName: string;
  holderEmail?: string;
  passType: 'Afiliado' | 'Executivo VIP' | 'Hoteleiro';
  issuedPasswordHash: string;
  issuedPasswordPlain: string;
  hotelName?: string;
  goldenCardActive: boolean;
  monthlyPaid: boolean;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface VipExecutiveHash {
  id: string;
  executiveName: string;
  passwordHash: string;
  active: boolean;
  updatedAt?: unknown;
}

export interface VipRoomPublic {
  id: string;
  monthLabel: string;
  passwordHash: string;
  buySignalTitle: string;
  buySignalAsset: string;
  buySignalTargetBRL: number;
  updatedAt?: unknown;
}

export interface VipRoomSecret {
  id: string;
  monthLabel: string;
  plainPassword: string;
  updatedBy: string;
  updatedAt?: unknown;
}

export interface InvestmentPackage {
  id: string;
  name: string;
  audience: string;
  amountBRL: number;
  monthlyLabel: string;
  cnecBonus: number;
  vipTierGrant: VipTier;
  hotelStarsAccess: string;
  highlights: string[];
}

export interface BrazilianBank {
  code: string;
  name: string;
  shortName: string;
  pixEnabled: boolean;
  globalSupport: boolean;
}

export interface InterCdbProduct {
  id: string;
  name: string;
  rateLabel: string;
  liquidity: string;
  minBRL: number;
  riskLabel: string;
}

export type ShareholderOrderStatus =
  | 'pending'
  | 'documentacao'
  | 'cartorio'
  | 'approved'
  | 'rejected';

export interface ShareholderOrder {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  userDocument?: string;
  divisionLabel: string;
  lotCount: number;
  sharesPerLot: number;
  totalShares: number;
  percentOwnership: number;
  estimatedValueBRL: number;
  status: ShareholderOrderStatus;
  notaryCode?: string;
  presidentNotes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ShareholderSummary {
  id: string;
  totalCapitalShares: number;
  allocatedShares: number;
  inProcessShares: number;
  activeShareholdersCount: number;
  updatedAt?: unknown;
}

export interface BookingPublicConfig {
  id: string;
  connected: boolean;
  partnerAid: string;
  tokenPrefix: string;
  activeBookingToken: string;
  bookingDomain: string;
  defaultDiscountPercent: number;
  updatedBy: string;
  updatedAt?: unknown;
}

export interface BookingSecretConfig {
  id: string;
  bookingApiToken: string;
  partnerAid: string;
  tokenMasked: string;
  updatedBy: string;
  updatedAt?: unknown;
}

export type TreasuryProbabilityTier = 'Padrao' | 'Alta' | 'Maxima';

export interface ShareholderTreeNode {
  id: string;
  fullName: string;
  branchTitle: string;
  state: string;
  photoUrl?: string;
  parentNodeId: string;
  sharesCount: number;
  sharePercent: number;
  executionPowers: string;
  hotelDiscountAccess: boolean;
  coursesAccess: boolean;
  treasuryTitlesEligible: boolean;
  treasuryProbabilityPercent: number;
  treasuryProbabilityTier: TreasuryProbabilityTier;
  notaryCode?: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type TreasuryEntryType = 'patrimonio' | 'venda_acoes' | 'cotacao_dia';

export interface TreasuryEntry {
  id: string;
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
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type BusinessPortalRecordType =
  | 'client'
  | 'hotel_event'
  | 'sales_tree'
  | 'plan_10_investment';

export interface BusinessPortalRecord {
  id: string;
  userId: string;
  ownerName: string;
  recordType: BusinessPortalRecordType;
  title: string;
  companyOrHotel?: string;
  parentNodeId?: string;
  contactPhone?: string;
  state: string;
  eventDate?: string;
  guestsCount?: number;
  hotelId?: string;
  discountPercent?: number;
  investmentAmountBRL?: number;
  notes?: string;
  status: 'active' | 'pending' | 'confirmed';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type EcclesiasticalPortalRecordType = 'worker_affiliate' | 'ministry_event';

export interface EcclesiasticalPortalRecord {
  id: string;
  userId: string;
  ownerName: string;
  recordType: EcclesiasticalPortalRecordType;
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
  status: 'active' | 'pending' | 'accredited';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ExecutiveMandateArea =
  | 'Hotelaria'
  | 'Farmácia'
  | 'Clubes'
  | 'Fiscalização de Operações'
  | 'Cursos & Eventos'
  | 'Comércio & Parcerias';

export type ExecutiveMandateStatus =
  | 'outorgado'
  | 'em_execucao'
  | 'relatorio_enviado'
  | 'aprovado'
  | 'revogado';

export interface ExecutiveMandate {
  id: string;
  assigneeUid?: string;
  assigneeName: string;
  assigneeRole: 'Executivo' | 'Afiliado';
  area: ExecutiveMandateArea;
  missionTitle: string;
  scopeDescription: string;
  state: string;
  city?: string;
  partnerName?: string;
  partnerDiscountPercent?: number;
  partnerStars?: number;
  executionReport?: string;
  reportSubmittedBy?: string;
  reportSubmittedAt?: string;
  insertedIntoCatalog: boolean;
  status: ExecutiveMandateStatus;
  grantedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type DukeEventTheme =
  | 'emerald_gold'
  | 'royal_blue'
  | 'crimson_gold'
  | 'midnight_violet'
  | 'ivory_gold';

export interface DukeEventMetric {
  label: string;
  value: string;
}

export interface DukeEventPanel {
  title: string;
  subtitle: string;
  description: string;
  badge: string;
}

export interface DukeEventScheduleItem {
  time: string;
  title: string;
  speaker: string;
  stage: string;
  description: string;
}

export interface DukeEventSpeaker {
  name: string;
  role: string;
  topic: string;
}

export interface DukeEventTicket {
  name: string;
  priceLabel: string;
  perks: string;
  highlighted: boolean;
}

export interface DukeEventSpec {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  tagline: string;
  dateLabel: string;
  timeLabel: string;
  venueName: string;
  city: string;
  state: string;
  theme: DukeEventTheme;
  organizerName: string;
  whatsappPhone: string;
  registrationCta: string;
  heroSummary: string;
  highlights: string[];
  metrics: DukeEventMetric[];
  panels: DukeEventPanel[];
  schedule: DukeEventScheduleItem[];
  speakers: DukeEventSpeaker[];
  tickets: DukeEventTicket[];
  bannerImageUrl?: string;
}

export interface DukeEventRecord extends DukeEventSpec {
  id: string;
  ownerUid: string;
  ownerName: string;
  status: 'draft' | 'published';
  publishedOrigin?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type DukeStudioMode = 'auto' | 'chat' | 'image' | 'event';

export type DukeImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:5';

export type DukeImageLayout =
  | 'full_bleed'
  | 'cinematic_bottom'
  | 'editorial_card'
  | 'framed_poster'
  | 'split_hero';

export type DukeImageFrameStyle = 'none' | 'gold_double' | 'minimal_white' | 'neon_glow';

export type DukeImageMotif = 'rays' | 'grid' | 'waves' | 'orbs' | 'rings' | 'emblem';

export interface DukeImageDesignSpec {
  mode: 'create' | 'reformulate';
  title: string;
  aspectRatio: DukeImageAspectRatio;
  layout: DukeImageLayout;
  frameStyle: DukeImageFrameStyle;
  decorativeMotif: DukeImageMotif;
  bgStart: string;
  bgMid: string;
  bgEnd: string;
  accentColor: string;
  textPrimary: string;
  textMuted: string;
  badgeText?: string;
  headline?: string;
  subheadline?: string;
  footerText?: string;
  ctaText?: string;
  brightness?: number;
  contrast?: number;
  saturate?: number;
  sepia?: number;
  hueRotate?: number;
  vignette?: number;
  tintColor?: string;
  tintOpacity?: number;
  emblemType?: 'crown' | 'globe' | 'star' | 'cross' | 'spark' | 'shield' | 'none';
}

export interface DukeGeneratedAsset {
  id: string;
  title: string;
  mode: 'create' | 'reformulate';
  aspectRatio: DukeImageAspectRatio;
  resultDataUrl: string;
  originalDataUrl?: string;
  designSpec: DukeImageDesignSpec;
  createdAt: string;
}

export interface DukeChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  modeUsed?: 'chat' | 'image' | 'event';
  publishedUrl?: string;
  attachmentPreview?: string;
  attachmentName?: string;
  generatedImage?: DukeGeneratedAsset;
}




