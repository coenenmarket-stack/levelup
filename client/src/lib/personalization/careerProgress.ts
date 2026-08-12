/**
 * Career path progress — characters/{uid}/careerProgress/{pathId}
 */

import { doc, getDoc, getDocs, collection, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export type CareerPathProgress = {
  pathId: string;
  status: "saved" | "active" | "completed";
  completedMilestoneIds: string[];
  startedAt: string;
  updatedAt: string;
};

function progressRef(uid: string, pathId: string) {
  return doc(db, "characters", uid, "careerProgress", pathId);
}

export async function readPathProgress(
  uid: string,
  pathId: string,
): Promise<CareerPathProgress | null> {
  try {
    const snap = await getDoc(progressRef(uid, pathId));
    return snap.exists() ? (snap.data() as CareerPathProgress) : null;
  } catch {
    return null;
  }
}

export async function listPathProgress(uid: string): Promise<CareerPathProgress[]> {
  try {
    const snap = await getDocs(collection(db, "characters", uid, "careerProgress"));
    return snap.docs.map((d) => d.data() as CareerPathProgress);
  } catch {
    return [];
  }
}

export async function saveOrStartPath(
  uid: string,
  pathId: string,
  status: "saved" | "active",
): Promise<CareerPathProgress> {
  const existing = await readPathProgress(uid, pathId);
  const now = new Date().toISOString();
  const next: CareerPathProgress = {
    pathId,
    status,
    completedMilestoneIds: existing?.completedMilestoneIds ?? [],
    startedAt: existing?.startedAt ?? now,
    updatedAt: now,
  };
  await setDoc(progressRef(uid, pathId), next, { merge: true });
  return next;
}

export async function toggleMilestone(
  uid: string,
  pathId: string,
  milestoneId: string,
): Promise<CareerPathProgress> {
  const existing = await readPathProgress(uid, pathId);
  const now = new Date().toISOString();
  const set = new Set(existing?.completedMilestoneIds ?? []);
  if (set.has(milestoneId)) set.delete(milestoneId);
  else set.add(milestoneId);
  const next: CareerPathProgress = {
    pathId,
    status: existing?.status ?? "active",
    completedMilestoneIds: Array.from(set),
    startedAt: existing?.startedAt ?? now,
    updatedAt: now,
  };
  await setDoc(progressRef(uid, pathId), next, { merge: true });
  return next;
}
