/**
 * Focused unit tests for Phase 2 day/streak/pack/weekly helpers.
 * Run: npm run test:unit
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  blocksDuplicateForToday,
  candidateDayKeys,
  dayDiff,
  dayKeyInTimeZone,
  dayKeyLocal,
  dayKeyUtc,
  isCompletionToday,
  isoWeekBoundsLocal,
  isoWeekIdLocal,
} from "./dayKey.ts";

describe("dayKeyLocal", () => {
  it("formats local calendar components", () => {
    const d = new Date(2026, 7, 10, 15, 30, 0);
    assert.equal(dayKeyLocal(d), "2026-08-10");
  });

  it("maps timezone midnights via dayKeyInTimeZone", () => {
    // Chicago 23:59 Aug 10 CDT == 04:59 UTC Aug 11
    const before = new Date("2026-08-11T04:59:00.000Z");
    assert.equal(dayKeyInTimeZone(before, "America/Chicago"), "2026-08-10");
    assert.equal(dayKeyUtc(before), "2026-08-11");

    const after = new Date("2026-08-11T05:00:00.000Z");
    assert.equal(dayKeyInTimeZone(after, "America/Chicago"), "2026-08-11");

    // Sydney 00:00 Aug 11 AEST == 14:00 UTC Aug 10
    const syd = new Date("2026-08-10T14:00:00.000Z");
    assert.equal(dayKeyInTimeZone(syd, "Australia/Sydney"), "2026-08-11");
    assert.equal(dayKeyUtc(syd), "2026-08-10");

    // LA 23:59 Aug 10 PDT
    const la = new Date("2026-08-11T06:59:00.000Z");
    assert.equal(dayKeyInTimeZone(la, "America/Los_Angeles"), "2026-08-10");
  });

  it("keeps a stable local day across US spring DST jump", () => {
    const before = new Date("2026-03-08T07:59:00.000Z"); // 01:59 CST
    const after = new Date("2026-03-08T08:00:00.000Z"); // 03:00 CDT
    assert.equal(dayKeyInTimeZone(before, "America/Chicago"), "2026-03-08");
    assert.equal(dayKeyInTimeZone(after, "America/Chicago"), "2026-03-08");
  });

  it("candidateDayKeys always includes UTC and local", () => {
    const instant = new Date("2026-08-11T02:00:00.000Z");
    const keys = candidateDayKeys(instant);
    assert.ok(keys.includes(dayKeyUtc(instant)));
    assert.ok(keys.includes(dayKeyLocal(instant)));
  });

  it("blocksDuplicateForToday covers local and legacy UTC same window", () => {
    const now = new Date("2026-08-11T02:00:00.000Z");
    const local = dayKeyLocal(now);
    const utc = dayKeyUtc(now);
    assert.equal(blocksDuplicateForToday([local], now), true);
    assert.equal(blocksDuplicateForToday([utc], now), true);
    assert.equal(blocksDuplicateForToday(["1999-01-01"], now), false);
  });

  it("dayDiff is calendar-based", () => {
    assert.equal(dayDiff("2026-08-10", "2026-08-11"), 1);
    assert.equal(dayDiff("2026-08-10", "2026-08-10"), 0);
    assert.equal(dayDiff("2026-08-10", "2026-08-13"), 3);
  });

  it("isCompletionToday accepts local or legacy utc candidate", () => {
    const instant = new Date("2026-08-11T02:00:00.000Z");
    for (const k of candidateDayKeys(instant)) {
      assert.equal(isCompletionToday(k, instant), true);
    }
    assert.equal(isCompletionToday("1999-01-01", instant), false);
  });

  it("iso week edges around year boundary", () => {
    const sun = new Date(2026, 11, 27, 12);
    const mon = new Date(2026, 11, 28, 12);
    const jan1 = new Date(2027, 0, 1, 12);
    assert.equal(isoWeekIdLocal(sun), "2026-W52");
    assert.equal(isoWeekIdLocal(mon), "2026-W53");
    assert.equal(isoWeekIdLocal(jan1), "2026-W53");
    const bounds = isoWeekBoundsLocal("2026-W53");
    assert.equal(bounds.start, "2026-12-28");
    assert.equal(bounds.end, "2027-01-03");
  });
});
