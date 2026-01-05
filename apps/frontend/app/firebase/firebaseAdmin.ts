import { cert, getApps, initializeApp, ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const projectId = process.env.FIREBASE_PROJECT_ID;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

export let authAdmin: any;
export let db: any;
export let storage: any;

let adminInitialized = false;

try {
  if (rawServiceAccount) {
    // FIREBASE_SERVICE_ACCOUNT as JSON string
    const parsed = JSON.parse(rawServiceAccount) as ServiceAccount;

    if (!getApps().length) {
      initializeApp({
        credential: cert(parsed),
        storageBucket,
      });
    }

    adminInitialized = true;
  } else if (clientEmail && privateKey && projectId) {
    // Split env vars (Vercel-safe)
    const safeKey = privateKey.replace(/\\n/g, "\n");

    const svc: ServiceAccount = {
      projectId,
      clientEmail,
      privateKey: safeKey,
    };

    if (!getApps().length) {
      initializeApp({
        credential: cert(svc),
        storageBucket,
      });
    }

    adminInitialized = true;
  } else {
    // Allow build to pass without crashing
    adminInitialized = false;
  }
} catch (e) {
  console.error(
    "Firebase Admin init error (non-fatal during build):",
    (e as Error).message
  );
  adminInitialized = false;
}

if (adminInitialized) {
  authAdmin = getAuth();
  db = getFirestore();
  storage = getStorage();
} else {
  // Runtime-safe stubs (fail only when actually used)
  const makeMissing = (name: string) =>
    new Proxy(
      {},
      {
        get() {
          throw new Error(
            `Firebase Admin SDK not initialized. Missing env vars.
Attempted to access: ${name}

Required:
- FIREBASE_SERVICE_ACCOUNT (JSON) OR
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY
- FIREBASE_PROJECT_ID
- FIREBASE_STORAGE_BUCKET`
          );
        },
      }
    );

  authAdmin = makeMissing("authAdmin");
  db = makeMissing("db");
  storage = makeMissing("storage");
}
