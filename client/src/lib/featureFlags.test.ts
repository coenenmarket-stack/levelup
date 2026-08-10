import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LAUNCH_FLAGS,
  isFeatureEnabled,
  isSocialSurfaceEnabled,
} from "./featureFlags";

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
    assert.equal(isSocialSurfaceEnabled(), false);
    assert.equal(isFeatureEnabled("friendsEnabled"), false);
  });
});
