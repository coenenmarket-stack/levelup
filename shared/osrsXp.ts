/**
 * Old School RuneScape skill XP curve.
 *
 * Cumulative XP to reach level N (level 1 = 0):
 *   floor( sum_{i=1}^{N-1} floor(i + 300 * 2^(i/7)) / 4 )
 *
 * Level 99 = 13,034,431 XP. Early levels move fast; 90→99 is a real grind.
 */

export const SKILL_MAX_LEVEL = 99;

/** Hero / account level still uses the lighter legacy curve. */
export const HERO_XP_TO_NEXT_LEVEL = (level: number) => Math.round(50 + level * 75);

/**
 * Skill XP granted per quest difficulty.
 * Tuned for ~4–7 months of focused daily play to a single 99
 * (≈3 medium quests/day into one skill, with streak bonus).
 */
export const SKILL_XP_BY_DIFFICULTY: Record<string, number> = {
  easy: 7_000,
  medium: 18_000,
  hard: 45_000,
};

/** Precomputed cumulative XP table: index = level, value = total XP to be at that level. */
const CUMULATIVE_XP: number[] = (() => {
  const table = new Array<number>(SKILL_MAX_LEVEL + 2);
  table[1] = 0;
  let total = 0;
  for (let lvl = 1; lvl <= SKILL_MAX_LEVEL; lvl++) {
    const diff = Math.floor(lvl + 300 * Math.pow(2, lvl / 7));
    total += diff;
    const cumulative = Math.floor(total / 4);
    // XP required to *reach* level (lvl+1)
    table[lvl + 1] = cumulative;
  }
  return table;
})();

/** Total XP required to be at `level` (1..99). Level 1 → 0. */
export function xpForLevel(level: number): number {
  const lvl = Math.max(1, Math.min(SKILL_MAX_LEVEL, Math.floor(level)));
  return CUMULATIVE_XP[lvl] ?? 0;
}

/** XP inside the current level needed to reach `level + 1`. 0 at max. */
export function xpToNextSkillLevel(level: number): number {
  if (level >= SKILL_MAX_LEVEL) return 0;
  const lvl = Math.max(1, Math.floor(level));
  return xpForLevel(lvl + 1) - xpForLevel(lvl);
}

/** Derive level (1..99) from cumulative total XP. */
export function levelFromTotalXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));
  // Binary search
  let lo = 1;
  let hi = SKILL_MAX_LEVEL;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi + 1) / 2);
    if (xpForLevel(mid) <= xp) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Remainder XP toward the next level, given cumulative total. */
export function remainderXpTowardNext(totalXp: number): number {
  const level = levelFromTotalXp(totalXp);
  if (level >= SKILL_MAX_LEVEL) return 0;
  return Math.max(0, Math.floor(totalXp) - xpForLevel(level));
}

export type SkillProgress = {
  /** Current level 1..99 */
  level: number;
  /** XP progress within this level (toward next). */
  xp: number;
  /** XP required to hit next level (0 if maxed). */
  xpToNext: number;
  /** Cumulative lifetime XP in this skill. */
  totalXp: number;
  leveledUp: boolean;
  oldLevel: number;
};

/**
 * Apply gained XP onto a skill using cumulative totals.
 * `currentTotalXp` is lifetime XP in the skill; `currentLevel` is optional cache.
 */
export function applySkillXp(
  currentTotalXp: number,
  gained: number,
): SkillProgress {
  const oldLevel = levelFromTotalXp(currentTotalXp);
  const totalXp = Math.max(0, Math.floor(currentTotalXp) + Math.max(0, Math.floor(gained)));
  const level = levelFromTotalXp(totalXp);
  const xpToNext = xpToNextSkillLevel(level);
  const xp = level >= SKILL_MAX_LEVEL ? 0 : remainderXpTowardNext(totalXp);
  return {
    level,
    xp,
    xpToNext,
    totalXp,
    leveledUp: level > oldLevel,
    oldLevel,
  };
}

/** Starting skill level from a 1–10 assessment score (hard reset / onboarding). */
export function startingLevelFromAssessment(score1to10: number): number {
  const n = Math.max(1, Math.min(10, Math.round(score1to10 || 1)));
  // Scores map to levels 1–10 so early game still has room to grow.
  return n;
}

export const SKILL_RANKS = [
  "Novice",
  "Apprentice",
  "Adept",
  "Expert",
  "Master",
  "Grandmaster",
  "Legend",
  "Mythic",
  "Transcendent",
] as const;

/** Rank bands across 1–99 (roughly every ~11 levels). */
export function skillRankForLevel(level: number): string {
  const lvl = Math.max(1, Math.min(SKILL_MAX_LEVEL, Math.floor(level)));
  const idx = Math.min(SKILL_RANKS.length - 1, Math.floor((lvl - 1) / 11));
  return SKILL_RANKS[idx];
}

/** Known OSRS checkpoints — used in tests. */
export const OSRS_XP_CHECKPOINTS: Record<number, number> = {
  1: 0,
  2: 83,
  10: 1_154,
  20: 4_470,
  50: 101_333,
  75: 1_210_421,
  92: 6_517_253,
  99: 13_034_431,
};
