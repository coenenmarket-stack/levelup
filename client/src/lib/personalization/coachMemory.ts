/**
 * Structured AI Coach memory — characters/{uid}/coachMemory/state
 * Do NOT store full chat transcripts here.
 */

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export type CoachMemory = {
  coachingGoals: string[];
  currentFocus: string | null;
  preferences: string[];
  activePlan: string | null;
  lastRecommendation: string | null;
  acceptedPlanIds: string[];
  updatedAt: string | null;
};

export const DEFAULT_COACH_MEMORY: CoachMemory = {
  coachingGoals: [],
  currentFocus: null,
  preferences: [],
  activePlan: null,
  lastRecommendation: null,
  acceptedPlanIds: [],
  updatedAt: null,
};

function memoryRef(uid: string) {
  return doc(db, "characters", uid, "coachMemory", "state");
}

export function mergeCoachMemory(raw: Partial<CoachMemory> | null | undefined): CoachMemory {
  const clip = (s: string | null | undefined, max: number): string | null => {
    if (!s) return null;
    const t = String(s).trim();
    if (!t) return null;
    return t.length > max ? t.slice(0, max) : t;
  };
  return {
    ...DEFAULT_COACH_MEMORY,
    ...(raw ?? {}),
    coachingGoals: Array.isArray(raw?.coachingGoals)
      ? raw!.coachingGoals.map((g) => String(g).slice(0, 120)).filter(Boolean).slice(0, 8)
      : [],
    preferences: Array.isArray(raw?.preferences)
      ? raw!.preferences.map((g) => String(g).slice(0, 120)).filter(Boolean).slice(0, 12)
      : [],
    acceptedPlanIds: Array.isArray(raw?.acceptedPlanIds)
      ? raw!.acceptedPlanIds.map(String).filter(Boolean).slice(0, 20)
      : [],
    currentFocus: clip(raw?.currentFocus ?? null, 160),
    activePlan: clip(raw?.activePlan ?? null, 280),
    lastRecommendation: clip(raw?.lastRecommendation ?? null, 280),
  };
}

export async function readCoachMemory(uid: string): Promise<CoachMemory> {
  try {
    const snap = await getDoc(memoryRef(uid));
    if (!snap.exists()) return { ...DEFAULT_COACH_MEMORY };
    return mergeCoachMemory(snap.data() as Partial<CoachMemory>);
  } catch (e) {
    console.warn("readCoachMemory failed", e);
    return { ...DEFAULT_COACH_MEMORY };
  }
}

export async function writeCoachMemory(
  uid: string,
  patch: Partial<CoachMemory>,
): Promise<CoachMemory> {
  const current = await readCoachMemory(uid);
  const next = mergeCoachMemory({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(memoryRef(uid), next, { merge: true });
  return next;
}

/** Compact string for coach system prompt — no emails or private account data. */
export function formatCoachMemoryForPrompt(mem: CoachMemory): string {
  const lines = [
    `Current focus: ${mem.currentFocus || "not set"}`,
    `Coaching goals: ${mem.coachingGoals.join("; ") || "none"}`,
    `Preferences: ${mem.preferences.join("; ") || "none"}`,
    `Active plan: ${mem.activePlan || "none"}`,
    `Last recommendation: ${mem.lastRecommendation || "none"}`,
  ];
  return lines.join("\n");
}
