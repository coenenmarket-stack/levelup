/**
 * Shared friend challenges — definitions + progress (no duplicate quest tracking).
 */

export type SharedChallengeMetric =
  | "combinedQuestCount"
  | "participantActiveDays"
  | "skillQuestCount"
  | "combinedXP"
  | "eachParticipantMinQuests";

export type SharedChallengeDef = {
  id: string;
  title: string;
  description: string;
  metric: SharedChallengeMetric;
  target: number;
  /** For skillQuestCount */
  skill?: "health" | "wealth" | "career" | "family" | "mindset";
  /** For eachParticipantMinQuests — min per person */
  perParticipantMin?: number;
  durationDays: number;
};

export type SharedChallengeStatus =
  | "pending"
  | "active"
  | "completed"
  | "declined"
  | "expired";

export type SharedChallengeDoc = {
  id: string;
  defId: string;
  hostUid: string;
  guestUid: string;
  participantUids: string[];
  status: SharedChallengeStatus;
  createdAt: string;
  startsAt: string | null;
  endsAt: string | null;
  acceptedAt: string | null;
  completedAt: string | null;
  progress: number;
  target: number;
  rewardClaimedBy: string[];
};

export const SHARED_CHALLENGE_DEFS: SharedChallengeDef[] = [
  {
    id: "momentum-duo",
    title: "Momentum Duo",
    description: "Complete 20 combined quests this week.",
    metric: "combinedQuestCount",
    target: 20,
    durationDays: 7,
  },
  {
    id: "consistency-partners",
    title: "Consistency Partners",
    description: "Each of you completes at least one quest on 5 different days.",
    metric: "participantActiveDays",
    target: 5,
    durationDays: 7,
  },
  {
    id: "balanced-duo",
    title: "Balanced Duo",
    description: "Together complete quests from all 5 skills.",
    metric: "skillQuestCount",
    target: 5,
    durationDays: 10,
  },
  {
    id: "career-sprint",
    title: "Career Sprint",
    description: "Complete 10 Career quests together.",
    metric: "skillQuestCount",
    skill: "career",
    target: 10,
    durationDays: 7,
  },
  {
    id: "wealth-week",
    title: "Wealth Week",
    description: "Complete 10 Wealth quests together.",
    metric: "skillQuestCount",
    skill: "wealth",
    target: 10,
    durationDays: 7,
  },
  {
    id: "mindset-momentum",
    title: "Mindset Momentum",
    description: "Complete 10 Mindset quests together.",
    metric: "skillQuestCount",
    skill: "mindset",
    target: 10,
    durationDays: 7,
  },
  {
    id: "health-habit",
    title: "Health Habit",
    description: "Complete 10 Health quests together.",
    metric: "skillQuestCount",
    skill: "health",
    target: 10,
    durationDays: 7,
  },
  {
    id: "family-focus",
    title: "Family Focus",
    description: "Complete 8 Family quests together.",
    metric: "skillQuestCount",
    skill: "family",
    target: 8,
    durationDays: 7,
  },
  {
    id: "xp-push",
    title: "XP Push",
    description: "Earn 500 combined XP from quests this week.",
    metric: "combinedXP",
    target: 500,
    durationDays: 7,
  },
  {
    id: "xp-surge",
    title: "XP Surge",
    description: "Earn 1,000 combined XP from quests.",
    metric: "combinedXP",
    target: 1000,
    durationDays: 10,
  },
  {
    id: "double-duty",
    title: "Double Duty",
    description: "Each of you completes at least 8 quests.",
    metric: "eachParticipantMinQuests",
    target: 8,
    perParticipantMin: 8,
    durationDays: 7,
  },
  {
    id: "weekend-warriors",
    title: "Weekend Warriors",
    description: "Complete 12 combined quests in 3 days.",
    metric: "combinedQuestCount",
    target: 12,
    durationDays: 3,
  },
  {
    id: "steady-pair",
    title: "Steady Pair",
    description: "Complete 30 combined quests over two weeks.",
    metric: "combinedQuestCount",
    target: 30,
    durationDays: 14,
  },
  {
    id: "daily-duo",
    title: "Daily Duo",
    description: "Each of you is active on 7 different days.",
    metric: "participantActiveDays",
    target: 7,
    durationDays: 10,
  },
  {
    id: "skill-sampler",
    title: "Skill Sampler",
    description: "Together hit all five skills at least twice each.",
    metric: "skillQuestCount",
    target: 10,
    durationDays: 14,
  },
  {
    id: "light-start",
    title: "Light Start",
    description: "Complete 8 combined quests together.",
    metric: "combinedQuestCount",
    target: 8,
    durationDays: 5,
  },
  {
    id: "focus-fifteen",
    title: "Focus Fifteen",
    description: "Complete 15 combined quests.",
    metric: "combinedQuestCount",
    target: 15,
    durationDays: 7,
  },
  {
    id: "even-split",
    title: "Even Split",
    description: "Each of you completes at least 5 quests.",
    metric: "eachParticipantMinQuests",
    target: 5,
    perParticipantMin: 5,
    durationDays: 7,
  },
];

