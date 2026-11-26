import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Briefcase,
  Building2,
  Church,
  Coins,
  Crown,
  Lock,
  LogIn,
  Plane,
  Radio,
  Scale,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  sanitizeDocId,
  sha256Hex,
  testConnection,
} from './firebase';
import {
  CONAE_ASSETS,
  DEFAULT_BENEFIT_PARTNERS,
  DEFAULT_COURSES,
  DEFAULT_EXECUTIVE_PIX,
  DEFAULT_HOTELS,
  DEFAULT_SHAREHOLDER_TREE,
  DEFAULT_SPONSORS,
  EXECUTIVES_TEAM,
  INVESTMENT_PACKAGES,
  SEED_PUBLIC_AFFILIATES,
} from './data/conaeSeed';
import type {
  BenefitPartner,
  BookingPublicConfig,
  BookingSecretConfig,
  BusinessPortalRecord,
  CourseEnrollment,
  CourseItem,
  CredentialPass,
  EcclesiasticalPortalRecord,
  ExecutiveMandate,
  ExecutiveMandateArea,
  ExecutiveMandateStatus,
  ExecutivePix,
  HotelBooking,
  InvestmentPackage,
  PackageOrder,
  PartnerHotel,
  PublicAffiliate,
  ShareholderOrder,
  ShareholderOrderStatus,
  ShareholderSummary,
  ShareholderTreeNode,
  SponsorItem,
  TabId,
  TreasuryEntry,
  TreasuryEntryType,
  UsdInvestment,
  UserProfile,
  UserRole,
  VipExecutiveHash,
  VipRoomPublic,
  VipRoomSecret,
  VipTier,
} from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CnecChart } from './components/CnecChart';
import { CoursesTab } from './components/CoursesTab';
import { BankAndCryptoTab } from './components/BankAndCryptoTab';
import { HotelsTab } from './components/HotelsTab';
import { BenefitsAndCardsTab } from './components/BenefitsAndCardsTab';
import { ShareholdersTab } from './components/ShareholdersTab';
import { VipRoomTab } from './components/VipRoomTab';
import { MediaRadioTab } from './components/MediaRadioTab';
import { AffiliateAuthTab } from './components/AffiliateAuthTab';
import { AdminPanelTab } from './components/AdminPanelTab';
import { mapMandateAreaToBenefitCategory } from './components/MandatesAndReportsPanel';
import { SimpleQuotationBoard } from './components/SimpleQuotationBoard';
import { BusinessManagementTab } from './components/BusinessManagementTab';
import { EcclesiasticalManagementTab } from './components/EcclesiasticalManagementTab';
import { FloatingAutoCarousel } from './components/FloatingAutoCarousel';
import { FloatingTreasuryMiniWidget } from './components/FloatingTreasuryMiniWidget';
import { FloatingConaeDunkSidebar } from './components/FloatingConaeDunkSidebar';
import { HotelGpsGalleryPanel } from './components/HotelGpsGalleryPanel';
import { InlineHotelBookingBoard } from './components/InlineHotelBookingBoard';
import { ShareholderBranchTree } from './components/ShareholderBranchTree';
import { AppLockScreen } from './components/AppLockScreen';
import { DuqueEventoStudio } from './components/DuqueEventoStudio';
import { PublicEventPage } from './components/PublicEventPage';
import { GolFlightsTab } from './components/GolFlightsTab';
import { LatamFlightsTab } from './components/LatamFlightsTab';
import { GOL_PROMO_FLIGHTS } from './data/golFlightsData';
import { LATAM_PROMO_FLIGHTS } from './data/latamFlightsData';
import {
  computeTreasuryStateStats,
  type ShareholderValuationRecord,
} from './utils/treasuryStateStats';
import {
  buildBookingComUrl,
  DEFAULT_BOOKING_PUBLIC,
  generateHotelBookingToken,
  maskBookingToken,
} from './utils/bookingTokenHelper';
import { triggerViewerEntryBoost } from './hooks/useLiveViewers';
import { usePWAInstall } from './hooks/usePWAInstall';
import { OfflineIndicator } from './components/OfflineIndicator';
import { LanguageFlags, LanguageProvider, useLanguage } from './i18n/LanguageContext';

const TIER_RANK: Record<VipTier, number> = {
  Padrao: 0,
  Prata: 1,
  Ouro: 2,
  Diamante: 3,
};

const TRIAL_DURATION_SECONDS = 40 * 60;
const TRIAL_START_STORAGE_KEY = 'conae_trial_started_at_v1';

function getOrCreateTrialStartMs(): number {
  const now = Date.now();
  try {
    const raw = window.localStorage.getItem(TRIAL_START_STORAGE_KEY);
    if (raw) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0 && parsed <= now) {
        return parsed;
      }
    }
    window.localStorage.setItem(TRIAL_START_STORAGE_KEY, String(now));
    return now;
  } catch {
    return now;
  }
}

function computeRemainingTrialSeconds(startMs: number): number {
  const elapsedSeconds = Math.floor((Date.now() - startMs) / 1000);
  return Math.max(0, TRIAL_DURATION_SECONDS - Math.max(0, elapsedSeconds));
}

function formatTrialMMSS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

type StandaloneRoute =
  | { kind: 'conae' }
  | { kind: 'duque-evento' }
  | { kind: 'public-event'; slug: string };

function parseStandaloneRoute(): StandaloneRoute {
  if (typeof window === 'undefined') return { kind: 'conae' };
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search);

  if (pathname === '/duque-evento' || params.get('page') === 'duque-evento') {
    return { kind: 'duque-evento' };
  }

  const eventMatch = pathname.match(/^\/evento\/([a-zA-Z0-9_-]+)$/);
  if (eventMatch?.[1]) {
    return { kind: 'public-event', slug: eventMatch[1] };
  }

  const queryEvent = params.get('evento');
  if (queryEvent && /^[a-zA-Z0-9_-]+$/.test(queryEvent)) {
    return { kind: 'public-event', slug: queryEvent };
  }

  return { kind: 'conae' };
}

