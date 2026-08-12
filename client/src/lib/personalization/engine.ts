/**
 * Deterministic personalization ranking engine.
 * No AI required — tunable weights, explainable reasons.
 */

import type { QuestCatalogItem } from "../questCatalog/types";
import type { Certification } from "../certifications";
import type { SideHustle } from "../sideHustles";
import type { CareerPath } from "../careerPaths";
import {
  goalToSkills,
  type PersonalizationPrefs,
  type ScoredRecommendation,
  type SkillGoalKey,
} from "./types";

export const SCORE_WEIGHTS = {
  primaryGoal: 40,
  secondaryGoal: 18,
  weakSkill: 22,
  careerInterest: 16,
  difficultyMatch: 10,
  timeMatch: 8,
  recentPenalty: 25,
  feedbackPenalty: 40,
  certInterestBoost: 12,
  hustleInterestBoost: 12,
  pathSkillMatch: 20,
} as const;

export type EngineContext = {
  prefs: PersonalizationPrefs;
  categoryLevels: Record<string, number>;
  /** Catalog IDs completed or shown recently */
  recentCatalogIds?: Set<string>;
  /** Feedback penalties: entityId → penalty strength 0..1 */
  feedbackPenalties?: Record<string, number>;
  dismissedIds?: Set<string>;
};

function skillRankOrder(levels: Record<string, number>): string[] {
  const keys = ["health", "wealth", "career", "family", "mindset"];
  return [...keys].sort(
    (a, b) => (levels[a] ?? 1) - (levels[b] ?? 1) || a.localeCompare(b),
  );
}

function difficultyFit(diff: string, intensity: PersonalizationPrefs["challengeIntensity"]): number {
  if (intensity === "easy") return diff === "easy" ? 1 : diff === "medium" ? 0.4 : 0;
  if (intensity === "push") return diff === "hard" ? 1 : diff === "medium" ? 0.7 : 0.3;
  return diff === "medium" ? 1 : 0.6;
}

function timeFitXp(xp: number, commitment: PersonalizationPrefs["dailyTimeCommitment"]): number {
  // Rough: easy 10xp ~5–10m, medium 25 ~15–25m, hard 50 ~30+m
  if (commitment === "5") return xp <= 10 ? 1 : xp <= 25 ? 0.3 : 0;
  if (commitment === "15") return xp <= 25 ? 1 : 0.5;
  if (commitment === "30") return xp <= 50 ? 1 : 0.7;
  return 1;
}

function pushReason(reasons: string[], text: string) {
  if (reasons.length < 3 && !reasons.includes(text)) reasons.push(text);
}

const ROLE_STOP = new Set([
  "a", "an", "the", "and", "or", "of", "in", "to", "for", "at", "on", "my", "i",
]);

/** Normalize free-text role for fuzzy path matching (no exact-string fragility). */
export function normalizeRoleText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function roleTokens(input: string): string[] {
  return normalizeRoleText(input)
    .split(" ")
    .filter((t) => t.length > 2 && !ROLE_STOP.has(t));
}

/** True when free-text role meaningfully overlaps a catalog role label. */
export function rolesLooselyMatch(userRole: string, catalogRole: string): boolean {
  const a = normalizeRoleText(userRole);
  const b = normalizeRoleText(catalogRole);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const ta = new Set(roleTokens(a));
  const tb = roleTokens(b);
  if (ta.size === 0 || tb.length === 0) return false;
  const overlap = tb.filter((t) => ta.has(t)).length;
  if (overlap >= 2) return true;
  if (overlap === 1 && (ta.size <= 2 || tb.length <= 2)) return true;
  return false;
}

