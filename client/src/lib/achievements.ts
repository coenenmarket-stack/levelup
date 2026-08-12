/**
 * Phase 2 achievement catalog + evaluation.
 * Single system — no parallel achievement store.
 * Achievements are cosmetic (no XP) to avoid a second XP path.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

export type AchievementTemplate = {
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  /** UI grouping */
  category: string | null;
  target: number;
};

/** ~36 high-signal achievements — not padded. */
export const ACHIEVEMENT_TEMPLATES: AchievementTemplate[] = [
  // Quest milestones
  { key: "first-quest", name: "First Step", description: "Complete your first quest", icon: "🌱", rarity: "common", category: "quests", target: 1 },
  { key: "10-quests", name: "Getting Started", description: "Complete 10 quests", icon: "⭐", rarity: "common", category: "quests", target: 10 },
  { key: "25-quests", name: "Committed", description: "Complete 25 quests", icon: "✨", rarity: "common", category: "quests", target: 25 },
  { key: "50-quests", name: "Habit Former", description: "Complete 50 quests", icon: "🎯", rarity: "rare", category: "quests", target: 50 },
  { key: "100-quests", name: "Centurion", description: "Complete 100 quests", icon: "💯", rarity: "rare", category: "quests", target: 100 },
  { key: "250-quests", name: "Dedicated", description: "Complete 250 quests", icon: "🏅", rarity: "epic", category: "quests", target: 250 },

  // Streak milestones
  { key: "streak-3", name: "Spark", description: "Reach a 3-day streak", icon: "🔥", rarity: "common", category: "streak", target: 3 },
  { key: "streak-7", name: "7 Day Streak", description: "Stay consistent for a week", icon: "🔥", rarity: "common", category: "streak", target: 7 },
  { key: "streak-14", name: "Two Weeks Strong", description: "Reach a 14-day streak", icon: "🔥", rarity: "rare", category: "streak", target: 14 },
  { key: "streak-30", name: "30 Day Streak", description: "A month of dedication", icon: "🔥", rarity: "rare", category: "streak", target: 30 },
  { key: "streak-60", name: "Unshakable", description: "Reach a 60-day streak", icon: "🔥", rarity: "epic", category: "streak", target: 60 },
  { key: "streak-100", name: "100 Day Streak", description: "Unbreakable habits", icon: "🔥", rarity: "legendary", category: "streak", target: 100 },

  // Skill — health
  { key: "first-workout", name: "First Workout", description: "Complete your first health quest", icon: "💪", rarity: "common", category: "health", target: 1 },
  { key: "10-workouts", name: "Gym Rat", description: "Complete 10 health quests", icon: "🏋️", rarity: "rare", category: "health", target: 10 },
  { key: "50-workouts", name: "Conditioned", description: "Complete 50 health quests", icon: "🥇", rarity: "epic", category: "health", target: 50 },

  // Skill — wealth (legacy finance counts)
  { key: "save-100", name: "Money Aware", description: "Complete 4 wealth quests", icon: "💵", rarity: "common", category: "wealth", target: 4 },
  { key: "save-1000", name: "Builder", description: "Complete 20 wealth quests", icon: "💰", rarity: "rare", category: "wealth", target: 20 },
  { key: "debt-crusher", name: "Wealth Engine", description: "Complete 50 wealth quests", icon: "⚒️", rarity: "epic", category: "wealth", target: 50 },

  // Skill — career
  { key: "first-cert", name: "Hard Mode Career", description: "Complete a hard career quest", icon: "🎓", rarity: "rare", category: "career", target: 1 },
  { key: "career-10", name: "Career Momentum", description: "Complete 10 career quests", icon: "📋", rarity: "common", category: "career", target: 10 },
  { key: "first-promo", name: "First Promotion", description: "Complete 25 career quests", icon: "📈", rarity: "epic", category: "career", target: 25 },

  // Skill — family
  { key: "family-5", name: "Present", description: "Complete 5 family quests", icon: "🤝", rarity: "common", category: "family", target: 5 },
  { key: "family-bonded", name: "Family Bonded", description: "Complete 25 family quests", icon: "❤️", rarity: "epic", category: "family", target: 25 },

  // Skill — mindset (legacy learning counts)
  { key: "mindset-10", name: "Clear Head", description: "Complete 10 mindset quests", icon: "🧠", rarity: "common", category: "mindset", target: 10 },
  { key: "scholar", name: "Scholar", description: "Complete 50 mindset quests", icon: "📚", rarity: "epic", category: "mindset", target: 50 },

  // Hustle proxy
  { key: "side-success", name: "Side Hustle Success", description: "Complete 25 wealth or career quests", icon: "🚀", rarity: "epic", category: "wealth", target: 25 },

  // Skill level milestones (OSRS-style 1–99)
  { key: "skill-any-5", name: "Skill Breakout", description: "Reach level 5 in any skill", icon: "📶", rarity: "common", category: "skills", target: 5 },
  { key: "skill-any-10", name: "Skill Specialist", description: "Reach level 10 in any skill", icon: "📡", rarity: "rare", category: "skills", target: 10 },
  { key: "skill-any-50", name: "Halfway There", description: "Reach level 50 in any skill", icon: "⛰️", rarity: "epic", category: "skills", target: 50 },
  { key: "skill-any-92", name: "Almost Cape", description: "Reach level 92 in any skill", icon: "🔥", rarity: "epic", category: "skills", target: 92 },
  { key: "skill-any-99", name: "Skill Mastery", description: "Reach level 99 in any skill — the grind cape", icon: "🧥", rarity: "legendary", category: "skills", target: 99 },
  { key: "balanced-3", name: "Balanced Foundation", description: "Reach level 3 in all five skills", icon: "⚖️", rarity: "rare", category: "skills", target: 3 },
  { key: "balanced-5", name: "Five Pillars", description: "Reach level 5 in all five skills", icon: "🏛️", rarity: "epic", category: "skills", target: 5 },
  { key: "balanced-50", name: "Well Rounded", description: "Reach level 50 in all five skills", icon: "🌟", rarity: "legendary", category: "skills", target: 50 },

  // Breadth
  { key: "all-five-skills", name: "Full Spectrum", description: "Complete quests in all five skills", icon: "🌈", rarity: "rare", category: "skills", target: 5 },

  // Weekly challenges
  { key: "weekly-1", name: "Week One", description: "Claim your first weekly challenge reward", icon: "📅", rarity: "common", category: "weekly", target: 1 },
  { key: "weekly-5", name: "Weekly Warrior", description: "Claim 5 weekly challenge rewards", icon: "🗓️", rarity: "rare", category: "weekly", target: 5 },
  { key: "weekly-10", name: "Seasoned Challenger", description: "Claim 10 weekly challenge rewards", icon: "🏆", rarity: "epic", category: "weekly", target: 10 },
  { key: "weekly-sweep", name: "Clean Sweep", description: "Claim all 3 weekly challenges in one week", icon: "🧹", rarity: "epic", category: "weekly", target: 3 },

  // Hero level
  { key: "level-5", name: "Rising Hero", description: "Reach level 5", icon: "🆙", rarity: "common", category: "hero", target: 5 },
  { key: "level-10", name: "Seasoned Adventurer", description: "Reach level 10", icon: "⚔️", rarity: "rare", category: "hero", target: 10 },
  { key: "level-25", name: "Champion", description: "Reach level 25", icon: "👑", rarity: "epic", category: "hero", target: 25 },
  { key: "level-50", name: "Legend", description: "Reach level 50", icon: "🏆", rarity: "legendary", category: "hero", target: 50 },

  // Social (Phase 4) — cosmetic
  { key: "first-friend", name: "First Friend", description: "Accept or add your first friend", icon: "👋", rarity: "common", category: "social", target: 1 },
  { key: "accountability-partner", name: "Accountability Partner", description: "Have 3 accepted friends", icon: "🤝", rarity: "rare", category: "social", target: 3 },
  { key: "first-shared-challenge", name: "First Shared Challenge", description: "Complete a shared friend challenge", icon: "🎯", rarity: "common", category: "social", target: 1 },
  { key: "five-shared-challenges", name: "Challenge Duo", description: "Complete 5 shared challenges", icon: "🏅", rarity: "rare", category: "social", target: 5 },
  { key: "party-founder", name: "Party Founder", description: "Create a party", icon: "🚩", rarity: "common", category: "social", target: 1 },
  { key: "team-player", name: "Team Player", description: "Complete a party challenge", icon: "🧱", rarity: "rare", category: "social", target: 1 },
  { key: "referral-first", name: "First Referral", description: "Activate your first successful referral", icon: "🌱", rarity: "common", category: "social", target: 1 },
  { key: "referral-builder", name: "Referral Builder", description: "Activate 3 successful referrals", icon: "🌿", rarity: "rare", category: "social", target: 3 },
  { key: "referral-advocate", name: "Referral Advocate", description: "Activate 5 successful referrals", icon: "🌳", rarity: "epic", category: "social", target: 5 },
  { key: "referral-legend", name: "Referral Legend", description: "Activate 10 successful referrals", icon: "🏆", rarity: "rare", category: "social", target: 10 },
];

