/**
 * Lightweight parties (2–8) + party challenge definitions.
 */

export const PARTY_MIN_SIZE = 2;
export const PARTY_MAX_SIZE = 8;
export const PARTY_NAME_MAX = 40;

export type PartyRole = "owner" | "member";

export type PartyDoc = {
  id: string;
  name: string;
  ownerUid: string;
  memberUids: string[];
  createdAt: string;
  updatedAt: string;
  dissolved: boolean;
};

export type PartyInviteStatus = "pending" | "accepted" | "declined" | "expired";

export type PartyInviteDoc = {
  id: string;
  partyId: string;
  fromUid: string;
  toUid: string;
  status: PartyInviteStatus;
  createdAt: string;
  expiresAt: string;
};

export type PartyChallengeMetric =
  | "combinedQuestCount"
  | "combinedXP"
  | "skillQuestCount"
  | "activeMemberDays"
  | "perSkillCollective";

export type PartyChallengeDef = {
  id: string;
  title: string;
  description: string;
  metric: PartyChallengeMetric;
  target: number;
  skill?: "health" | "wealth" | "career" | "family" | "mindset";
  durationDays: number;
};

export const PARTY_CHALLENGE_DEFS: PartyChallengeDef[] = [
  {
    id: "team-momentum",
    title: "Team Momentum",
    description: "Complete 50 combined quests as a party.",
    metric: "combinedQuestCount",
    target: 50,
    durationDays: 14,
  },
  {
    id: "full-spectrum",
    title: "Full Spectrum",
    description: "Collectively complete 10 quests in each skill.",
    metric: "perSkillCollective",
    target: 50,
    durationDays: 14,
  },
  {
    id: "active-week",
    title: "Active Week",
    description: "Have at least one party member active each day for 7 days.",
    metric: "activeMemberDays",
    target: 7,
    durationDays: 7,
  },
  {
    id: "team-xp",
    title: "Team XP",
    description: "Earn 2,000 combined quest XP.",
    metric: "combinedXP",
    target: 2000,
    durationDays: 14,
  },
  {
    id: "career-crew",
    title: "Career Crew",
    description: "Complete 25 Career quests together.",
    metric: "skillQuestCount",
    skill: "career",
    target: 25,
    durationDays: 14,
  },
  {
    id: "wealth-crew",
    title: "Wealth Crew",
    description: "Complete 25 Wealth quests together.",
    metric: "skillQuestCount",
    skill: "wealth",
    target: 25,
    durationDays: 14,
  },
  {
    id: "health-crew",
    title: "Health Crew",
    description: "Complete 25 Health quests together.",
    metric: "skillQuestCount",
    skill: "health",
    target: 25,
    durationDays: 14,
  },
  {
    id: "mindset-crew",
    title: "Mindset Crew",
    description: "Complete 25 Mindset quests together.",
    metric: "skillQuestCount",
    skill: "mindset",
    target: 25,
    durationDays: 14,
  },
  {
    id: "family-crew",
    title: "Family Crew",
    description: "Complete 20 Family quests together.",
    metric: "skillQuestCount",
    skill: "family",
    target: 20,
    durationDays: 14,
  },
  {
    id: "sprint-30",
    title: "Sprint 30",
    description: "Complete 30 combined quests in one week.",
    metric: "combinedQuestCount",
    target: 30,
    durationDays: 7,
  },
  {
    id: "party-push",
    title: "Party Push",
    description: "Earn 1,200 combined XP in one week.",
    metric: "combinedXP",
    target: 1200,
    durationDays: 7,
  },
  {
    id: "ten-day-grind",
    title: "Ten-Day Grind",
    description: "Stay collectively active across 10 calendar days.",
    metric: "activeMemberDays",
    target: 10,
    durationDays: 14,
  },
];

export const PARTY_CHALLENGE_COUNT = PARTY_CHALLENGE_DEFS.length;

export function getPartyChallengeDef(id: string): PartyChallengeDef | undefined {
  return PARTY_CHALLENGE_DEFS.find((d) => d.id === id);
}

export function sanitizePartyName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, PARTY_NAME_MAX);
}

export function canInviteToParty(opts: {
  party: PartyDoc;
  inviterUid: string;
  inviteeUid: string;
  blockedEitherWay: boolean;
  areFriends: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (opts.party.dissolved) return { ok: false, reason: "dissolved" };
  if (opts.inviterUid !== opts.party.ownerUid) return { ok: false, reason: "not_owner" };
  if (opts.inviteeUid === opts.inviterUid) return { ok: false, reason: "self" };
  if (opts.party.memberUids.includes(opts.inviteeUid)) return { ok: false, reason: "already_member" };
  if (opts.party.memberUids.length >= PARTY_MAX_SIZE) return { ok: false, reason: "party_full" };
  if (opts.blockedEitherWay) return { ok: false, reason: "blocked" };
  if (!opts.areFriends) return { ok: false, reason: "not_friends" };
  return { ok: true };
}

/**
 * Deterministic owner transfer: earliest remaining member by uid sort
 * (stable when join order unknown). Prefer original memberUids order excluding leaver.
 */
export function nextOwnerUid(memberUids: string[], leavingUid: string): string | null {
  const remaining = memberUids.filter((u) => u !== leavingUid);
  if (!remaining.length) return null;
  return remaining[0] ?? null;
}

export function partyAfterOwnerLeave(
  party: PartyDoc,
  leavingUid: string,
): PartyDoc | { dissolved: true } {
  if (leavingUid !== party.ownerUid) {
    return {
      ...party,
      memberUids: party.memberUids.filter((u) => u !== leavingUid),
      updatedAt: new Date().toISOString(),
    };
  }
  const next = nextOwnerUid(party.memberUids, leavingUid);
  if (!next) return { dissolved: true };
  return {
    ...party,
    ownerUid: next,
    memberUids: party.memberUids.filter((u) => u !== leavingUid),
    updatedAt: new Date().toISOString(),
  };
}

export type PartyCompletionLite = {
  uid: string;
  category: string;
  xpReward: number;
  completionDate: string;
  kind?: string;
};

export function computePartyProgress(
  def: PartyChallengeDef,
  comps: PartyCompletionLite[],
  memberUids: string[],
  window: { start: string; end: string },
): number {
  const inWindow = comps.filter(
    (c) =>
      c.kind !== "weeklyChallenge" &&
      memberUids.includes(c.uid) &&
      c.completionDate >= window.start &&
      c.completionDate <= window.end,
  );

  if (def.metric === "combinedQuestCount") return inWindow.length;
  if (def.metric === "combinedXP") {
    return inWindow.reduce((s, c) => s + (Number(c.xpReward) || 0), 0);
  }
  if (def.metric === "skillQuestCount" && def.skill) {
    return inWindow.filter((c) => c.category === def.skill).length;
  }
  if (def.metric === "activeMemberDays") {
    // Days where at least one member completed a quest
    const days = new Set(inWindow.map((c) => c.completionDate));
    return days.size;
  }
  if (def.metric === "perSkillCollective") {
    const skills = ["health", "wealth", "career", "family", "mindset"] as const;
    const bySkill: Record<string, number> = {};
    for (const c of inWindow) bySkill[c.category] = (bySkill[c.category] ?? 0) + 1;
    // progress = sum of min(10, count) per skill → target 50
    return skills.reduce((s, k) => s + Math.min(10, bySkill[k] ?? 0), 0);
  }
  return 0;
}

export function partyRewardClaimId(challengeId: string, uid: string): string {
  return `party_${challengeId}_${uid}`;
}
