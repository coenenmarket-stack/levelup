/**
 * Phase 4 social client API — callables + Firestore reads.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  setDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import type { ReferralRecord, ReferralStats } from "./referrals";
import { summarizeReferrals } from "./referrals";
import type { SharedChallengeDoc } from "./sharedChallenges";
import type { PartyDoc, PartyInviteDoc } from "./parties";
import {
  DEFAULT_LEADERBOARD_PRIVACY,
  mergeLeaderboardPrivacy,
  weeklyQuestStats,
  type LeaderboardPrivacy,
} from "./leaderboards";
import {
  DEFAULT_SOCIAL_NOTIFICATION_PREFS,
  mergeSocialNotificationPrefs,
  type SocialNotificationPrefs,
} from "./notifications";
import { ACTIVITY_FEED_LIMIT } from "./activity";
import { isoWeekBoundsLocal, isoWeekIdLocal } from "../dayKey";

function call<TReq extends object, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(functions, name);
}

// --- Referrals ---

export async function redeemReferralCode(code: string) {
  return (await call<{ code: string }, { status: string; friendshipId: string; referralId?: string }>(
    "redeemReferralCode",
  )({ code })).data;
}

export async function activateReferralAfterQuest(questId: string) {
  try {
    return (
      await call<{ questId: string }, { activated: boolean; referralId?: string }>("activateReferral")({
        questId,
      })
    ).data;
  } catch (e) {
    console.warn("activateReferral failed", e);
    return { activated: false };
  }
}

export async function loadMyReferrals(uid: string): Promise<{ records: ReferralRecord[]; stats: ReferralStats }> {
  const snap = await getDocs(query(collection(db, "referrals"), where("referrerUid", "==", uid)));
  const records = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ReferralRecord[];
  return { records, stats: summarizeReferrals(records) };
}

// --- Blocks ---

export async function blockUser(blockedUid: string) {
  return (await call<{ blockedUid: string }, { ok: boolean }>("blockUser")({ blockedUid })).data;
}

export async function unblockUser(blockedUid: string) {
  return (await call<{ blockedUid: string }, { ok: boolean }>("unblockUser")({ blockedUid })).data;
}

export async function loadBlockedUids(uid: string): Promise<string[]> {
  const snap = await getDocs(query(collection(db, "blocks"), where("blockerUid", "==", uid)));
  return snap.docs.map((d) => String((d.data() as any).blockedUid)).filter(Boolean);
}

// --- Shared challenges ---

export async function inviteSharedChallenge(defId: string, friendUid: string) {
  return (
    await call<{ defId: string; friendUid: string }, { id: string; status: string }>(
      "inviteSharedChallenge",
    )({ defId, friendUid })
  ).data;
}

export async function respondSharedChallenge(challengeId: string, action: "accept" | "decline") {
  return (
    await call<{ challengeId: string; action: string }, { status: string }>("respondSharedChallenge")({
      challengeId,
      action,
    })
  ).data;
}

export async function refreshSharedChallengeProgress(challengeId: string) {
  return (
    await call<{ challengeId: string }, { progress: number; status: string }>(
      "refreshSharedChallengeProgress",
    )({ challengeId })
  ).data;
}

export async function loadSharedChallengesForUser(uid: string): Promise<SharedChallengeDoc[]> {
  const snap = await getDocs(
    query(collection(db, "sharedChallenges"), where("participantUids", "array-contains", uid), limit(40)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as SharedChallengeDoc[];
}

// --- Parties ---

export async function createParty(name: string) {
  return (await call<{ name: string }, { partyId: string }>("createParty")({ name })).data;
}

export async function inviteToParty(partyId: string, friendUid: string) {
  return (
    await call<{ partyId: string; friendUid: string }, { inviteId: string }>("inviteToParty")({
      partyId,
      friendUid,
    })
  ).data;
}

export async function respondPartyInvite(inviteId: string, action: "accept" | "decline") {
  return (
    await call<{ inviteId: string; action: string }, { status: string }>("respondPartyInvite")({
      inviteId,
      action,
    })
  ).data;
}

export async function leaveParty(partyId: string) {
  return (await call<{ partyId: string }, { ok: boolean; dissolved?: boolean }>("leaveParty")({ partyId })).data;
}

export async function kickPartyMember(partyId: string, memberUid: string) {
  return (
    await call<{ partyId: string; memberUid: string }, { ok: boolean }>("kickPartyMember")({
      partyId,
      memberUid,
    })
  ).data;
}

export async function renameParty(partyId: string, name: string) {
  return (await call<{ partyId: string; name: string }, { ok: boolean }>("renameParty")({ partyId, name })).data;
}

export async function startPartyChallenge(partyId: string, defId: string) {
  return (
    await call<{ partyId: string; defId: string }, { challengeId: string }>("startPartyChallenge")({
      partyId,
      defId,
    })
  ).data;
}

export async function refreshPartyChallengeProgress(challengeId: string) {
  return (
    await call<{ challengeId: string }, { progress: number; status: string }>(
      "refreshPartyChallengeProgress",
    )({ challengeId })
  ).data;
}

export async function loadMyParties(uid: string): Promise<PartyDoc[]> {
  const snap = await getDocs(
    query(collection(db, "parties"), where("memberUids", "array-contains", uid), limit(20)),
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }) as PartyDoc)
    .filter((p) => !p.dissolved);
}

export async function loadPartyInvites(uid: string): Promise<PartyInviteDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, "partyInvites"),
      where("toUid", "==", uid),
      where("status", "==", "pending"),
      limit(20),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as PartyInviteDoc[];
}

export type PartyChallengeDoc = {
  id: string;
  partyId: string;
  defId: string;
  title?: string;
  status: string;
  memberUids: string[];
  createdBy?: string;
  createdAt?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  progress: number;
  target: number;
  completedAt?: string | null;
};

export async function loadPartyChallenges(partyId: string): Promise<PartyChallengeDoc[]> {
  const snap = await getDocs(
    query(collection(db, "partyChallenges"), where("partyId", "==", partyId), limit(10)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as PartyChallengeDoc[];
}

// --- Privacy / social prefs on users/{uid} ---

export type SocialUserPrefs = LeaderboardPrivacy & SocialNotificationPrefs;

export async function readSocialUserPrefs(uid: string): Promise<SocialUserPrefs> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const data = snap.exists() ? (snap.data() as any) : {};
    return {
      ...mergeLeaderboardPrivacy(data),
      ...mergeSocialNotificationPrefs(data),
    };
  } catch {
    return { ...DEFAULT_LEADERBOARD_PRIVACY, ...DEFAULT_SOCIAL_NOTIFICATION_PREFS };
  }
}

export async function writeSocialUserPrefs(uid: string, patch: Partial<SocialUserPrefs>) {
  await setDoc(
    doc(db, "users", uid),
    { ...patch, updatedAt: new Date().toISOString() },
    { merge: true },
  );
  // Mirror leaderboard opt-in onto publicProfiles for friend ranking (allowlisted)
  if (patch.leaderboardOptIn !== undefined) {
    await setDoc(
      doc(db, "publicProfiles", uid),
      { leaderboardOptIn: patch.leaderboardOptIn === true, updatedAt: new Date().toISOString() },
      { merge: true },
    );
  }
}

export async function loadSocialActivity(uid: string) {
  const snap = await getDocs(
    query(
      collection(db, "socialActivity"),
      where("visibleTo", "array-contains", uid),
      orderBy("createdAtMs", "desc"),
      limit(ACTIVITY_FEED_LIMIT),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

/** Own weekly quest/XP totals from completions (local ISO week). */
export async function loadOwnWeeklyQuestStats(
  uid: string,
): Promise<{ quests: number; xp: number; weekStart: string; weekEnd: string }> {
  const weekId = isoWeekIdLocal();
  const { start, end } = isoWeekBoundsLocal(weekId);
  const snap = await getDocs(
    query(
      collection(db, "characters", uid, "completions"),
      where("completionDate", ">=", start),
      where("completionDate", "<=", end),
    ),
  );
  const comps = snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      uid,
      xpReward: Number(data.xpReward) || 0,
      completionDate: String(data.completionDate ?? ""),
      kind: data.kind as string | undefined,
    };
  });
  const stats = weeklyQuestStats(comps, start, end);
  const mine = stats[uid] ?? { quests: 0, xp: 0 };
  return { quests: mine.quests, xp: mine.xp, weekStart: start, weekEnd: end };
}
