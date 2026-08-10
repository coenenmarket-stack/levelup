/**
 * Friend / party weekly leaderboards — opt-in only.
 */

export type LeaderboardMetric = "weeklyXp" | "weeklyQuests" | "challengeContribution";

export type LeaderboardEntry = {
  uid: string;
  name: string;
  value: number;
  rank: number;
};

export type LeaderboardPrivacy = {
  leaderboardOptIn: boolean;
  showLevelToFriends: boolean;
  showStreakToFriends: boolean;
  showSkillsToFriends: boolean;
  showShowcaseAchievements: boolean;
  showSocialActivity: boolean;
};

export const DEFAULT_LEADERBOARD_PRIVACY: LeaderboardPrivacy = {
  leaderboardOptIn: false,
  showLevelToFriends: true,
  showStreakToFriends: true,
  showSkillsToFriends: true,
  showShowcaseAchievements: true,
  showSocialActivity: true,
};

export function mergeLeaderboardPrivacy(
  raw: Partial<LeaderboardPrivacy> | null | undefined,
): LeaderboardPrivacy {
  return { ...DEFAULT_LEADERBOARD_PRIVACY, ...(raw ?? {}) };
}

export function rankLeaderboard(
  rows: Array<{ uid: string; name: string; value: number; optIn: boolean }>,
): LeaderboardEntry[] {
  const eligible = rows.filter((r) => r.optIn && Number.isFinite(r.value));
  eligible.sort((a, b) => b.value - a.value || a.uid.localeCompare(b.uid));
  return eligible.map((r, i) => ({
    uid: r.uid,
    name: r.name,
    value: r.value,
    rank: i + 1,
  }));
}

export type WeeklyComp = {
  uid: string;
  xpReward: number;
  completionDate: string;
  kind?: string;
};

export function weeklyQuestStats(
  comps: WeeklyComp[],
  weekStart: string,
  weekEnd: string,
): Record<string, { quests: number; xp: number }> {
  const out: Record<string, { quests: number; xp: number }> = {};
  for (const c of comps) {
    if (c.kind === "weeklyChallenge" || c.kind === "sharedChallenge" || c.kind === "partyChallenge") {
      continue;
    }
    if (c.completionDate < weekStart || c.completionDate > weekEnd) continue;
    const cur = out[c.uid] ?? { quests: 0, xp: 0 };
    cur.quests += 1;
    cur.xp += Number(c.xpReward) || 0;
    out[c.uid] = cur;
  }
  return out;
}
