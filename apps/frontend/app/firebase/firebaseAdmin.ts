// firebase/firebaseAdmin.ts
import admin from "firebase-admin";

const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

// Only initialize if we have the required environment variables
if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    console.error("Firebase admin initialization error:", error);
  }
}

// Safe exports that won't fail during build
export const db = admin.apps.length ? admin.firestore() : null as any;
export const storage = admin.apps.length ? admin.storage() : null as any;
export const authAdmin = admin.apps.length ? admin.auth() : null as any;