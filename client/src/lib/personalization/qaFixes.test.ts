import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CAREER_PATHS,
  CAREER_PATH_COUNT,
  resolveCertId,
  resolveHustleId,
} from "../careerPaths.ts";
import { CERTIFICATIONS } from "../certifications.ts";
import { SIDE_HUSTLES } from "../sideHustles.ts";
import { QUEST_CATALOG } from "../questCatalog/index.ts";
import {
  personalizedDailySlots,
  rolesLooselyMatch,
  scoreCareerPath,
  scoreCertification,
  scoreSideHustle,
} from "./engine.ts";
import { DEFAULT_PERSONALIZATION, mergePrefs, type PersonalizationPrefs } from "./types.ts";
import { pickRecommendedNextAction } from "./nextAction.ts";
import { mergeCoachMemory } from "./coachMemory.ts";
import { mergeCertProgress } from "./guideProgress.ts";
import { resolveDailySlots, pickCatalogForSlots } from "../dailyPackAssign.ts";

function prefs(partial: Partial<PersonalizationPrefs>): PersonalizationPrefs {
  return { ...DEFAULT_PERSONALIZATION, ...partial };
}

describe("content cross-links", () => {
  it("has 30 career paths, 56 certs, 61 hustles, 750 quests", () => {
    assert.equal(CAREER_PATH_COUNT, 30);
    assert.equal(CAREER_PATHS.length, 30);
    assert.equal(CERTIFICATIONS.length, 56);
    assert.equal(SIDE_HUSTLES.length, 61);
    assert.equal(QUEST_CATALOG.length, 750);
  });

  it("has unique path ids and titles", () => {
    const ids = CAREER_PATHS.map((p) => p.id);
    const titles = CAREER_PATHS.map((p) => p.title);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(new Set(titles).size, titles.length);
  });

  it("resolves all path cert and hustle references", () => {
    const certIds = new Set(CERTIFICATIONS.map((c) => c.id));
    const hustleIds = new Set(SIDE_HUSTLES.map((h) => h.id));
    const skills = new Set(["health", "wealth", "career", "family", "mindset"]);
    for (const p of CAREER_PATHS) {
      assert.ok(p.milestones.length > 0, p.id);
      assert.ok(p.entryRoles.length > 0, p.id);
      assert.ok(p.targetRoles.length > 0, p.id);
      for (const s of p.relatedSkills) assert.ok(skills.has(s), `${p.id} ${s}`);
      for (const id of p.recommendedCertificationIds) {
        assert.ok(certIds.has(resolveCertId(id)), `${p.id} cert ${id}`);
      }
      for (const id of p.recommendedSideHustleIds) {
        assert.ok(hustleIds.has(resolveHustleId(id)), `${p.id} hustle ${id}`);
      }
    }
  });
});

describe("free-text role matching", () => {
  it("matches token overlap without exact strings", () => {
    assert.equal(rolesLooselyMatch("maintenance tech", "Maintenance Technician"), true);
    assert.equal(rolesLooselyMatch("help desk", "Help Desk Technician"), true);
    assert.equal(rolesLooselyMatch("asdf qwer zxcv", "Maintenance Supervisor"), false);
  });

  it("boosts path score for current/target role", () => {
    const path = CAREER_PATHS.find((p) => p.id === "maint-tech-to-supervisor")!;
    const base = scoreCareerPath(path, {
      prefs: prefs({ primaryGoal: "career" }),
      categoryLevels: { health: 2, wealth: 2, career: 2, family: 2, mindset: 2 },
    });
    const matched = scoreCareerPath(path, {
      prefs: prefs({
        primaryGoal: "career",
        currentRole: "Maintenance Tech",
        targetRole: "Maintenance Supervisor",
      }),
      categoryLevels: { health: 2, wealth: 2, career: 2, family: 2, mindset: 2 },
    });
    assert.ok(matched.score > base.score);
  });
});

