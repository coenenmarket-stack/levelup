import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SCORE_WEIGHTS,
  personalizedDailySlots,
  rankAll,
  scoreCareerPath,
  scoreCertification,
  scoreQuest,
  scoreSideHustle,
} from "./engine.ts";
import { DEFAULT_PERSONALIZATION, mergePrefs, type PersonalizationPrefs } from "./types.ts";
import { shouldShowSoftPersonalizePrompt } from "./types.ts";
import { feedbackToPenalties, type RecFeedback } from "./feedback.ts";
import { pickRecommendedNextAction } from "./nextAction.ts";
import { computeGoalProgress, type UserGoal } from "./goals.ts";
import { CAREER_PATHS } from "../careerPaths.ts";
import { CERTIFICATIONS } from "../certifications.ts";
import { SIDE_HUSTLES } from "../sideHustles.ts";
import { QUEST_CATALOG } from "../questCatalog/index.ts";
import { resolveDailySlots } from "../dailyPackAssign.ts";

function prefs(partial: Partial<PersonalizationPrefs>): PersonalizationPrefs {
  return { ...DEFAULT_PERSONALIZATION, ...partial };
}

describe("personalization defaults & legacy", () => {
  it("uses safe defaults for missing prefs", () => {
    const m = mergePrefs(null);
    assert.equal(m.dailyTimeCommitment, "15");
    assert.equal(m.challengeIntensity, "balanced");
    assert.equal(m.personalizationCompleted, false);
    assert.deepEqual(m.secondaryGoals, []);
  });

  it("caps secondary goals at 3", () => {
    const m = mergePrefs({
      secondaryGoals: ["health", "wealth", "career", "family"] as any,
    });
    assert.equal(m.secondaryGoals.length, 3);
  });

  it("soft prompt shows for legacy accounts once", () => {
    assert.equal(shouldShowSoftPersonalizePrompt(DEFAULT_PERSONALIZATION), true);
    assert.equal(
      shouldShowSoftPersonalizePrompt(
        prefs({ softPromptDismissedAt: "2026-01-01T00:00:00.000Z" }),
      ),
      false,
    );
    assert.equal(
      shouldShowSoftPersonalizePrompt(prefs({ personalizationCompleted: true })),
      false,
    );
  });
});

describe("quest scoring", () => {
  const levels = { health: 1, wealth: 3, career: 2, family: 4, mindset: 5 };
  const base = prefs({
    primaryGoal: "career",
    secondaryGoals: ["wealth"],
    personalizationCompleted: true,
    dailyTimeCommitment: "15",
    challengeIntensity: "balanced",
  });

  it("weights primary goal higher than unrelated skills", () => {
    const careerQ = QUEST_CATALOG.find((q) => q.category === "career")!;
    const familyQ = QUEST_CATALOG.find((q) => q.category === "family")!;
    const a = scoreQuest(careerQ, { prefs: base, categoryLevels: levels });
    const b = scoreQuest(familyQ, { prefs: base, categoryLevels: levels });
    assert.ok(a.score > b.score);
    assert.ok(a.reasons.some((r) => /primary/i.test(r)));
  });

  it("applies secondary goal boost", () => {
    const wealthQ = QUEST_CATALOG.find((q) => q.category === "wealth")!;
    const familyQ = QUEST_CATALOG.find((q) => q.category === "family")!;
    const a = scoreQuest(wealthQ, { prefs: base, categoryLevels: levels });
    const b = scoreQuest(familyQ, { prefs: base, categoryLevels: levels });
    assert.ok(a.score > b.score);
  });

  it("penalizes recently completed catalog ids", () => {
    const q = QUEST_CATALOG.find((x) => x.category === "career")!;
    const fresh = scoreQuest(q, { prefs: base, categoryLevels: levels });
    const recent = scoreQuest(q, {
      prefs: base,
      categoryLevels: levels,
      recentCatalogIds: new Set([q.id]),
    });
    assert.equal(recent.score, fresh.score - SCORE_WEIGHTS.recentPenalty);
  });

  it("boosts weakest skill", () => {
    const healthQ = QUEST_CATALOG.find((q) => q.category === "health")!;
    const mindsetQ = QUEST_CATALOG.find((q) => q.category === "mindset")!;
    const a = scoreQuest(healthQ, {
      prefs: prefs({ primaryGoal: "balance" }),
      categoryLevels: levels,
    });
    const b = scoreQuest(mindsetQ, {
      prefs: prefs({ primaryGoal: "balance" }),
      categoryLevels: levels,
    });
    assert.ok(a.score > b.score);
  });
});

