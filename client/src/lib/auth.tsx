// Firebase Auth context. Manages the Firebase user, the synced Firestore
// "users/{uid}" profile doc, and exposes auth actions (signup/login/google/
// logout/forgot/reset/changePassword/deleteAccount).
//
// The Firebase user (uid, email, emailVerified) lives in Firebase Auth.
// Per-user app data (onboarded flag, notificationsEnabled, displayName) lives
// in Firestore at users/{uid}. We merge both into the Me object that the rest
// of the app consumes.

import { createContext, useContext, ReactNode, useEffect, useState, useCallback } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, collection, getDocs, writeBatch } from "firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";
import { auth, db, googleProvider } from "./firebase";
import type { Me } from "./types";
import { SCHEMA_VERSION } from "./gameLogic";
import { shouldUseGoogleRedirect } from "./ios";

// If the user's existing character is from an older schema (pre-6-category model),
// wipe it so they're forced through the new Life Assessment on next login.
// Match the 'wipe + re-onboard' choice from the Phase 3 roadmap.
async function migrateIfStale(uid: string): Promise<boolean> {
  const charRef = doc(db, "characters", uid);
  const snap = await getDoc(charRef);
  if (!snap.exists()) return false;
  const data = snap.data() as any;
  const v = data.schemaVersion ?? 0;
  if (v >= SCHEMA_VERSION) return false;
  // Old character — wipe character doc + subcollections.
  for (const sub of ["quests", "categories", "achievements", "rewards", "completions"]) {
    const existing = await getDocs(collection(charRef, sub));
    if (existing.size > 0) {
      const batch = writeBatch(db);
      existing.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }
  await deleteDoc(charRef);
  // Flip onboarded flag back to false so the app routes to onboarding.
  await updateDoc(doc(db, "users", uid), { onboarded: false });
  return true;
}

type AuthCtx = {
  me: Me | null;
  isLoading: boolean;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  googleSignIn: () => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>; // legacy — Firebase handles via email link
  verifyEmail: (token?: string) => Promise<void>; // sends a fresh verification email
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateSettings: (fields: { notificationsEnabled?: boolean; displayName?: string }) => Promise<void>;
  deleteAccount: (currentPassword?: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

type ProfileDoc = {
  email: string;
  displayName?: string;
  provider: "password" | "google";
  onboarded: boolean;
  notificationsEnabled: boolean;
  createdAt?: any;
};

// Map a Firebase user + Firestore profile doc into the app's Me shape.
function buildMe(fbUser: FirebaseUser, profile: ProfileDoc): Me {
  return {
    id: fbUser.uid as any, // schema typed as number, but we use the uid string throughout
    email: fbUser.email ?? profile.email,
    provider: profile.provider,
    emailVerified: fbUser.emailVerified,
    onboarded: profile.onboarded,
    notificationsEnabled: profile.notificationsEnabled,
    createdAt: typeof profile.createdAt === "string" ? profile.createdAt : new Date().toISOString(),
  };
}

// Ensure a users/{uid} profile doc exists. Called after every auth event
// (signup, login, google) so we recover gracefully if the doc was lost.
async function ensureProfile(fbUser: FirebaseUser, provider: "password" | "google"): Promise<ProfileDoc> {
  const ref = doc(db, "users", fbUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as ProfileDoc;
  }
  const initial: ProfileDoc = {
    email: fbUser.email ?? "",
    displayName: fbUser.displayName ?? "",
    provider,
    onboarded: false,
    notificationsEnabled: true,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, initial);
  // serverTimestamp resolves on read; return the in-memory version with current time for now
  return { ...initial, createdAt: new Date().toISOString() };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<ProfileDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to Firebase Auth state.
  // On Capacitor iOS, getRedirectResult / IndexedDB persistence can hang and
  // never fire onAuthStateChanged — which left TestFlight on the spinner forever.
  useEffect(() => {
    let cancelled = false;
    const AUTH_BOOT_MS = 4000;
    const REDIRECT_MS = 2500;

    const bootTimer = window.setTimeout(() => {
      if (!cancelled) {
        console.warn("Auth boot timed out — showing sign-in");
        setIsLoading(false);
      }
    }, AUTH_BOOT_MS);

    // Complete Google redirect sign-in (required for iOS Safari), but never block boot.
    void Promise.race([
      getRedirectResult(auth),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), REDIRECT_MS)),
    ])
      .then(async (result) => {
        if (result?.user) await ensureProfile(result.user, "google");
      })
      .catch((e) => console.error("getRedirectResult failed", e));

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;
      setFbUser(user);
      if (!user) {
        setProfile(null);
        setIsLoading(false);
        return;
      }
      // We don't know if this is password or google here; check providerData.
      const providerId = user.providerData[0]?.providerId ?? "password";
      const providerKey: "password" | "google" =
        providerId === "google.com" ? "google" : "password";
      try {
        const p = await ensureProfile(user, providerKey);
        // One-time schema migration: drops legacy character if pre-v3 schema.
        const migrated = await migrateIfStale(user.uid);
        if (!cancelled) setProfile(migrated ? { ...p, onboarded: false } : p);
      } catch (e) {
        console.error("ensureProfile failed", e);
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
      window.clearTimeout(bootTimer);
      unsub();
    };
  }, []);

  // Live-subscribe to the user's profile doc so onboarded flag flips immediately
  // when the Cloud Function (or client) finalizes onboarding.
  useEffect(() => {
    if (!fbUser) return;
    const unsub = onSnapshot(doc(db, "users", fbUser.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data() as ProfileDoc);
    });
    return unsub;
  }, [fbUser]);

  const me: Me | null = fbUser && profile ? buildMe(fbUser, profile) : null;

  const refresh = useCallback(async () => {
    if (!fbUser) return;
    await fbUser.reload();
    const snap = await getDoc(doc(db, "users", fbUser.uid));
    if (snap.exists()) setProfile(snap.data() as ProfileDoc);
  }, [fbUser]);

  const signup = async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await ensureProfile(cred.user, "password");
    // Fire-and-forget verification email; sandboxed environments may block it
    sendEmailVerification(cred.user).catch(() => {});
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const googleSignIn = async () => {
    if (shouldUseGoogleRedirect()) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    const cred = await signInWithPopup(auth, googleProvider);
    await ensureProfile(cred.user, "google");
  };

  const dropGameCaches = () => {
    qc.removeQueries({ predicate: (q) => {
      const k = q.queryKey[0];
      return typeof k === "string" && (k.startsWith("character") || k.startsWith("quests") || k.startsWith("achievements") || k.startsWith("completions") || k.startsWith("rewards") || k.startsWith("categories") || k.startsWith("stats"));
    }});
  };

  const logout = async () => {
    await signOut(auth);
    dropGameCaches();
  };

  const forgotPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  // Firebase handles password reset entirely via emailed link; this legacy
  // method is kept for prop compatibility but is unreachable in normal flow.
  const resetPassword = async (_token: string, _password: string) => {
    throw new Error("Password reset is handled via the emailed link from Firebase.");
  };

  const verifyEmail = async (_token?: string) => {
    if (!auth.currentUser) throw new Error("Not signed in");
    await sendEmailVerification(auth.currentUser);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!auth.currentUser || !auth.currentUser.email) throw new Error("Not signed in");
    const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, cred);
    await updatePassword(auth.currentUser, newPassword);
  };

  const updateSettings = async (fields: { notificationsEnabled?: boolean; displayName?: string }) => {
    if (!fbUser) throw new Error("Not signed in");
    await updateDoc(doc(db, "users", fbUser.uid), fields);
  };

  const deleteAccount = async (currentPassword?: string) => {
    if (!auth.currentUser) throw new Error("Not signed in");
    // For password accounts, reauthenticate first
    if (currentPassword && auth.currentUser.email) {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, cred);
    }
    const uid = auth.currentUser.uid;
    // Best-effort delete of user profile + character (sub-collections cleaned by Cloud Function trigger)
    await Promise.allSettled([
      deleteDoc(doc(db, "users", uid)),
      deleteDoc(doc(db, "characters", uid)),
    ]);
    await deleteUser(auth.currentUser);
    dropGameCaches();
  };

  return (
    <Ctx.Provider value={{
      me, isLoading,
      signup, login, googleSignIn, logout,
      forgotPassword, resetPassword, verifyEmail,
      changePassword, updateSettings, deleteAccount, refresh,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