describe("next-action weekly claimable", () => {
  it("surfaces claim_weekly when claimable and dailies done", () => {
    const action = pickRecommendedNextAction({
      prefs: prefs({ personalizationCompleted: true, softPromptDismissedAt: "x" }),
      dailyIncomplete: 0,
      dailyTotal: 3,
      weeklyClaimable: 2,
      streakBroken: false,
      topQuest: null,
      activeCareerPathId: null,
      careerPathTitle: null,
      activeCertId: null,
      activeCertTitle: null,
      activeHustleId: null,
      activeHustleTitle: null,
      hasOpenGoals: true,
    });
    assert.equal(action.kind, "claim_weekly");
  });

  it("keeps finish_daily ahead of weekly claimable", () => {
    const action = pickRecommendedNextAction({
      prefs: prefs({ personalizationCompleted: true, softPromptDismissedAt: "x" }),
      dailyIncomplete: 1,
      dailyTotal: 3,
      weeklyClaimable: 2,
      streakBroken: false,
      topQuest: null,
      activeCareerPathId: null,
      careerPathTitle: null,
      activeCertId: null,
      activeCertTitle: null,
      activeHustleId: null,
      activeHustleTitle: null,
      hasOpenGoals: true,
    });
    assert.equal(action.kind, "finish_daily_quests");
  });
});

describe("coach memory bounds", () => {
  it("clips oversized memory fields", () => {
    const mem = mergeCoachMemory({
      currentFocus: "x".repeat(500),
      activePlan: "y".repeat(500),
      lastRecommendation: "z".repeat(500),
      coachingGoals: Array.from({ length: 20 }, (_, i) => `goal-${i}-${"a".repeat(200)}`),
    });
    assert.ok((mem.currentFocus?.length ?? 0) <= 160);
    assert.ok((mem.activePlan?.length ?? 0) <= 280);
    assert.ok((mem.lastRecommendation?.length ?? 0) <= 280);
    assert.equal(mem.coachingGoals.length, 8);
    assert.ok(mem.coachingGoals.every((g) => g.length <= 120));
  });
});

describe("guide progress defaults", () => {
  it("merges missing cert progress safely", () => {
    const p = mergeCertProgress(null);
    assert.deepEqual(p.saved, []);
    assert.deepEqual(p.completed, []);
  });
});

describe("cert/hustle suppression", () => {
  it("suppresses certs when interest is no", () => {
    const cert = CERTIFICATIONS[0]!;
    const scored = scoreCertification(cert, {
      prefs: prefs({ certificationInterest: "no" }),
      categoryLevels: {},
    });
    assert.ok(scored.score < -20);
  });

  it("suppresses hustles when income is not_now", () => {
    const hustle = SIDE_HUSTLES[0]!;
    const scored = scoreSideHustle(hustle, {
      prefs: prefs({ incomeInterest: "not_now" }),
      categoryLevels: {},
    });
    assert.ok(scored.score < -20);
  });
});

describe("daily pack stability helpers", () => {
  it("legacy accounts without primary keep weakest slots", () => {
    const slots = resolveDailySlots(
      { health: 1, wealth: 2, career: 3, family: 4, mindset: 5 },
      mergePrefs(null),
    );
    assert.deepEqual(slots, ["health", "wealth", "career"]);
  });

  it("personalized slots stay three and primary-first", () => {
    const slots = personalizedDailySlots(
      prefs({ primaryGoal: "wealth", secondaryGoals: ["mindset"] }),
      { health: 1, wealth: 5, career: 3, family: 4, mindset: 2 },
    );
    assert.equal(slots.length, 3);
    assert.equal(slots[0], "wealth");
    assert.equal(new Set(slots).size, 3);
  });

  it("pickCatalogForSlots returns unique ids with prefs", () => {
    const slots = personalizedDailySlots(
      prefs({ primaryGoal: "career", personalizationCompleted: true }),
      { health: 1, wealth: 2, career: 3, family: 4, mindset: 5 },
    );
    const picks = pickCatalogForSlots(slots, "qa:seed", new Set(), {
      prefs: prefs({ primaryGoal: "career", personalizationCompleted: true }),
      categoryLevels: { health: 1, wealth: 2, career: 3, family: 4, mindset: 5 },
    });
    assert.equal(picks.length, 3);
    assert.equal(new Set(picks.map((p) => p.catalogId)).size, 3);
  });
});