describe("daily personalization slots", () => {
  it("keeps three distinct skill roles: primary, weak, balance", () => {
    const slots = personalizedDailySlots(
      prefs({ primaryGoal: "career", secondaryGoals: ["mindset"] }),
      { health: 1, wealth: 2, career: 5, family: 3, mindset: 4 },
    );
    assert.equal(slots.length, 3);
    assert.equal(slots[0], "career");
    assert.equal(slots[1], "health");
    assert.ok(slots.includes("mindset") || slots[2] !== "career");
  });

  it("resolveDailySlots falls back to weakest bias without primary goal", () => {
    const slots = resolveDailySlots({ health: 1, wealth: 2, career: 3, family: 4, mindset: 5 }, DEFAULT_PERSONALIZATION);
    assert.deepEqual(slots, ["health", "wealth", "career"]);
  });
});

describe("cert / hustle / path ranking", () => {
  const ctx = {
    prefs: prefs({
      primaryGoal: "career",
      careerInterests: ["technology"],
      certificationInterest: "yes",
      incomeInterest: "both",
      personalizationCompleted: true,
    }),
    categoryLevels: { health: 2, wealth: 2, career: 2, family: 2, mindset: 2 },
  };

  it("ranks tech certs higher for technology interest", () => {
    const ranked = rankAll(CERTIFICATIONS, scoreCertification, ctx, 5);
    assert.ok(ranked.length > 0);
    assert.ok(ranked[0]!.score > 0);
    assert.ok(ranked[0]!.reasons.length > 0);
  });

  it("hides certs when interest is no", () => {
    const off = {
      ...ctx,
      prefs: prefs({ ...ctx.prefs, certificationInterest: "no" }),
    };
    const ranked = rankAll(CERTIFICATIONS, scoreCertification, off, 5);
    assert.equal(ranked.length, 0);
  });

  it("ranks hustles when income interest is on", () => {
    const ranked = rankAll(SIDE_HUSTLES, scoreSideHustle, ctx, 5);
    assert.ok(ranked.length > 0);
  });

  it("ranks technology career paths highly", () => {
    const ranked = rankAll(CAREER_PATHS, scoreCareerPath, ctx, 5);
    assert.ok(ranked.length > 0);
    assert.ok(
      ranked.some((r) => r.item.careerInterests.includes("technology")),
    );
  });
});

describe("recommendation feedback", () => {
  it("maps not_interested to dismiss + full penalty", () => {
    const list: RecFeedback[] = [
      {
        entityId: "path-a",
        entityType: "career_path",
        kind: "not_interested",
        updatedAt: "x",
      },
      {
        entityId: "cert-b",
        entityType: "certification",
        kind: "show_less",
        updatedAt: "x",
      },
    ];
    const { penalties, dismissedIds } = feedbackToPenalties(list);
    assert.ok(dismissedIds.has("path-a"));
    assert.equal(penalties["path-a"], 1);
    assert.equal(penalties["cert-b"], 0.55);
  });
});

describe("recommended next action", () => {
  it("prioritizes personalization soft prompt", () => {
    const action = pickRecommendedNextAction({
      prefs: DEFAULT_PERSONALIZATION,
      dailyIncomplete: 3,
      dailyTotal: 3,
      weeklyClaimable: 0,
      streakBroken: false,
      topQuest: null,
      activeCareerPathId: null,
      careerPathTitle: null,
      activeCertId: null,
      activeCertTitle: null,
      activeHustleId: null,
      activeHustleTitle: null,
      hasOpenGoals: false,
    });
    assert.equal(action.kind, "complete_onboarding_personalization");
  });

  it("prioritizes finishing dailies when personalized", () => {
    const action = pickRecommendedNextAction({
      prefs: prefs({ personalizationCompleted: true, softPromptDismissedAt: "x" }),
      dailyIncomplete: 2,
      dailyTotal: 3,
      weeklyClaimable: 0,
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

describe("goal progress", () => {
  it("computes career path milestone progress", () => {
    const goal: UserGoal = {
      id: "g1",
      title: "Path",
      type: "career_path",
      target: null,
      status: "active",
      createdAt: "x",
      updatedAt: "x",
      targetDate: null,
      relatedEntityId: "p",
      manualProgress: 0,
    };
    assert.equal(computeGoalProgress(goal, { pathMilestoneDone: 2, pathMilestoneTotal: 5 }), 40);
  });
});
