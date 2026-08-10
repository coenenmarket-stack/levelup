import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canSendPushToday,
  isInQuietHours,
  localHourInTimezone,
  mergeServerPrefs,
  respectPreferences,
  shouldRemoveInvalidToken,
  MAX_PUSH_PER_DAY,
} from "./service.ts";
import {
  isEmailEligible,
  isWeeklyEmailSendWindow,
  renderWeeklyProgressEmail,
  sendTransactionalEmail,
} from "./email.ts";
import { nextBatchCursor, WEEKLY_EMAIL_BATCH_SIZE } from "./weeklyEmail.ts";

describe("server notification prefs", () => {
  it("defaults push off and respects categories", () => {
    const prefs = mergeServerPrefs({});
    assert.equal(prefs.pushEnabled, false);
    assert.equal(respectPreferences({ ...prefs, pushEnabled: true }, "friend_request"), true);
    assert.equal(
      respectPreferences({ ...prefs, pushEnabled: true, notifyFriendRequests: false }, "friend_request"),
      false,
    );
  });

  it("does not treat notificationsEnabled alone as remote push master", () => {
    const prefs = mergeServerPrefs({ notificationsEnabled: true, pushEnabled: false });
    assert.equal(prefs.pushEnabled, false);
    assert.equal(respectPreferences(prefs, "friend_request"), false);
    assert.equal(
      respectPreferences(mergeServerPrefs({ pushEnabled: true, notifySocialMaster: true }), "party_invite"),
      true,
    );
  });

  it("quiet hours + rate limit helpers", () => {
    assert.equal(isInQuietHours(23, { enabled: true, startHour: 22, endHour: 8 }), true);
    assert.equal(canSendPushToday(MAX_PUSH_PER_DAY), false);
    assert.equal(shouldRemoveInvalidToken("messaging/registration-token-not-registered"), true);
  });

  it("local hour in timezone falls back safely", () => {
    const h = localHourInTimezone(new Date("2026-08-10T18:00:00Z"), "UTC");
    assert.equal(h, 18);
    const bad = localHourInTimezone(new Date("2026-08-10T18:00:00Z"), "Not/AZone");
    assert.ok(Number.isFinite(bad));
  });
});

describe("email eligibility + templates + unsubscribe prefs", () => {
  it("requires verified email + opt-in", () => {
    assert.equal(
      isEmailEligible({
        email: "a@b.com",
        emailVerified: true,
        emailEnabled: true,
        categoryEnabled: true,
      }).ok,
      true,
    );
    assert.equal(
      isEmailEligible({
        email: "a@b.com",
        emailVerified: false,
        emailEnabled: true,
        categoryEnabled: true,
      }).reason,
      "unverified",
    );
    assert.equal(
      isEmailEligible({
        email: "a@b.com",
        emailVerified: true,
        emailEnabled: false,
        categoryEnabled: true,
      }).reason,
      "email_master_off",
    );
  });

  it("renders weekly summary without private coach content", () => {
    const r = renderWeeklyProgressEmail({
      name: "Ada",
      level: 14,
      xpGained: 420,
      questsCompleted: 12,
      streak: 6,
      weeklyCompleted: 2,
      weeklyTotal: 3,
      achievementName: "Locked In",
      nextAction: "Continue your career path.",
      openUrl: "https://example.com",
      unsubscribeHint: "Manage in Settings.",
    });
    assert.match(r.subject, /Level 14/);
    assert.match(r.text, /12 Quests/);
    assert.match(r.html, /Open Level Up Life/);
    assert.match(r.text, /Manage in Settings/);
    assert.doesNotMatch(r.text, /coach/i);
  });

  it("skips send without API key (no network)", async () => {
    const r = await sendTransactionalEmail({
      apiKey: undefined,
      to: "a@b.com",
      subject: "t",
      html: "<p>x</p>",
      text: "x",
    });
    assert.equal(r.skipped, "missing_api_key");
  });

  it("weekly send window uses timezone weekday/hour", () => {
    // Fixed: Sunday 2026-08-09 18:00 UTC
    const sundayUtc = new Date(Date.UTC(2026, 7, 9, 18, 0, 0));
    assert.equal(
      isWeeklyEmailSendWindow({ now: sundayUtc, timezone: "UTC", targetWeekday: 0, hourLocal: 18 }),
      true,
    );
    assert.equal(
      isWeeklyEmailSendWindow({ now: sundayUtc, timezone: "UTC", targetWeekday: 0, hourLocal: 17 }),
      false,
    );
  });

  it("paginates weekly email batches and resets when exhausted", () => {
    const ids = Array.from({ length: 250 }, (_, i) => ({ id: `u${String(i).padStart(3, "0")}` }));
    const page1 = nextBatchCursor(ids, WEEKLY_EMAIL_BATCH_SIZE);
    assert.equal(page1.processedIds.length, 200);
    assert.equal(page1.exhausted, false);
    assert.equal(page1.nextCursorId, "u199");

    const remaining = ids.slice(200);
    const page2 = nextBatchCursor(remaining, WEEKLY_EMAIL_BATCH_SIZE);
    assert.equal(page2.processedIds.length, 50);
    assert.equal(page2.exhausted, true);
    assert.equal(page2.nextCursorId, null);
  });

  it("handles provider timeout without throwing", async () => {
    const r = await sendTransactionalEmail({
      apiKey: "test-key",
      to: "a@b.com",
      subject: "t",
      html: "<p>x</p>",
      text: "x",
      fetchImpl: async () => {
        throw new Error("timeout");
      },
    });
    assert.equal(r.ok, false);
    assert.match(String(r.error), /timeout/);
  });
});
