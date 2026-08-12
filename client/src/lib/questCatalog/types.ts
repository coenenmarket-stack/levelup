export type QuestCatalogCategory =
  | "health"
  | "wealth"
  | "career"
  | "family"
  | "mindset";

export type QuestCatalogDifficulty = "easy" | "medium" | "hard";

export type QuestCatalogItem = {
  id: string;
  title: string;
  /** Short “why it matters” line. */
  description: string;
  /** Clear steps for how to complete the quest. */
  howto?: string;
  category: QuestCatalogCategory;
  difficulty: QuestCatalogDifficulty;
  xpReward: number;
  isDaily: boolean;
};

/** Shared explanation shape for catalog + runtime quests. */
export type QuestExplanation = {
  what: string;
  howto: string;
  why: string;
};

export function explainQuest(input: {
  title: string;
  description?: string | null;
  howto?: string | null;
  category?: string | null;
  isDaily?: boolean | null;
}): QuestExplanation {
  const title = input.title.trim();
  const description = (input.description ?? "").trim();
  const category = (input.category ?? "life").trim() || "life";
  const cadence = input.isDaily ? "You can earn XP for this once per day." : "Side quests stay on your list until you complete them.";

  const what = title
    ? `Your mission: ${title}.`
    : "Complete this quest as written.";

  const howto =
    (input.howto ?? "").trim() ||
    [
      `1. Read the title carefully so you know the finish line.`,
      `2. Do the action fully — quality over rushing.`,
      `3. When you're done, tap the ring to mark it complete and earn XP.`,
      cadence,
    ].join(" ");

  const why = description
    ? `${description} This builds your ${category} skill over time.`
    : `Small, finished actions compound. This quest builds your ${category} skill and protects your streak.`;

  return { what, howto, why };
}