const SKILL_KEYS = ["health", "wealth", "career", "family", "mindset"] as const;

function nowISO() {
  return new Date().toISOString();
}

function countCategory(comps: any[], ...keys: string[]) {
  const set = new Set(keys);
  return comps.filter((c) => set.has(String(c.category))).length;
}

function isWeeklyClaim(c: any) {
  return c.kind === "weeklyChallenge";
}

/** Seed any missing achievement templates for existing users (idempotent). */
export async function ensureAchievementDocs(uid: string): Promise<void> {
  const col = collection(db, "characters", uid, "achievements");
  const snap = await getDocs(col);
  const have = new Set(snap.docs.map((d) => d.id));
  const missing = ACHIEVEMENT_TEMPLATES.filter((t) => !have.has(t.key));
  if (!missing.length) return;
  // Firestore batches max 500; we have < 50
  const batch = writeBatch(db);
  for (const a of missing) {
    batch.set(doc(col, a.key), {
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon,
      rarity: a.rarity,
      category: a.category,
      unlocked: false,
      unlockedAt: null,
      progress: 0,
      target: a.target,
    });
  }
  await batch.commit();
}

export type EvalContext = {
  allComps: any[];
  character: any;
  categoryLevels: Record<string, number>;
  /** Phase 4 social counters (optional — defaults to 0) */
  social?: {
    friendCount?: number;
    sharedChallengesCompleted?: number;
    partiesCreated?: number;
    partyChallengesCompleted?: number;
    referralsActivated?: number;
  };
};

