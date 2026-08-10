/**
 * Lightweight recommendation feedback — characters/{uid}/recFeedback/{entityId}
 */

import { doc, getDoc, getDocs, collection, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export type FeedbackKind = "not_interested" | "show_less" | "saved" | "started";

export type RecFeedback = {
  entityId: string;
  entityType: "quest" | "certification" | "side_hustle" | "career_path";
  kind: FeedbackKind;
  updatedAt: string;
};

function feedbackCol(uid: string) {
  return collection(db, "characters", uid, "recFeedback");
}

export async function readAllFeedback(uid: string): Promise<RecFeedback[]> {
  try {
    const snap = await getDocs(feedbackCol(uid));
    return snap.docs.map((d) => d.data() as RecFeedback);
  } catch (e) {
    console.warn("readAllFeedback failed", e);
    return [];
  }
}

export async function writeFeedback(
  uid: string,
  fb: Omit<RecFeedback, "updatedAt">,
): Promise<void> {
  const payload: RecFeedback = { ...fb, updatedAt: new Date().toISOString() };
  await setDoc(doc(db, "characters", uid, "recFeedback", fb.entityId), payload, { merge: true });
}

export function feedbackToPenalties(list: RecFeedback[]): {
  penalties: Record<string, number>;
  dismissedIds: Set<string>;
} {
  const penalties: Record<string, number> = {};
  const dismissedIds = new Set<string>();
  for (const f of list) {
    if (f.kind === "not_interested") {
      dismissedIds.add(f.entityId);
      penalties[f.entityId] = 1;
    } else if (f.kind === "show_less") {
      penalties[f.entityId] = 0.55;
    }
  }
  return { penalties, dismissedIds };
}

export async function readFeedback(uid: string, entityId: string): Promise<RecFeedback | null> {
  try {
    const snap = await getDoc(doc(db, "characters", uid, "recFeedback", entityId));
    return snap.exists() ? (snap.data() as RecFeedback) : null;
  } catch {
    return null;
  }
}
