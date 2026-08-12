import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  NOTIFICATION_IDS,
  plannedRetentionNotificationIds,
} from "./notifications.ts";

const basePrefs = {
  notificationsEnabled: true,
  notifyDailyQuests: true,
  notifyStreakRisk: true,
  notifyWeeklyChallenges: true,
};

describe("notification planner", () => {
  it("schedules nothing when master is off", () => {
    const ids = plannedRetentionNotificationIds({
      prefs: { ...basePrefs, notificationsEnabled: false },
      currentStreak: 3,
      lastCompletionDate: "2026-08-09",
      hasIncompleteDaily: true,
      hasIncompleteWeekly: true,
    });
    assert.deepEqual(ids, []);
  });

  it("omits streak warning when streak is already protected today", () => {
    const today = new Date().toISOString().slice(0, 10);
    // Use local today via Date local construction
    const d = new Date();
    const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const ids = plannedRetentionNotificationIds({
      prefs: basePrefs,
      currentStreak: 5,
      lastCompletionDate: local,
      hasIncompleteDaily: true,
      hasIncompleteWeekly: true,
    });
    assert.ok(ids.includes(NOTIFICATION_IDS.daily));
    assert.ok(!ids.includes(NOTIFICATION_IDS.streak));
    assert.ok(ids.includes(NOTIFICATION_IDS.weekly));
    void today;
  });

  it("includes streak warning when at risk", () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const ids = plannedRetentionNotificationIds({
      prefs: basePrefs,
      currentStreak: 4,
      lastCompletionDate: yesterday,
      hasIncompleteDaily: true,
      hasIncompleteWeekly: false,
    });
    assert.ok(ids.includes(NOTIFICATION_IDS.streak));
    assert.ok(!ids.includes(NOTIFICATION_IDS.weekly));
  });

  it("uses stable deterministic notification ids", () => {
    assert.equal(NOTIFICATION_IDS.daily, 1001);
    assert.equal(NOTIFICATION_IDS.streak, 1002);
    assert.equal(NOTIFICATION_IDS.weekly, 1003);
  });
});
