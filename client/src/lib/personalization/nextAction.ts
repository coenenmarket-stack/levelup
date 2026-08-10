import type { ScoredRecommendation } from "./types";
import type { PersonalizationPrefs } from "./types";
import { shouldShowSoftPersonalizePrompt } from "./types";
import type { QuestCatalogItem } from "../questCatalog/types";

export type NextActionKind =
  | "complete_onboarding_personalization"
  | "finish_daily_quests"
  | "complete_quest"
  | "claim_weekly"
  | "continue_certification"
  | "continue_side_hustle"
  | "continue_career_path"
  | "restart_streak"
  | "update_goals"
  | "explore";

export type RecommendedNextAction = {
  kind: NextActionKind;
  title: string;
  subtitle: string;
  href: string;
  reason: string;
  priority: number;
};

export type NextActionInput = {
  prefs: PersonalizationPrefs;
  dailyIncomplete: number;
  dailyTotal: number;
  weeklyClaimable: number;
  streakBroken: boolean;
  topQuest: ScoredRecommendation<QuestCatalogItem> | null;
  activeCareerPathId: string | null;
  careerPathTitle: string | null;
  activeCertId: string | null;
  activeCertTitle: string | null;
  activeHustleId: string | null;
  activeHustleTitle: string | null;
  hasOpenGoals: boolean;
};

/**
 * Pick ONE clear next action. Lower priority number = shown first.
 */
export function pickRecommendedNextAction(input: NextActionInput): RecommendedNextAction {
  const candidates: RecommendedNextAction[] = [];

  if (shouldShowSoftPersonalizePrompt(input.prefs)) {
    candidates.push({
      kind: "complete_onboarding_personalization",
      title: "Personalize your plan",
      subtitle: "Tell us what you’re working toward — takes about a minute.",
      href: "/personalize",
      reason: "Tailored quests and paths start with your goals.",
      priority: 10,
    });
  }

  if (input.streakBroken) {
    candidates.push({
      kind: "restart_streak",
      title: "Restart your streak",
      subtitle: "Complete one quest today to get back on track.",
      href: "/quests",
      reason: "Momentum recovers fastest with a single win today.",
      priority: 20,
    });
  }

  if (input.dailyIncomplete > 0 && input.dailyTotal > 0) {
    candidates.push({
      kind: "finish_daily_quests",
      title: "Finish today’s quests",
      subtitle: `${input.dailyIncomplete} of ${input.dailyTotal} remaining`,
      href: "/",
      reason: "Daily quests protect your streak and XP pace.",
      priority: 30,
    });
  }

  if (input.weeklyClaimable > 0) {
    candidates.push({
      kind: "claim_weekly",
      title: "Claim weekly challenge XP",
      subtitle: `${input.weeklyClaimable} challenge${input.weeklyClaimable === 1 ? "" : "s"} ready`,
      href: "/",
      reason: "You’ve already earned it — claim before the week rolls.",
      priority: 35,
    });
  }

  if (input.activeCareerPathId && input.careerPathTitle) {
    candidates.push({
      kind: "continue_career_path",
      title: `Continue: ${input.careerPathTitle}`,
      subtitle: "Work the next milestone on your path.",
      href: `/career-paths/${input.activeCareerPathId}`,
      reason: "You’re already on this path — keep the chain going.",
      priority: 40,
    });
  }

  if (input.activeCertId && input.activeCertTitle) {
    candidates.push({
      kind: "continue_certification",
      title: `Continue: ${input.activeCertTitle}`,
      subtitle: "Pick up where you left off.",
      href: `/certifications`,
      reason: "Certification progress compounds when you return often.",
      priority: 45,
    });
  }

  if (input.activeHustleId && input.activeHustleTitle) {
    candidates.push({
      kind: "continue_side_hustle",
      title: `Continue: ${input.activeHustleTitle}`,
      subtitle: "Next step on your income path.",
      href: `/side-hustles`,
      reason: "You’re already building this hustle.",
      priority: 48,
    });
  }

  if (input.topQuest) {
    candidates.push({
      kind: "complete_quest",
      title: input.topQuest.item.title,
      subtitle: `+${input.topQuest.item.xpReward} XP · ${input.topQuest.reasons[0] ?? "Recommended for you"}`,
      href: `/quests`,
      reason: input.topQuest.reasons[0] ?? "Strong match for your goals.",
      priority: 50,
    });
  }

  if (!input.hasOpenGoals && input.prefs.personalizationCompleted) {
    candidates.push({
      kind: "update_goals",
      title: "Set a goal",
      subtitle: "Track a skill, cert, path, or personal target.",
      href: "/goals",
      reason: "Goals keep recommendations pointed at what matters.",
      priority: 60,
    });
  }

  candidates.push({
    kind: "explore",
    title: "Explore paths & guides",
    subtitle: "Career paths, certifications, and side hustles.",
    href: "/explore",
    reason: "Discover something new to build toward.",
    priority: 90,
  });

  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0]!;
}

/** Helper for coach deep-link payloads (no progression mutation). */
export type CoachActionLink = {
  label: string;
  href: string;
  kind: "quest" | "career_path" | "certification" | "side_hustle" | "goal" | "personalize" | "home";
};

export function buildCoachActionLinks(opts: {
  questId?: string | null;
  pathId?: string | null;
  certId?: string | null;
  hustleId?: string | null;
  goalId?: string | null;
}): CoachActionLink[] {
  const links: CoachActionLink[] = [];
  if (opts.questId) links.push({ label: "Open quest", href: `/quests`, kind: "quest" });
  if (opts.pathId) links.push({ label: "Open career path", href: `/career-paths/${opts.pathId}`, kind: "career_path" });
  if (opts.certId) links.push({ label: "Open certification", href: `/certifications`, kind: "certification" });
  if (opts.hustleId) links.push({ label: "Open side hustle", href: `/side-hustles`, kind: "side_hustle" });
  if (opts.goalId) links.push({ label: "Open goals", href: `/goals`, kind: "goal" });
  return links;
}
