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
  FacebookAuthProvider,
  OAuthProvider,
  type Auth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

export const firebaseConfig = {
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

/** Default Google-hosted auth domain. Apple Services IDs are usually registered
 *  against this return URL (`…firebaseapp.com/__/auth/handler`). We keep the
 *  primary app on web.app (Safari ITP) and use this only for Apple OAuth. */
export const APPLE_OAUTH_AUTH_DOMAIN = "level-up-life-73702.firebaseapp.com";

// Avoid double-init in Vite HMR
const app: FirebaseApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

/**
 * Secondary Firebase app used ONLY for Sign in with Apple.
 * Apple rejects `*.web.app/__/auth/handler` unless that exact return URL was
 * added to the Services ID — Firebase Console defaults to firebaseapp.com.
 * Completing Apple on this app, then `signInWithCredential` on the primary
 * auth, keeps the rest of the client on the ITP-safe web.app authDomain.
 */
export function getAppleOAuthAuth(): Auth {
  const name = "apple-oauth";
  const existing = getApps().find((a) => a.name === name);
  const appleApp =
    existing ??
    initializeApp(
      {
        ...firebaseConfig,
        authDomain: APPLE_OAUTH_AUTH_DOMAIN,
      },
      name,
    );
  return getAuth(appleApp);
}

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

export const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope("email");
facebookProvider.addScope("public_profile");
// user_friends requires Meta App Review — requested so Find Friends works once approved.
facebookProvider.addScope("user_friends");
facebookProvider.setCustomParameters({ display: "popup" });

export const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

export default app;
