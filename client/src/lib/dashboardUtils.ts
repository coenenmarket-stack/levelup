import type { Category, Character, Quest } from "@/lib/types";

const SKILL_ORDER = ["health", "wealth", "career", "family", "mindset"];

export function getWeakestCategory(categories: Category[]): Category | null {
  if (!categories.length) return null;
  return [...categories].sort(
    (a, b) => (a.level - b.level) || (a.xp - b.xp),
  )[0];
}

export function getStrongestCategory(categories: Category[]): Category | null {
  if (!categories.length) return null;
  return [...categories].sort(
    (a, b) => (b.level - a.level) || (b.xp - a.xp),
  )[0];
}

export type TodaysMission = {
  headline: string;
  subtitle: string;
  quest: Quest | null;
  allComplete: boolean;
};

export function getTodaysMission(activeQuests: Quest[], allComplete?: boolean): TodaysMission {
  if (allComplete || activeQuests.length === 0) {
    return {
      headline: "All missions complete",
      subtitle: "You cleared today's pack. Rest up, hero — or hit the Quests page for side quests.",
      quest: null,
      allComplete: true,
    };
  }
  const next = [...activeQuests].sort(
    (a, b) => SKILL_ORDER.indexOf(a.category) - SKILL_ORDER.indexOf(b.category),
  )[0];
  return {
    headline: next.title,
    subtitle: `Your next move · ${next.category} · +${next.xpReward} XP`,
    quest: next,
    allComplete: false,
  };
}

export function getTodaysFocus(
  weakest: Category | null,
  character: Character | null,
): { title: string; body: string; categoryKey: string | null } {
  if (!weakest) {
    return {
      title: "Today's Focus",
      body: "Complete one quest to build momentum.",
      categoryKey: null,
    };
  }
  const goalHint = character?.lifeGoal
    ? ` It connects to your goal: ${character.lifeGoal.replace(/^Pursue: /, "")}.`
    : "";
  return {
    title: `Focus: ${weakest.name}`,
    body: `${weakest.icon} Your ${weakest.name} skill is your growth edge (Lv.${weakest.level}). Push here today.${goalHint}`,
    categoryKey: weakest.key,
  };
}
