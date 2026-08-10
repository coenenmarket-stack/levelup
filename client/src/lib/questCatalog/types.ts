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
  description: string;
  category: QuestCatalogCategory;
  difficulty: QuestCatalogDifficulty;
  xpReward: number;
  isDaily: boolean;
};
