import { cert, getApps, initializeApp, ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const projectId = process.env.FIREBASE_PROJECT_ID;
export let authAdmin: any;
export let db: any;
let adminInitialized = false;

try {
  if (rawServiceAccount) {
    // FIREBASE_SERVICE_ACCOUNT expected as a JSON string
    const parsed = JSON.parse(rawServiceAccount) as ServiceAccount;
    if (!getApps().length) {
      initializeApp({
        credential: cert(parsed),
      });
    }
    adminInitialized = true;
  } else if (clientEmail && privateKey && projectId) {
    // Support split env vars (useful for hosting providers)
    const safeKey = privateKey.replace(/\\n/g, "\n");
    const svc: ServiceAccount = {
      projectId,
      clientEmail,
      privateKey: safeKey,
    };
    if (!getApps().length) {
      initializeApp({
        credential: cert(svc),
      });
    }
    adminInitialized = true;
  } else {
    // Do not throw during build — leave admin uninitialized and export stubs.
    adminInitialized = false;
  }
} catch (e) {
  // Parsing/initialization error — do not crash the build here.
  console.error("Firebase Admin init error (non-fatal during build):", (e as Error).message);
  adminInitialized = false;
}

if (adminInitialized) {
  authAdmin = getAuth();
  db = getFirestore();
} else {
  // Stubs that throw meaningful errors at runtime if used without configuration.
  const makeMissing = (name: string) => {
    return new Proxy(
      {},
      {
        get() {
          throw new Error(
            `Firebase Admin SDK not initialized. Set FIREBASE_SERVICE_ACCOUNT (JSON) or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY/FIREBASE_PROJECT_ID environment variables. Attempted to access: ${name}`
          );
        },
      }
    );
  };

  // Keep exported names so import sites compile; will throw when actually invoked.
  // Types are any to satisfy callers at compile time.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // Keep exported names so import sites compile; will throw when actually invoked.
  authAdmin = makeMissing("authAdmin");
  db = makeMissing("db");
}