import {
  CATEGORY_KEYS,
  QUEST_CATALOG,
  type QuestCatalogCategory,
  type QuestCatalogItem,
} from "./questCatalog";

export type SkillKey = QuestCatalogCategory;

export type PackPick = {
  catalogId: string;
  title: string;
  description: string;
  category: SkillKey;
  difficulty: "easy" | "medium" | "hard";
  xpReward: number;
};

/** Default primary daily pack size (Phase 2 UX). */
export const DAILY_PACK_SIZE = 3;

/**
 * Skill slots for a daily pack.
 * Default 3: one quest each from the three weakest skills (strong variety, lower load).
 * Legacy 5-slot pattern (2× weakest, 1× next three) kept for fill math when refreshing old packs.
 */
export function biasedSkillSlots(
  catLevels: Record<string, number>,
  count: number = DAILY_PACK_SIZE,
): SkillKey[] {
  const sorted = [...CATEGORY_KEYS].sort(
    (a, b) => (catLevels[a] ?? 1) - (catLevels[b] ?? 1) || a.localeCompare(b),
  );
  if (count <= 3) {
    return sorted.slice(0, count);
  }
  // Legacy 5-pack pattern
  const pattern: SkillKey[] = [sorted[0], sorted[0], sorted[1], sorted[2], sorted[3]];
  return pattern.slice(0, count);
}

/** Fill remaining slots after a refresh keeps some completed quests. */
export function biasedSlotsFilling(
  catLevels: Record<string, number>,
  keptCategories: SkillKey[],
  need: number,
  targetSize: number = DAILY_PACK_SIZE,
): SkillKey[] {
  if (need <= 0) return [];
  const remaining = biasedSkillSlots(catLevels, targetSize);
  for (const k of keptCategories) {
    const i = remaining.indexOf(k);
    if (i >= 0) remaining.splice(i, 1);
  }
  const sorted = [...CATEGORY_KEYS].sort(
    (a, b) => (catLevels[a] ?? 1) - (catLevels[b] ?? 1) || a.localeCompare(b),
  );
  while (remaining.length < need) remaining.push(sorted[0]);
  return remaining.slice(0, need);
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function poolForCategory(category: SkillKey, preferDaily: boolean): QuestCatalogItem[] {
  const all = QUEST_CATALOG.filter((q) => q.category === category);
  if (!preferDaily) return all;
  const daily = all.filter((q) => q.isDaily);
  return daily.length >= 3 ? daily : all;
}

/**
 * Pick catalog items for skill slots. Deterministic from seed so the same
 * uid+day gets a stable pack; excludeIds avoid recent duplicates.
 */
export function pickCatalogForSlots(
  slots: SkillKey[],
  seed: string,
  excludeIds: Set<string> = new Set(),
): PackPick[] {
  const picked: PackPick[] = [];
  const used = new Set<string>(excludeIds);
  const base = hashStr(seed);

  slots.forEach((category, slotIndex) => {
    let pool = poolForCategory(category, true).filter((q) => !used.has(q.id));
    if (pool.length === 0) {
      pool = poolForCategory(category, false).filter((q) => !used.has(q.id));
    }
    if (pool.length === 0) {
      pool = poolForCategory(category, false);
    }
    const idx = pool.length ? (base + slotIndex * 97) % pool.length : 0;
    const item = pool[idx] ?? QUEST_CATALOG.find((q) => q.category === category)!;
    used.add(item.id);
    picked.push({
      catalogId: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      difficulty: item.difficulty,
      xpReward: item.xpReward,
    });
  });

  return picked;
}

export function orderPackBySkill<T extends { category: string }>(quests: T[]): T[] {
  return [...quests].sort(
    (a, b) => CATEGORY_KEYS.indexOf(a.category as SkillKey) - CATEGORY_KEYS.indexOf(b.category as SkillKey),
  );
}

/** Deterministic Firestore quest id for a catalog pick in today's pack. */
export function packQuestDocId(day: string, catalogId: string): string {
  return `pack_${day}_${catalogId}`;
}
