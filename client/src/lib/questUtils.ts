import type { Quest } from "@/lib/types";

export type DailyProgress = {
  completed: number;
  remaining: number;
  total: number;
  percentage: number;
};

export function splitQuestsByCompletion(quests: Quest[]): {
  active: Quest[];
  completedToday: Quest[];
} {
  const active: Quest[] = [];
  const completedToday: Quest[] = [];
  for (const q of quests) {
    if (q.completedToday) completedToday.push(q);
    else active.push(q);
  }
  return { active, completedToday };
}

export function computeDailyProgress(
  active: Quest[],
  completedToday: Quest[],
): DailyProgress {
  const completed = completedToday.length;
  const remaining = active.length;
  const total = completed + remaining;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, remaining, total, percentage };
}

/** Default collapsed when completed count exceeds this threshold. */
export const COMPLETED_SECTION_AUTO_COLLAPSE = 5;
