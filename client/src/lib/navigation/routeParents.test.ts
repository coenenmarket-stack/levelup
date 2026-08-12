import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeLocation, parentRouteFor } from "./routeParents";

describe("parentRouteFor", () => {
  it("returns null on home", () => {
    assert.equal(parentRouteFor("/"), null);
    assert.equal(parentRouteFor(""), null);
  });

  it("maps career path detail to list", () => {
    assert.equal(parentRouteFor("/career-paths/nursing"), "/career-paths");
  });

  it("maps invite to friends when friends enabled, else home", () => {
    // Default launch flags: friendsEnabled false
    assert.equal(parentRouteFor("/invite"), "/");
  });

  it("falls back to home for secondary pages", () => {
    assert.equal(parentRouteFor("/settings"), "/");
    assert.equal(parentRouteFor("/quests"), "/");
    assert.equal(parentRouteFor("/side-hustles"), "/");
  });
});

describe("normalizeLocation", () => {
  it("defaults empty to home", () => {
    assert.equal(normalizeLocation(""), "/");
    assert.equal(normalizeLocation("/quests"), "/quests");
  });
});
