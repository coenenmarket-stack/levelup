/**
 * Certification / side-hustle guide progress.
 * Firestore: characters/{uid}/guideProgress/{certifications|sideHustles}
 * Migrates legacy cert localStorage once (owner-only, private).
 */

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export type CertGuideProgress = {
  saved: string[];
  goals: string[];
  started: string[];
  completed: string[];
  updatedAt: string | null;
  migratedFromLocal?: boolean;
};

export type HustleGuideProgress = {
  saved: string[];
  started: string[];
  completed: string[];
  updatedAt: string | null;
};

const emptyCert = (): CertGuideProgress => ({
  saved: [],
  goals: [],
  started: [],
  completed: [],
  updatedAt: null,
});

const emptyHustle = (): HustleGuideProgress => ({
  saved: [],
  started: [],
  completed: [],
  updatedAt: null,
});

function certRef(uid: string) {
  return doc(db, "characters", uid, "guideProgress", "certifications");
}

function hustleRef(uid: string) {
  return doc(db, "characters", uid, "guideProgress", "sideHustles");
}

function legacyCertKey(uid: string) {
  return `levelup_cert_progress_v1__${uid}`;
}

function loadLegacyCertLocal(uid: string): CertGuideProgress | null {
  try {
    const raw = localStorage.getItem(legacyCertKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CertGuideProgress>;
    return {
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      started: Array.isArray(parsed.started) ? parsed.started : [],
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      updatedAt: null,
      migratedFromLocal: true,
    };
  } catch {
    return null;
  }
}

function uniq(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)));
}

export function mergeCertProgress(
  raw: Partial<CertGuideProgress> | null | undefined,
): CertGuideProgress {
  return {
    ...emptyCert(),
    ...(raw ?? {}),
    saved: uniq(raw?.saved ?? []),
    goals: uniq(raw?.goals ?? []),
    started: uniq(raw?.started ?? []),
    completed: uniq(raw?.completed ?? []),
  };
}

export function mergeHustleProgress(
  raw: Partial<HustleGuideProgress> | null | undefined,
): HustleGuideProgress {
  return {
    ...emptyHustle(),
    ...(raw ?? {}),
    saved: uniq(raw?.saved ?? []),
    started: uniq(raw?.started ?? []),
    completed: uniq(raw?.completed ?? []),
  };
}

export async function readCertProgress(uid: string): Promise<CertGuideProgress> {
  try {
    const snap = await getDoc(certRef(uid));
    if (snap.exists()) return mergeCertProgress(snap.data() as Partial<CertGuideProgress>);

    const legacy = uid !== "anon" ? loadLegacyCertLocal(uid) : null;
    if (legacy && (legacy.saved.length || legacy.goals.length || legacy.started.length || legacy.completed.length)) {
      const migrated = mergeCertProgress({
        ...legacy,
        updatedAt: new Date().toISOString(),
        migratedFromLocal: true,
      });
      await setDoc(certRef(uid), migrated, { merge: true });
      try {
        localStorage.removeItem(legacyCertKey(uid));
      } catch {
        /* private mode */
      }
      return migrated;
    }
    return emptyCert();
  } catch (e) {
    console.warn("readCertProgress failed", e);
    return loadLegacyCertLocal(uid) ?? emptyCert();
  }
}

export async function writeCertProgress(
  uid: string,
  progress: CertGuideProgress,
): Promise<CertGuideProgress> {
  const next = mergeCertProgress({
    ...progress,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(certRef(uid), next, { merge: true });
  return next;
}

export async function readHustleProgress(uid: string): Promise<HustleGuideProgress> {
  try {
    const snap = await getDoc(hustleRef(uid));
    if (!snap.exists()) return emptyHustle();
    return mergeHustleProgress(snap.data() as Partial<HustleGuideProgress>);
  } catch (e) {
    console.warn("readHustleProgress failed", e);
    return emptyHustle();
  }
}

export async function writeHustleProgress(
  uid: string,
  progress: HustleGuideProgress,
): Promise<HustleGuideProgress> {
  const next = mergeHustleProgress({
    ...progress,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(hustleRef(uid), next, { merge: true });
  return next;
}

export function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}
