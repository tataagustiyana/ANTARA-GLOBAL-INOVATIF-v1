import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
  Firestore,
} from 'firebase/firestore';

import firebaseAppletConfig from '../../firebase-applet-config.json';

// Mengambil konfigurasi dari firebase-applet-config.json
const configData: any = firebaseAppletConfig || {};

/**
 * 1. KODE KONFIGURASI FIREBASE (firebaseConfig)
 * Ganti placeholder di bawah ini dengan API Key dan kredensial Firebase project Anda jika menggunakan kredensial custom.
 */
export const firebaseConfig = {
  apiKey: configData.apiKey || 'AIzaSyYOUR_API_KEY_HERE_PLACEHOLDER',
  authDomain: configData.authDomain || 'your-project-id.firebaseapp.com',
  projectId: configData.projectId || 'your-project-id',
  storageBucket: configData.storageBucket || 'your-project-id.firebasestorage.app',
  messagingSenderId: configData.messagingSenderId || '123456789012',
  appId: configData.appId || '1:123456789012:web:abcdef1234567890',
  firestoreDatabaseId: configData.firestoreDatabaseId || '(default)',
};

// Inisialisasi Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inisialisasi Firebase Authentication
export const auth = getAuth(app);

// Inisialisasi Cloud Firestore (mendukung database instance kustom jika ditentukan)
export const db: Firestore =
  firebaseConfig.firestoreDatabaseId &&
  firebaseConfig.firestoreDatabaseId !== '(default)' &&
  firebaseConfig.firestoreDatabaseId !== ''
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();

// Error handling helper standard Firestore
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  doc,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
};

export type { FirebaseUser, DocumentData, QuerySnapshot, DocumentSnapshot };