export function scoreQuest(
  quest: QuestCatalogItem,
  ctx: EngineContext,
): ScoredRecommendation<QuestCatalogItem> {
  const reasons: string[] = [];
  let score = 0;
  const prefs = ctx.prefs;
  const weak = skillRankOrder(ctx.categoryLevels);
  const primarySkills = prefs.primaryGoal ? goalToSkills(prefs.primaryGoal) : [];
  const secondarySkills = prefs.secondaryGoals.flatMap(goalToSkills);

  if (primarySkills.includes(quest.category as any)) {
    score += SCORE_WEIGHTS.primaryGoal;
    pushReason(reasons, "Recommended because this matches your primary focus.");
  } else if (secondarySkills.includes(quest.category as any)) {
    score += SCORE_WEIGHTS.secondaryGoal;
    pushReason(reasons, "Supports one of your secondary goals.");
  }

  const weakIdx = weak.indexOf(quest.category);
  if (weakIdx === 0) {
    score += SCORE_WEIGHTS.weakSkill;
    pushReason(reasons, "Good next step for your lowest skill.");
  } else if (weakIdx === 1) {
    score += SCORE_WEIGHTS.weakSkill * 0.6;
  } else if (weakIdx === 2) {
    score += SCORE_WEIGHTS.weakSkill * 0.3;
  }

  score += SCORE_WEIGHTS.difficultyMatch * difficultyFit(quest.difficulty, prefs.challengeIntensity);
  if (difficultyFit(quest.difficulty, prefs.challengeIntensity) >= 0.9) {
    pushReason(reasons, "Fits your preferred challenge level.");
  }

  score += SCORE_WEIGHTS.timeMatch * timeFitXp(quest.xpReward, prefs.dailyTimeCommitment);
  if (timeFitXp(quest.xpReward, prefs.dailyTimeCommitment) >= 0.9) {
    pushReason(reasons, `Fits your ${prefs.dailyTimeCommitment}-minute daily goal.`);
  }

  if (ctx.recentCatalogIds?.has(quest.id)) {
    score -= SCORE_WEIGHTS.recentPenalty;
  }
  const fb = ctx.feedbackPenalties?.[quest.id] ?? 0;
  if (fb > 0) score -= SCORE_WEIGHTS.feedbackPenalty * fb;
  if (ctx.dismissedIds?.has(quest.id)) score -= SCORE_WEIGHTS.feedbackPenalty;

  if (reasons.length === 0) pushReason(reasons, "Builds a skill on your board.");

  return { item: quest, score, reasons };
}

const CERT_CATEGORY_TO_INTEREST: Record<string, string[]> = {
  Tech: ["technology"],
  Business: ["business", "management", "sales", "entrepreneurship"],
  Trades: ["trades", "maintenance"],
  Finance: ["business", "sales"],
  Creative: ["business", "entrepreneurship"],
  Health: ["healthcare"],
};

export function scoreCertification(
  cert: Certification,
  ctx: EngineContext,
): ScoredRecommendation<Certification> {
  const reasons: string[] = [];
  let score = 0;
  const prefs = ctx.prefs;

  if (prefs.certificationInterest === "no") {
    return { item: cert, score: -100, reasons: ["Hidden — certification interest is off."] };
  }
  if (prefs.certificationInterest === "yes") {
    score += SCORE_WEIGHTS.certInterestBoost;
    pushReason(reasons, "You asked for certification recommendations.");
  }

  const interests = new Set(prefs.careerInterests.map(String));
  const mapped = CERT_CATEGORY_TO_INTEREST[cert.category] ?? [];
  if (mapped.some((m) => interests.has(m))) {
    score += SCORE_WEIGHTS.careerInterest;
    pushReason(reasons, `Matches your interest in ${cert.category.toLowerCase()}.`);
  }

  const primarySkills = prefs.primaryGoal ? goalToSkills(prefs.primaryGoal) : [];
  if (cert.relatedSkills?.some((s) => primarySkills.includes(s as any))) {
    score += SCORE_WEIGHTS.primaryGoal * 0.5;
    pushReason(reasons, "Aligns with your primary focus skills.");
  }

  const weak = skillRankOrder(ctx.categoryLevels);
  if (cert.relatedSkills?.includes(weak[0] as any)) {
    score += SCORE_WEIGHTS.weakSkill * 0.5;
    pushReason(reasons, "Supports your lowest skill area.");
  }

  if (ctx.dismissedIds?.has(cert.id)) score -= SCORE_WEIGHTS.feedbackPenalty;
  if (reasons.length === 0) pushReason(reasons, "A practical credential to explore.");

  return { item: cert, score, reasons };
}

const HUSTLE_CATEGORY_TO_INTEREST: Record<string, string[]> = {
  Reseller: ["entrepreneurship", "business", "sales"],
  "Digital Products": ["technology", "entrepreneurship", "business"],
  Content: ["sales", "entrepreneurship", "business"],
  Services: ["trades", "maintenance", "business", "entrepreneurship"],
  Local: ["trades", "maintenance", "hospitality", "entrepreneurship"],
  Tech: ["technology", "entrepreneurship"],
};

