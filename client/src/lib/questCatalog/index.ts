import { HEALTH_QUESTS } from "./health";
import { WEALTH_QUESTS } from "./wealth";
import { CAREER_QUESTS } from "./career";
import { FAMILY_QUESTS } from "./family";
import { MINDSET_QUESTS } from "./mindset";
import type { QuestCatalogCategory, QuestCatalogDifficulty, QuestCatalogItem } from "./types";

export type { QuestCatalogCategory, QuestCatalogDifficulty, QuestCatalogItem } from "./types";

export const XP_BY_DIFFICULTY = { easy: 10, medium: 25, hard: 50 } as const;

export const CATEGORY_KEYS: QuestCatalogCategory[] = [
  "health",
  "wealth",
  "career",
  "family",
  "mindset",
];

export const QUEST_CATALOG: QuestCatalogItem[] = [
  ...HEALTH_QUESTS,
  ...WEALTH_QUESTS,
  ...CAREER_QUESTS,
  ...FAMILY_QUESTS,
  ...MINDSET_QUESTS,
];

export function getCatalogByCategory(category: QuestCatalogCategory): QuestCatalogItem[] {
  return QUEST_CATALOG.filter((q) => q.category === category);
}

export function filterCatalog(opts: {
  category?: QuestCatalogCategory;
  difficulty?: QuestCatalogDifficulty;
  search?: string;
}): QuestCatalogItem[] {
  const q = (opts.search ?? "").trim().toLowerCase();
  return QUEST_CATALOG.filter((item) => {
    if (opts.category && item.category !== opts.category) return false;
    if (opts.difficulty && item.difficulty !== opts.difficulty) return false;
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });
}

export {
  HEALTH_QUESTS,
  WEALTH_QUESTS,
  CAREER_QUESTS,
  FAMILY_QUESTS,
  MINDSET_QUESTS,
};
