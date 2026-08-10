/**
 * Phase 3 personalization preference model.
 * Stored at characters/{uid}/personalization/prefs — owner-only via character rules.
 */

export type SkillGoalKey = "health" | "wealth" | "career" | "family" | "mindset" | "balance";

export type EmploymentStatus =
  | "employed"
  | "student"
  | "between_jobs"
  | "self_employed"
  | "building_business"
  | "prefer_not";

export type DailyTimeCommitment = "5" | "15" | "30" | "45";

export type ChallengeIntensity = "easy" | "balanced" | "push";

export type CareerInterest =
  | "management"
  | "trades"
  | "technology"
  | "business"
  | "hospitality"
  | "maintenance"
  | "healthcare"
  | "sales"
  | "entrepreneurship"
  | "unsure";

export type IncomeInterest = "side_hustles" | "career_advancement" | "both" | "not_now";

export type CertificationInterest = "yes" | "maybe" | "no";

export type PersonalizationPrefs = {
  primaryGoal: SkillGoalKey | null;
  secondaryGoals: SkillGoalKey[];
  employmentStatus: EmploymentStatus | null;
  dailyTimeCommitment: DailyTimeCommitment;
  challengeIntensity: ChallengeIntensity;
  careerInterests: CareerInterest[];
  incomeInterest: IncomeInterest;
  certificationInterest: CertificationInterest;
  currentRole: string | null;
  targetRole: string | null;
  activeCareerPathId: string | null;
  personalizationCompleted: boolean;
  softPromptDismissedAt: string | null;
  updatedAt: string | null;
};

export const DEFAULT_PERSONALIZATION: PersonalizationPrefs = {
  primaryGoal: null,
  secondaryGoals: [],
  employmentStatus: null,
  dailyTimeCommitment: "15",
  challengeIntensity: "balanced",
  careerInterests: [],
  incomeInterest: "not_now",
  certificationInterest: "maybe",
  currentRole: null,
  targetRole: null,
  activeCareerPathId: null,
  personalizationCompleted: false,
  softPromptDismissedAt: null,
  updatedAt: null,
};

/** Safe merge for legacy accounts — missing fields get defaults. */
export function mergePrefs(raw: Partial<PersonalizationPrefs> | null | undefined): PersonalizationPrefs {
  return {
    ...DEFAULT_PERSONALIZATION,
    ...(raw ?? {}),
    secondaryGoals: Array.isArray(raw?.secondaryGoals) ? raw!.secondaryGoals.slice(0, 3) : [],
    careerInterests: Array.isArray(raw?.careerInterests) ? raw!.careerInterests : [],
  };
}

export function shouldShowSoftPersonalizePrompt(prefs: PersonalizationPrefs): boolean {
  if (prefs.personalizationCompleted) return false;
  if (prefs.softPromptDismissedAt) return false;
  return true;
}

/** Map UI goal → skill keys used by catalog / pack. */
export function goalToSkills(goal: SkillGoalKey): Array<"health" | "wealth" | "career" | "family" | "mindset"> {
  if (goal === "balance") return ["health", "wealth", "career", "family", "mindset"];
  return [goal];
}

export const PRIMARY_GOAL_OPTIONS: { key: SkillGoalKey; label: string; blurb: string }[] = [
  { key: "health", label: "Health & Fitness", blurb: "Energy, movement, recovery" },
  { key: "wealth", label: "Money", blurb: "Budgeting, saving, income skills" },
  { key: "career", label: "Career", blurb: "Skills, leadership, advancement" },
  { key: "family", label: "Relationships / Family", blurb: "Connection and presence" },
  { key: "mindset", label: "Mindset", blurb: "Focus, habits, learning" },
  { key: "balance", label: "Overall Life Balance", blurb: "Grow evenly across skills" },
];

export const CAREER_INTEREST_OPTIONS: { key: CareerInterest; label: string }[] = [
  { key: "management", label: "Management / Leadership" },
  { key: "trades", label: "Skilled Trades" },
  { key: "technology", label: "Technology" },
  { key: "business", label: "Business" },
  { key: "hospitality", label: "Hospitality / Food Service" },
  { key: "maintenance", label: "Maintenance / Facilities" },
  { key: "healthcare", label: "Healthcare" },
  { key: "sales", label: "Sales / Marketing" },
  { key: "entrepreneurship", label: "Entrepreneurship" },
  { key: "unsure", label: "Not sure yet" },
];

export type ScoredRecommendation<T> = {
  item: T;
  score: number;
  reasons: string[];
};
