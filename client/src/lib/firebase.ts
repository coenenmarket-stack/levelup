// Firebase bootstrap — initializes Firebase app, Auth, Firestore, and Functions.
// The config object is public by design (apiKey is an identifier, not a secret).
// Security is enforced by Firestore rules + Auth restrictions in the Firebase console.

import { Capacitor } from "@capacitor/core";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBRtjVakNyozHXP_lVKoDuINTumRYOl7i4",
  // IMPORTANT: must match the hosting domain to avoid Safari ITP breaking auth.
  // Requires `https://level-up-life-73702.web.app/__/auth/handler` to be added
  // to the OAuth 2.0 Client's "Authorized redirect URIs" in Google Cloud Console.
  authDomain: "level-up-life-73702.web.app",
  projectId: "level-up-life-73702",
  storageBucket: "level-up-life-73702.firebasestorage.app",
  messagingSenderId: "901479824639",
  appId: "1:901479824639:web:4948da9080d5aba934e0ca",
  measurementId: "G-ESB32YZ7TV",
};

// Avoid double-init in Vite HMR
const app: FirebaseApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

/**
 * Capacitor WKWebView can hang forever on the default getAuth() + browser
 * persistence path (IndexedDB / redirect-result handshake). initializeAuth with
 * an explicit persistence chain avoids the infinite "loading" gate on iOS.
 */
function createAuth(firebaseApp: FirebaseApp): Auth {
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      return initializeAuth(firebaseApp, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
      });
    } catch {
      // Already initialized (HMR / re-import)
    }
  }
  return getAuth(firebaseApp);
}

export const auth = createAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export default app;
