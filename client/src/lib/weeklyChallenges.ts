/**
 * Weekly challenges — local ISO week, claim-once XP via deterministic completion docs.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { dayKeyLocal, isoWeekBoundsLocal, isoWeekIdLocal } from "./dayKey";
import { streakXpMultiplier } from "./streak";
import { XP_TO_NEXT_LEVEL, titleForLevel } from "@shared/schema";
import { evaluateAchievements } from "./achievements";

export type WeeklyChallengeDef = {
  key: string;
  title: string;
  description: string;
  target: number;
  xpReward: number;
  metric: "quests" | "dailyPack" | "skills";
};

export type WeeklyChallengeProgress = WeeklyChallengeDef & {
  progress: number;
  completed: boolean;
  rewardClaimed: boolean;
};

export type WeeklyChallengeState = {
  weekId: string;
  weekStart: string;
  weekEnd: string;
  challenges: WeeklyChallengeProgress[];
};

export const WEEKLY_CHALLENGE_DEFS: WeeklyChallengeDef[] = [
  {
    key: "week-quests-5",
    title: "Five Wins",
    description: "Complete 5 quests this week",
    target: 5,
    xpReward: 50,
    metric: "quests",
  },
  {
    key: "week-daily-3",
    title: "Daily Discipline",
    description: "Complete 3 daily missions this week",
    target: 3,
    xpReward: 40,
    metric: "dailyPack",
  },
  {
    key: "week-skills-3",
    title: "Balanced Hero",
    description: "Complete quests in 3 different skills",
    target: 3,
    xpReward: 60,
    metric: "skills",
  },
];

function challengeDocRef(uid: string, weekId: string) {
  return doc(db, "characters", uid, "weeklyChallenges", weekId);
}

function rewardClaimDocId(weekId: string, challengeKey: string) {
  return `weekly_${weekId}_${challengeKey}`;
}

async function computeMetrics(uid: string, weekStart: string, weekEnd: string) {
  const snap = await getDocs(
    query(
      collection(db, "characters", uid, "completions"),
      where("completionDate", ">=", weekStart),
      where("completionDate", "<=", weekEnd),
    ),
  );
  let quests = 0;
  let dailyPack = 0;
  const skills = new Set<string>();
  snap.forEach((d) => {
    const c = d.data() as any;
    if (c.kind === "weeklyChallenge") return;
    quests += 1;
    if (c.category) skills.add(String(c.category));
    if (String(c.questId ?? "").startsWith("pack_")) dailyPack += 1;
  });
  return { quests, dailyPack, skills: skills.size };
}

function progressFor(
  def: WeeklyChallengeDef,
  metrics: { quests: number; dailyPack: number; skills: number },
): number {
  if (def.metric === "quests") return metrics.quests;
  if (def.metric === "dailyPack") return metrics.dailyPack;
  return metrics.skills;
}

/** Ensure week doc exists and progress mirrors completion log. Safe for existing users. */
export async function ensureWeeklyChallenges(uid: string): Promise<WeeklyChallengeState> {
  const weekId = isoWeekIdLocal();
  const { start, end } = isoWeekBoundsLocal(weekId);
  const ref = challengeDocRef(uid, weekId);
  const metrics = await computeMetrics(uid, start, end);
  const existing = await getDoc(ref);
  const claimed: Record<string, boolean> = existing.exists()
    ? ((existing.data() as any).claimed ?? {})
    : {};

  const challenges: WeeklyChallengeProgress[] = WEEKLY_CHALLENGE_DEFS.map((def) => {
    const progress = Math.min(def.target, progressFor(def, metrics));
    return {
      ...def,
      progress,
      completed: progress >= def.target,
      rewardClaimed: !!claimed[def.key],
    };
  });

  await setDoc(
    ref,
    {
      weekId,
      weekStart: start,
      weekEnd: end,
      claimed,
      progress: Object.fromEntries(challenges.map((c) => [c.key, c.progress])),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  return { weekId, weekStart: start, weekEnd: end, challenges };
}

/**
 * Claim weekly challenge XP once. Uses deterministic completion doc to block duplicates.
 */
export async function claimWeeklyChallengeReward(
  uid: string,
  challengeKey: string,
): Promise<{ xpEarned: number; character: any }> {
  const weekId = isoWeekIdLocal();
  const state = await ensureWeeklyChallenges(uid);
  const challenge = state.challenges.find((c) => c.key === challengeKey);
  if (!challenge) throw new Error("Challenge not found");
  if (!challenge.completed) throw new Error("Challenge not complete yet");
  if (challenge.rewardClaimed) throw new Error("Reward already claimed");

  const charRef = doc(db, "characters", uid);
  const claimRef = doc(db, "characters", uid, "completions", rewardClaimDocId(weekId, challengeKey));
  const weekRef = challengeDocRef(uid, weekId);
  const today = dayKeyLocal();

  const charSnap = await getDoc(charRef);
  if (!charSnap.exists()) throw new Error("Character not found");
  const char: any = charSnap.data();

  const streakMult = streakXpMultiplier(char.currentStreak ?? 0);
  const baseXp = challenge.xpReward;
  const awardedXp = Math.max(1, Math.round(baseXp * streakMult));

  await runTransaction(db, async (tx) => {
    const existingClaim = await tx.get(claimRef);
    if (existingClaim.exists()) throw new Error("Reward already claimed");
    const weekSnap = await tx.get(weekRef);
    const claimed = weekSnap.exists() ? { ...((weekSnap.data() as any).claimed ?? {}) } : {};
    if (claimed[challengeKey]) throw new Error("Reward already claimed");

    claimed[challengeKey] = true;
    tx.set(claimRef, {
      questId: rewardClaimDocId(weekId, challengeKey),
      questTitle: `Weekly: ${challenge.title}`,
      category: "mindset",
      difficulty: "medium",
      xpReward: awardedXp,
      completedAt: new Date().toISOString(),
      completionDate: today,
      kind: "weeklyChallenge",
      weekId,
      challengeKey,
    });
    tx.set(weekRef, { claimed, updatedAt: new Date().toISOString() }, { merge: true });

    let xp = (char.xp ?? 0) + awardedXp;
    let level = char.level ?? 1;
    while (xp >= XP_TO_NEXT_LEVEL(level)) {
      xp -= XP_TO_NEXT_LEVEL(level);
      level++;
    }
    tx.update(charRef, {
      xp,
      level,
      title: titleForLevel(level),
      totalXp: (char.totalXp ?? 0) + awardedXp,
      spendableXp: (char.spendableXp ?? 0) + awardedXp,
    });
  });

  // Refresh weekly achievements after claim
  try {
    const comps = await getDocs(collection(db, "characters", uid, "completions"));
    const cats = await getDocs(collection(db, "characters", uid, "categories"));
    const categoryLevels: Record<string, number> = {};
    cats.forEach((d) => {
      const c: any = d.data();
      if (c.key) categoryLevels[c.key] = c.level ?? 1;
    });
    const updated = await getDoc(charRef);
    await evaluateAchievements(uid, {
      allComps: comps.docs.map((d) => d.data()),
      character: updated.data(),
      categoryLevels,
    });
  } catch (e) {
    console.warn("achievement eval after weekly claim failed", e);
  }

  const updated = await getDoc(charRef);
  const character: any = { id: uid, userId: uid, ...updated.data() };
  character.xpToNext = XP_TO_NEXT_LEVEL(character.level);
  try {
    character.goals = JSON.parse(character.goalsJson || "[]");
  } catch {
    character.goals = [];
  }
  return { xpEarned: awardedXp, character };
}

export async function syncWeeklyChallengeProgress(uid: string): Promise<void> {
  try {
    await ensureWeeklyChallenges(uid);
  } catch (e) {
    console.warn("weekly challenge sync failed", e);
  }
}