export function scoreSideHustle(
  hustle: SideHustle,
  ctx: EngineContext,
): ScoredRecommendation<SideHustle> {
  const reasons: string[] = [];
  let score = 0;
  const prefs = ctx.prefs;

  if (prefs.incomeInterest === "not_now") {
    return { item: hustle, score: -50, reasons: ["Hidden — income interest is off for now."] };
  }
  if (prefs.incomeInterest === "side_hustles" || prefs.incomeInterest === "both") {
    score += SCORE_WEIGHTS.hustleInterestBoost;
    pushReason(reasons, "Fits your interest in earning extra income.");
  }

  const interests = new Set(prefs.careerInterests.map(String));
  const mapped = HUSTLE_CATEGORY_TO_INTEREST[hustle.category] ?? [];
  if (mapped.some((m) => interests.has(m))) {
    score += SCORE_WEIGHTS.careerInterest;
    pushReason(reasons, "Matches skills and interests you’re building.");
  }

  const primarySkills = prefs.primaryGoal ? goalToSkills(prefs.primaryGoal) : [];
  if (hustle.relatedSkills?.some((s) => primarySkills.includes(s as any))) {
    score += SCORE_WEIGHTS.primaryGoal * 0.4;
    pushReason(reasons, "Uses skills tied to your primary focus.");
  }

  // Time: lower startup intensity for short daily commitment
  if (prefs.dailyTimeCommitment === "5" || prefs.dailyTimeCommitment === "15") {
    if (hustle.skillLevel === "Beginner") score += 6;
    pushReason(reasons, "Matches your available time.");
  }

  if (ctx.dismissedIds?.has(hustle.id)) score -= SCORE_WEIGHTS.feedbackPenalty;
  if (reasons.length === 0) pushReason(reasons, "A practical way to practice earning skills.");

  return { item: hustle, score, reasons };
}

export function scoreCareerPath(
  path: CareerPath,
  ctx: EngineContext,
): ScoredRecommendation<CareerPath> {
  const reasons: string[] = [];
  let score = 0;
  const prefs = ctx.prefs;
  const interests = new Set(prefs.careerInterests);

  if (path.careerInterests.some((i) => interests.has(i))) {
    score += SCORE_WEIGHTS.careerInterest + 10;
    pushReason(reasons, "Matches your selected career interests.");
  }

  const primarySkills = prefs.primaryGoal ? goalToSkills(prefs.primaryGoal) : [];
  if (path.relatedSkills.some((s) => primarySkills.includes(s))) {
    score += SCORE_WEIGHTS.pathSkillMatch;
    pushReason(reasons, "Builds skills tied to your primary focus.");
  }

  if (prefs.primaryGoal === "career" || prefs.primaryGoal === "wealth") {
    score += 8;
  }

  if (prefs.targetRole) {
    const t = normalizeRoleText(prefs.targetRole);
    if (path.targetRoles.some((r) => rolesLooselyMatch(t, r))) {
      score += 25;
      pushReason(reasons, "Aligned with the role you’re working toward.");
    }
  }

  if (prefs.currentRole) {
    const c = normalizeRoleText(prefs.currentRole);
    if (path.entryRoles.some((r) => rolesLooselyMatch(c, r))) {
      score += 18;
      pushReason(reasons, "Fits where you may be starting.");
    }
  }

  if (ctx.dismissedIds?.has(path.id)) score -= SCORE_WEIGHTS.feedbackPenalty;
  if (reasons.length === 0) pushReason(reasons, "A practical progression path to explore.");

  return { item: path, score, reasons };
}

export function rankAll<T>(
  items: T[],
  scorer: (item: T, ctx: EngineContext) => ScoredRecommendation<T>,
  ctx: EngineContext,
  limit = 10,
): ScoredRecommendation<T>[] {
  return items
    .map((item) => scorer(item, ctx))
    .filter((s) => s.score > -20)
    .sort((a, b) => b.score - a.score || String((a.item as any).id).localeCompare(String((b.item as any).id)))
    .slice(0, limit);
}

/**
 * Personalized daily skill slots: primary-aligned, weak-skill, balance.
 * Still 3 slots; never collapses to a single skill.
 */
export function personalizedDailySlots(
  prefs: PersonalizationPrefs,
  categoryLevels: Record<string, number>,
): Array<"health" | "wealth" | "career" | "family" | "mindset"> {
  const weak = skillRankOrder(categoryLevels) as Array<"health" | "wealth" | "career" | "family" | "mindset">;
  const primary = prefs.primaryGoal ? goalToSkills(prefs.primaryGoal)[0] : weak[0];
  const slots: Array<"health" | "wealth" | "career" | "family" | "mindset"> = [];

  // 1) Primary focus
  slots.push(primary);
  // 2) Weakest skill different from primary
  const weakPick = weak.find((s) => s !== primary) ?? weak[0];
  slots.push(weakPick);
  // 3) Balance / secondary
  const secondary = prefs.secondaryGoals.flatMap(goalToSkills).find((s) => !slots.includes(s));
  const third = secondary ?? weak.find((s) => !slots.includes(s)) ?? weak[0];
  slots.push(third);

  return slots.slice(0, 3);
}

export function primaryGoalLabel(goal: SkillGoalKey | null): string {
  if (!goal) return "Balanced growth";
  const map: Record<SkillGoalKey, string> = {
    health: "Health & Fitness",
    wealth: "Money",
    career: "Career",
    family: "Relationships / Family",
    mindset: "Mindset",
    balance: "Overall Life Balance",
  };
  return map[goal];
}
