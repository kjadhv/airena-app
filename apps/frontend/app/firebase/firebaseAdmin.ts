// app/firebase/firebaseAdmin.ts
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let authAdmin: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;

function initializeFirebaseAdmin() {
  // Don't initialize during build time
  if (typeof window === 'undefined' && !process.env.FIREBASE_PROJECT_ID) {
    console.warn('Firebase Admin: Skipping initialization - no credentials');
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin environment variables. " +
      "Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
    );
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
      storageBucket,
    });
  }

  authAdmin = getAuth();
  db = getFirestore();
  storage = getStorage();
}

function ensureInitialized() {
  if (!authAdmin || !db || !storage) {
    initializeFirebaseAdmin();
  }
}

export function getAuthAdmin() {
  ensureInitialized();
  if (!authAdmin) {
    throw new Error("Firebase Auth not initialized - check environment variables");
  }
  return authAdmin;
}

export function getDb() {
  ensureInitialized();
  if (!db) {
    throw new Error("Firestore not initialized - check environment variables");
  }
  return db;
}

export function getStorageAdmin() {
  ensureInitialized();
  if (!storage) {
    throw new Error("Storage not initialized - check environment variables");
  }
  return storage;
}