function ConaeAppContent() {
  const { isEn, tr, translateDynamic } = useLanguage();
  const numLocale = isEn ? 'en-US' : 'pt-BR';
  const [standaloneRoute, setStandaloneRoute] = useState<StandaloneRoute>(() => parseStandaloneRoute());
  const [trialStartMs] = useState<number>(() => getOrCreateTrialStartMs());
  const [remainingTrialSeconds, setRemainingTrialSeconds] = useState<number>(() =>
    computeRemainingTrialSeconds(trialStartMs)
  );
  const [isAppUnlocked, setIsAppUnlocked] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setStandaloneRoute(parseStandaloneRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToDuqueEvento = () => {
    window.history.pushState({}, '', '/duque-evento');
    setStandaloneRoute({ kind: 'duque-evento' });
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const navigateToPublishedEvent = (slug: string) => {
    const clean = slug.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!clean) return;
    window.history.pushState({}, '', `/evento/${clean}`);
    setStandaloneRoute({ kind: 'public-event', slug: clean });
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const navigateBackToConae = () => {
    window.history.pushState({}, '', '/');
    setStandaloneRoute({ kind: 'conae' });
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
  const [manualLockRequested, setManualLockRequested] = useState(false);
  const pwaInstall = usePWAInstall();
  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAdminDoc, setIsAdminDoc] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [publicAffiliates, setPublicAffiliates] = useState<PublicAffiliate[]>(SEED_PUBLIC_AFFILIATES);
  const [hotels, setHotels] = useState<PartnerHotel[]>(DEFAULT_HOTELS);
  const [courses, setCourses] = useState<CourseItem[]>(DEFAULT_COURSES);
  const [sponsors, setSponsors] = useState<SponsorItem[]>(DEFAULT_SPONSORS);
  const [benefitPartners, setBenefitPartners] = useState<BenefitPartner[]>(DEFAULT_BENEFIT_PARTNERS);
  const [executivePixList, setExecutivePixList] = useState<ExecutivePix[]>(DEFAULT_EXECUTIVE_PIX);

  const [vipPublic, setVipPublic] = useState<VipRoomPublic | null>(null);
  const [vipSecret, setVipSecret] = useState<VipRoomSecret | null>(null);
  const [vipExecutiveHashes, setVipExecutiveHashes] = useState<VipExecutiveHash[]>([]);
  const [credentialPasses, setCredentialPasses] = useState<CredentialPass[]>([]);

  const [ordersList, setOrdersList] = useState<PackageOrder[]>([]);
  const [usdList, setUsdList] = useState<UsdInvestment[]>([]);
  const [enrollmentsList, setEnrollmentsList] = useState<CourseEnrollment[]>([]);
  const [bookingsList, setBookingsList] = useState<HotelBooking[]>([]);
  const [shareholderOrders, setShareholderOrders] = useState<ShareholderOrder[]>([]);
  const [shareholderSummary, setShareholderSummary] = useState<ShareholderSummary | null>(null);
  const [shareholderTree, setShareholderTree] = useState<ShareholderTreeNode[]>(DEFAULT_SHAREHOLDER_TREE);
  const [treasuryEntries, setTreasuryEntries] = useState<TreasuryEntry[]>([]);
  const [bookingPublic, setBookingPublic] = useState<BookingPublicConfig | null>(null);
  const [bookingSecret, setBookingSecret] = useState<BookingSecretConfig | null>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [businessRecords, setBusinessRecords] = useState<BusinessPortalRecord[]>([]);
  const [ecclesiasticalRecords, setEcclesiasticalRecords] = useState<EcclesiasticalPortalRecord[]>([]);
  const [executiveMandates, setExecutiveMandates] = useState<ExecutiveMandate[]>([]);

  const [showFloatingPromo, setShowFloatingPromo] = useState(true);
  const [uiNotice, setUiNotice] = useState<string | null>(null);

  const isBootstrappedAdmin = Boolean(
    firebaseUser?.emailVerified && firebaseUser.email === BOOTSTRAPPED_ADMIN_EMAIL
  );
  const isAdmin = Boolean(
    isBootstrappedAdmin ||
      isAdminDoc ||
      profile?.role === 'president' ||
      profile?.role === 'executive'
  );

  // 1. Test Firestore connectivity once on mount + 40-minute tasting countdown
  useEffect(() => {
    void testConnection();
  }, []);

  useEffect(() => {
    if (isAppUnlocked) return;
    const syncRemaining = () => {
      setRemainingTrialSeconds(computeRemainingTrialSeconds(trialStartMs));
    };
    syncRemaining();
    const timerId = window.setInterval(syncRemaining, 1000);
    return () => window.clearInterval(timerId);
  }, [isAppUnlocked, trialStartMs]);

  useEffect(() => {
    if (firebaseUser?.uid) {
      triggerViewerEntryBoost();
    }
  }, [firebaseUser?.uid]);

  // 2. Listen to Auth State
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setProfile(null);
        setIsAdminDoc(false);
        setOrdersList([]);
        setUsdList([]);
        setEnrollmentsList([]);
        setBookingsList([]);
        setShareholderOrders([]);
        setCredentialPasses([]);
        setVipExecutiveHashes([]);
        setUsersList([]);
        setBusinessRecords([]);
        setEcclesiasticalRecords([]);
        setExecutiveMandates([]);
        setVipPublic(null);
        setVipSecret(null);
      }
    });
    return () => unsub();
  }, []);

  // 3. Public non-PII listeners (Affiliates showcase, Hotels, Courses, Sponsors, Benefit Partners, Shareholder Summary)
  useEffect(() => {
    const unsubAff = onSnapshot(
      collection(db, 'public_affiliates'),
      (snap) => {
        const docs = snap.docs.map((d) => d.data() as PublicAffiliate);
        if (docs.length > 0) {
          const merged = [...docs];
          SEED_PUBLIC_AFFILIATES.forEach((seed) => {
            if (!merged.some((m) => m.uid === seed.uid)) {
              merged.push(seed);
            }
          });
          setPublicAffiliates(merged);
        } else {
          setPublicAffiliates(SEED_PUBLIC_AFFILIATES);
        }
      },
      (err) => console.warn('Public affiliates listener:', err.message)
    );

    const unsubHotels = onSnapshot(
      collection(db, 'hotels'),
      (snap) => {
        const docs = snap.docs.map((d) => d.data() as PartnerHotel);
        if (docs.length > 0) {
          const merged = [...docs];
          DEFAULT_HOTELS.forEach((seed) => {
            if (!merged.some((m) => m.id === seed.id)) {
              merged.push(seed);
            }
          });
          setHotels(merged);
        } else {
          setHotels(DEFAULT_HOTELS);
        }
      },
      (err) => console.warn('Hotels listener:', err.message)
    );

    const unsubCourses = onSnapshot(
      collection(db, 'courses'),
      (snap) => {
        const docs = snap.docs.map((d) => d.data() as CourseItem);
        if (docs.length > 0) {
          const merged = [...docs];
          DEFAULT_COURSES.forEach((seed) => {
            if (!merged.some((m) => m.id === seed.id)) {
              merged.push(seed);
            }
          });
          setCourses(merged);
        } else {
          setCourses(DEFAULT_COURSES);
        }
      },
      (err) => console.warn('Courses listener:', err.message)
    );

    const unsubSponsors = onSnapshot(
      collection(db, 'sponsors'),
      (snap) => {
        const docs = snap.docs.map((d) => d.data() as SponsorItem);
        if (docs.length > 0) {
          const merged = [...docs];
          DEFAULT_SPONSORS.forEach((seed) => {
            if (!merged.some((m) => m.id === seed.id)) {
              merged.push(seed);
            }
          });
          setSponsors(merged);
        } else {
          setSponsors(DEFAULT_SPONSORS);
        }
      },
      (err) => console.warn('Sponsors listener:', err.message)
    );

    const unsubBenefits = onSnapshot(
      collection(db, 'benefit_partners'),
      (snap) => {
        const docs = snap.docs.map((d) => d.data() as BenefitPartner);
        if (docs.length > 0) {
          const merged = [...docs];
          DEFAULT_BENEFIT_PARTNERS.forEach((seed) => {
            if (!merged.some((m) => m.id === seed.id)) {
              merged.push(seed);
            }
          });
          setBenefitPartners(merged);
        } else {
          setBenefitPartners(DEFAULT_BENEFIT_PARTNERS);
        }
      },
      (err) => console.warn('Benefit partners listener:', err.message)
    );

    const unsubShareSummary = onSnapshot(
      doc(db, 'shareholder_summary', 'current'),
      (snap) => {
        if (snap.exists()) {
          setShareholderSummary(snap.data() as ShareholderSummary);
        }
      },
      (err) => console.warn('Shareholder summary listener:', err.message)
    );

    const unsubBookingPub = onSnapshot(
      doc(db, 'booking_public', 'current'),
      (snap) => {
        if (snap.exists()) {
          setBookingPublic(snap.data() as BookingPublicConfig);
        }
      },
      (err) => console.warn('Booking public listener:', err.message)
    );

    const unsubShareholderTree = onSnapshot(
      collection(db, 'shareholder_tree'),
      (snap) => {
        const docs = snap.docs.map((d) => d.data() as ShareholderTreeNode);
        if (docs.length > 0) {
          const merged = [...docs];
          DEFAULT_SHAREHOLDER_TREE.forEach((seed) => {
            if (!merged.some((m) => m.id === seed.id)) {
              merged.push(seed);
            }
          });
          setShareholderTree(merged);
        } else {
          setShareholderTree(DEFAULT_SHAREHOLDER_TREE);
        }
      },
      (err) => console.warn('Shareholder tree listener:', err.message)
    );

    const unsubTreasuryLedger = onSnapshot(
      collection(db, 'treasury_ledger'),
      (snap) => {
        const docs = snap.docs
          .map((d) => ({ ...(d.data() as TreasuryEntry), id: d.id }))
          .sort((a, b) => (b.entryDate || '').localeCompare(a.entryDate || ''));
        setTreasuryEntries(docs);
      },
      (err) => console.warn('Treasury ledger listener:', err.message)
    );

    return () => {
      unsubAff();
      unsubHotels();
      unsubCourses();
      unsubSponsors();
      unsubBenefits();
      unsubShareSummary();
      unsubBookingPub();
      unsubShareholderTree();
      unsubTreasuryLedger();
    };
  }, []);

  // 4. Signed-in user profile bootstrap & admin check
  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified) return;

    const uid = firebaseUser.uid;
    let active = true;

    const ensureProfileAndAdmin = async () => {
      try {
        const adminSnap = await getDoc(doc(db, 'admins', uid));
        if (active) setIsAdminDoc(adminSnap.exists());
      } catch {
        if (active) setIsAdminDoc(false);
      }

      try {
        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);
        if (!snap.exists() && active) {
          const initialName = (firebaseUser.displayName || 'Filiado CONAE').slice(0, 100);
          const payload: Record<string, unknown> = {
            uid,
            displayName: initialName.length >= 2 ? initialName : 'Filiado CONAE',
            email: firebaseUser.email || 'filiado@conaecursos.com.br',
            state: 'GO',
            role: 'affiliate',
            vipTier: 'Padrao',
            balanceBRL: 0,
            balanceUSD: 0,
            cnecTokens: 0,
            monthlyPlanActive: false,
            virtualCardActive: false,
            executiveCardActive: false,
            sharesOwned: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (firebaseUser.photoURL) {
            payload.photoUrl = firebaseUser.photoURL.slice(0, 500);
          }
          await setDoc(userRef, payload);

          const pubRef = doc(db, 'public_affiliates', uid);
          const pubSnap = await getDoc(pubRef);
          if (!pubSnap.exists()) {
            const pubPayload: Record<string, unknown> = {
              uid,
              displayName: payload.displayName,
              state: 'GO',
              vipTier: 'Padrao',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            if (payload.photoUrl) pubPayload.photoUrl = payload.photoUrl;
            await setDoc(pubRef, pubPayload);
          }
        }
      } catch (err) {
        console.error('Bootstrap profile failed:', err);
      }
    };

    void ensureProfileAndAdmin();

    const unsubProfile = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      }
    );

    const unsubVipPub = onSnapshot(
      doc(db, 'vip_public', 'current'),
      (snap) => {
        if (snap.exists()) {
          setVipPublic(snap.data() as VipRoomPublic);
        }
      },
      (err) => console.warn('VIP public listener:', err.message)
    );

    return () => {
      active = false;
      unsubProfile();
      unsubVipPub();
    };
  }, [authReady, firebaseUser]);

  // 5. Protected collections listeners (gated on authReady + verified user)
  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified) return;

    const uid = firebaseUser.uid;

    const pixQ = isBootstrappedAdmin
      ? collection(db, 'executive_pix')
      : query(collection(db, 'executive_pix'), where('active', '==', true));

    const unsubPix = onSnapshot(
      pixQ,
      (snap) => {
        const docs = snap.docs.map((d) => d.data() as ExecutivePix);
        setExecutivePixList(docs.length > 0 ? docs : DEFAULT_EXECUTIVE_PIX);
      },
      (err) => console.warn('Executive PIX listener:', err.message)
    );

    const vipHashesQ = isBootstrappedAdmin
      ? collection(db, 'vip_executive_hashes')
      : query(collection(db, 'vip_executive_hashes'), where('active', '==', true));

    const unsubVipHashes = onSnapshot(
      vipHashesQ,
      (snap) => {
        setVipExecutiveHashes(snap.docs.map((d) => d.data() as VipExecutiveHash));
      },
      (err) => console.warn('VIP executive hashes listener:', err.message)
    );

    const passesQ = isBootstrappedAdmin
      ? collection(db, 'credential_passes')
      : query(collection(db, 'credential_passes'), where('targetUid', '==', uid));

    const unsubPasses = onSnapshot(
      passesQ,
      (snap) => {
        setCredentialPasses(snap.docs.map((d) => d.data() as CredentialPass));
      },
      (err) => console.warn('Credential passes listener:', err.message)
    );

    const ordersQ = isBootstrappedAdmin
      ? collection(db, 'package_orders')
      : query(collection(db, 'package_orders'), where('userId', '==', uid));

    const unsubOrders = onSnapshot(
      ordersQ,
      (snap) => setOrdersList(snap.docs.map((d) => d.data() as PackageOrder)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'package_orders')
    );

    const usdQ = isBootstrappedAdmin
      ? collection(db, 'usd_investments')
      : query(collection(db, 'usd_investments'), where('userId', '==', uid));

    const unsubUsd = onSnapshot(
      usdQ,
      (snap) => setUsdList(snap.docs.map((d) => d.data() as UsdInvestment)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'usd_investments')
    );

    const enrollQ = isBootstrappedAdmin
      ? collection(db, 'course_enrollments')
      : query(collection(db, 'course_enrollments'), where('userId', '==', uid));

    const unsubEnroll = onSnapshot(
      enrollQ,
      (snap) => setEnrollmentsList(snap.docs.map((d) => d.data() as CourseEnrollment)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'course_enrollments')
    );

    const bookQ = isBootstrappedAdmin
      ? collection(db, 'hotel_bookings')
      : query(collection(db, 'hotel_bookings'), where('userId', '==', uid));

    const unsubBook = onSnapshot(
      bookQ,
      (snap) => setBookingsList(snap.docs.map((d) => d.data() as HotelBooking)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'hotel_bookings')
    );

    const shareQ = isBootstrappedAdmin
      ? collection(db, 'shareholder_orders')
      : query(collection(db, 'shareholder_orders'), where('userId', '==', uid));

    const unsubShareOrders = onSnapshot(
      shareQ,
      (snap) => setShareholderOrders(snap.docs.map((d) => d.data() as ShareholderOrder)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'shareholder_orders')
    );

    const businessQ = isBootstrappedAdmin
      ? collection(db, 'business_portal_records')
      : query(collection(db, 'business_portal_records'), where('userId', '==', uid));

    const unsubBusiness = onSnapshot(
      businessQ,
      (snap) =>
        setBusinessRecords(
          snap.docs.map((d) => ({ ...(d.data() as BusinessPortalRecord), id: d.id }))
        ),
      (err) => console.warn('Business portal listener:', err.message)
    );

    const ecclesiasticalQ = isBootstrappedAdmin
      ? collection(db, 'ecclesiastical_portal_records')
      : query(collection(db, 'ecclesiastical_portal_records'), where('userId', '==', uid));

    const unsubEcclesiastical = onSnapshot(
      ecclesiasticalQ,
      (snap) =>
        setEcclesiasticalRecords(
          snap.docs.map((d) => ({ ...(d.data() as EcclesiasticalPortalRecord), id: d.id }))
        ),
      (err) => console.warn('Ecclesiastical portal listener:', err.message)
    );

    const mandatesQ = isBootstrappedAdmin
      ? collection(db, 'executive_mandates')
      : query(collection(db, 'executive_mandates'), where('assigneeUid', '==', uid));

    const unsubMandates = onSnapshot(
      mandatesQ,
      (snap) =>
        setExecutiveMandates(
          snap.docs.map((d) => ({ ...(d.data() as ExecutiveMandate), id: d.id }))
        ),
      (err) => handleFirestoreError(err, OperationType.LIST, 'executive_mandates')
    );

    return () => {
      unsubPix();
      unsubVipHashes();
      unsubPasses();
      unsubOrders();
      unsubUsd();
      unsubEnroll();
      unsubBook();
      unsubShareOrders();
      unsubBusiness();
      unsubEcclesiastical();
      unsubMandates();
    };
  }, [authReady, firebaseUser, isBootstrappedAdmin]);

  // 6. Admin-only listeners
  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified || !isAdmin) return;

    const unsubVipSec = onSnapshot(
      doc(db, 'vip_secrets', 'current'),
      (snap) => {
        if (snap.exists()) setVipSecret(snap.data() as VipRoomSecret);
      },
      (err) => console.warn('VIP secret listener:', err.message)
    );

    const unsubBookingSec = onSnapshot(
      doc(db, 'booking_secrets', 'current'),
      (snap) => {
        if (snap.exists()) setBookingSecret(snap.data() as BookingSecretConfig);
      },
      (err) => console.warn('Booking secret listener:', err.message)
    );

    let unsubUsers = () => {};
    if (isBootstrappedAdmin) {
      unsubUsers = onSnapshot(
        collection(db, 'users'),
        (snap) => setUsersList(snap.docs.map((d) => d.data() as UserProfile)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'users')
      );
    }

    return () => {
      unsubVipSec();
      unsubBookingSec();
      unsubUsers();
    };
  }, [authReady, firebaseUser, isAdmin, isBootstrappedAdmin]);

  // Auth Actions
  const handleGoogleLogin = async () => {
    try {
      setUiNotice(null);
      await signInWithPopup(auth, googleProvider);
      setUiNotice(
        tr(
          'Sessão autenticada com sucesso na plataforma CONAE.',
          'Session authenticated successfully on the CONAE platform.'
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : tr('Erro ao conectar conta Google.', 'Error connecting Google account.');
      setUiNotice(tr(`Não foi possível concluir o login: ${msg}`, `Could not complete sign in: ${msg}`));
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setActiveTab('inicio');
    setUiNotice(tr('Você saiu da sua conta CONAE com segurança.', 'You safely signed out of your CONAE account.'));
  };

  const handleRequireAuth = () => {
    setActiveTab('afiliado');
    setUiNotice(
      tr(
        'Conecte sua conta Google na aba Cadastro / Afiliado para continuar.',
        'Connect your Google account on the Affiliate Sign-Up tab to continue.'
      )
    );
  };

  // User CRUD Handlers
  const handleSaveProfile = async (data: {
    displayName: string;
    phone: string;
    state: string;
    cpf: string;
    loginUsername: string;
    loginPassword?: string;
    photoUrl: string;
  }) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const userRef = doc(db, 'users', uid);
    const pubRef = doc(db, 'public_affiliates', uid);

    try {
      const secretHash = data.loginPassword ? await sha256Hex(data.loginPassword) : profile?.loginSecretHash;
      const existingSnap = await getDoc(userRef);

      if (!existingSnap.exists()) {
        const createPayload: Record<string, unknown> = {
          uid,
          displayName: data.displayName,
          email: firebaseUser.email || 'filiado@conaecursos.com.br',
          state: data.state,
          role: 'affiliate',
          vipTier: 'Padrao',
          balanceBRL: 0,
          balanceUSD: 0,
          cnecTokens: 0,
          monthlyPlanActive: false,
          virtualCardActive: false,
          executiveCardActive: false,
          sharesOwned: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (data.phone) createPayload.phone = data.phone;
        if (data.cpf) createPayload.cpf = data.cpf;
        if (data.loginUsername.length >= 3) createPayload.loginUsername = data.loginUsername;
        if (secretHash) createPayload.loginSecretHash = secretHash;
        if (data.photoUrl) createPayload.photoUrl = data.photoUrl.slice(0, 60000);

        await setDoc(userRef, createPayload);
      } else {
        const updatePayload: Record<string, unknown> = {
          displayName: data.displayName,
          phone: data.phone,
          state: data.state,
          cpf: data.cpf,
          photoUrl: data.photoUrl.slice(0, 60000),
          updatedAt: serverTimestamp(),
        };
        if (data.loginUsername.length >= 3) {
          updatePayload.loginUsername = data.loginUsername;
        }
        if (secretHash) {
          updatePayload.loginSecretHash = secretHash;
        }
        await updateDoc(userRef, updatePayload);
      }

      const pubSnap = await getDoc(pubRef);
      if (!pubSnap.exists()) {
        await setDoc(pubRef, {
          uid,
          displayName: data.displayName,
          state: data.state,
          photoUrl: data.photoUrl.slice(0, 60000),
          vipTier: 'Padrao',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(pubRef, {
          displayName: data.displayName,
          state: data.state,
          photoUrl: data.photoUrl.slice(0, 60000),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  };

  const handleGenerateBankToken = async (): Promise<string> => {
    if (!firebaseUser) return '';
    const uid = firebaseUser.uid;
    const token = `cnae_tok_${uid.slice(0, 6)}_${Math.random().toString(36).slice(2, 10)}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        bankToken: token,
        updatedAt: serverTimestamp(),
      });
      return token;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleCreatePackageOrder = async (params: {
    pkg: InvestmentPackage;
    paymentMethod: 'PIX_INTER' | 'PIX_MULTI' | 'CONTA_GLOBAL_USD' | 'DERIV_P2P';
    executivePix: ExecutivePix;
    contactEmail?: string;
  }) => {
    if (!firebaseUser || !profile) return;
    const id = sanitizeDocId('ord');
    const cleanEmail = (params.contactEmail || profile.email || '').trim().slice(0, 120);
    const notesText = cleanEmail
      ? `PIX ${params.executivePix.executiveName} (CPF ${params.executivePix.pixKey}) · E-mail Cartão Hotéis: ${cleanEmail}`.slice(0, 290)
      : `PIX ${params.executivePix.executiveName} (${params.executivePix.pixKey})`.slice(0, 290);
    try {
      await setDoc(doc(db, 'package_orders', id), {
        id,
        userId: firebaseUser.uid,
        userName: profile.displayName,
        packageId: params.pkg.id,
        packageName: params.pkg.name,
        amountBRL: params.pkg.amountBRL,
        cnecAmount: params.pkg.cnecBonus,
        paymentMethod: params.paymentMethod,
        executivePixId: params.executivePix.id,
        executiveName: params.executivePix.executiveName,
        status: 'pending',
        notes: notesText,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `package_orders/${id}`);
    }
  };

  const handleCreateUsdInvestment = async (params: {
    amountUSD: number;
    quoteBRL: number;
    platform: 'DERIV_P2P' | 'INTER_GLOBAL' | 'CDB_INTER';
  }) => {
    if (!firebaseUser || !profile) return;
    const id = sanitizeDocId('usd');
    try {
      await setDoc(doc(db, 'usd_investments', id), {
        id,
        userId: firebaseUser.uid,
        userName: profile.displayName,
        amountUSD: params.amountUSD,
        quoteBRL: params.quoteBRL,
        amountBRL: Number((params.amountUSD * params.quoteBRL).toFixed(2)),
        platform: params.platform,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `usd_investments/${id}`);
    }
  };

  const handleEnrollCourse = async (course: CourseItem) => {
    if (!firebaseUser || !profile) return;
    const id = sanitizeDocId('enr');
    try {
      await setDoc(doc(db, 'course_enrollments', id), {
        id,
        userId: firebaseUser.uid,
        userName: profile.displayName,
        courseId: course.id,
        courseTitle: course.title,
        modality: course.modality,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `course_enrollments/${id}`);
    }
  };

  const handleBookHotel = async (params: {
    hotel: PartnerHotel;
    checkInDate: string;
    checkOutDate?: string;
    guests: number;
    children?: number;
    rooms?: number;
  }) => {
    if (!firebaseUser || !profile) return;
    const id = sanitizeDocId('hot');
    const cfg = bookingPublic || DEFAULT_BOOKING_PUBLIC;
    const bookingToken = generateHotelBookingToken(cfg.tokenPrefix, params.hotel.state, id);
    const bookingUrl = buildBookingComUrl({
      hotelName: params.hotel.name,
      city: params.hotel.city,
      state: params.hotel.state,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      guests: params.guests,
      children: params.children ?? 0,
      rooms: params.rooms ?? 1,
      partnerAid: cfg.partnerAid,
      bookingToken,
      bookingDomain: cfg.bookingDomain,
    });
    try {
      await setDoc(doc(db, 'hotel_bookings', id), {
        id,
        userId: firebaseUser.uid,
        userName: profile.displayName,
        hotelId: params.hotel.id,
        hotelName: params.hotel.name,
        state: params.hotel.state,
        stars: params.hotel.stars,
        checkInDate: params.checkInDate,
        guests: params.guests,
        status: 'pending',
        bookingToken,
        bookingChannel: 'CONAE_BOOKING_TOKEN',
        bookingUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { bookingToken, bookingUrl };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `hotel_bookings/${id}`);
      return { bookingToken, bookingUrl };
    }
  };

  const handleCreateShareholderOrder = async (params: {
    userPhone: string;
    userDocument: string;
    divisionLabel: string;
    lotCount: number;
    sharesPerLot: number;
    totalShares: number;
    percentOwnership: number;
    estimatedValueBRL: number;
  }) => {
    if (!firebaseUser || !profile) return;
    const id = sanitizeDocId('shr');
    try {
      await setDoc(doc(db, 'shareholder_orders', id), {
        id,
        userId: firebaseUser.uid,
        userName: profile.displayName,
        userPhone: params.userPhone.slice(0, 30),
        userDocument: params.userDocument.slice(0, 30),
        divisionLabel: params.divisionLabel.slice(0, 100),
        lotCount: params.lotCount,
        sharesPerLot: params.sharesPerLot,
        totalShares: params.totalShares,
        percentOwnership: params.percentOwnership,
        estimatedValueBRL: params.estimatedValueBRL,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `shareholder_orders/${id}`);
    }
  };

  // Business & Ecclesiastical Portal Handlers
  const handleCreateBusinessRecord = async (params: {
    recordType: BusinessPortalRecord['recordType'];
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
    status?: BusinessPortalRecord['status'];
  }): Promise<boolean> => {
    if (!firebaseUser || !profile) return false;
    const id = sanitizeDocId('biz');
    const payload: Record<string, unknown> = {
      id,
      userId: firebaseUser.uid,
      ownerName: (profile.displayName || 'Empresario CONAE').slice(0, 100),
      recordType: params.recordType,
      title: params.title.trim().slice(0, 120),
      state: (params.state || 'GO').trim().slice(0, 4).toUpperCase(),
      status: params.status || 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (params.companyOrHotel?.trim()) payload.companyOrHotel = params.companyOrHotel.trim().slice(0, 120);
    if (params.parentNodeId?.trim()) payload.parentNodeId = params.parentNodeId.trim().slice(0, 128);
    if (params.contactPhone?.trim()) payload.contactPhone = params.contactPhone.trim().slice(0, 30);
    if (params.eventDate?.trim()) payload.eventDate = params.eventDate.trim().slice(0, 20);
    if (typeof params.guestsCount === 'number' && Number.isFinite(params.guestsCount)) {
      payload.guestsCount = Math.max(0, Math.min(10000, Math.round(params.guestsCount)));
    }
    if (params.hotelId?.trim()) payload.hotelId = params.hotelId.trim().slice(0, 128);
    if (typeof params.discountPercent === 'number' && Number.isFinite(params.discountPercent)) {
      payload.discountPercent = Math.max(0, Math.min(100, Number(params.discountPercent)));
    }
    if (typeof params.investmentAmountBRL === 'number' && Number.isFinite(params.investmentAmountBRL)) {
      payload.investmentAmountBRL = Math.max(0, Math.min(100000000, Number(params.investmentAmountBRL)));
    }
    if (params.notes?.trim()) payload.notes = params.notes.trim().slice(0, 300);

    try {
      await setDoc(doc(db, 'business_portal_records', id), payload);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `business_portal_records/${id}`);
      return false;
    }
  };

  const handleDeleteBusinessRecord = async (id: string) => {
    const cleanId = id.trim();
    if (!cleanId) return;
    try {
      await deleteDoc(doc(db, 'business_portal_records', cleanId));
      setBusinessRecords((prev) => prev.filter((item) => item.id !== cleanId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `business_portal_records/${cleanId}`);
    }
  };

  const handleCreateEcclesiasticalRecord = async (params: {
    recordType: EcclesiasticalPortalRecord['recordType'];
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
    status?: EcclesiasticalPortalRecord['status'];
  }): Promise<boolean> => {
    if (!firebaseUser || !profile) return false;
    const id = sanitizeDocId('ecl');
    const payload: Record<string, unknown> = {
      id,
      userId: firebaseUser.uid,
      ownerName: (profile.displayName || 'Ministro CONAE').slice(0, 100),
      recordType: params.recordType,
      fullNameOrTitle: params.fullNameOrTitle.trim().slice(0, 120),
      state: (params.state || 'GO').trim().slice(0, 4).toUpperCase(),
      status: params.status || 'accredited',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (params.ministryRole?.trim()) payload.ministryRole = params.ministryRole.trim().slice(0, 60);
    if (params.churchName?.trim()) payload.churchName = params.churchName.trim().slice(0, 120);
    if (params.contactPhone?.trim()) payload.contactPhone = params.contactPhone.trim().slice(0, 30);
    if (params.city?.trim()) payload.city = params.city.trim().slice(0, 80);
    if (params.eventDate?.trim()) payload.eventDate = params.eventDate.trim().slice(0, 20);
    if (typeof params.expectedAttendees === 'number' && Number.isFinite(params.expectedAttendees)) {
      payload.expectedAttendees = Math.max(0, Math.min(100000, Math.round(params.expectedAttendees)));
    }
    if (params.credentialCode?.trim()) payload.credentialCode = params.credentialCode.trim().slice(0, 60);
    if (params.notes?.trim()) payload.notes = params.notes.trim().slice(0, 300);

    try {
      await setDoc(doc(db, 'ecclesiastical_portal_records', id), payload);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `ecclesiastical_portal_records/${id}`);
      return false;
    }
  };

  const handleDeleteEcclesiasticalRecord = async (id: string) => {
    const cleanId = id.trim();
    if (!cleanId) return;
    try {
      await deleteDoc(doc(db, 'ecclesiastical_portal_records', cleanId));
      setEcclesiasticalRecords((prev) => prev.filter((item) => item.id !== cleanId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `ecclesiastical_portal_records/${cleanId}`);
    }
  };

  // Admin Handlers
  const handleApprovePackageOrder = async (order: PackageOrder, approve: boolean) => {
    try {
      const orderRef = doc(db, 'package_orders', order.id);
      if (!approve) {
        await updateDoc(orderRef, { status: 'rejected', updatedAt: serverTimestamp() });
        return;
      }

      const targetUserRef = doc(db, 'users', order.userId);
      const userSnap = await getDoc(targetUserRef);
      const matchedPkg = INVESTMENT_PACKAGES.find((p) => p.id === order.packageId);
      const grantedTier: VipTier = matchedPkg?.vipTierGrant || 'Prata';

      const batch = writeBatch(db);
      batch.update(orderRef, { status: 'approved', updatedAt: serverTimestamp() });

      if (userSnap.exists()) {
        const current = userSnap.data() as UserProfile;
        const nextTier =
          TIER_RANK[grantedTier] > TIER_RANK[current.vipTier] ? grantedTier : current.vipTier;
        const generatedCardNum =
          current.cardNumber ||
          `4916 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;

        batch.update(targetUserRef, {
          balanceBRL: Number(((current.balanceBRL || 0) + order.amountBRL).toFixed(2)),
          cnecTokens: Number(((current.cnecTokens || 0) + order.cnecAmount).toFixed(2)),
          vipTier: nextTier,
          monthlyPlanActive: true,
          virtualCardActive: true,
          cardNumber: generatedCardNum,
          updatedAt: serverTimestamp(),
        });

        const pubRef = doc(db, 'public_affiliates', order.userId);
        const pubSnap = await getDoc(pubRef);
        if (pubSnap.exists()) {
          batch.update(pubRef, { vipTier: nextTier, updatedAt: serverTimestamp() });
        }
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `package_orders/${order.id}`);
    }
  };

  const handleApproveUsdInvestment = async (inv: UsdInvestment, approve: boolean) => {
    try {
      const invRef = doc(db, 'usd_investments', inv.id);
      if (!approve) {
        await updateDoc(invRef, { status: 'rejected', updatedAt: serverTimestamp() });
        return;
      }
      const userRef = doc(db, 'users', inv.userId);
      const userSnap = await getDoc(userRef);
      const batch = writeBatch(db);
      batch.update(invRef, { status: 'approved', updatedAt: serverTimestamp() });
      if (userSnap.exists()) {
        const current = userSnap.data() as UserProfile;
        batch.update(userRef, {
          balanceUSD: Number(((current.balanceUSD || 0) + inv.amountUSD).toFixed(2)),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `usd_investments/${inv.id}`);
    }
  };

  const handleUpdateEnrollmentStatus = async (
    enroll: CourseEnrollment,
    status: 'active' | 'certified'
  ) => {
    try {
      const patch: Record<string, unknown> = { status, updatedAt: serverTimestamp() };
      if (status === 'certified') {
        patch.credentialCode =
          enroll.credentialCode || `CONAE-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      await updateDoc(doc(db, 'course_enrollments', enroll.id), patch);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `course_enrollments/${enroll.id}`);
    }
  };

  const handleUpdateBookingStatus = async (
    booking: HotelBooking,
    status: 'confirmed' | 'cancelled'
  ) => {
    try {
      await updateDoc(doc(db, 'hotel_bookings', booking.id), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `hotel_bookings/${booking.id}`);
    }
  };

  const handleUpdateShareholderOrder = async (
    order: ShareholderOrder,
    params: {
      status: ShareholderOrderStatus;
      notaryCode: string;
      presidentNotes: string;
    }
  ) => {
    try {
      const orderRef = doc(db, 'shareholder_orders', order.id);
      const batch = writeBatch(db);

      const orderPatch: Record<string, unknown> = {
        status: params.status,
        updatedAt: serverTimestamp(),
      };
      if (params.notaryCode.trim()) orderPatch.notaryCode = params.notaryCode.trim().slice(0, 80);
      if (params.presidentNotes.trim()) {
        orderPatch.presidentNotes = params.presidentNotes.trim().slice(0, 300);
      }
      batch.update(orderRef, orderPatch);

      // Credit shares onto user profile only when transitioning to approved after Cartório
      if (params.status === 'approved' && order.status !== 'approved') {
        const userRef = doc(db, 'users', order.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const current = userSnap.data() as UserProfile;
          const nextShares = Math.min(100000, (current.sharesOwned || 0) + order.totalShares);
          batch.update(userRef, {
            sharesOwned: nextShares,
            sharesNotaryCode: (params.notaryCode.trim() || `CARTORIO-${order.id.slice(-6).toUpperCase()}`).slice(0, 80),
            updatedAt: serverTimestamp(),
          });
        }
      }

      // Update aggregate public summary (non-PII)
      const projectedOrders = shareholderOrders.map((o) =>
        o.id === order.id ? { ...o, status: params.status } : o
      );
      const approvedSum = projectedOrders
        .filter((o) => o.status === 'approved')
        .reduce((acc, o) => acc + o.totalShares, 0);
      const inProcSum = projectedOrders
        .filter((o) => o.status === 'pending' || o.status === 'documentacao' || o.status === 'cartorio')
        .reduce((acc, o) => acc + o.totalShares, 0);
      const uniqueHolders = new Set(
        projectedOrders.filter((o) => o.status === 'approved').map((o) => o.userId)
      ).size;

      batch.set(doc(db, 'shareholder_summary', 'current'), {
        id: 'current',
        totalCapitalShares: 100000,
        allocatedShares: Math.min(100000, 18500 + approvedSum),
        inProcessShares: Math.min(100000 - Math.min(100000, 18500 + approvedSum), inProcSum),
        activeShareholdersCount: 12 + uniqueHolders,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `shareholder_orders/${order.id}`);
    }
  };

  const handleUpdateUserPatrimony = async (
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
  ) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const cardNumber =
        user.cardNumber ||
        `4916 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;

      const updateObj: Record<string, unknown> = {
        balanceBRL: patch.balanceBRL,
        balanceUSD: patch.balanceUSD,
        cnecTokens: patch.cnecTokens,
        vipTier: patch.vipTier,
        monthlyPlanActive: patch.monthlyPlanActive,
        virtualCardActive: patch.virtualCardActive,
        executiveCardActive: patch.executiveCardActive,
        sharesOwned: patch.sharesOwned,
        role: patch.role,
        cardNumber,
        updatedAt: serverTimestamp(),
      };
      if (patch.sharesNotaryCode) {
        updateObj.sharesNotaryCode = patch.sharesNotaryCode.slice(0, 80);
      }

      await updateDoc(userRef, updateObj);

      const pubRef = doc(db, 'public_affiliates', user.uid);
      const pubSnap = await getDoc(pubRef);
      if (pubSnap.exists()) {
        await updateDoc(pubRef, { vipTier: patch.vipTier, updatedAt: serverTimestamp() });
      }

      if (patch.role === 'executive' || patch.role === 'president') {
        await setDoc(doc(db, 'admins', user.uid), {
          uid: user.uid,
          email: user.email,
          roleTitle: patch.role === 'president' ? 'Presidente Mundial' : 'Executivo Diretoria',
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleDeleteUnpaidUser = async (user: UserProfile) => {
    if (
      user.monthlyPlanActive ||
      user.role === 'president' ||
      user.email === BOOTSTRAPPED_ADMIN_EMAIL
    ) {
      return;
    }
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', user.uid));

      const pubRef = doc(db, 'public_affiliates', user.uid);
      const pubSnap = await getDoc(pubRef);
      if (pubSnap.exists()) {
        batch.delete(pubRef);
      }

      const adminRef = doc(db, 'admins', user.uid);
      const adminSnap = await getDoc(adminRef);
      if (adminSnap.exists()) {
        batch.delete(adminRef);
      }

      credentialPasses
        .filter((cp) => cp.targetUid === user.uid)
        .forEach((cp) => {
          batch.delete(doc(db, 'credential_passes', cp.id));
          if (cp.passType === 'Executivo VIP') {
            batch.delete(doc(db, 'vip_executive_hashes', cp.id));
          }
        });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}`);
    }
  };

  const handleDeleteAllUnpaidUsers = async (targets: UserProfile[]): Promise<number> => {
    const eligible = targets.filter(
      (u) => !u.monthlyPlanActive && u.role !== 'president' && u.email !== BOOTSTRAPPED_ADMIN_EMAIL
    );
    let removed = 0;
    for (const user of eligible) {
      await handleDeleteUnpaidUser(user);
      removed++;
    }
    return removed;
  };

  const handleDeleteAffiliateRegistration = async (targetUid: string) => {
    if (!firebaseUser) return;
    if (isBootstrappedAdmin && targetUid === firebaseUser.uid) {
      setUiNotice(
        tr(
          'A conta principal da Presidência não pode ser excluída.',
          'The primary Presidency account cannot be deleted.'
        )
      );
      return;
    }

    const targetUser = usersList.find((u) => u.uid === targetUid);
    if (targetUser && (targetUser.role === 'president' || targetUser.email === BOOTSTRAPPED_ADMIN_EMAIL)) {
      setUiNotice(
        tr(
          'O cadastro principal da Presidência é protegido contra exclusão.',
          'The main Presidency registration is protected against deletion.'
        )
      );
      return;
    }

    try {
      const batch = writeBatch(db);

      const userRef = doc(db, 'users', targetUid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        batch.delete(userRef);
      }

      const pubRef = doc(db, 'public_affiliates', targetUid);
      const pubSnap = await getDoc(pubRef);
      if (pubSnap.exists()) {
        batch.delete(pubRef);
      }

      if (isAdmin) {
        const adminRef = doc(db, 'admins', targetUid);
        const adminSnap = await getDoc(adminRef);
        if (adminSnap.exists()) {
          batch.delete(adminRef);
        }

        credentialPasses
          .filter((cp) => cp.targetUid === targetUid)
          .forEach((cp) => {
            batch.delete(doc(db, 'credential_passes', cp.id));
            if (cp.passType === 'Executivo VIP') {
              batch.delete(doc(db, 'vip_executive_hashes', cp.id));
            }
          });
      }

      await batch.commit();

      if (targetUid === firebaseUser.uid) {
        setProfile(null);
        setUiNotice(
          tr(
            'Seu cadastro CONAE foi excluído com sucesso.',
            'Your CONAE registration was deleted successfully.'
          )
        );
      } else {
        setUiNotice(
          tr(
            'Cadastro de afiliado excluído com sucesso.',
            'Affiliate registration deleted successfully.'
          )
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${targetUid}`);
    }
  };

  const handleSaveExecutivePix = async (
    pix: Omit<ExecutivePix, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const id = sanitizeDocId('pix');
    try {
      await setDoc(doc(db, 'executive_pix', id), {
        ...pix,
        id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `executive_pix/${id}`);
    }
  };

  const handleDeleteExecutivePix = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'executive_pix', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `executive_pix/${id}`);
    }
  };

  const handleUpdateVipSettings = async (params: {
    monthLabel: string;
    plainPassword: string;
    buySignalTitle: string;
    buySignalAsset: string;
    buySignalTargetBRL: number;
  }) => {
    try {
      const passwordHash = await sha256Hex(params.plainPassword);
      const batch = writeBatch(db);
      batch.set(doc(db, 'vip_public', 'current'), {
        id: 'current',
        monthLabel: params.monthLabel,
        passwordHash,
        buySignalTitle: params.buySignalTitle,
        buySignalAsset: params.buySignalAsset,
        buySignalTargetBRL: params.buySignalTargetBRL,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'vip_secrets', 'current'), {
        id: 'current',
        monthLabel: params.monthLabel,
        plainPassword: params.plainPassword,
        updatedBy: profile?.displayName || firebaseUser?.email || 'Presidência CONAE',
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'vip_public/current');
    }
  };

  const handleUpdateBookingTokenConfig = async (params: {
    connected: boolean;
    partnerAid: string;
    tokenPrefix: string;
    activeBookingToken: string;
    bookingApiToken: string;
    defaultDiscountPercent: number;
  }) => {
    try {
      const updatedBy = (profile?.displayName || firebaseUser?.email || 'Presidência CONAE').slice(0, 100);
      const partnerAid = (params.partnerAid || '2408915').trim().slice(0, 32);
      const tokenPrefix = (params.tokenPrefix || 'BKG-CNEC').trim().slice(0, 24);
      const activeBookingToken = (params.activeBookingToken || 'BKG-CNEC-2026-VIP').trim().slice(0, 64);
      const rawApiToken = (params.bookingApiToken || 'CONAE_BOOKING_LIVE').trim().slice(0, 200);
      const defaultDiscountPercent = Math.min(
        100,
        Math.max(0, Number(params.defaultDiscountPercent) || 0)
      );

      const batch = writeBatch(db);
      batch.set(doc(db, 'booking_public', 'current'), {
        id: 'current',
        connected: Boolean(params.connected),
        partnerAid: partnerAid.length >= 2 ? partnerAid : '2408915',
        tokenPrefix: tokenPrefix.length >= 2 ? tokenPrefix : 'BKG-CNEC',
        activeBookingToken: activeBookingToken.length >= 4 ? activeBookingToken : 'BKG-CNEC-2026-VIP',
        bookingDomain: 'www.booking.com',
        defaultDiscountPercent,
        updatedBy: updatedBy.length >= 2 ? updatedBy : 'Presidência CONAE',
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'booking_secrets', 'current'), {
        id: 'current',
        bookingApiToken: rawApiToken.length >= 4 ? rawApiToken : 'CONAE_BOOKING_LIVE',
        partnerAid: partnerAid.length >= 2 ? partnerAid : '2408915',
        tokenMasked: maskBookingToken(rawApiToken).slice(0, 64) || 'CO••••VE',
        updatedBy: updatedBy.length >= 2 ? updatedBy : 'Presidência CONAE',
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'booking_public/current');
    }
  };

  const handleCreateHotel = async (
    hotel: Omit<PartnerHotel, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const id = sanitizeDocId('hotel');
    const payload: Record<string, unknown> = {
      id,
      name: hotel.name,
      city: hotel.city,
      state: hotel.state,
      category: hotel.category,
      stars: hotel.stars,
      discountPercent: hotel.discountPercent,
      description: hotel.description,
      active: hotel.active,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (hotel.photoUrl) payload.photoUrl = hotel.photoUrl.slice(0, 60000);
    if (hotel.hotelBenefits) payload.hotelBenefits = hotel.hotelBenefits.slice(0, 300);
    if (Array.isArray(hotel.galleryPhotos) && hotel.galleryPhotos.length > 0) {
      payload.galleryPhotos = hotel.galleryPhotos
        .filter((u) => typeof u === 'string' && u.trim().length > 0)
        .slice(0, 5)
        .map((u) => u.slice(0, 60000));
    }

    try {
      await setDoc(doc(db, 'hotels', id), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `hotels/${id}`);
    }
  };

  const handleSaveHotelGpsAndPhotos = async (hotel: PartnerHotel) => {
    const hotelRef = doc(db, 'hotels', hotel.id);
    const baseFields: Record<string, unknown> = {
      id: hotel.id,
      name: hotel.name,
      city: hotel.city,
      state: hotel.state,
      category: hotel.category,
      stars: hotel.stars,
      discountPercent: hotel.discountPercent,
      description: hotel.description,
      active: hotel.active,
      updatedAt: serverTimestamp(),
    };
    if (hotel.photoUrl) baseFields.photoUrl = hotel.photoUrl.slice(0, 60000);
    if (hotel.hotelBenefits) baseFields.hotelBenefits = hotel.hotelBenefits.slice(0, 300);
    if (Array.isArray(hotel.galleryPhotos) && hotel.galleryPhotos.length > 0) {
      baseFields.galleryPhotos = hotel.galleryPhotos
        .filter((u) => typeof u === 'string' && u.trim().length > 0)
        .slice(0, 5)
        .map((u) => u.slice(0, 60000));
    }

    try {
      const snap = await getDoc(hotelRef);
      if (snap.exists()) {
        await updateDoc(hotelRef, baseFields);
      } else {
        await setDoc(hotelRef, {
          ...baseFields,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `hotels/${hotel.id}`);
    }
  };

  const handleDeleteHotel = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'hotels', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `hotels/${id}`);
    }
  };

  const handleCreateCourse = async (
    course: Omit<CourseItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const id = sanitizeDocId('course');
    const payload: Record<string, unknown> = {
      id,
      title: course.title,
      category: course.category,
      duration: course.duration,
      modality: course.modality,
      feeLabel: course.feeLabel,
      description: course.description,
      active: course.active,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (course.schedule) payload.schedule = course.schedule;
    if (course.location) payload.location = course.location;
    if (course.photoUrl) payload.photoUrl = course.photoUrl.slice(0, 60000);

    try {
      await setDoc(doc(db, 'courses', id), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `courses/${id}`);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'courses', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `courses/${id}`);
    }
  };

  const handleCreateSponsor = async (
    sponsor: Omit<SponsorItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const id = sanitizeDocId('spon');
    const payload: Record<string, unknown> = {
      id,
      name: sponsor.name,
      segment: sponsor.segment,
      benefit: sponsor.benefit,
      description: sponsor.description,
      active: sponsor.active,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (sponsor.photoUrl) payload.photoUrl = sponsor.photoUrl.slice(0, 60000);

    try {
      await setDoc(doc(db, 'sponsors', id), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `sponsors/${id}`);
    }
  };

  const handleDeleteSponsor = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'sponsors', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `sponsors/${id}`);
    }
  };

  const handleCreateBenefitPartner = async (
    partner: Omit<BenefitPartner, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const id = sanitizeDocId('ben');
    const payload: Record<string, unknown> = {
      id,
      name: partner.name,
      category: partner.category,
      city: partner.city,
      state: partner.state,
      discountPercent: partner.discountPercent,
      description: partner.description,
      hotelExclusive: partner.hotelExclusive,
      active: partner.active,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (partner.photoUrl) payload.photoUrl = partner.photoUrl.slice(0, 60000);

    try {
      await setDoc(doc(db, 'benefit_partners', id), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `benefit_partners/${id}`);
    }
  };

  const handleDeleteBenefitPartner = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'benefit_partners', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `benefit_partners/${id}`);
    }
  };

  const handleCreateMandate = async (mandate: {
    assigneeUid?: string;
    assigneeName: string;
    assigneeRole: 'Executivo' | 'Afiliado';
    area: ExecutiveMandateArea;
    missionTitle: string;
    scopeDescription: string;
    state: string;
    city?: string;
    grantedBy: string;
  }) => {
    const id = sanitizeDocId('out');
    const payload: Record<string, unknown> = {
      id,
      assigneeName: mandate.assigneeName.trim().slice(0, 100),
      assigneeRole: mandate.assigneeRole,
      area: mandate.area,
      missionTitle: mandate.missionTitle.trim().slice(0, 140),
      scopeDescription: mandate.scopeDescription.trim().slice(0, 400),
      state: (mandate.state || 'GO').trim().slice(0, 4),
      insertedIntoCatalog: false,
      status: 'outorgado' as ExecutiveMandateStatus,
      grantedBy: mandate.grantedBy.trim().slice(0, 100),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (mandate.assigneeUid && mandate.assigneeUid.trim().length > 0) {
      payload.assigneeUid = mandate.assigneeUid.trim().slice(0, 128);
    }
    if (mandate.city && mandate.city.trim().length > 0) {
      payload.city = mandate.city.trim().slice(0, 80);
    }

    try {
      await setDoc(doc(db, 'executive_mandates', id), payload);
      setUiNotice(
        tr(
          `Outorgação emitida para ${mandate.assigneeName} (${mandate.area}).`,
          `Mandate granted to ${mandate.assigneeName} (${mandate.area}).`
        )
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `executive_mandates/${id}`);
    }
  };

  const handleSubmitMandateReport = async (params: {
    mandate: ExecutiveMandate;
    city: string;
    partnerName: string;
    partnerDiscountPercent: number;
    partnerStars?: number;
    executionReport: string;
    submittedBy: string;
    status: 'em_execucao' | 'relatorio_enviado';
  }) => {
    const patch: Record<string, unknown> = {
      city: params.city.trim().slice(0, 80),
      partnerName: params.partnerName.trim().slice(0, 120),
      partnerDiscountPercent: Math.min(100, Math.max(0, Number(params.partnerDiscountPercent) || 0)),
      executionReport: params.executionReport.trim().slice(0, 600),
      reportSubmittedBy: params.submittedBy.trim().slice(0, 100),
      reportSubmittedAt: new Date().toISOString().slice(0, 40),
      status: params.status,
      updatedAt: serverTimestamp(),
    };
    if (params.mandate.area === 'Hotelaria' && typeof params.partnerStars === 'number') {
      patch.partnerStars = Math.min(5, Math.max(2, Math.round(params.partnerStars)));
    }

    try {
      await updateDoc(doc(db, 'executive_mandates', params.mandate.id), patch);
      setUiNotice(
        tr(
          `Relatório de execução enviado para a Presidência (${params.mandate.missionTitle}).`,
          `Execution report submitted to Presidency (${params.mandate.missionTitle}).`
        )
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `executive_mandates/${params.mandate.id}`);
    }
  };

  const handleApproveMandateAndInsert = async (params: {
    mandate: ExecutiveMandate;
    insertIntoCatalog: boolean;
  }) => {
    const { mandate, insertIntoCatalog } = params;
    let didInsert = Boolean(mandate.insertedIntoCatalog);

    if (insertIntoCatalog && !mandate.insertedIntoCatalog && mandate.partnerName?.trim()) {
      const cleanName = mandate.partnerName.trim().slice(0, 120);
      const cleanCity = (mandate.city || 'Goiânia').trim().slice(0, 80);
      const cleanState = (mandate.state || 'GO').trim().slice(0, 4);
      const cleanDesc = (mandate.executionReport || mandate.scopeDescription || mandate.missionTitle)
        .trim()
        .slice(0, 300);

      if (mandate.area === 'Hotelaria') {
        await handleCreateHotel({
          name: cleanName,
          city: cleanCity,
          state: cleanState,
          category: 'Hotel',
          stars: Math.min(5, Math.max(2, Math.round(mandate.partnerStars || 4))),
          discountPercent: Math.min(90, Math.max(5, Math.round(mandate.partnerDiscountPercent || 25))),
          description: cleanDesc,
          active: true,
        });
        didInsert = true;
      } else if (
        mandate.area === 'Farmácia' ||
        mandate.area === 'Clubes' ||
        mandate.area === 'Comércio & Parcerias'
      ) {
        await handleCreateBenefitPartner({
          name: cleanName,
          category: mapMandateAreaToBenefitCategory(mandate.area),
          city: cleanCity,
          state: cleanState,
          discountPercent: Math.min(90, Math.max(5, Math.round(mandate.partnerDiscountPercent || 20))),
          description: cleanDesc,
          hotelExclusive: false,
          active: true,
        });
        didInsert = true;
      }
    }

    try {
      await updateDoc(doc(db, 'executive_mandates', mandate.id), {
        status: 'aprovado',
        insertedIntoCatalog: didInsert,
        updatedAt: serverTimestamp(),
      });
      setUiNotice(
        didInsert
          ? tr(
              `Relatório aprovado e ${mandate.partnerName || mandate.area} inserido automaticamente na rede oficial CONAE.`,
              `Report approved and ${mandate.partnerName || mandate.area} automatically added to the official CONAE network.`
            )
          : tr(
              `Relatório da outorgação "${mandate.missionTitle}" aprovado pela Presidência.`,
              `Mandate report "${mandate.missionTitle}" approved by Presidency.`
            )
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `executive_mandates/${mandate.id}`);
    }
  };

  const handleUpdateMandateStatus = async (
    mandate: ExecutiveMandate,
    status: ExecutiveMandateStatus
  ) => {
    try {
      await updateDoc(doc(db, 'executive_mandates', mandate.id), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `executive_mandates/${mandate.id}`);
    }
  };

  const handleDeleteMandate = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'executive_mandates', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `executive_mandates/${id}`);
    }
  };

  const handleCreateCredentialPass = async (params: {
    targetUid?: string;
    holderName: string;
    holderEmail?: string;
    passType: 'Afiliado' | 'Executivo VIP' | 'Hoteleiro';
    issuedPasswordPlain: string;
    hotelName?: string;
    goldenCardActive: boolean;
    monthlyPaid: boolean;
    notes?: string;
  }) => {
    const id = sanitizeDocId('pass');
    try {
      const issuedPasswordHash = await sha256Hex(params.issuedPasswordPlain);
      const batch = writeBatch(db);

      const passDoc: Record<string, unknown> = {
        id,
        holderName: params.holderName.slice(0, 100),
        passType: params.passType,
        issuedPasswordHash,
        issuedPasswordPlain: params.issuedPasswordPlain.slice(0, 64),
        goldenCardActive: params.goldenCardActive,
        monthlyPaid: params.monthlyPaid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (params.targetUid) passDoc.targetUid = params.targetUid.slice(0, 128);
      if (params.holderEmail) passDoc.holderEmail = params.holderEmail.slice(0, 150);
      if (params.hotelName) passDoc.hotelName = params.hotelName.slice(0, 120);
      if (params.notes) passDoc.notes = params.notes.slice(0, 240);

      batch.set(doc(db, 'credential_passes', id), passDoc);

      if (params.passType === 'Executivo VIP') {
        batch.set(doc(db, 'vip_executive_hashes', id), {
          id,
          executiveName: params.holderName.slice(0, 100),
          passwordHash: issuedPasswordHash,
          active: true,
          updatedAt: serverTimestamp(),
        });
      }

      if (params.targetUid) {
        const userRef = doc(db, 'users', params.targetUid);
        const userSnap = await getDoc(userRef);

        if (params.passType === 'Executivo VIP') {
          batch.set(doc(db, 'admins', params.targetUid), {
            uid: params.targetUid,
            email: params.holderEmail || 'executivo@conaecursos.com.br',
            roleTitle: 'Executivo Credenciado',
            createdAt: serverTimestamp(),
          });
        }

        if (userSnap.exists()) {
          const userUpdate: Record<string, unknown> = {
            monthlyPlanActive: params.monthlyPaid,
            updatedAt: serverTimestamp(),
          };
          if (params.goldenCardActive || params.passType === 'Executivo VIP') {
            userUpdate.executiveCardActive = true;
          }
          if (params.passType === 'Executivo VIP') {
            userUpdate.role = 'executive';
          }
          batch.update(userRef, userUpdate);
        }
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `credential_passes/${id}`);
    }
  };

  const handleLookupPackageOrder = async (orderId: string): Promise<PackageOrder | null> => {
    const cleanId = orderId.trim();
    if (!cleanId) return null;
    try {
      const snap = await getDoc(doc(db, 'package_orders', cleanId));
      return snap.exists() ? (snap.data() as PackageOrder) : null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `package_orders/${cleanId}`);
    }
  };

  const handleLookupUsdInvestment = async (invId: string): Promise<UsdInvestment | null> => {
    const cleanId = invId.trim();
    if (!cleanId) return null;
    try {
      const snap = await getDoc(doc(db, 'usd_investments', cleanId));
      return snap.exists() ? (snap.data() as UsdInvestment) : null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `usd_investments/${cleanId}`);
    }
  };

  const handleDeleteCredentialPass = async (id: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'credential_passes', id));
      const vipHashRef = doc(db, 'vip_executive_hashes', id);
      const vipSnap = await getDoc(vipHashRef);
      if (vipSnap.exists()) {
        batch.delete(vipHashRef);
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `credential_passes/${id}`);
    }
  };

  const handleSaveShareholderTreeNode = async (
    node: Omit<ShareholderTreeNode, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    const id = node.id ? node.id.replace(/[^a-zA-Z0-9_-]/g, '') : sanitizeDocId('st_node');
    const cleanFullName = (node.fullName || 'Acionista CONAE').trim().slice(0, 100);
    const cleanBranchTitle = (node.branchTitle || 'Acionista CONAE').trim().slice(0, 120);
    const cleanState = (node.state || 'GO').trim().slice(0, 4).toUpperCase();
    const cleanParentId = (node.parentNodeId || 'exec_helio').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128) || 'exec_helio';
    const cleanPowers = (node.executionPowers || 'Poderes de execução na Convenção CONAE').trim().slice(0, 260);
    const clampedShares = Math.min(100000, Math.max(0, Math.floor(Number(node.sharesCount) || 0)));
    const clampedPercent = Math.min(100, Math.max(0, Number(node.sharePercent) || 0));
    const clampedProb = Math.min(100, Math.max(0, Math.floor(Number(node.treasuryProbabilityPercent) || 0)));

    const payload: Record<string, unknown> = {
      id,
      fullName: cleanFullName.length >= 2 ? cleanFullName : 'Acionista CONAE',
      branchTitle: cleanBranchTitle.length >= 2 ? cleanBranchTitle : 'Acionista CONAE',
      state: cleanState.length >= 2 ? cleanState : 'GO',
      parentNodeId: cleanParentId,
      sharesCount: clampedShares,
      sharePercent: clampedPercent,
      executionPowers: cleanPowers.length >= 2 ? cleanPowers : 'Poderes de execução na Convenção CONAE',
      hotelDiscountAccess: Boolean(node.hotelDiscountAccess),
      coursesAccess: Boolean(node.coursesAccess),
      treasuryTitlesEligible: Boolean(node.treasuryTitlesEligible),
      treasuryProbabilityPercent: clampedProb,
      treasuryProbabilityTier: node.treasuryProbabilityTier || 'Padrao',
      active: node.active !== false,
      updatedAt: serverTimestamp(),
    };
    if (node.photoUrl) payload.photoUrl = node.photoUrl.slice(0, 60000);
    if (node.notaryCode) payload.notaryCode = node.notaryCode.trim().slice(0, 80);

    try {
      const ref = doc(db, 'shareholder_tree', id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, payload);
      } else {
        await setDoc(ref, {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `shareholder_tree/${id}`);
    }
  };

  const handleDeleteShareholderTreeNode = async (id: string) => {
    const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '');
    const seedMatch = DEFAULT_SHAREHOLDER_TREE.find((s) => s.id === cleanId);
    try {
      const ref = doc(db, 'shareholder_tree', cleanId);
      if (seedMatch) {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          await updateDoc(ref, {
            active: false,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            ...seedMatch,
            active: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } else {
        await deleteDoc(ref);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `shareholder_tree/${cleanId}`);
    }
  };

  const handleCreateTreasuryEntry = async (entry: {
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
  }) => {
    const id = sanitizeDocId('tr');
    const cleanTitle = entry.title.trim().slice(0, 120);
    const cleanState = entry.state.trim().toUpperCase().slice(0, 4) || 'GO';
    const cleanAmount = Math.min(1000000000, Math.max(0, Number(entry.amountBRL) || 0));
    const cleanShares = Math.min(100000, Math.max(0, Math.floor(Number(entry.sharesCount) || 0)));
    const cleanForSale = Math.min(100000, Math.max(0, Math.floor(Number(entry.sharesForSaleCount) || 0)));
    const cleanQuotePct = Math.min(1000, Math.max(-100, Number(entry.dailyQuotePercent) || 0));
    const cleanQuotePayout = Math.min(1000000000, Math.max(0, Number(entry.dailyQuotePayoutBRL) || 0));
    const cleanDate = (entry.entryDate || new Date().toISOString().slice(0, 10)).trim().slice(0, 20);
    const cleanRecordedBy = (entry.recordedBy || profile?.displayName || 'Executivo CONAE').trim().slice(0, 100);
    const cleanType: TreasuryEntryType =
      entry.entryType === 'patrimonio' || entry.entryType === 'cotacao_dia'
        ? entry.entryType
        : 'venda_acoes';

    const payload: Record<string, unknown> = {
      id,
      entryType: cleanType,
      title: cleanTitle.length >= 2 ? cleanTitle : 'Lançamento CONAE',
      state: cleanState.length >= 2 ? cleanState : 'GO',
      amountBRL: Number(cleanAmount.toFixed(2)),
      sharesCount: cleanShares,
      sharesForSaleCount: cleanForSale,
      dailyQuotePercent: Number(cleanQuotePct.toFixed(2)),
      dailyQuotePayoutBRL: Number(cleanQuotePayout.toFixed(2)),
      entryDate: cleanDate.length >= 8 ? cleanDate : new Date().toISOString().slice(0, 10),
      recordedBy: cleanRecordedBy.length >= 2 ? cleanRecordedBy : 'Executivo CONAE',
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (entry.buyerName && entry.buyerName.trim()) {
      payload.buyerName = entry.buyerName.trim().slice(0, 100);
    }
    if (entry.buyerPhotoUrl && entry.buyerPhotoUrl.trim()) {
      payload.buyerPhotoUrl = entry.buyerPhotoUrl.trim().slice(0, 60000);
    }
    if (entry.notes && entry.notes.trim()) {
      payload.notes = entry.notes.trim().slice(0, 240);
    }

    try {
      await setDoc(doc(db, 'treasury_ledger', id), payload);
      const localEntry: TreasuryEntry = {
        id,
        entryType: cleanType,
        title: payload.title as string,
        buyerName: payload.buyerName as string | undefined,
        buyerPhotoUrl: payload.buyerPhotoUrl as string | undefined,
        state: payload.state as string,
        amountBRL: payload.amountBRL as number,
        sharesCount: payload.sharesCount as number,
        sharesForSaleCount: payload.sharesForSaleCount as number,
        dailyQuotePercent: payload.dailyQuotePercent as number,
        dailyQuotePayoutBRL: payload.dailyQuotePayoutBRL as number,
        entryDate: payload.entryDate as string,
        recordedBy: payload.recordedBy as string,
        notes: payload.notes as string | undefined,
        active: true,
      };
      setTreasuryEntries((prev) =>
        [localEntry, ...prev.filter((item) => item.id !== id)].sort((a, b) =>
          (b.entryDate || '').localeCompare(a.entryDate || '')
        )
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `treasury_ledger/${id}`);
    }
  };

  const handleDeleteTreasuryEntry = async (id: string) => {
    const docId = id.trim();
    if (!docId) return;
    try {
      await deleteDoc(doc(db, 'treasury_ledger', docId));
      setTreasuryEntries((prev) => prev.filter((item) => item.id !== docId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `treasury_ledger/${docId}`);
    }
  };

  const handleDeleteAllTreasuryEntries = async (ids: string[]) => {
    const validIds = ids.map((rawId) => rawId.trim()).filter(Boolean);
    if (validIds.length === 0) return;
    try {
      const chunkSize = 400;
      for (let i = 0; i < validIds.length; i += chunkSize) {
        const chunk = validIds.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((docId) => {
          batch.delete(doc(db, 'treasury_ledger', docId));
        });
        await batch.commit();
      }
      const deletedSet = new Set(validIds);
      setTreasuryEntries((prev) => prev.filter((item) => !deletedSet.has(item.id)));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'treasury_ledger');
    }
  };

  const handleDeleteShareholderBuyer = async (holder: ShareholderValuationRecord) => {
    const refs = holder.sourceRefs || [];
    if (refs.length === 0) return;

    for (const ref of refs) {
      const docId = (ref.docId || '').trim();
      if (!docId) continue;

      if (ref.collection === 'treasury_ledger') {
        await handleDeleteTreasuryEntry(docId);
      } else if (ref.collection === 'shareholder_tree') {
        await handleDeleteShareholderTreeNode(docId);
      } else if (ref.collection === 'shareholder_orders') {
        try {
          await deleteDoc(doc(db, 'shareholder_orders', docId));
          setShareholderOrders((prev) => prev.filter((item) => item.id !== docId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `shareholder_orders/${docId}`);
        }
      } else if (ref.collection === 'package_orders') {
        try {
          await deleteDoc(doc(db, 'package_orders', docId));
          setOrdersList((prev) => prev.filter((item) => item.id !== docId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `package_orders/${docId}`);
        }
      }
    }
  };

  const handleSeedDefaultsToFirestore = async () => {
    try {
      const batch = writeBatch(db);
      DEFAULT_HOTELS.forEach((h) => {
        const data: Record<string, unknown> = {
          id: h.id,
          name: h.name,
          city: h.city,
          state: h.state,
          category: h.category,
          stars: h.stars,
          discountPercent: h.discountPercent,
          description: h.description,
          active: h.active,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (h.hotelBenefits) data.hotelBenefits = h.hotelBenefits;
        if (h.photoUrl) data.photoUrl = h.photoUrl;
        batch.set(doc(db, 'hotels', h.id), data);
      });
      DEFAULT_COURSES.forEach((c) => {
        const data: Record<string, unknown> = {
          id: c.id,
          title: c.title,
          category: c.category,
          duration: c.duration,
          modality: c.modality,
          feeLabel: c.feeLabel,
          description: c.description,
          active: c.active,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (c.schedule) data.schedule = c.schedule;
        if (c.location) data.location = c.location;
        if (c.photoUrl) data.photoUrl = c.photoUrl;
        batch.set(doc(db, 'courses', c.id), data);
      });
      DEFAULT_SPONSORS.forEach((s) => {
        const data: Record<string, unknown> = {
          id: s.id,
          name: s.name,
          segment: s.segment,
          benefit: s.benefit,
          description: s.description,
          active: s.active,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (s.photoUrl) data.photoUrl = s.photoUrl;
        batch.set(doc(db, 'sponsors', s.id), data);
      });
      DEFAULT_BENEFIT_PARTNERS.forEach((b) => {
        const data: Record<string, unknown> = {
          id: b.id,
          name: b.name,
          category: b.category,
          city: b.city,
          state: b.state,
          discountPercent: b.discountPercent,
          description: b.description,
          hotelExclusive: b.hotelExclusive,
          active: b.active,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (b.photoUrl) data.photoUrl = b.photoUrl;
        batch.set(doc(db, 'benefit_partners', b.id), data);
      });
      DEFAULT_EXECUTIVE_PIX.forEach((p) => {
        batch.set(doc(db, 'executive_pix', p.id), {
          ...p,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      DEFAULT_SHAREHOLDER_TREE.forEach((st) => {
        const data: Record<string, unknown> = {
          id: st.id,
          fullName: st.fullName,
          branchTitle: st.branchTitle,
          state: st.state,
          parentNodeId: st.parentNodeId,
          sharesCount: st.sharesCount,
          sharePercent: st.sharePercent,
          executionPowers: st.executionPowers,
          hotelDiscountAccess: st.hotelDiscountAccess,
          coursesAccess: st.coursesAccess,
          treasuryTitlesEligible: st.treasuryTitlesEligible,
          treasuryProbabilityPercent: st.treasuryProbabilityPercent,
          treasuryProbabilityTier: st.treasuryProbabilityTier,
          active: st.active,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (st.photoUrl) data.photoUrl = st.photoUrl;
        if (st.notaryCode) data.notaryCode = st.notaryCode;
        batch.set(doc(db, 'shareholder_tree', st.id), data);
      });

      const defaultPass = 'CONAE2026VIP';
      const passHash = await sha256Hex(defaultPass);
      batch.set(doc(db, 'vip_public', 'current'), {
        id: 'current',
        monthLabel: 'Novembro 2026',
        passwordHash: passHash,
        buySignalTitle: 'Acumulação Estratégica Tesouro CONAE & Hotéis 5★',
        buySignalAsset: 'CNEC / TESOURO',
        buySignalTargetBRL: 6.4,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'vip_secrets', 'current'), {
        id: 'current',
        monthLabel: 'Novembro 2026',
        plainPassword: defaultPass,
        updatedBy: profile?.displayName || 'Presidência CONAE',
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'shareholder_summary', 'current'), {
        id: 'current',
        totalCapitalShares: 100000,
        allocatedShares: 18500,
        inProcessShares: 6500,
        activeShareholdersCount: 12,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'seed_defaults');
    }
  };

  const userOrdersOnly = useMemo(() => {
    if (!firebaseUser) return [];
    return ordersList.filter((o) => o.userId === firebaseUser.uid);
  }, [ordersList, firebaseUser]);

  const userUsdOnly = useMemo(() => {
    if (!firebaseUser) return [];
    return usdList.filter((u) => u.userId === firebaseUser.uid);
  }, [usdList, firebaseUser]);

  const userEnrollmentsOnly = useMemo(() => {
    if (!firebaseUser) return [];
    return enrollmentsList.filter((e) => e.userId === firebaseUser.uid);
  }, [enrollmentsList, firebaseUser]);

  const userBookingsOnly = useMemo(() => {
    if (!firebaseUser) return [];
    return bookingsList.filter((b) => b.userId === firebaseUser.uid);
  }, [bookingsList, firebaseUser]);

  const userShareholderOrdersOnly = useMemo(() => {
    if (!firebaseUser) return [];
    return shareholderOrders.filter((s) => s.userId === firebaseUser.uid);
  }, [shareholderOrders, firebaseUser]);

  const userCredentialPassesOnly = useMemo(() => {
    if (!firebaseUser) return [];
    return credentialPasses.filter((cp) => cp.targetUid === firebaseUser.uid);
  }, [credentialPasses, firebaseUser]);

  const treasuryStats = useMemo(
    () =>
      computeTreasuryStateStats({
        usersList,
        publicAffiliates,
        ordersList,
        usdList,
        shareholderOrders,
        treasuryEntries,
        shareholderTree,
        currentProfile: profile,
      }),
    [
      usersList,
      publicAffiliates,
      ordersList,
      usdList,
      shareholderOrders,
      treasuryEntries,
      shareholderTree,
      profile,
    ]
  );

  const primaryNav: { id: TabId; label: string }[] = [
    { id: 'inicio', label: tr('Início', 'Home') },
    { id: 'cursos', label: tr('Cursos', 'Courses') },
    { id: 'banco', label: tr('Banco de Ações', 'Equity Bank') },
    { id: 'hoteis', label: tr('Hotéis VIP', 'VIP Hotels') },
    { id: 'vip', label: tr('Sala VIP', 'VIP Room') },
  ];

  const compactSquareMenus: {
    id: TabId;
    title: string;
    subtitle: string;
    metric: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'acionistas',
      title: tr('Acionistas · 100.000 Ações', 'Shareholders · 100,000 Shares'),
      subtitle: tr(
        'Divisórias matemáticas, análise Presidência, documentação e Cartório.',
        'Mathematical splits, Presidency review, documentation and Notary.'
      ),
      metric: `${(profile?.sharesOwned ?? 0).toLocaleString(numLocale)} ${tr('ações no painel', 'shares in panel')}`,
      icon: <Scale className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'beneficios',
      title: tr('Rede Hoteleiros & Benefícios', 'Hoteliers & Benefits Network'),
      subtitle: tr(
        'Cartão Dourado, cartões por hotel, Farmácias, Supermercados e Clínicas.',
        'Gold Card, hotel cards, Pharmacies, Supermarkets and Clinics.'
      ),
      metric: `${benefitPartners.length} ${tr('parceiros com desconto', 'discount partners')}`,
      icon: <Store className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'cursos',
      title: tr('CONAE Cursos', 'CONAE Courses'),
      subtitle: tr(
        'Capelania, Juiz de Paz, Teologia EAD e Banco de Informação.',
        'Chaplaincy, Justice of the Peace, Online Theology and Info Bank.'
      ),
      metric: `${courses.length} ${tr('formações · conaecursos.com.br', 'programs · conaecursos.com.br')}`,
      icon: <BookOpen className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'hoteis',
      title: tr('Hotéis & Clubes VIP', 'VIP Hotels & Clubs'),
      subtitle: tr(
        'Rede conveniada 2★ a 5★ em estados do Brasil com até 65% OFF.',
        'Accredited 2★ to 5★ network across Brazilian states up to 65% OFF.'
      ),
      metric: `${hotels.length} ${tr('unidades credenciadas', 'accredited locations')}`,
      icon: <Building2 className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'voos_gol',
      title: tr('Passagens Aéreas GOL', 'GOL Airfare Deals'),
      subtitle: tr(
        'Pacote Dezembro e promoções voegol.com.br já preenchidos ao abrir.',
        'December packages & voegol.com.br deals pre-filled on open.'
      ),
      metric: `${GOL_PROMO_FLIGHTS.length} ${tr('trechos em promoção · voegol.com.br', 'promo routes · voegol.com.br')}`,
      icon: <Plane className="w-5 h-5 text-[#FF7A2F]" />,
    },
    {
      id: 'voos_tam',
      title: tr('Passagens Aéreas TAM / LATAM', 'TAM / LATAM Airfare Deals'),
      subtitle: tr(
        'Pacote Dezembro e ofertas latamairlines.com já preenchidos ao abrir.',
        'December packages & latamairlines.com deals pre-filled on open.'
      ),
      metric: `${LATAM_PROMO_FLIGHTS.length} ${tr('trechos em promoção · latamairlines.com', 'promo routes · latamairlines.com')}`,
      icon: <Plane className="w-5 h-5 text-[#ff4d7d]" />,
    },
    {
      id: 'vip',
      title: tr('Sala VIP & Cartão Dourado', 'VIP Room & Gold Card'),
      subtitle: tr(
        'Indicativo dos acionistas protegido por senha mensal ou executiva.',
        'Shareholders outlook protected by monthly or executive password.'
      ),
      metric: translateDynamic(vipPublic?.monthLabel || 'Novembro 2026'),
      icon: <Crown className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'midia',
      title: tr('Web Rádio, Vídeos & Patrocinadores', 'Web Radio, Videos & Sponsors'),
      subtitle: tr(
        'Mensagens do Apóstolo Hélio César, YouTube e bastidores ao vivo.',
        'Messages from Apostle Hélio César, YouTube and live backstage.'
      ),
      metric: `${sponsors.length} ${tr('patrocinadores · 24h', 'sponsors · 24/7')}`,
      icon: <Radio className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'admin',
      title: tr('Painel do Presidente & Diretoria', 'President & Board Panel'),
      subtitle: tr(
        'Cofre protegido, PIX, Cartório Acionistas, Senhas e Uploads.',
        'Protected vault, PIX, Shareholder Notary, Passwords and Uploads.'
      ),
      metric: isAdmin
        ? tr('Acesso Executivo Ativo', 'Executive Access Active')
        : tr('Uso restrito Presidência', 'Presidency Restricted'),
      icon: <ShieldCheck className="w-5 h-5 text-amber-400" />,
    },
  ];

  const trialExpired = remainingTrialSeconds <= 0;
  const shouldShowLockScreen = !isAppUnlocked && (trialExpired || manualLockRequested);

  if (standaloneRoute.kind === 'duque-evento') {
    return (
      <DuqueEventoStudio
        firebaseUser={firebaseUser}
        profile={profile}
        isAdmin={isAdmin}
        onGoogleLogin={handleGoogleLogin}
        onBackToConae={navigateBackToConae}
        onOpenPublishedEvent={navigateToPublishedEvent}
      />
    );
  }

  if (standaloneRoute.kind === 'public-event') {
    return (
      <PublicEventPage
        slug={standaloneRoute.slug}
        onBackToStudio={navigateToDuqueEvento}
        onBackToConae={navigateBackToConae}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#050907] text-emerald-50 flex flex-col overflow-x-hidden relative">
      <OfflineIndicator />
      {shouldShowLockScreen && (
        <AppLockScreen
          trialExpired={trialExpired}
          remainingTrialSeconds={remainingTrialSeconds}
          stateStats={treasuryStats.states}
          shareUnitPriceBRL={treasuryStats.shareUnitPriceBRL}
          latestDailyQuotePercent={treasuryStats.latestDailyQuotePercent}
          valuationBoostPercent={treasuryStats.valuationBoostPercent}
          totalEquityBRL={treasuryStats.totalEquityBRL}
          shareholderTree={shareholderTree}
          buyerHighlights={treasuryStats.buyerHighlights}
          shareholderValuations={treasuryStats.shareholderValuations}
          publicAffiliates={publicAffiliates}
          pwaInstall={pwaInstall}
          onOpenDuqueEvento={navigateToDuqueEvento}
          onUnlock={() => {
            setIsAppUnlocked(true);
            setManualLockRequested(false);
          }}
          onResumeTrial={
            !trialExpired
              ? () => {
                  setManualLockRequested(false);
                }
              : undefined
          }
        />
      )}

      <div
        aria-hidden={shouldShowLockScreen}
        className={`flex-1 flex flex-col min-h-screen ${
          shouldShowLockScreen ? 'pointer-events-none select-none' : ''
        }`}
      >
      {/* Subtle luxury radial backdrop */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(circle at 18% 12%, rgba(16, 185, 129, 0.14), transparent 42%), radial-gradient(circle at 82% 8%, rgba(245, 158, 11, 0.10), transparent 36%)',
        }}
      />

      {/* TOP BAR CONTRACT with Uploaded President Photo Background */}
      <header className="sticky top-0 z-40 relative overflow-hidden border-b border-amber-400/35 bg-[#040a07] shadow-xl">
        {/* Seamless ambient full-width backdrop from the same photo */}
        <img
          src={CONAE_ASSETS.headerPresidentBg}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover object-[center_36%] scale-105 blur-[4px] opacity-40"
        />
        {/* Crisp centered portrait layer framed lower so his full face, flags, and blazer show cleanly */}
        <div
          aria-hidden="true"
          className="pointer-events-none select-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-[235px] sm:w-[250px] md:w-[265px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)]"
        >
          <img
            src={CONAE_ASSETS.headerPresidentBg}
            alt=""
            className="w-full h-full object-cover object-[center_36%] opacity-90"
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#040a07]/82 via-[#040a07]/22 to-[#040a07]/82"
        />
        <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 min-h-[88px] sm:min-h-[104px] py-2 flex items-center justify-between gap-3 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('inicio')}
              className="flex items-center gap-3 sm:gap-3.5 text-left cursor-pointer shrink-0 group"
            >
              <span className="conae-logo-stage shrink-0">
                <span className="conae-logo-glow" aria-hidden="true" />
                <span className="conae-logo-emblem w-16 h-16 sm:w-20 sm:h-20 border-2 border-amber-400/90 block shadow-lg">
                  <img
                    src={CONAE_ASSETS.emblemHeart}
                    alt={tr('Emblema CONAE', 'CONAE Emblem')}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className="conae-logo-shine" aria-hidden="true" />
                </span>
              </span>
              <div className="leading-tight">
                <span className="font-display text-xl sm:text-2xl md:text-[26px] font-bold tracking-wide conae-gold-text block">
                  CONAE
                </span>
                <span className="text-[11px] sm:text-xs text-emerald-200/85 whitespace-nowrap block">
                  {tr('Convenção & Banco', 'Convention & Bank')}
                </span>
              </div>
            </button>
          </div>

          {/* Golden CONAE Coin Cipher + Moeda Revolution CNEC anchored to the upper-right corner */}
          <div className="absolute top-1 right-1.5 sm:top-1.5 sm:right-4 z-20 overflow-hidden rounded-lg bg-black/65 border border-amber-400/25 px-2 sm:px-2.5 py-1 flex items-center max-w-[172px] sm:max-w-none sm:min-w-[215px]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('afiliado');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              title={tr(
                'Moeda Revolution CNEC no Mercado de Investimento — Clique para ir ao Cadastro',
                'CNEC Revolution Coin in the Investment Market — Click to Sign Up'
              )}
              className="animate-cipher-drift inline-flex items-center gap-1.5 sm:gap-2 text-left cursor-pointer group whitespace-nowrap shrink-0"
            >
              <span className="relative inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-amber-950 via-neutral-950 to-amber-900 border border-amber-400/85 shadow-[0_0_12px_rgba(251,191,36,0.45)] overflow-hidden shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10"
                >
                  <defs>
                    <linearGradient id="conaeCipherGold" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="48%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#fde047" />
                    </linearGradient>
                  </defs>
                  <line x1="10.2" y1="2.2" x2="10.2" y2="21.8" stroke="url(#conaeCipherGold)" strokeWidth="1.7" strokeLinecap="round" />
                  <line x1="13.8" y1="2.2" x2="13.8" y2="21.8" stroke="url(#conaeCipherGold)" strokeWidth="1.7" strokeLinecap="round" />
                  <path
                    d="M 16.8 6.8 C 14.5 4.8 9.2 4.8 7.5 7.4 C 5.8 10 8.5 11.7 12.2 12.1 C 15.8 12.5 18 14.3 16.4 16.9 C 14.7 19.4 9.3 19.3 7.1 17.2"
                    fill="none"
                    stroke="url(#conaeCipherGold)"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                  />
                  <polygon points="12,1.2 13.2,2.7 12,4.2 10.8,2.7" fill="#fef08a" />
                </svg>
                <span className="conae-cipher-shine" aria-hidden="true" />
              </span>

              <span className="leading-tight min-w-0">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span className="text-[10.5px] sm:text-[11px] font-bold conae-gold-text tracking-wide group-hover:underline truncate">
                    {tr('Moeda Revolution CNEC', 'CNEC Revolution Coin')}
                  </span>
                </span>
                <span className="text-[9.5px] font-mono text-emerald-300/90 hidden sm:block">
                  {tr('Mercado de Investimento', 'Investment Market')}
                </span>
              </span>
            </button>
          </div>

          <nav className="hidden lg:flex items-center gap-5 shrink-0 lg:self-end lg:pb-1">
            {primaryNav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 py-1 border-b-2 ${
                  activeTab === item.id
                    ? 'text-amber-300 border-amber-400'
                    : 'text-emerald-100/80 border-transparent hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Secondary Compact Workspace Strip */}
        <div className="relative z-10 border-t border-amber-400/20 bg-black/45 backdrop-blur-[1px]">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-1.5 text-[11px] sm:text-xs">
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 min-w-0">
              {primaryNav.map((item) => (
                <button
                  key={`sub_${item.id}`}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`lg:hidden px-2 py-1 rounded-md font-medium whitespace-nowrap cursor-pointer ${
                    activeTab === item.id
                      ? 'bg-amber-500 text-neutral-950 font-semibold'
                      : 'text-emerald-100/80 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setActiveTab('acionistas')}
                className={`px-2 py-1 rounded-md font-medium whitespace-nowrap cursor-pointer ${
                  activeTab === 'acionistas'
                    ? 'bg-emerald-700 text-white border border-amber-400/50'
                    : 'text-emerald-200/85 hover:text-white'
                }`}
              >
                {tr('Acionistas 100k', 'Shareholders 100k')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('beneficios')}
                className={`px-2 py-1 rounded-md font-medium whitespace-nowrap cursor-pointer ${
                  activeTab === 'beneficios'
                    ? 'bg-emerald-700 text-white border border-amber-400/50'
                    : 'text-emerald-200/85 hover:text-white'
                }`}
              >
                {tr('Rede & Benefícios', 'Network & Benefits')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('midia')}
                className={`px-2 py-1 rounded-md font-medium whitespace-nowrap cursor-pointer ${
                  activeTab === 'midia'
                    ? 'bg-emerald-700 text-white border border-amber-400/50'
                    : 'text-emerald-200/85 hover:text-white'
                }`}
              >
                {tr('Mídia & Web Rádio', 'Media & Web Radio')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('afiliado')}
                className={`px-2 py-1 rounded-md font-medium whitespace-nowrap cursor-pointer ${
                  activeTab === 'afiliado'
                    ? 'bg-emerald-700 text-white border border-amber-400/50'
                    : 'text-emerald-200/85 hover:text-white'
                }`}
              >
                {tr('Cadastro Afiliados', 'Affiliate Sign-Up')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`px-2 py-1 rounded-md font-medium whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-amber-500 text-neutral-950 font-semibold'
                    : 'text-amber-300/90 hover:text-amber-200'
                }`}
              >
                {tr('Painel Presidente', 'President Panel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAppUnlocked(false);
                  setManualLockRequested(true);
                }}
                title={
                  !isAppUnlocked
                    ? tr(
                        'Tempo restante de degustação gratuita — clique para digitar a senha de acesso',
                        'Remaining free preview time — click to enter the access password'
                      )
                    : tr('Bloquear acesso ao aplicativo', 'Lock application access')
                }
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-emerald-200/85 hover:text-amber-300 font-medium whitespace-nowrap cursor-pointer"
              >
                <Lock className="w-3 h-3 shrink-0 text-amber-300" />
                {!isAppUnlocked ? (
                  <span className="font-mono tabular-nums text-amber-200">
                    {tr('Degustação', 'Preview')} {formatTrialMMSS(remainingTrialSeconds)}
                  </span>
                ) : (
                  <span>{tr('Bloquear', 'Lock')}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('afiliado')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-semibold text-[11px] sm:text-xs hover:from-amber-400 hover:to-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {firebaseUser ? (
                  <>
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span className="max-w-[96px] truncate">
                      {profile?.displayName?.split(' ')[0] || tr('Minha Conta', 'My Account')}
                    </span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5 shrink-0" />
                    <span>{tr('Entrar / Afiliado', 'Sign In / Affiliate')}</span>
                  </>
                )}
              </button>

              {/* Two Luminous Internal-Light Notification Buttons: Gestão Empresarial & Gestão Eclesiástica */}
              <button
                type="button"
                onClick={() => setActiveTab('gestao_empresarial')}
                title={tr(
                  'Gestão Empresarial: Hotelaria, Eventos com Desconto, Árvore de Vendas e Plano 10% CONAE',
                  'Business Management: Hospitality, Discounted Events, Sales Tree & CONAE 10% Plan'
                )}
                className={`conae-btn-inner-glow inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'gestao_empresarial'
                    ? 'bg-gradient-to-r from-amber-500/95 via-amber-400 to-yellow-300 text-neutral-950 border-amber-200'
                    : 'bg-gradient-to-r from-amber-950/90 via-amber-900/75 to-emerald-950/90 text-amber-100 hover:text-white border-amber-400/75'
                }`}
              >
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-85" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-200 shadow-[0_0_8px_#fde047]" />
                </span>
                <Briefcase className="w-3.5 h-3.5 shrink-0 relative z-10" />
                <span className="relative z-10">
                  {tr('Gestão Empresarial', 'Business Mgmt')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('gestao_eclesiastica')}
                title={tr(
                  'Gestão Eclesiástica: Credenciamento de Obreiros, Eventos de Ministério, Cursos, Hotelaria e Pacotes Aéreos',
                  'Ecclesiastical Management: Minister Accreditation, Ministry Events, Courses, Hotels & Airfare Deals'
                )}
                className={`conae-btn-inner-glow-emerald inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'gestao_eclesiastica'
                    ? 'bg-gradient-to-r from-emerald-500/95 via-emerald-400 to-teal-300 text-neutral-950 border-emerald-200'
                    : 'bg-gradient-to-r from-emerald-950/95 via-emerald-900/80 to-teal-950/90 text-emerald-100 hover:text-white border-emerald-400/75'
                }`}
              >
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-85" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200 shadow-[0_0_8px_#6ee7b7]" />
                </span>
                <Church className="w-3.5 h-3.5 shrink-0 relative z-10" />
                <span className="relative z-10">
                  {tr('Gestão Eclesiástica', 'Ecclesiastical Mgmt')}
                </span>
              </button>

              {/* Locked side-by-side: BR/USA Flags + Flying Airplane GOL & TAM (LATAM) Promo Tickers immediately right of USA Flag */}
              <div className="inline-flex flex-nowrap items-center gap-1 shrink-0">
                <LanguageFlags />

                <button
                  type="button"
                  onClick={() => setActiveTab('voos_gol')}
                  title={tr(
                    'Promoções Aéreas GOL (voegol.com.br) — Clique para abrir a aba GOL',
                    'GOL Airfare Deals (voegol.com.br) — Click to open GOL tab'
                  )}
                  className={`inline-flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-md border transition-colors cursor-pointer w-[132px] sm:w-[152px] xl:w-[168px] overflow-hidden shrink-0 ${
                    activeTab === 'voos_gol'
                      ? 'bg-[#FF5A00]/30 border-[#FF5A00] text-white'
                      : 'bg-black/65 border-[#FF5A00]/50 hover:border-[#FF7A2F] text-emerald-100'
                  }`}
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#FF5A00] text-white shrink-0 overflow-hidden shadow-sm">
                    <Plane className="w-3 h-3 animate-plane-takeoff" aria-hidden="true" />
                  </span>
                  <span className="text-[10px] font-bold text-[#FF8C42] whitespace-nowrap shrink-0">
                    GOL
                  </span>
                  <span className="marquee-wrapper overflow-hidden flex-1 min-w-0">
                    <span className="animate-marquee-gol flex items-center gap-2 text-[10px] font-mono tabular-nums whitespace-nowrap">
                      {[...GOL_PROMO_FLIGHTS, ...GOL_PROMO_FLIGHTS].map((f, idx) => (
                        <span key={`hdr_gol_${f.id}_${idx}`} className="inline-flex items-center gap-1 shrink-0">
                          <span className="text-white font-semibold">
                            {f.originCode}→{f.destCode}
                          </span>
                          <span className="text-amber-300 font-bold">
                            R${f.promoPriceBRL.toFixed(0)}
                          </span>
                          <span className="text-white/30">·</span>
                        </span>
                      ))}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('voos_tam')}
                  title={tr(
                    'Promoções Aéreas TAM / LATAM (latamairlines.com) — Clique para abrir a aba TAM',
                    'TAM / LATAM Airfare Deals (latamairlines.com) — Click to open TAM tab'
                  )}
                  className={`inline-flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-md border transition-colors cursor-pointer w-[124px] sm:w-[144px] xl:w-[160px] overflow-hidden shrink-0 ${
                    activeTab === 'voos_tam'
                      ? 'bg-[#E8114B]/30 border-[#E8114B] text-white'
                      : 'bg-black/65 border-[#E8114B]/55 hover:border-[#ff4d7d] text-emerald-100'
                  }`}
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#E8114B] text-white shrink-0 overflow-hidden shadow-sm">
                    <Plane className="w-3 h-3 animate-plane-takeoff" aria-hidden="true" />
                  </span>
                  <span className="text-[10px] font-bold text-[#ff6f96] whitespace-nowrap shrink-0">
                    TAM
                  </span>
                  <span className="marquee-wrapper overflow-hidden flex-1 min-w-0">
                    <span className="animate-marquee-gol flex items-center gap-2 text-[10px] font-mono tabular-nums whitespace-nowrap">
                      {[...LATAM_PROMO_FLIGHTS, ...LATAM_PROMO_FLIGHTS].map((f, idx) => (
                        <span key={`hdr_tam_${f.id}_${idx}`} className="inline-flex items-center gap-1 shrink-0">
                          <span className="text-white font-semibold">
                            {f.originCode}→{f.destCode}
                          </span>
                          <span className="text-amber-300 font-bold">
                            R${f.promoPriceBRL.toFixed(0)}
                          </span>
                          <span className="text-white/30">·</span>
                        </span>
                      ))}
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Auto-Scrolling Floating Partner Bar across ALL menus & Home */}
      <FloatingAutoCarousel
        hotels={hotels}
        benefitPartners={benefitPartners}
        sponsors={sponsors}
        onNavigateTab={setActiveTab}
      />

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-3 sm:py-4 space-y-4">
        {uiNotice && (
          <div className="conae-panel-soft rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm text-emerald-100">
            <span>{uiNotice}</span>
            <button
              type="button"
              onClick={() => setUiNotice(null)}
              aria-label={tr('Fechar aviso', 'Dismiss notice')}
              className="text-amber-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Official CONAE Convenção & Holding Banner inside the Tabs (medium-small so content below is visible) */}
        <div className="relative w-full max-w-[340px] sm:max-w-[400px] mx-auto rounded-xl overflow-hidden border border-amber-400/55 shadow-[0_10px_28px_rgba(0,0,0,0.5)] bg-[#04101d]">
          <img
            src="/assets/aistudio/InShot_20261124_195330616_6fd30136.jpg"
            alt={tr(
              'CONAE Convenção & Holding · Gestor Empresarial e Gestor Ministerial',
              'CONAE Convention & Holding · Business & Ministerial Management'
            )}
            className="w-full h-auto block object-contain"
          />
          <button
            type="button"
            onClick={() => setActiveTab('gestao_empresarial')}
            aria-label={tr('Abrir aba Gestor Empresarial', 'Open Business Management tab')}
            title={tr('Abrir Gestor Empresarial', 'Open Business Management')}
            className="absolute left-0 bottom-0 w-1/2 h-[30%] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          />
          <button
            type="button"
            onClick={() => setActiveTab('gestao_eclesiastica')}
            aria-label={tr('Abrir aba Gestor Ministerial', 'Open Ministerial Management tab')}
            title={tr('Abrir Gestor Ministerial', 'Open Ministerial Management')}
            className="absolute right-0 bottom-0 w-1/2 h-[30%] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          />
        </div>

        {activeTab === 'inicio' && (
          <div className="space-y-4">
            {/* Smaller Top Copy of the Daily Share Quote Panel with Rolling Bar (above Convenção & Acionistas) */}
            <CnecChart
              topBanner
              stateStats={treasuryStats.states}
              totalSalesCount={treasuryStats.totalSalesCount}
              activeStatesCount={treasuryStats.activeStatesCount}
              totalEquityBRL={treasuryStats.totalEquityBRL}
              totalShareSalesBRL={treasuryStats.totalShareSalesBRL}
              totalSharesSold={treasuryStats.totalSharesSold}
              totalSharesForSale={treasuryStats.totalSharesForSale}
              todayVolumeBRL={treasuryStats.todayVolumeBRL}
              latestDailyQuotePercent={treasuryStats.latestDailyQuotePercent}
              todayQuotePayoutBRL={treasuryStats.todayQuotePayoutBRL}
              executiveEntriesCount={treasuryStats.executiveEntriesCount}
              valuationBoostPercent={treasuryStats.valuationBoostPercent}
              buyerHighlights={treasuryStats.buyerHighlights}
              shareholderValuations={treasuryStats.shareholderValuations}
              quotationMath={treasuryStats.quotationMath}
            />

            {/* Compact Hero + Centered Executive Gallery */}
            <section className="conae-panel rounded-xl p-5 sm:p-6 space-y-6">
              <div className="text-center max-w-3xl mx-auto space-y-2.5">
                <p className="text-xs font-medium text-amber-300">
                  {tr(
                    'Conselho Supremo da Convenção Mundial · Confederação Nacional dos Evangélicos',
                    'Supreme Council of the World Convention · National Confederation of Evangelicals'
                  )}
                </p>
                <h1 className="text-2xl sm:text-4xl font-bold text-white leading-tight">
                  {tr(
                    'CONAE Convenção, Acionistas & Banco Patrimonial',
                    'CONAE Convention, Shareholders & Equity Bank'
                  )}
                </h1>
                <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                  {tr(
                    'Unificando formação ministerial (conaecursos.com.br), ações CNEC, quadro de 100.000 ações em lotes matemáticos registrados em cartório, Cartão Dourado e descontos exclusivos em hotéis, farmácias, clínicas e supermercados.',
                    'Unifying ministerial training (conaecursos.com.br), CNEC shares, 100,000-share equity board in notarized mathematical lots, Gold Card and exclusive discounts at hotels, pharmacies, clinics and supermarkets.'
                  )}
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('acionistas')}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-semibold text-xs sm:text-sm hover:from-amber-400 hover:to-amber-300 cursor-pointer whitespace-nowrap"
                  >
                    {tr('Lotes de 100.000 Ações', '100,000-Share Lots')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('banco')}
                    className="px-4 py-2 rounded-lg conae-panel-soft text-white font-medium text-xs sm:text-sm hover:border-amber-400/60 cursor-pointer whitespace-nowrap"
                  >
                    {tr('Banco de Ações & Cartão Virtual', 'Equity Bank & Virtual Card')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('beneficios')}
                    className="px-4 py-2 rounded-lg conae-panel-soft text-amber-200 font-medium text-xs sm:text-sm hover:border-amber-400/60 cursor-pointer whitespace-nowrap"
                  >
                    {tr('Farmácias, Clínicas & Hotéis', 'Pharmacies, Clinics & Hotels')}
                  </button>
                </div>
              </div>

              {/* Centered Executive Portraits */}
              <div className="pt-2 border-t border-amber-400/20">
                <p className="text-center text-xs font-semibold text-amber-300 mb-4">
                  {tr(
                    'Mesa Diretora Executiva & Fundadores da Moeda CONAE (CNEC)',
                    'Executive Board of Directors & Founders of CONAE Coin (CNEC)'
                  )}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  {EXECUTIVES_TEAM.map((exec, idx) => {
                    const seqDelay = `${idx * 3}s`;
                    return (
                      <div
                        key={exec.id}
                        className="conae-panel-soft rounded-xl p-4 flex flex-col items-center text-center space-y-2.5"
                      >
                        <span className="conae-logo-stage shrink-0">
                          <span
                            className="conae-exec-glow"
                            style={{ animationDelay: seqDelay }}
                            aria-hidden="true"
                          />
                          <span
                            className="conae-exec-emblem w-20 h-20 sm:w-24 sm:h-24 border-2 border-amber-400/85 block"
                            style={{ animationDelay: seqDelay }}
                          >
                            <img
                              src={exec.photo}
                              alt={exec.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <span
                              className="conae-exec-shine"
                              style={{ animationDelay: seqDelay }}
                              aria-hidden="true"
                            />
                          </span>
                        </span>
                        <div className="space-y-0.5">
                          <h3 className="text-sm font-bold text-white">{exec.name}</h3>
                          <p className="text-[11px] font-medium text-amber-300">{translateDynamic(exec.role)}</p>
                          <p className="text-[11px] text-emerald-100/70">{translateDynamic(exec.highlight)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Ramified Shareholder Tree Directly Below Executivo Samuel / Executive Board */}
            <ShareholderBranchTree
              nodes={shareholderTree}
              isAdmin={isAdmin}
              onGoToHotels={() => setActiveTab('hoteis')}
              onGoToCourses={() => setActiveTab('cursos')}
              onGoToBank={() => setActiveTab('banco')}
              onGoToShareholders={() => setActiveTab('acionistas')}
              onGoToAdmin={() => setActiveTab('admin')}
            />

            {/* Left Hotel Gallery & GPS Sidebar + Live CNEC Chart & Compact Square Menu Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24">
                <HotelGpsGalleryPanel
                  hotels={hotels}
                  onGoToHotels={() => setActiveTab('hoteis')}
                />
              </div>

              <div className="lg:col-span-8 xl:col-span-9 space-y-5">
                <CnecChart
                  stateStats={treasuryStats.states}
                  totalSalesCount={treasuryStats.totalSalesCount}
                  activeStatesCount={treasuryStats.activeStatesCount}
                  totalEquityBRL={treasuryStats.totalEquityBRL}
                  totalShareSalesBRL={treasuryStats.totalShareSalesBRL}
                  totalSharesSold={treasuryStats.totalSharesSold}
                  totalSharesForSale={treasuryStats.totalSharesForSale}
                  todayVolumeBRL={treasuryStats.todayVolumeBRL}
                  latestDailyQuotePercent={treasuryStats.latestDailyQuotePercent}
                  todayQuotePayoutBRL={treasuryStats.todayQuotePayoutBRL}
                  executiveEntriesCount={treasuryStats.executiveEntriesCount}
                  valuationBoostPercent={treasuryStats.valuationBoostPercent}
                  buyerHighlights={treasuryStats.buyerHighlights}
                  shareholderValuations={treasuryStats.shareholderValuations}
                  quotationMath={treasuryStats.quotationMath}
                  onBuyPackageClick={() => setActiveTab('banco')}
                />

                <SimpleQuotationBoard
                  variant="home"
                  quotationMath={treasuryStats.quotationMath}
                  shareholderValuations={treasuryStats.shareholderValuations}
                  currentProfile={profile}
                  onBuyShares={() => setActiveTab('banco')}
                />

                <InlineHotelBookingBoard
                  hotels={hotels}
                  bookings={userBookingsOnly}
                  bookingPublic={bookingPublic}
                  profile={profile}
                  onBookHotel={handleBookHotel}
                  onRequireAuth={handleRequireAuth}
                  onOpenAllHotels={() => setActiveTab('hoteis')}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {compactSquareMenus.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setActiveTab(card.id)}
                      className="conae-panel rounded-xl p-4 text-left hover:border-amber-400/70 transition-colors cursor-pointer flex flex-col justify-between min-h-[136px] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-amber-400/35 flex items-center justify-center shrink-0">
                          {card.icon}
                        </div>
                        <span className="text-[11px] font-mono text-amber-300 text-right truncate">
                          {tr('Abrir →', 'Open →')}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{card.title}</h3>
                        <p className="text-xs text-emerald-100/75 line-clamp-2 mt-0.5">
                          {card.subtitle}
                        </p>
                      </div>
                      <p className="text-[11px] font-mono text-emerald-300/90 pt-1 border-t border-amber-400/15 truncate">
                        {card.metric}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Registered Affiliates Showcase + Benefits Strip */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 conae-panel rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-amber-300 font-medium">
                      {tr('Comunidade & Rede Nacional', 'Community & National Network')} ·{' '}
                      <span className="font-mono text-emerald-300">
                        {publicAffiliates.length} {tr('cadastrados', 'registered')}
                      </span>
                    </p>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-400" />
                      <span>{tr('Afiliados & Investidores Cadastrados', 'Registered Affiliates & Investors')}</span>
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('afiliado')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950 font-semibold text-xs hover:bg-amber-400 cursor-pointer whitespace-nowrap"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {tr('Cadastrar / Entrar', 'Sign Up / Sign In')}
                  </button>
                </div>

                {publicAffiliates.length > 0 && (
                  <div className="marquee-wrapper overflow-hidden rounded-lg bg-black/45 border border-amber-400/25 py-2 px-1">
                    <div className="animate-marquee-investors gap-2.5 items-center">
                      {(() => {
                        const baseList =
                          publicAffiliates.length < 4
                            ? [...publicAffiliates, ...publicAffiliates]
                            : publicAffiliates;
                        return [...baseList, ...baseList].map((aff, idx) => (
                          <div
                            key={`${aff.uid}-marquee-${idx}`}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-950/75 border border-amber-400/25 px-2.5 py-1.5 shrink-0"
                          >
                            <img
                              src={aff.photoUrl || CONAE_ASSETS.emblemHeart}
                              alt={aff.displayName}
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded-full object-cover border border-amber-400/60 shrink-0"
                            />
                            <div className="leading-tight">
                              <p className="text-[11px] font-semibold text-white whitespace-nowrap">
                                {aff.displayName}
                              </p>
                              <p className="text-[10px] text-amber-300/90 whitespace-nowrap">
                                {aff.state} · {translateDynamic(aff.vipTier)}
                              </p>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                <div className="max-h-[245px] overflow-y-auto conae-scroll pr-1.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {publicAffiliates.map((aff) => (
                      <div
                        key={aff.uid}
                        className="conae-panel-soft rounded-lg p-3 flex items-center gap-3"
                      >
                        <img
                          src={aff.photoUrl || CONAE_ASSETS.emblemHeart}
                          alt={aff.displayName}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover border border-amber-400/50 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {aff.displayName}
                          </p>
                          <p className="text-[11px] text-emerald-200/75">
                            {aff.state} · {tr('Nível', 'Tier')} {translateDynamic(aff.vipTier)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 conae-panel rounded-xl p-5 space-y-3.5 flex flex-col justify-between">
                <div className="space-y-2">
                  <p className="text-xs text-amber-300 font-medium">
                    {tr('Destaques Institucionais', 'Institutional Highlights')}
                  </p>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-400" />
                    <span>{tr('Benefícios do Conveniado Ativo', 'Active Member Benefits')}</span>
                  </h2>
                  <ul className="space-y-2 text-xs text-emerald-100/80 pt-1">
                    <li className="flex items-start gap-2">
                      <Scale className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        {tr(
                          '100.000 ações em lotes matemáticos aprovados pela Presidência e averbados em Cartório.',
                          '100,000 shares in mathematical lots approved by the Presidency and notarized.'
                        )}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        {tr(
                          'No painel em tempo real será mostrado o valor das ações e a cotação (%).',
                          'In the real-time panel, the value of the shares and quote (%) will be displayed.'
                        )}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        {tr(
                          'Cartões por hotel com acesso a cursos, clínicas, exames laboratoriais, farmácias e supermercados.',
                          'Hotel-specific cards with access to courses, clinics, lab tests, pharmacies and supermarkets.'
                        )}
                      </span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('midia')}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  {tr(
                    'Assistir Mensagens do Presidente & Ouvir Web Rádio',
                    'Watch President Messages & Listen to Web Radio'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cursos' && (
          <CoursesTab
            courses={courses}
            enrollments={userEnrollmentsOnly}
            profile={profile}
            onEnroll={handleEnrollCourse}
            onRequireAuth={handleRequireAuth}
          />
        )}

        {activeTab === 'banco' && (
          <BankAndCryptoTab
            profile={profile}
            hotels={hotels}
            executivePixList={executivePixList}
            userOrders={userOrdersOnly}
            userUsdInvestments={userUsdOnly}
            stateStats={treasuryStats.states}
            totalSalesCount={treasuryStats.totalSalesCount}
            activeStatesCount={treasuryStats.activeStatesCount}
            totalEquityBRL={treasuryStats.totalEquityBRL}
            totalShareSalesBRL={treasuryStats.totalShareSalesBRL}
            totalSharesSold={treasuryStats.totalSharesSold}
            totalSharesForSale={treasuryStats.totalSharesForSale}
            todayVolumeBRL={treasuryStats.todayVolumeBRL}
            latestDailyQuotePercent={treasuryStats.latestDailyQuotePercent}
            todayQuotePayoutBRL={treasuryStats.todayQuotePayoutBRL}
            executiveEntriesCount={treasuryStats.executiveEntriesCount}
            valuationBoostPercent={treasuryStats.valuationBoostPercent}
            shareUnitPriceBRL={treasuryStats.shareUnitPriceBRL}
            buyerHighlights={treasuryStats.buyerHighlights}
            shareholderValuations={treasuryStats.shareholderValuations}
            quotationMath={treasuryStats.quotationMath}
            onCreatePackageOrder={handleCreatePackageOrder}
            onCreateUsdInvestment={handleCreateUsdInvestment}
            onGenerateBankToken={handleGenerateBankToken}
            onRequireAuth={handleRequireAuth}
            onGoToHotels={() => setActiveTab('hoteis')}
          />
        )}

        {activeTab === 'hoteis' && (
          <HotelsTab
            hotels={hotels}
            bookings={userBookingsOnly}
            bookingPublic={bookingPublic}
            profile={profile}
            onBookHotel={handleBookHotel}
            onRequireAuth={handleRequireAuth}
            onGoToBenefits={() => setActiveTab('beneficios')}
          />
        )}

        {activeTab === 'voos_gol' && (
          <GolFlightsTab
            onGoToHotels={() => setActiveTab('hoteis')}
            onGoToTam={() => setActiveTab('voos_tam')}
          />
        )}

        {activeTab === 'voos_tam' && (
          <LatamFlightsTab
            onGoToHotels={() => setActiveTab('hoteis')}
            onGoToGol={() => setActiveTab('voos_gol')}
          />
        )}

        {activeTab === 'beneficios' && (
          <BenefitsAndCardsTab
            profile={profile}
            hotels={hotels}
            benefitPartners={benefitPartners}
            userCredentialPasses={userCredentialPassesOnly}
            onGoToHotels={() => setActiveTab('hoteis')}
            onGoToBank={() => setActiveTab('banco')}
          />
        )}

        {activeTab === 'acionistas' && (
          <ShareholdersTab
            profile={profile}
            hotels={hotels}
            userOrders={userShareholderOrdersOnly}
            summary={shareholderSummary}
            shareholderTree={shareholderTree}
            isAdmin={isAdmin}
            onCreateShareholderOrder={handleCreateShareholderOrder}
            onRequireAuth={handleRequireAuth}
            onGoToHotels={() => setActiveTab('hoteis')}
            onGoToCourses={() => setActiveTab('cursos')}
            onGoToBank={() => setActiveTab('banco')}
            onGoToAdmin={() => setActiveTab('admin')}
          />
        )}

        {activeTab === 'vip' && (
          <VipRoomTab
            profile={profile}
            vipPublic={vipPublic}
            vipExecutiveHashes={vipExecutiveHashes}
            onRequireAuth={handleRequireAuth}
            onGoToBank={() => setActiveTab('banco')}
          />
        )}

        {activeTab === 'midia' && <MediaRadioTab sponsors={sponsors} />}

        {activeTab === 'afiliado' && (
          <AffiliateAuthTab
            firebaseUid={firebaseUser?.uid || null}
            firebaseEmail={firebaseUser?.email || null}
            isAdmin={isAdmin}
            profile={profile}
            usersList={usersList}
            publicAffiliates={publicAffiliates}
            userCredentialPasses={userCredentialPassesOnly}
            vipExecutiveHashes={vipExecutiveHashes}
            onGoogleLogin={handleGoogleLogin}
            onLogout={handleLogout}
            onSaveProfile={handleSaveProfile}
            onDeleteRegistration={handleDeleteAffiliateRegistration}
            onGoToShareholders={() => setActiveTab('acionistas')}
            userMandates={
              firebaseUser
                ? executiveMandates.filter((m) => m.assigneeUid === firebaseUser.uid)
                : []
            }
            onSubmitMandateReport={handleSubmitMandateReport}
          />
        )}

        {activeTab === 'gestao_empresarial' && (
          <BusinessManagementTab
            profile={profile}
            hotels={hotels}
            courses={courses}
            benefitPartners={benefitPartners}
            records={
              firebaseUser
                ? businessRecords.filter((r) => r.userId === firebaseUser.uid || isAdmin)
                : []
            }
            onCreateRecord={handleCreateBusinessRecord}
            onDeleteRecord={handleDeleteBusinessRecord}
            onRequireAuth={handleRequireAuth}
            onGoToHotels={() => setActiveTab('hoteis')}
            onGoToCourses={() => setActiveTab('cursos')}
            onGoToBenefits={() => setActiveTab('beneficios')}
            onGoToBank={() => setActiveTab('banco')}
          />
        )}

        {activeTab === 'gestao_eclesiastica' && (
          <EcclesiasticalManagementTab
            profile={profile}
            hotels={hotels}
            courses={courses}
            records={
              firebaseUser
                ? ecclesiasticalRecords.filter((r) => r.userId === firebaseUser.uid || isAdmin)
                : []
            }
            onCreateRecord={handleCreateEcclesiasticalRecord}
            onDeleteRecord={handleDeleteEcclesiasticalRecord}
            onEnrollCourse={handleEnrollCourse}
            onRequireAuth={handleRequireAuth}
            onGoToHotels={() => setActiveTab('hoteis')}
            onGoToCourses={() => setActiveTab('cursos')}
            onGoToGolFlights={() => setActiveTab('voos_gol')}
            onGoToTamFlights={() => setActiveTab('voos_tam')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanelTab
            isAdmin={isAdmin}
            isLoggedIn={Boolean(firebaseUser)}
            onGoogleLogin={handleGoogleLogin}
            usersList={usersList}
            ordersList={ordersList}
            usdList={usdList}
            enrollmentsList={enrollmentsList}
            bookingsList={bookingsList}
            shareholderOrders={shareholderOrders}
            executivePixList={executivePixList}
            hotels={hotels}
            courses={courses}
            sponsors={sponsors}
            benefitPartners={benefitPartners}
            credentialPasses={credentialPasses}
            vipExecutiveHashes={vipExecutiveHashes}
            vipPublic={vipPublic}
            vipSecret={vipSecret}
            onApprovePackageOrder={handleApprovePackageOrder}
            onApproveUsdInvestment={handleApproveUsdInvestment}
            onLookupPackageOrder={handleLookupPackageOrder}
            onLookupUsdInvestment={handleLookupUsdInvestment}
            onUpdateEnrollmentStatus={handleUpdateEnrollmentStatus}
            onUpdateBookingStatus={handleUpdateBookingStatus}
            onUpdateShareholderOrder={handleUpdateShareholderOrder}
            onUpdateUserPatrimony={handleUpdateUserPatrimony}
            onDeleteUnpaidUser={handleDeleteUnpaidUser}
            onDeleteAllUnpaidUsers={handleDeleteAllUnpaidUsers}
            onDeleteAnyUser={handleDeleteAffiliateRegistration}
            onSaveExecutivePix={handleSaveExecutivePix}
            onDeleteExecutivePix={handleDeleteExecutivePix}
            onUpdateVipSettings={handleUpdateVipSettings}
            onCreateHotel={handleCreateHotel}
            onSaveHotelGpsAndPhotos={handleSaveHotelGpsAndPhotos}
            onDeleteHotel={handleDeleteHotel}
            onCreateCourse={handleCreateCourse}
            onDeleteCourse={handleDeleteCourse}
            onCreateSponsor={handleCreateSponsor}
            onDeleteSponsor={handleDeleteSponsor}
            onCreateBenefitPartner={handleCreateBenefitPartner}
            onDeleteBenefitPartner={handleDeleteBenefitPartner}
            onCreateCredentialPass={handleCreateCredentialPass}
            onDeleteCredentialPass={handleDeleteCredentialPass}
            onSeedDefaultsToFirestore={handleSeedDefaultsToFirestore}
            bookingPublic={bookingPublic}
            bookingSecret={bookingSecret}
            onUpdateBookingTokenConfig={handleUpdateBookingTokenConfig}
            shareholderTree={shareholderTree}
            onSaveShareholderTreeNode={handleSaveShareholderTreeNode}
            onDeleteShareholderTreeNode={handleDeleteShareholderTreeNode}
            treasuryEntries={treasuryEntries}
            onCreateTreasuryEntry={handleCreateTreasuryEntry}
            onDeleteTreasuryEntry={handleDeleteTreasuryEntry}
            onDeleteAllTreasuryEntries={handleDeleteAllTreasuryEntries}
            onDeleteShareholderBuyer={handleDeleteShareholderBuyer}
            quotationMath={treasuryStats.quotationMath}
            shareholderValuations={treasuryStats.shareholderValuations}
            executiveMandates={executiveMandates}
            onCreateMandate={handleCreateMandate}
            onSubmitMandateReport={handleSubmitMandateReport}
            onApproveMandateAndInsert={handleApproveMandateAndInsert}
            onUpdateMandateStatus={handleUpdateMandateStatus}
            onDeleteMandate={handleDeleteMandate}
          />
        )}
      </main>

      {/* Floating Vertical Promo Card (Desktop xl+ only, offset left of the top-to-bottom Treasury widget) */}
      {showFloatingPromo && activeTab === 'inicio' && (
        <aside className="hidden xl:flex fixed right-[224px] bottom-5 z-30 w-56 conae-panel rounded-xl p-3.5 flex-col space-y-2 animate-float-vertical shadow-2xl">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              {tr('Oportunidade CONAE', 'CONAE Opportunity')}
            </span>
            <button
              type="button"
              onClick={() => setShowFloatingPromo(false)}
              aria-label={tr('Fechar destaque flutuante', 'Close floating highlight')}
              className="text-emerald-200/70 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs font-semibold text-white leading-snug">
            {tr(
              '100.000 Ações em Lotes + Cartão Dourado & Rede de Descontos',
              '100,000 Shares in Lots + Gold Card & Discount Network'
            )}
          </p>
          <p className="text-[11px] text-emerald-100/75">
            {tr(
              'Solicite seu lote de ações em cartório ou ative seu pacote via PIX na Presidência.',
              'Request your notarized share lot or activate your package via PIX with the Presidency.'
            )}
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('acionistas')}
            className="w-full py-1.5 rounded-lg bg-amber-500 text-neutral-950 font-semibold text-xs hover:bg-amber-400 cursor-pointer"
          >
            {tr('Ver Lotes de Ações', 'View Share Lots')}
          </button>
        </aside>
      )}

      {/* Compact Floating Copy of Treasury Chart, Brazilian Flags, Booking.com Token & Coupled GOL Deals */}
      <FloatingTreasuryMiniWidget
        stateStats={treasuryStats.states}
        totalSalesCount={treasuryStats.totalSalesCount}
        valuationBoostPercent={treasuryStats.valuationBoostPercent}
        shareholderValuations={treasuryStats.shareholderValuations}
        onOpenTreasury={() => setActiveTab('banco')}
        bookingPublic={bookingPublic}
        userBookings={userBookingsOnly}
        hotels={hotels}
        onOpenHotels={() => setActiveTab('hoteis')}
        onOpenGolFlights={() => setActiveTab('voos_gol')}
        onOpenTamFlights={() => setActiveTab('voos_tam')}
        onOpenDuqueEvento={navigateToDuqueEvento}
      />

      {/* Footer */}
      <footer className="relative z-10 border-t border-amber-400/20 bg-black/55 py-4 px-4 text-center text-xs text-emerald-200/70">
        {tr(
          'CONAE · Conselho Supremo da Convenção Mundial · Sede Garavelo, Aparecida de Goiânia-GO · conaecursos.com.br',
          'CONAE · Supreme Council of the World Convention · HQ Garavelo, Aparecida de Goiânia-GO, Brazil · conaecursos.com.br'
        )}
      </footer>
      </div>

      {/* Bottom-Left Floating CONAE DUNK Robot + Big Microphone (always interactive, including above the Lock Screen) */}
      <FloatingConaeDunkSidebar
        shareholderTree={shareholderTree}
        buyerHighlights={treasuryStats.buyerHighlights}
        publicAffiliates={publicAffiliates}
        hotels={hotels}
        courses={courses}
        benefitPartners={benefitPartners}
        sponsors={sponsors}
        stateStats={treasuryStats.states}
        businessRecords={
          !shouldShowLockScreen && firebaseUser
            ? businessRecords.filter((r) => r.userId === firebaseUser.uid || isAdmin)
            : []
        }
        ecclesiasticalRecords={
          !shouldShowLockScreen && firebaseUser
            ? ecclesiasticalRecords.filter((r) => r.userId === firebaseUser.uid || isAdmin)
            : []
        }
        shareUnitPriceBRL={treasuryStats.shareUnitPriceBRL}
        latestDailyQuotePercent={treasuryStats.latestDailyQuotePercent}
        valuationBoostPercent={treasuryStats.valuationBoostPercent}
        totalEquityBRL={treasuryStats.totalEquityBRL}
        totalSharesForSale={treasuryStats.totalSharesForSale}
        lockScreenActive={shouldShowLockScreen}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}

function GmpQuotaBanner() {
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  if (!quotaExceeded) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
      <span>
        Google Maps Platform quota reached. If you are the app owner, visit{' '}
        <a
          href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold text-amber-950 hover:text-amber-800"
        >
          maps developer site
        </a>{' '}
        for instructions to update your account.
      </span>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ErrorBoundary>
        <GmpQuotaBanner />
        <ConaeAppContent />
      </ErrorBoundary>
    </LanguageProvider>
  );
}
