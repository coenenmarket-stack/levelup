import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  DEFAULT_PERSONALIZATION,
  mergePrefs,
  type PersonalizationPrefs,
} from "./types";

export { mergePrefs, shouldShowSoftPersonalizePrompt } from "./types";

function prefsRef(uid: string) {
  return doc(db, "characters", uid, "personalization", "prefs");
}

/** Safe read for legacy accounts — never throws for missing docs. */
export async function readPersonalization(uid: string): Promise<PersonalizationPrefs> {
  try {
    const snap = await getDoc(prefsRef(uid));
    if (!snap.exists()) return { ...DEFAULT_PERSONALIZATION };
    return mergePrefs(snap.data() as Partial<PersonalizationPrefs>);
  } catch (e) {
    console.warn("readPersonalization failed", e);
    return { ...DEFAULT_PERSONALIZATION };
  }
}

export async function writePersonalization(
  uid: string,
  patch: Partial<PersonalizationPrefs>,
): Promise<PersonalizationPrefs> {
  const current = await readPersonalization(uid);
  const next = mergePrefs({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(prefsRef(uid), next, { merge: true });
  return next;
}
