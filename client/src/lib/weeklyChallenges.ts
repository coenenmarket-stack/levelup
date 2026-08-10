/**
 * Weekly challenges — meta goals over the ISO week, rewarded once via
 * the same XP fields as quests (no second XP system).
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
import { dayKeyUtc, streakXpMultiplier } from "./streak";
import { XP_TO_NEXT_LEVEL, titleForLevel } from "@shared/schema";

export type WeeklyChallengeDef = {
  key: string;
  title: string;
  description: string;
  target: number;
  /** Base XP awarded once when claimed (then streak mult applied). */
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

/** ISO week id YYYY-Www (UTC). */
export function isoWeekId(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Thursday in current week decides the year.
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function isoWeekBounds(weekId: string): { start: string; end: string } {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekId);
  if (!m) {
    const today = dayKeyUtc();
    return { start: today, end: today };
  }
  const year = Number(m[1]);
  const week = Number(m[2]);
  // ISO week 1 is the week with Jan 4th
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

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
    // Weekly reward claims are completions too — exclude from quest metrics.
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
  const weekId = isoWeekId();
  const { start, end } = isoWeekBounds(weekId);
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
 * Awards into the same character XP fields as quests.
 */
export async function claimWeeklyChallengeReward(
  uid: string,
  challengeKey: string,
): Promise<{ xpEarned: number; character: any }> {
  const weekId = isoWeekId();
  const state = await ensureWeeklyChallenges(uid);
  const challenge = state.challenges.find((c) => c.key === challengeKey);
  if (!challenge) throw new Error("Challenge not found");
  if (!challenge.completed) throw new Error("Challenge not complete yet");
  if (challenge.rewardClaimed) throw new Error("Reward already claimed");

  const charRef = doc(db, "characters", uid);
  const claimRef = doc(db, "characters", uid, "completions", rewardClaimDocId(weekId, challengeKey));
  const weekRef = challengeDocRef(uid, weekId);
  const today = dayKeyUtc();

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

/** Best-effort progress refresh after a quest completion (no reward auto-claim). */
export async function syncWeeklyChallengeProgress(uid: string): Promise<void> {
  try {
    await ensureWeeklyChallenges(uid);
  } catch (e) {
    console.warn("weekly challenge sync failed", e);
  }
}
