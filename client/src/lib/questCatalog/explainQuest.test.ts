import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { explainQuest } from "./types";

describe("explainQuest", () => {
  it("uses provided howto and description", () => {
    const out = explainQuest({
      title: "Drink water",
      description: "Stay hydrated",
      howto: "1. Fill a glass.\n2. Drink it.",
      category: "health",
      isDaily: true,
    });
    assert.match(out.what, /Drink water/);
    assert.equal(out.howto, "1. Fill a glass.\n2. Drink it.");
    assert.match(out.why, /Stay hydrated/);
    assert.match(out.why, /health/);
  });

  it("synthesizes howto when missing", () => {
    const out = explainQuest({
      title: "Take a walk",
      description: "Clear your head",
      category: "health",
      isDaily: true,
    });
    assert.match(out.howto, /Mark/i);
    assert.match(out.howto, /ring|complete/i);
  });
});
