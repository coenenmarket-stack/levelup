import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
  type DocumentReference,
  type Firestore,
} from "firebase/firestore";
import { db } from "./firebase";

/** Subcollections wiped on schema hard-reset / re-onboarding. */
export const CHARACTER_WIPE_SUBCOLLECTIONS = [
  "quests",
  "categories",
  "achievements",
  "rewards",
  "completions",
  "weeklyChallenges",
  "dailyPacks",
  "goals",
  "personalization",
  "careerProgress",
  "guideProgress",
  "coachMemory",
  "recFeedback",
  "notifications",
  "notificationMeta",
  // Keep devices — push tokens should survive re-onboard.
] as const;

const BATCH_LIMIT = 450;

async function deleteQueryInChunks(refs: DocumentReference[]): Promise<void> {
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const chunk = refs.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

/** Delete every document in a character subcollection (chunked for Firestore limits). */
export async function wipeCharacterSubcollection(
  uid: string,
  sub: string,
  firestore: Firestore = db,
): Promise<number> {
  const col = collection(firestore, "characters", uid, sub);
  const snap = await getDocs(col);
  if (snap.empty) return 0;
  await deleteQueryInChunks(snap.docs.map((d) => d.ref));
  return snap.size;
}

/**
 * Hard-reset wipe used by schema migration and re-onboarding.
 * Removes progression data so OSRS skill state cannot leak across resets.
 */
export async function wipeCharacterProgress(uid: string): Promise<void> {
  const charRef = doc(db, "characters", uid);
  for (const sub of CHARACTER_WIPE_SUBCOLLECTIONS) {
    await wipeCharacterSubcollection(uid, sub);
  }
  // publicProfiles is top-level — clear so friends don't see pre-reset levels.
  try {
    await deleteDoc(doc(db, "publicProfiles", uid));
  } catch {
    // May not exist yet.
  }
  try {
    await deleteDoc(charRef);
  } catch {
    // Caller may rewrite the character doc immediately after.
  }
}