export function progressForAchievement(key: string, ctx: EvalContext): number {
  const questComps = ctx.allComps.filter((c) => !isWeeklyClaim(c));
  const weeklyClaims = ctx.allComps.filter(isWeeklyClaim);
  const levels = ctx.categoryLevels;
  const maxSkill = Math.max(0, ...SKILL_KEYS.map((k) => levels[k] ?? 1));
  const minSkill = Math.min(...SKILL_KEYS.map((k) => levels[k] ?? 1));
  const skillsTouched = new Set(
    questComps.map((c) => String(c.category)).filter((k) => (SKILL_KEYS as readonly string[]).includes(k)
      || k === "finance" || k === "learning" || k === "hustle"),
  );
  // Normalize legacy → modern for breadth
  const modernSkills = new Set<string>();
  for (const k of Array.from(skillsTouched)) {
    if (k === "finance") modernSkills.add("wealth");
    else if (k === "learning") modernSkills.add("mindset");
    else if (k === "hustle") {
      modernSkills.add("wealth");
      modernSkills.add("career");
    } else modernSkills.add(k);
  }

  switch (key) {
    case "first-quest":
    case "10-quests":
    case "25-quests":
    case "50-quests":
    case "100-quests":
    case "250-quests":
      return questComps.length;
    case "streak-3":
    case "streak-7":
    case "streak-14":
    case "streak-30":
    case "streak-60":
    case "streak-100":
      return ctx.character.longestStreak ?? 0;
    case "first-workout":
    case "10-workouts":
    case "50-workouts":
    case "100-workouts":
      return countCategory(questComps, "health");
    case "save-100":
    case "save-1000":
    case "debt-crusher":
      return countCategory(questComps, "wealth", "finance");
    case "first-cert":
      return questComps.filter((c) => c.category === "career" && c.difficulty === "hard").length;
    case "career-10":
    case "first-promo":
      return countCategory(questComps, "career");
    case "family-5":
    case "family-bonded":
      return countCategory(questComps, "family");
    case "mindset-10":
    case "scholar":
      return countCategory(questComps, "mindset", "learning");
    case "side-success":
      return countCategory(questComps, "wealth", "career", "finance", "hustle");
    case "skill-any-5":
    case "skill-any-10":
    case "skill-any-50":
    case "skill-any-92":
    case "skill-any-99":
      return maxSkill;
    case "balanced-3":
    case "balanced-5":
    case "balanced-50":
      return minSkill;
    case "all-five-skills":
      return modernSkills.size;
    case "weekly-1":
    case "weekly-5":
    case "weekly-10":
      return weeklyClaims.length;
    case "weekly-sweep": {
      const byWeek: Record<string, number> = {};
      for (const c of weeklyClaims) {
        const w = String(c.weekId ?? "unknown");
        byWeek[w] = (byWeek[w] ?? 0) + 1;
      }
      return Math.max(0, ...Object.values(byWeek), 0);
    }
    case "level-5":
    case "level-10":
    case "level-25":
    case "level-50":
      return ctx.character.level ?? 1;
    case "first-friend":
    case "accountability-partner":
      return ctx.social?.friendCount ?? 0;
    case "first-shared-challenge":
    case "five-shared-challenges":
      return ctx.social?.sharedChallengesCompleted ?? 0;
    case "party-founder":
      return ctx.social?.partiesCreated ?? 0;
    case "team-player":
      return ctx.social?.partyChallengesCompleted ?? 0;
    case "referral-first":
    case "referral-builder":
    case "referral-advocate":
    case "referral-legend":
      return ctx.social?.referralsActivated ?? 0;
    default:
      return 0;
  }
}

