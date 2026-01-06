// app/firebase/firebaseAdmin.ts
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

// Initialize Firebase Admin only if credentials are available
let authAdmin: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;

function initializeFirebaseAdmin() {
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

// Helper function to ensure Firebase is initialized
function ensureInitialized() {
  if (!authAdmin || !db || !storage) {
    initializeFirebaseAdmin();
  }
}

// Export getters that initialize on first use
export function getAuthAdmin() {
  ensureInitialized();
  return authAdmin!;
}

export function getDb() {
  ensureInitialized();
  return db!;
}

export function getStorageAdmin() {
  ensureInitialized();
  return storage!;
}