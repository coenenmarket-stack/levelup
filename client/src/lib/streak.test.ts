import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getStreakStatus, nextStreakState, streakXpMultiplier } from "./streak.ts";

describe("streak", () => {
  it("multiplies XP up to +50%", () => {
    assert.equal(streakXpMultiplier(0), 1);
    assert.equal(streakXpMultiplier(1), 1.05);
    assert.equal(streakXpMultiplier(10), 1.5);
    assert.equal(streakXpMultiplier(20), 1.5);
  });

  it("counts a calendar day once", () => {
    const next = nextStreakState({
      currentStreak: 3,
      longestStreak: 5,
      lastCompletionDate: "2026-08-10",
      today: "2026-08-10",
    });
    assert.equal(next.currentStreak, 3);
  });

  it("increments on consecutive day", () => {
    const next = nextStreakState({
      currentStreak: 3,
      longestStreak: 5,
      lastCompletionDate: "2026-08-09",
      today: "2026-08-10",
    });
    assert.equal(next.currentStreak, 4);
    assert.equal(next.longestStreak, 5);
  });

  it("resets after a missed day", () => {
    const next = nextStreakState({
      currentStreak: 7,
      longestStreak: 7,
      lastCompletionDate: "2026-08-07",
      today: "2026-08-10",
    });
    assert.equal(next.currentStreak, 1);
  });

  it("marks at-risk when last was yesterday", () => {
    const status = getStreakStatus({
      currentStreak: 4,
      longestStreak: 4,
      lastCompletionDate: "2026-08-09",
      today: "2026-08-10",
      now: new Date(2026, 7, 10, 12),
    });
    // protectedToday uses candidate keys for "now"; with explicit today/last mismatch:
    assert.equal(status.atRisk, true);
    assert.equal(status.protectedToday, false);
  });
});
