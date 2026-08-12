import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OSRS_XP_CHECKPOINTS,
  SKILL_MAX_LEVEL,
  applySkillXp,
  levelFromTotalXp,
  xpForLevel,
  xpToNextSkillLevel,
} from "./osrsXp";

describe("OSRS XP curve", () => {
  it("matches classic cumulative XP checkpoints", () => {
    for (const [lvl, xp] of Object.entries(OSRS_XP_CHECKPOINTS)) {
      assert.equal(xpForLevel(Number(lvl)), xp, `level ${lvl}`);
    }
  });

  it("levelFromTotalXp round-trips checkpoints", () => {
    for (const [lvl, xp] of Object.entries(OSRS_XP_CHECKPOINTS)) {
      assert.equal(levelFromTotalXp(xp), Number(lvl), `xp ${xp} → level ${lvl}`);
    }
  });

  it("caps at 99", () => {
    assert.equal(levelFromTotalXp(99_999_999), SKILL_MAX_LEVEL);
    assert.equal(xpToNextSkillLevel(99), 0);
  });

  it("applySkillXp levels up and tracks remainder", () => {
    // 0 XP + 83 → exactly level 2
    const a = applySkillXp(0, 83);
    assert.equal(a.level, 2);
    assert.equal(a.xp, 0);
    assert.equal(a.leveledUp, true);

    // Mid-level progress
    const b = applySkillXp(0, 40);
    assert.equal(b.level, 1);
    assert.equal(b.xp, 40);
    assert.equal(b.xpToNext, 83);
  });
});
