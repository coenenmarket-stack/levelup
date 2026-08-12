import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canActivateReferral,
  canAttributeReferral,
  milestonesReached,
  referralDocId,
  summarizeReferrals,
  type ReferralRecord,
} from "./referrals.ts";
import { canSendFriendRequest, isBlockedEitherWay, blockDocId } from "./blocks.ts";
import {
  SHARED_CHALLENGE_COUNT,
  SHARED_CHALLENGE_DEFS,
  computeSharedProgress,
  sharedChallengeExpired,
  sharedRewardClaimId,
  addDaysToDayKey,
} from "./sharedChallenges.ts";
import {
  PARTY_CHALLENGE_COUNT,
  PARTY_MAX_SIZE,
  canInviteToParty,
  nextOwnerUid,
  partyAfterOwnerLeave,
  computePartyProgress,
  sanitizePartyName,
  partyRewardClaimId,
  type PartyDoc,
} from "./parties.ts";
import {
  filterActivityFeed,
  isSocialActivityType,
  renderSocialActivity,
  ACTIVITY_FEED_LIMIT,
} from "./activity.ts";
import {
  DEFAULT_LEADERBOARD_PRIVACY,
  filterProfileForPrivacy,
  mergeLeaderboardPrivacy,
  rankLeaderboard,
  weeklyQuestStats,
} from "./leaderboards.ts";
import { shouldNotifySocial, mergeSocialNotificationPrefs } from "./notifications.ts";

function baseReferral(over: Partial<ReferralRecord> = {}): ReferralRecord {
  return {
    id: "a__b",
    referrerUid: "a",
    referredUid: "b",
    inviteCode: "ABC123",
    status: "joined",
    createdAt: "2026-01-01T00:00:00.000Z",
    joinedAt: "2026-01-01T00:00:00.000Z",
    activatedAt: null,
    activationQuestId: null,
    ...over,
  };
}

