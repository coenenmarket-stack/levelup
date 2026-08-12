/**
 * Lightweight user goals — characters/{uid}/goals/{goalId}
 * Private (owner-only via character subcollection rules).
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export type GoalType =
  | "skill"
  | "career_path"
  | "certification"
  | "side_hustle"
  | "quest"
  | "custom";

export type GoalStatus = "active" | "completed" | "abandoned";

export type UserGoal = {
  id: string;
  title: string;
  type: GoalType;
  target: string | null;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
  targetDate: string | null;
  relatedEntityId: string | null;
  /** Manual progress 0–100 for custom goals */
  manualProgress: number;
};

function goalsCol(uid: string) {
  return collection(db, "characters", uid, "goals");
}

export async function listGoals(uid: string): Promise<UserGoal[]> {
  try {
    const snap = await getDocs(goalsCol(uid));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<UserGoal, "id">) }))
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  } catch (e) {
    console.warn("listGoals failed", e);
    return [];
  }
}

export async function upsertGoal(
  uid: string,
  goal: Partial<UserGoal> & { title: string; type: GoalType },
): Promise<UserGoal> {
  const id = goal.id ?? `goal_${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const title = String(goal.title).trim().slice(0, 120);
  if (!title) throw new Error("Goal title required");
  const next: UserGoal = {
    id,
    title,
    type: goal.type,
    target: goal.target ? String(goal.target).slice(0, 160) : null,
    status: goal.status ?? "active",
    createdAt: goal.createdAt ?? now,
    updatedAt: now,
    targetDate: goal.targetDate ?? null,
    relatedEntityId: goal.relatedEntityId ?? null,
    manualProgress: Math.min(100, Math.max(0, goal.manualProgress ?? 0)),
  };
  await setDoc(doc(db, "characters", uid, "goals", id), next, { merge: true });
  return next;
}

export async function deleteGoal(uid: string, goalId: string): Promise<void> {
  await deleteDoc(doc(db, "characters", uid, "goals", goalId));
}

/**
 * Auto progress where measurable. Custom goals use manualProgress.
 */
export function computeGoalProgress(
  goal: UserGoal,
  ctx: {
    pathMilestoneDone?: number;
    pathMilestoneTotal?: number;
    certMilestonesDone?: number;
    certMilestonesTotal?: number;
    skillLevel?: number;
    skillTargetLevel?: number;
    questsCompleted?: number;
    questTarget?: number;
  },
): number {
  if (goal.status === "completed") return 100;
  if (goal.type === "custom") return Math.min(100, Math.max(0, goal.manualProgress));
  if (goal.type === "career_path" && ctx.pathMilestoneTotal) {
    return Math.round(((ctx.pathMilestoneDone ?? 0) / ctx.pathMilestoneTotal) * 100);
  }
  if (goal.type === "certification" && ctx.certMilestonesTotal) {
    return Math.round(((ctx.certMilestonesDone ?? 0) / ctx.certMilestonesTotal) * 100);
  }
  if (goal.type === "skill" && ctx.skillTargetLevel) {
    return Math.min(100, Math.round(((ctx.skillLevel ?? 1) / ctx.skillTargetLevel) * 100));
  }
  if (goal.type === "quest" && ctx.questTarget) {
    return Math.min(100, Math.round(((ctx.questsCompleted ?? 0) / ctx.questTarget) * 100));
  }
  if (goal.type === "side_hustle") {
    return Math.min(100, goal.manualProgress);
  }
  return Math.min(100, goal.manualProgress);
}
