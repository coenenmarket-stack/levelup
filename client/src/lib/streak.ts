/** Streak helpers — day boundaries via centralized local day keys. */

import {
  candidateDayKeys,
  dayDiff,
  dayKeyLocal,
  dayKeyUtc,
  isCompletionToday,
} from "./dayKey";

export { dayKeyLocal, dayKeyUtc, dayDiff, candidateDayKeys, isCompletionToday };
/** @deprecated Prefer dayKeyLocal — kept as alias during Phase 2 transition. */
export const dayKeyUtcAlias = dayKeyUtc;

/** Streak XP multiplier: +5% per day, capped at +50%. */
export function streakXpMultiplier(currentStreak: number): number {
  return 1 + Math.min(0.5, Math.max(0, currentStreak) * 0.05);
}

export type StreakStatus = {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string | null;
  /** True when the player has already completed something today (local or legacy UTC). */
  protectedToday: boolean;
  /** True when last activity was yesterday — streak breaks if they miss today. */
  atRisk: boolean;
  /** True when last activity was 2+ days ago (or never) — streak already broken. */
  broken: boolean;
  bonusPct: number;
};

/**
 * Compute streak UI status using local today.
 * lastCompletionDate may be local or legacy UTC; both are accepted for "protected today".
 */
export function getStreakStatus(input: {
  currentStreak?: number | null;
  longestStreak?: number | null;
  lastCompletionDate?: string | null;
  today?: string;
  now?: Date;
}): StreakStatus {
  const now = input.now ?? new Date();
  const today = input.today ?? dayKeyLocal(now);
  const last = input.lastCompletionDate ?? null;
  const currentStreak = input.currentStreak ?? 0;
  const longestStreak = input.longestStreak ?? 0;
  const protectedToday = isCompletionToday(last, now);
  let atRisk = false;
  let broken = false;
  if (!last) {
    broken = currentStreak <= 0;
  } else if (protectedToday) {
    atRisk = false;
    broken = false;
  } else {
    // Compare against local today for gap detection.
    const diff = dayDiff(last, today);
    if (diff === 1) atRisk = currentStreak > 0;
    else if (diff > 1) broken = true;
    else if (diff < 0) {
      // last is "ahead" of local today (legacy UTC tomorrow edge) — treat as protected
      atRisk = false;
      broken = false;
    }
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

/**
 * Apply streak update for a completion on `today` (local day key).
 * One calendar day counts once; same-day repeats do not increment.
 */
export function nextStreakState(input: {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string | null;
  today: string;
}): { currentStreak: number; longestStreak: number } {
  const last = input.lastCompletionDate;
  let currentStreak = input.currentStreak ?? 0;
  if (last !== input.today) {
    // Also treat legacy UTC same-calendar ambiguity: if last is in candidate days for "today", don't bump.
    // Caller should pass today=local; if last===utcToday and utc!==local, dayDiff may be 0 or 1.
    if (last) {
      const diff = dayDiff(last, input.today);
      if (diff === 1) currentStreak += 1;
      else if (diff > 1) currentStreak = 1;
      else if (diff === 0) {
        /* same key — no bump */
      } else if (diff < 0) {
        // last appears after today (UTC ahead) — keep at least 1
        currentStreak = Math.max(currentStreak, 1);
      }
    } else {
      currentStreak = 1;
    }
  }
  const longestStreak = Math.max(input.longestStreak ?? 0, currentStreak);
  return { currentStreak, longestStreak };
}
