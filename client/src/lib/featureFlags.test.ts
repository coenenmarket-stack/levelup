import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LAUNCH_FLAGS,
  isFeatureEnabled,
  isSocialSurfaceEnabled,
  isLaunchRouteEnabled,
} from "./featureFlags";
import { pickRecommendedNextAction, buildCoachActionLinks } from "./personalization/nextAction";
import { DEFAULT_PERSONALIZATION } from "./personalization/types";

describe("LAUNCH_FLAGS", () => {
  it("keeps solo RPG core available", () => {
    assert.equal(LAUNCH_FLAGS.aiCoachEnabled, true);
  });

  it("hides social / remote delivery until infra is ready", () => {
    assert.equal(LAUNCH_FLAGS.remotePushEnabled, false);
    assert.equal(LAUNCH_FLAGS.emailNotificationsEnabled, false);
    assert.equal(LAUNCH_FLAGS.friendsEnabled, false);
    assert.equal(LAUNCH_FLAGS.socialChallengesEnabled, false);
    assert.equal(LAUNCH_FLAGS.partiesEnabled, false);
    assert.equal(LAUNCH_FLAGS.leaderboardsEnabled, false);
    assert.equal(LAUNCH_FLAGS.notificationInboxEnabled, false);
    assert.equal(LAUNCH_FLAGS.socialHomeCardEnabled, false);
    assert.equal(LAUNCH_FLAGS.rewardsShopEnabled, false);
    assert.equal(isSocialSurfaceEnabled(), false);
    assert.equal(isFeatureEnabled("friendsEnabled"), false);
  });

  it("blocks launch-gated routes", () => {
    assert.equal(isLaunchRouteEnabled("/friends"), false);
    assert.equal(isLaunchRouteEnabled("/invite"), false);
    assert.equal(isLaunchRouteEnabled("/social"), false);
    assert.equal(isLaunchRouteEnabled("/leaderboard"), false);
    assert.equal(isLaunchRouteEnabled("/notifications"), false);
    assert.equal(isLaunchRouteEnabled("/shop"), false);
    assert.equal(isLaunchRouteEnabled("/quests"), true);
    assert.equal(isLaunchRouteEnabled("/coach"), true);
    assert.equal(isLaunchRouteEnabled("/"), true);
  });
});

describe("recommended next action launch safety", () => {
  const base = {
    prefs: { ...DEFAULT_PERSONALIZATION, personalizationCompleted: true },
    dailyIncomplete: 0,
    dailyTotal: 3,
    weeklyClaimable: 0,
    streakBroken: false,
    topQuest: null,
    activeCareerPathId: null,
    careerPathTitle: null,
    activeCertId: null,
    activeCertTitle: null,
    activeHustleId: null,
    activeHustleTitle: null,
    hasOpenGoals: true,
  };

  it("never recommends hidden social / inbox / shop routes", () => {
    const scenarios = [
      base,
      { ...base, dailyIncomplete: 2 },
      { ...base, streakBroken: true },
      { ...base, weeklyClaimable: 1 },
      { ...base, hasOpenGoals: false },
      {
        ...base,
        activeCareerPathId: "path-tech",
        careerPathTitle: "Tech",
      },
    ];
    const banned = [
      "/friends",
      "/invite",
      "/social",
      "/leaderboard",
      "/notifications",
      "/shop",
    ];
    for (const input of scenarios) {
      const action = pickRecommendedNextAction(input);
      for (const b of banned) {
        assert.equal(action.href === b || action.href.startsWith(`${b}?`) || action.href.startsWith(`${b}/`), false);
      }
    }
  });

  it("coach action links stay on solo RPG surfaces", () => {
    const links = buildCoachActionLinks({
      questId: "q1",
      pathId: "p1",
      certId: "c1",
      hustleId: "h1",
      goalId: "g1",
    });
    for (const l of links) {
      assert.match(l.href, /^\/(quests|career-paths|certifications|side-hustles|goals)/);
    }
  });
});
