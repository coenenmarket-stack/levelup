import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DAILY_PACK_SIZE,
  biasedSkillSlots,
  pickCatalogForSlots,
} from "./dailyPackAssign.ts";

describe("dailyPackAssign", () => {
  it("defaults to 3 primary quests", () => {
    assert.equal(DAILY_PACK_SIZE, 3);
  });

  it("picks three weakest skills without doubling when size is 3", () => {
    const slots = biasedSkillSlots({ health: 1, wealth: 2, career: 3, family: 4, mindset: 5 }, 3);
    assert.deepEqual(slots, ["health", "wealth", "career"]);
  });

  it("uses legacy 5-pack pattern when requested", () => {
    const slots = biasedSkillSlots({ health: 1, wealth: 2, career: 3, family: 4, mindset: 5 }, 5);
    assert.deepEqual(slots, ["health", "health", "wealth", "career", "family"]);
  });

  it("returns unique catalog ids for a pack", () => {
    const slots = biasedSkillSlots({ health: 1, wealth: 1, career: 1, family: 1, mindset: 1 }, 3);
    const picks = pickCatalogForSlots(slots, "uid:2026-08-10:n:");
    assert.equal(picks.length, 3);
    const ids = new Set(picks.map((p) => p.catalogId));
    assert.equal(ids.size, 3);
  });
});
