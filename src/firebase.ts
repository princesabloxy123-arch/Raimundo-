import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const BOOTSTRAPPED_ADMIN_EMAIL = 'princesabloxy123@gmail.com';
export const PRESIDENT_MASTER_HASH = '92a1f953de6fe86d079dd4185a00c8e2bd9fb6eee898953c29102a9513812d07';
export const APP_ACCESS_LOCK_HASH = '92a1f953de6fe86d079dd4185a00c8e2bd9fb6eee898953c29102a9513812d07';
export const APP_INSTALL_PASSWORD_HASH = 'b674efa88b3511eb224b4a9f2da93b291aaf9f844be2759555393d194cc76ca7';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration (client offline).');
    }
    return false;
  }
}

export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function isPresidentMasterPassword(value: string): Promise<boolean> {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const directHash = await sha256Hex(trimmed);
  if (directHash === PRESIDENT_MASTER_HASH) return true;
  const compactHash = await sha256Hex(trimmed.toLowerCase().replace(/\s+/g, ''));
  return compactHash === PRESIDENT_MASTER_HASH;
}

export async function isAppAccessPassword(value: string): Promise<boolean> {
  const cleaned = value.trim().replace(/\s+/g, '');
  if (!cleaned) return false;
  const directDigest = await sha256Hex(cleaned);
  if (directDigest === APP_ACCESS_LOCK_HASH) return true;
  const lowerDigest = await sha256Hex(cleaned.toLowerCase());
  return lowerDigest === APP_ACCESS_LOCK_HASH;
}

export async function isAppInstallPassword(value: string): Promise<boolean> {
  const cleaned = value.trim().replace(/\s+/g, '');
  if (!cleaned) return false;
  const directDigest = await sha256Hex(cleaned);
  if (directDigest === APP_INSTALL_PASSWORD_HASH) return true;
  const lowerDigest = await sha256Hex(cleaned.toLowerCase());
  return lowerDigest === APP_INSTALL_PASSWORD_HASH;
}

export function sanitizeDocId(prefix: string): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rnd}`.replace(/[^a-zA-Z0-9_-]/g, '');
}
