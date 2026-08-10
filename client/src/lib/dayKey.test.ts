/**
 * Focused unit tests for Phase 2 day/streak/pack/weekly helpers.
 * Run: npx tsx --test client/src/lib/dayKey.test.ts client/src/lib/streak.test.ts client/src/lib/dailyPackAssign.test.ts client/src/lib/achievements.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  candidateDayKeys,
  dayDiff,
  dayKeyLocal,
  dayKeyUtc,
  isCompletionToday,
  isoWeekIdLocal,
} from "./dayKey.ts";

describe("dayKeyLocal", () => {
  it("formats local calendar components", () => {
    // Construct a local date that is unambiguous
    const d = new Date(2026, 7, 10, 15, 30, 0); // Aug 10 2026 local
    assert.equal(dayKeyLocal(d), "2026-08-10");
  });

  it("differs from UTC near midnight for west-of-UTC zones when applicable", () => {
    // Simulate: local evening Aug 10 that is already Aug 11 UTC
    // We can't change process TZ reliably; instead compare helpers on a fixed Instant.
    const instant = new Date("2026-08-11T02:00:00.000Z"); // Aug 10 evening in America/Chicago
    const local = dayKeyLocal(instant);
    const utc = dayKeyUtc(instant);
    // In UTC this is Aug 11; in US Central it's still Aug 10.
    assert.equal(utc, "2026-08-11");
    // Local depends on the runner's TZ — assert candidateDayKeys includes both when different
    const keys = candidateDayKeys(instant);
    assert.ok(keys.includes(utc));
    assert.ok(keys.includes(local));
    assert.ok(keys.length === 1 || keys.length === 2);
  });

  it("dayDiff is calendar-based", () => {
    assert.equal(dayDiff("2026-08-10", "2026-08-11"), 1);
    assert.equal(dayDiff("2026-08-10", "2026-08-10"), 0);
    assert.equal(dayDiff("2026-08-10", "2026-08-13"), 3);
  });

  it("isCompletionToday accepts local or legacy utc candidate", () => {
    const instant = new Date("2026-08-11T02:00:00.000Z");
    const keys = candidateDayKeys(instant);
    for (const k of keys) {
      assert.equal(isCompletionToday(k, instant), true);
    }
    assert.equal(isCompletionToday("1999-01-01", instant), false);
  });

  it("isoWeekIdLocal returns YYYY-Www", () => {
    const id = isoWeekIdLocal(new Date(2026, 7, 10));
    assert.match(id, /^\d{4}-W\d{2}$/);
  });
});