/** Evaluate + unlock achievements. Returns newly unlocked docs. No XP awards. */
export async function evaluateAchievements(
  uid: string,
  ctx: EvalContext,
): Promise<any[]> {
  await ensureAchievementDocs(uid);
  const snap = await getDocs(collection(db, "characters", uid, "achievements"));
  const newlyUnlocked: any[] = [];
  const batch = writeBatch(db);
  let writes = 0;

  for (const aDoc of snap.docs) {
    const a: any = aDoc.data();
    const template = ACHIEVEMENT_TEMPLATES.find((t) => t.key === a.key);
    const target = a.target ?? template?.target ?? 1;
    const progress = progressForAchievement(a.key, ctx);
    const shouldUnlock = !a.unlocked && progress >= target;
    const namePatch = template && (a.name !== template.name || a.description !== template.description)
      ? { name: template.name, description: template.description, category: template.category, rarity: template.rarity, icon: template.icon }
      : {};
    if (progress !== a.progress || shouldUnlock || Object.keys(namePatch).length) {
      batch.update(aDoc.ref, {
        progress,
        target,
        ...namePatch,
        unlocked: shouldUnlock ? true : a.unlocked,
        unlockedAt: shouldUnlock ? nowISO() : a.unlockedAt,
      });
      writes++;
      if (shouldUnlock) {
        newlyUnlocked.push({
          id: aDoc.id,
          ...a,
          ...namePatch,
          progress,
          target,
          unlocked: true,
          unlockedAt: nowISO(),
        });
      }
    }
  }
  if (writes) await batch.commit();
  return newlyUnlocked;
}

/** Showcase top unlocked achievements for public profile (max 3). */
export async function topUnlockedAchievementKeys(uid: string, limit = 3): Promise<string[]> {
  const snap = await getDocs(collection(db, "characters", uid, "achievements"));
  const unlocked = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((a) => a.unlocked)
    .sort((a, b) => String(b.unlockedAt ?? "").localeCompare(String(a.unlockedAt ?? "")));
  return unlocked.slice(0, limit).map((a) => a.key);
}

export async function seedAchievementsOnOnboarding(uid: string): Promise<void> {
  for (const a of ACHIEVEMENT_TEMPLATES) {
    await setDoc(doc(db, "characters", uid, "achievements", a.key), {
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon,
      rarity: a.rarity,
      category: a.category,
      unlocked: false,
      unlockedAt: null,
      progress: 0,
      target: a.target,
    });
  }
}
