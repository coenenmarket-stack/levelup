import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ACHIEVEMENT_TEMPLATES, progressForAchievement } from "./achievements.ts";

describe("achievements", () => {
  it("has 30–40 templates", () => {
    assert.ok(ACHIEVEMENT_TEMPLATES.length >= 30);
    assert.ok(ACHIEVEMENT_TEMPLATES.length <= 40);
  });

  it("has unique keys", () => {
    const keys = ACHIEVEMENT_TEMPLATES.map((t) => t.key);
    assert.equal(new Set(keys).size, keys.length);
  });

  it("computes quest milestone progress excluding weekly claims", () => {
    const progress = progressForAchievement("10-quests", {
      allComps: [
        { category: "health" },
        { category: "wealth" },
        { kind: "weeklyChallenge", weekId: "2026-W32" },
      ],
      character: { longestStreak: 2, level: 3 },
      categoryLevels: { health: 2, wealth: 1, career: 1, family: 1, mindset: 1 },
    });
    assert.equal(progress, 2);
  });

  it("computes weekly-sweep from claims in one week", () => {
    const progress = progressForAchievement("weekly-sweep", {
      allComps: [
        { kind: "weeklyChallenge", weekId: "2026-W32" },
        { kind: "weeklyChallenge", weekId: "2026-W32" },
        { kind: "weeklyChallenge", weekId: "2026-W32" },
        { kind: "weeklyChallenge", weekId: "2026-W31" },
      ],
      character: { longestStreak: 1, level: 1 },
      categoryLevels: { health: 1, wealth: 1, career: 1, family: 1, mindset: 1 },
    });
    assert.equal(progress, 3);
  });

  it("counts all five skills with legacy mapping", () => {
    const progress = progressForAchievement("all-five-skills", {
      allComps: [
        { category: "health" },
        { category: "finance" },
        { category: "career" },
        { category: "family" },
        { category: "learning" },
      ],
      character: { longestStreak: 1, level: 1 },
      categoryLevels: { health: 1, wealth: 1, career: 1, family: 1, mindset: 1 },
    });
    assert.equal(progress, 5);
  });
});