export const SHARED_CHALLENGE_COUNT = SHARED_CHALLENGE_DEFS.length;

export function getSharedChallengeDef(id: string): SharedChallengeDef | undefined {
  return SHARED_CHALLENGE_DEFS.find((d) => d.id === id);
}

export type CompletionLite = {
  uid: string;
  category: string;
  xpReward: number;
  completionDate: string;
  kind?: string;
};

function isQuestComp(c: CompletionLite) {
  return c.kind !== "weeklyChallenge" && c.kind !== "sharedChallenge" && c.kind !== "partyChallenge";
}

export function computeSharedProgress(
  def: SharedChallengeDef,
  comps: CompletionLite[],
  participantUids: string[],
  window: { start: string; end: string },
): number {
  const inWindow = comps.filter(
    (c) =>
      isQuestComp(c) &&
      participantUids.includes(c.uid) &&
      c.completionDate >= window.start &&
      c.completionDate <= window.end,
  );

  if (def.metric === "combinedQuestCount") return inWindow.length;

  if (def.metric === "combinedXP") {
    return inWindow.reduce((s, c) => s + (Number(c.xpReward) || 0), 0);
  }

  if (def.metric === "skillQuestCount") {
    if (def.skill) {
      return inWindow.filter((c) => c.category === def.skill).length;
    }
    // balanced: count distinct skills touched (cap at 5), or for skill-sampler count min×5
    if (def.id === "skill-sampler") {
      const bySkill: Record<string, number> = {};
      for (const c of inWindow) {
        bySkill[c.category] = (bySkill[c.category] ?? 0) + 1;
      }
      const skills = ["health", "wealth", "career", "family", "mindset"];
      return skills.reduce((sum, s) => sum + Math.min(2, bySkill[s] ?? 0), 0);
    }
    const skills = new Set(
      inWindow
        .map((c) => c.category)
        .filter((k) => ["health", "wealth", "career", "family", "mindset"].includes(k)),
    );
    return skills.size;
  }

  if (def.metric === "participantActiveDays") {
    // Min across participants of unique active days
    let minDays = Infinity;
    for (const uid of participantUids) {
      const days = new Set(inWindow.filter((c) => c.uid === uid).map((c) => c.completionDate));
      minDays = Math.min(minDays, days.size);
    }
    return Number.isFinite(minDays) ? minDays : 0;
  }

  if (def.metric === "eachParticipantMinQuests") {
    const need = def.perParticipantMin ?? def.target;
    let minCount = Infinity;
    for (const uid of participantUids) {
      const n = inWindow.filter((c) => c.uid === uid).length;
      minCount = Math.min(minCount, n);
    }
    return Number.isFinite(minCount) ? Math.min(minCount, need) : 0;
  }

  return 0;
}

export function sharedChallengeExpired(doc: SharedChallengeDoc, nowISODate: string): boolean {
  if (doc.status === "declined" || doc.status === "expired" || doc.status === "completed") return false;
  if (doc.status === "pending" && doc.endsAt && nowISODate > doc.endsAt) return true;
  if (doc.status === "active" && doc.endsAt && nowISODate > doc.endsAt) return true;
  return false;
}

export function sharedRewardClaimId(challengeId: string, uid: string): string {
  return `shared_${challengeId}_${uid}`;
}

export function addDaysToDayKey(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