describe("referrals", () => {
  it("builds deterministic referral ids", () => {
    assert.equal(referralDocId("r1", "u2"), "r1__u2");
  });

  it("blocks self-referral", () => {
    const r = canAttributeReferral({
      referrerUid: "u1",
      referredUid: "u1",
      existingForReferred: null,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "self_referral");
  });

  it("blocks duplicate attribution / changing referrer", () => {
    const r = canAttributeReferral({
      referrerUid: "r2",
      referredUid: "u1",
      existingForReferred: baseReferral({ referrerUid: "r1", referredUid: "u1" }),
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "already_attributed");
  });

  it("activates on first qualifying quest only once", () => {
    const ok = canActivateReferral({
      record: baseReferral({ status: "joined" }),
      referredUid: "b",
      questId: "q1",
    });
    assert.equal(ok.ok, true);

    const dup = canActivateReferral({
      record: baseReferral({ status: "activated", activatedAt: "x", activationQuestId: "q1" }),
      referredUid: "b",
      questId: "q2",
    });
    assert.equal(dup.ok, false);
    if (!dup.ok) assert.equal(dup.reason, "already_activated");
  });

  it("summarizes statuses and referral milestones", () => {
    const records = [
      baseReferral({ status: "invited", referredUid: "b1", id: "a__b1" }),
      baseReferral({ status: "joined", referredUid: "b2", id: "a__b2" }),
      baseReferral({ status: "activated", referredUid: "b3", id: "a__b3" }),
    ];
    assert.deepEqual(summarizeReferrals(records), { invited: 1, joined: 2, activated: 1 });
    assert.deepEqual(milestonesReached(1, 0), ["referral-first"]);
    assert.deepEqual(milestonesReached(3, 1), ["referral-builder"]);
    assert.deepEqual(milestonesReached(10, 5), ["referral-legend"]);
    assert.deepEqual(milestonesReached(2, 1), []);
  });
});

describe("friend requests / blocks", () => {
  it("prevents self, duplicates, and blocked requests", () => {
    assert.equal(
      canSendFriendRequest({
        fromUid: "a",
        toUid: "a",
        blockedEitherWay: false,
        existingStatus: "none",
      }).ok,
      false,
    );
    assert.equal(
      canSendFriendRequest({
        fromUid: "a",
        toUid: "b",
        blockedEitherWay: false,
        existingStatus: "pending",
      }).ok,
      false,
    );
    assert.equal(
      canSendFriendRequest({
        fromUid: "a",
        toUid: "b",
        blockedEitherWay: true,
        existingStatus: "none",
      }).ok,
      false,
    );
    assert.equal(
      canSendFriendRequest({
        fromUid: "a",
        toUid: "b",
        blockedEitherWay: false,
        existingStatus: "none",
      }).ok,
      true,
    );
  });

  it("detects blocks either way", () => {
    const set = new Set([blockDocId("a", "b")]);
    assert.equal(isBlockedEitherWay("a", "b", set), true);
    assert.equal(isBlockedEitherWay("b", "a", set), true);
    assert.equal(isBlockedEitherWay("a", "c", set), false);
  });
});

describe("shared challenges", () => {
  it("has 15–20 definitions", () => {
    assert.ok(SHARED_CHALLENGE_COUNT >= 15 && SHARED_CHALLENGE_COUNT <= 20);
    assert.equal(SHARED_CHALLENGE_DEFS.length, SHARED_CHALLENGE_COUNT);
  });

  it("computes combined quest progress and ignores non-quest kinds", () => {
    const def = SHARED_CHALLENGE_DEFS.find((d) => d.id === "momentum-duo")!;
    const progress = computeSharedProgress(
      def,
      [
        { uid: "a", category: "health", xpReward: 10, completionDate: "2026-08-10" },
        { uid: "b", category: "career", xpReward: 20, completionDate: "2026-08-11" },
        {
          uid: "a",
          category: "health",
          xpReward: 50,
          completionDate: "2026-08-11",
          kind: "weeklyChallenge",
        },
      ],
      ["a", "b"],
      { start: "2026-08-10", end: "2026-08-16" },
    );
    assert.equal(progress, 2);
  });

  it("expires pending/active after endsAt and not declined", () => {
    assert.equal(
      sharedChallengeExpired(
        {
          id: "1",
          defId: "momentum-duo",
          hostUid: "a",
          guestUid: "b",
          participantUids: ["a", "b"],
          status: "active",
          createdAt: "x",
          startsAt: "2026-08-01",
          endsAt: "2026-08-07",
          acceptedAt: "x",
          completedAt: null,
          progress: 1,
          target: 20,
          rewardClaimedBy: [],
        },
        "2026-08-08",
      ),
      true,
    );
    assert.equal(
      sharedChallengeExpired(
        {
          id: "1",
          defId: "momentum-duo",
          hostUid: "a",
          guestUid: "b",
          participantUids: ["a", "b"],
          status: "declined",
          createdAt: "x",
          startsAt: null,
          endsAt: "2026-08-07",
          acceptedAt: null,
          completedAt: null,
          progress: 0,
          target: 20,
          rewardClaimedBy: [],
        },
        "2026-08-08",
      ),
      false,
    );
  });

  it("uses deterministic reward claim ids (idempotent key)", () => {
    assert.equal(sharedRewardClaimId("c1", "u1"), "shared_c1_u1");
    assert.equal(addDaysToDayKey("2026-08-10", 7), "2026-08-17");
  });
});

describe("parties", () => {
  it("has 10–15 party challenge definitions and max size 8", () => {
    assert.ok(PARTY_CHALLENGE_COUNT >= 10 && PARTY_CHALLENGE_COUNT <= 15);
    assert.equal(PARTY_MAX_SIZE, 8);
  });

  it("sanitizes party names and enforces invite rules", () => {
    assert.equal(sanitizePartyName("  Hello   World!!!  "), "Hello World!!!");
    assert.ok(sanitizePartyName("x".repeat(100)).length <= 40);
    const party: PartyDoc = {
      id: "p1",
      name: "Crew",
      ownerUid: "owner",
      memberUids: ["owner", "m1"],
      createdAt: "x",
      updatedAt: "x",
      dissolved: false,
    };
    assert.equal(
      canInviteToParty({
        party,
        inviterUid: "owner",
        inviteeUid: "m2",
        blockedEitherWay: false,
        areFriends: true,
      }).ok,
      true,
    );
    const full = {
      ...party,
      memberUids: ["owner", "a", "b", "c", "d", "e", "f", "g"],
    };
    const r = canInviteToParty({
      party: full,
      inviterUid: "owner",
      inviteeUid: "z",
      blockedEitherWay: false,
      areFriends: true,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "party_full");
  });

  it("transfers ownership to earliest remaining member and dissolves empty parties", () => {
    assert.equal(nextOwnerUid(["o", "b", "c"], "o"), "b");
    const party: PartyDoc = {
      id: "p1",
      name: "Crew",
      ownerUid: "o",
      memberUids: ["o", "b"],
      createdAt: "x",
      updatedAt: "x",
      dissolved: false,
    };
    const next = partyAfterOwnerLeave(party, "o");
    assert.ok(!("dissolved" in next && (next as any).dissolved === true && !("ownerUid" in next)));
    if ("ownerUid" in next) {
      assert.equal(next.ownerUid, "b");
      assert.deepEqual(next.memberUids, ["b"]);
    }
    const alone: PartyDoc = { ...party, memberUids: ["o"] };
    const dissolved = partyAfterOwnerLeave(alone, "o");
    assert.deepEqual(dissolved, { dissolved: true });
  });

  it("computes party progress and reward ids", () => {
    const def = {
      id: "team-momentum",
      title: "Team Momentum",
      description: "",
      metric: "combinedQuestCount" as const,
      target: 50,
      durationDays: 14,
    };
    const progress = computePartyProgress(
      def,
      [
        { uid: "a", category: "health", xpReward: 10, completionDate: "2026-08-10" },
        { uid: "b", category: "career", xpReward: 10, completionDate: "2026-08-11" },
      ],
      ["a", "b"],
      { start: "2026-08-10", end: "2026-08-20" },
    );
    assert.equal(progress, 2);
    assert.equal(partyRewardClaimId("pc1", "u1"), "party_pc1_u1");
  });
});

describe("activity + leaderboards + privacy + notifications", () => {
  it("only renders known activity types and bounds feed", () => {
    assert.equal(isSocialActivityType("level_milestone"), true);
    assert.equal(isSocialActivityType("free_text"), false);
    assert.match(renderSocialActivity("level_milestone", { level: 5 }, "Ada"), /level 5/);
    const filtered = filterActivityFeed(
      Array.from({ length: 80 }, (_, i) => ({ createdAtMs: i })),
    );
    assert.equal(filtered.length, ACTIVITY_FEED_LIMIT);
    assert.equal(filtered[0]!.createdAtMs, 79);
  });

  it("defaults leaderboard opt-in OFF and excludes opted-out users", () => {
    assert.equal(DEFAULT_LEADERBOARD_PRIVACY.leaderboardOptIn, false);
    assert.equal(mergeLeaderboardPrivacy(null).leaderboardOptIn, false);
    const ranked = rankLeaderboard([
      { uid: "a", name: "A", value: 10, optIn: true },
      { uid: "b", name: "B", value: 99, optIn: false },
      { uid: "c", name: "C", value: 20, optIn: true },
    ]);
    assert.deepEqual(
      ranked.map((r) => r.uid),
      ["c", "a"],
    );
    assert.equal(ranked[0]!.rank, 1);
  });

  it("aggregates weekly stats inside ISO week window", () => {
    const stats = weeklyQuestStats(
      [
        { uid: "a", xpReward: 10, completionDate: "2026-08-10" },
        { uid: "a", xpReward: 5, completionDate: "2026-08-11" },
        { uid: "a", xpReward: 100, completionDate: "2026-08-01" },
        { uid: "b", xpReward: 7, completionDate: "2026-08-10", kind: "weeklyChallenge" },
      ],
      "2026-08-10",
      "2026-08-16",
    );
    assert.deepEqual(stats.a, { quests: 2, xp: 15 });
    assert.equal(stats.b, undefined);
  });

  it("filters profile fields by privacy prefs", () => {
    const filtered = filterProfileForPrivacy(
      {
        level: 12,
        title: "Champion",
        currentStreak: 9,
        categoryLevels: { health: 3 },
        showcaseAchievements: ["first-quest"],
      },
      {
        ...DEFAULT_LEADERBOARD_PRIVACY,
        showLevelToFriends: false,
        showStreakToFriends: false,
        showSkillsToFriends: false,
        showShowcaseAchievements: false,
      },
    );
    assert.equal(filtered.level, undefined);
    assert.equal(filtered.currentStreak, 0);
    assert.deepEqual(filtered.categoryLevels, {});
    assert.deepEqual(filtered.showcaseAchievements, []);
  });

  it("gates social notifications behind master + category toggles", () => {
    const prefs = mergeSocialNotificationPrefs({
      notifySocialMaster: true,
      notifyFriendRequests: false,
    });
    assert.equal(shouldNotifySocial(prefs, "notifyFriendRequests"), false);
    assert.equal(shouldNotifySocial(prefs, "notifyPartyInvites"), true);
    const off = mergeSocialNotificationPrefs({ notifySocialMaster: false });
    assert.equal(shouldNotifySocial(off, "notifyPartyInvites"), false);
  });
});
