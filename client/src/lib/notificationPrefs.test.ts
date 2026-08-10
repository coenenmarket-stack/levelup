import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateSocialPush,
  canSendPushToday,
  categoryEnabled,
  emailCategoryEnabled,
  isInQuietHours,
  mergeNotificationPrefsV2,
  MAX_PUSH_PER_DAY,
  DEFAULT_NOTIFICATION_PREFS_V2,
} from "./notificationPrefs.ts";
import {
  destinationForNotificationType,
  destinationToPath,
  resolveDeepLinkPath,
} from "./notificationDeepLinks.ts";
import { dedupeDeviceRecords, shouldRemoveInvalidToken, shouldShowPushOptIn } from "./pushNotifications.ts";

describe("notification prefs / quiet hours / rate limits", () => {
  it("defaults push and email masters OFF for legacy users", () => {
    const p = mergeNotificationPrefsV2(null);
    assert.equal(p.pushEnabled, false);
    assert.equal(p.emailEnabled, false);
    assert.equal(p.quietHours.startHour, 22);
    assert.equal(p.quietHours.endHour, 8);
  });

  it("maps legacy notificationsEnabled without enabling remote push", () => {
    const p = mergeNotificationPrefsV2({ notificationsEnabled: true });
    assert.equal(p.notificationsEnabled, true);
    assert.equal(p.pushEnabled, false);
  });

  it("gates remote categories on pushEnabled only", () => {
    const localOnly = {
      ...DEFAULT_NOTIFICATION_PREFS_V2,
      notificationsEnabled: true,
      pushEnabled: false,
    };
    assert.equal(categoryEnabled(localOnly, "daily"), true);
    assert.equal(categoryEnabled(localOnly, "friend_request"), false);
    const remote = { ...localOnly, pushEnabled: true };
    assert.equal(categoryEnabled(remote, "friend_request"), true);
  });

  it("quiet hours across overnight span", () => {
    const quiet = { enabled: true, startHour: 22, endHour: 8 };
    assert.equal(isInQuietHours(22, quiet), true);
    assert.equal(isInQuietHours(23, quiet), true);
    assert.equal(isInQuietHours(3, quiet), true);
    assert.equal(isInQuietHours(7, quiet), true);
    assert.equal(isInQuietHours(8, quiet), false);
    assert.equal(isInQuietHours(10, quiet), false);
    assert.equal(isInQuietHours(21, quiet), false);
    assert.equal(isInQuietHours(23, { ...quiet, enabled: false }), false);
  });

  it("rate limits pushes per day", () => {
    assert.equal(canSendPushToday(0), true);
    assert.equal(canSendPushToday(MAX_PUSH_PER_DAY - 1), true);
    assert.equal(canSendPushToday(MAX_PUSH_PER_DAY), false);
  });

  it("filters categories by prefs", () => {
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS_V2, pushEnabled: true, notifyFriendRequests: false };
    assert.equal(categoryEnabled(prefs, "friend_request"), false);
    assert.equal(categoryEnabled(prefs, "party_invite"), true);
  });

  it("requires email master + category", () => {
    assert.equal(
      emailCategoryEnabled(
        { ...DEFAULT_NOTIFICATION_PREFS_V2, emailEnabled: true, emailWeeklyProgress: true },
        "weekly",
      ),
      true,
    );
    assert.equal(
      emailCategoryEnabled(
        { ...DEFAULT_NOTIFICATION_PREFS_V2, emailEnabled: false, emailWeeklyProgress: true },
        "weekly",
      ),
      false,
    );
  });

  it("aggregates social pushes", () => {
    assert.equal(aggregateSocialPush([]), null);
    assert.equal(aggregateSocialPush([{ title: "A" }])?.title, "A");
    assert.match(aggregateSocialPush([{ title: "A" }, { title: "B" }])!.title, /2 new/);
  });
});

describe("deep links", () => {
  it("maps types to safe routes", () => {
    assert.equal(destinationToPath(destinationForNotificationType("friend_request")).startsWith("/friends"), true);
    assert.equal(destinationToPath(destinationForNotificationType("party_invite")).startsWith("/social"), true);
    assert.equal(destinationToPath(destinationForNotificationType("weekly_reward")).startsWith("/"), true);
  });

  it("rejects arbitrary URLs", () => {
    assert.equal(resolveDeepLinkPath("https://evil.example/phish"), "/");
    assert.equal(resolveDeepLinkPath("/admin"), "/");
    assert.equal(resolveDeepLinkPath("/friends"), "/friends");
    assert.equal(resolveDeepLinkPath({ route: "/social", tab: "parties", id: "p1" }), "/social?tab=parties&id=p1");
  });
});

describe("push tokens", () => {
  it("dedupes device records by token keeping newest", () => {
    const out = dedupeDeviceRecords([
      { id: "a", pushToken: "t1", updatedAt: "2026-01-01" },
      { id: "b", pushToken: "t1", updatedAt: "2026-02-01" },
      { id: "c", pushToken: "t2", updatedAt: "2026-01-01" },
    ]);
    assert.equal(out.length, 2);
    assert.equal(out.find((d) => d.pushToken === "t1")?.id, "b");
  });

  it("flags invalid FCM error codes for removal", () => {
    assert.equal(shouldRemoveInvalidToken("messaging/registration-token-not-registered"), true);
    assert.equal(shouldRemoveInvalidToken("messaging/invalid-registration-token"), true);
    assert.equal(shouldRemoveInvalidToken("messaging/server-unavailable"), false);
  });
});

describe("push opt-in UX", () => {
  it("does not nag after dismiss or when already enabled/denied", () => {
    assert.equal(
      shouldShowPushOptIn({ notificationsEnabled: true, dismissedAtMs: null }),
      false,
    );
    assert.equal(
      shouldShowPushOptIn({ notificationsEnabled: false, pushPermission: "denied" }),
      false,
    );
    assert.equal(
      shouldShowPushOptIn({
        notificationsEnabled: false,
        dismissedAtMs: Date.now() - 1000,
        nowMs: Date.now(),
      }),
      false,
    );
    assert.equal(
      shouldShowPushOptIn({
        notificationsEnabled: false,
        dismissedAtMs: Date.now() - 20 * 24 * 60 * 60 * 1000,
        nowMs: Date.now(),
      }),
      true,
    );
  });
});
