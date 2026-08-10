/** Streak helpers — single source of truth for day keys and streak risk UI. */

/** Calendar day key in UTC (matches existing completionDate / lastCompletionDate). */
export function dayKeyUtc(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Inclusive day difference between two YYYY-MM-DD keys. */
export function dayDiff(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Streak XP multiplier: +5% per day, capped at +50%. */
export function streakXpMultiplier(currentStreak: number): number {
  return 1 + Math.min(0.5, Math.max(0, currentStreak) * 0.05);
}

export type StreakStatus = {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string | null;
  /** True when the player has already completed something today. */
  protectedToday: boolean;
  /** True when last activity was yesterday — streak breaks if they miss today. */
  atRisk: boolean;
  /** True when last activity was 2+ days ago (or never) — streak already broken. */
  broken: boolean;
  bonusPct: number;
};

export function getStreakStatus(input: {
  currentStreak?: number | null;
  longestStreak?: number | null;
  lastCompletionDate?: string | null;
  today?: string;
}): StreakStatus {
  const today = input.today ?? dayKeyUtc();
  const last = input.lastCompletionDate ?? null;
  const currentStreak = input.currentStreak ?? 0;
  const longestStreak = input.longestStreak ?? 0;
  const protectedToday = last === today;
  let atRisk = false;
  let broken = false;
  if (!last) {
    broken = currentStreak <= 0;
  } else if (last === today) {
    atRisk = false;
    broken = false;
  } else {
    const diff = dayDiff(last, today);
    if (diff === 1) atRisk = currentStreak > 0;
    else if (diff > 1) broken = true;
  }
  const bonusPct = Math.round((streakXpMultiplier(currentStreak) - 1) * 100);
  return {
    currentStreak,
    longestStreak,
    lastCompletionDate: last,
    protectedToday,
    atRisk,
    broken,
    bonusPct,
  };
}
