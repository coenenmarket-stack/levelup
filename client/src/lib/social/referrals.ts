/**
 * Phase 4 referral attribution — pure logic (deterministic, testable).
 * Successful referral = referred user joins + completes first qualifying quest.
 */

export type ReferralStatus = "invited" | "joined" | "activated";

export type ReferralRecord = {
  id: string;
  referrerUid: string;
  referredUid: string;
  inviteCode: string;
  status: ReferralStatus;
  createdAt: string;
  joinedAt: string | null;
  activatedAt: string | null;
  activationQuestId: string | null;
};

export type ReferralStats = {
  invited: number;
  joined: number;
  activated: number;
};

export function referralDocId(referrerUid: string, referredUid: string): string {
  return `${referrerUid}__${referredUid}`;
}

export function canAttributeReferral(opts: {
  referrerUid: string;
  referredUid: string;
  existingForReferred: ReferralRecord | null;
}): { ok: true } | { ok: false; reason: string } {
  if (!opts.referrerUid || !opts.referredUid) return { ok: false, reason: "missing_uids" };
  if (opts.referrerUid === opts.referredUid) return { ok: false, reason: "self_referral" };
  if (opts.existingForReferred) return { ok: false, reason: "already_attributed" };
  return { ok: true };
}

export function canActivateReferral(opts: {
  record: ReferralRecord | null;
  referredUid: string;
  questId: string;
}): { ok: true } | { ok: false; reason: string } {
  if (!opts.record) return { ok: false, reason: "no_referral" };
  if (opts.record.referredUid !== opts.referredUid) return { ok: false, reason: "not_referred_user" };
  if (opts.record.status === "activated") return { ok: false, reason: "already_activated" };
  if (opts.record.status !== "joined" && opts.record.status !== "invited") {
    return { ok: false, reason: "invalid_status" };
  }
  if (!opts.questId) return { ok: false, reason: "missing_quest" };
  return { ok: true };
}

/** Cosmetic referral milestones — no XP. */
export const REFERRAL_MILESTONES = [
  { activated: 1, achievementKey: "referral-first", label: "First Referral" },
  { activated: 3, achievementKey: "referral-builder", label: "Referral Builder" },
  { activated: 5, achievementKey: "referral-advocate", label: "Referral Advocate" },
  { activated: 10, achievementKey: "referral-legend", label: "Referral Legend", rarity: "rare" as const },
] as const;

export function milestonesReached(activatedCount: number, previousActivated: number): string[] {
  return REFERRAL_MILESTONES.filter(
    (m) => activatedCount >= m.activated && previousActivated < m.activated,
  ).map((m) => m.achievementKey);
}

export function summarizeReferrals(records: ReferralRecord[]): ReferralStats {
  return {
    invited: records.filter((r) => r.status === "invited").length,
    joined: records.filter((r) => r.status === "joined" || r.status === "activated").length,
    activated: records.filter((r) => r.status === "activated").length,
  };
}
