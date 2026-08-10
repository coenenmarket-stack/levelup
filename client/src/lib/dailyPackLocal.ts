/**
 * Catalog-driven daily pack assignment.
 * Reuses the 750-quest catalog + existing quest/completion docs.
 * Same cache shape as CF generateQuests: characters/{uid}/dailyPacks/{YYYY-MM-DD}.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  biasedSkillSlots,
  biasedSlotsFilling,
  orderPackBySkill,
  packQuestDocId,
  pickCatalogForSlots,
  type PackPick,
  type SkillKey,
} from "./dailyPackAssign";
import { dayKeyUtc } from "./streak";

export type DailyPackQuest = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  xpReward: number;
  isDaily: boolean;
  active: boolean;
  catalogId: string;
  dailyPackDate: string;
  source: "catalog";
  createdAt: string;
};

export type DailyPackResult = {
  quests: DailyPackQuest[];
  cached?: boolean;
  allComplete?: boolean;
  source: "catalog";
};

async function readCategoryLevels(uid: string): Promise<Record<string, number>> {
  const snap = await getDocs(collection(db, "characters", uid, "categories"));
  const levels: Record<string, number> = {};
  snap.forEach((d) => {
    const v = d.data() as any;
    if (v.key) levels[v.key] = v.level ?? 1;
  });
  return levels;
}

async function getTodayCompletedQuestIds(uid: string, today: string): Promise<Set<string>> {
  const snap = await getDocs(
    query(
      collection(db, "characters", uid, "completions"),
      where("completionDate", "==", today),
    ),
  );
  return new Set(snap.docs.map((d) => String((d.data() as any).questId)));
}

/** Catalog IDs used in recent packs (variety). */
async function recentCatalogIds(uid: string, today: string, lookbackDays = 7): Promise<Set<string>> {
  const out = new Set<string>();
  const base = new Date(today + "T00:00:00.000Z");
  for (let i = 1; i <= lookbackDays; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const cache = await getDoc(doc(db, "characters", uid, "dailyPacks", key));
    if (!cache.exists()) continue;
    const ids: string[] = (cache.data() as any).catalogIds ?? [];
    ids.forEach((id) => out.add(id));
  }
  return out;
}

async function persistPicks(
  uid: string,
  today: string,
  picks: PackPick[],
): Promise<DailyPackQuest[]> {
  const now = new Date().toISOString();
  const quests: DailyPackQuest[] = [];
  for (const p of picks) {
    const id = packQuestDocId(today, p.catalogId);
    const payload: DailyPackQuest = {
      id,
      title: p.title,
      description: p.description,
      category: p.category,
      difficulty: p.difficulty,
      xpReward: p.xpReward,
      isDaily: true,
      active: true,
      catalogId: p.catalogId,
      dailyPackDate: today,
      source: "catalog",
      createdAt: now,
    };
    await setDoc(doc(db, "characters", uid, "quests", id), payload, { merge: true });
    quests.push(payload);
  }
  return quests;
}

async function loadQuestsByIds(uid: string, ids: string[]): Promise<DailyPackQuest[]> {
  const docs = await Promise.all(ids.map((id) => getDoc(doc(db, "characters", uid, "quests", id))));
  return docs
    .filter((d) => d.exists())
    .map((d) => ({ id: d.id, ...(d.data() as any) } as DailyPackQuest));
}

/**
 * Ensure today's catalog pack exists. Refresh replaces incomplete slots only.
 */
export async function ensureCatalogDailyPack(
  uid: string,
  refresh = false,
): Promise<DailyPackResult> {
  const today = dayKeyUtc();
  const cacheRef = doc(db, "characters", uid, "dailyPacks", today);
  const completedToday = await getTodayCompletedQuestIds(uid, today);
  const catLevels = await readCategoryLevels(uid);

  if (!refresh) {
    const cached = await getDoc(cacheRef);
    if (cached.exists()) {
      const data = cached.data() as any;
      const ids: string[] = data.questIds ?? [];
      if (ids.length) {
        const quests = await loadQuestsByIds(uid, ids);
        if (quests.length === ids.length && quests.length > 0) {
          return {
            quests: orderPackBySkill(quests),
            cached: true,
            allComplete: !!data.allComplete || quests.every((q) => completedToday.has(q.id)),
            source: "catalog",
          };
        }
      }
    }
  }

  let keptQuests: DailyPackQuest[] = [];
  let slots: SkillKey[] = [];
  const exclude = await recentCatalogIds(uid, today);

  if (refresh) {
    const cached = await getDoc(cacheRef);
    const cachedIds: string[] = cached.exists() ? ((cached.data() as any).questIds ?? []) : [];
    const keepIds: string[] = [];
    const deleteIds: string[] = [];
    for (const id of cachedIds) {
      if (completedToday.has(id)) keepIds.push(id);
      else deleteIds.push(id);
    }
    await Promise.all(
      deleteIds.map((id) => deleteDoc(doc(db, "characters", uid, "quests", id)).catch(() => null)),
    );
    if (keepIds.length) {
      keptQuests = await loadQuestsByIds(uid, keepIds);
      keptQuests.forEach((q) => {
        if (q.catalogId) exclude.add(q.catalogId);
      });
    }
    const need = Math.max(0, 5 - keptQuests.length);
    if (need === 0) {
      await setDoc(
        cacheRef,
        {
          questIds: keepIds,
          catalogIds: keptQuests.map((q) => q.catalogId).filter(Boolean),
          generatedAt: new Date().toISOString(),
          refreshed: true,
          allComplete: true,
          source: "catalog",
        },
        { merge: true },
      );
      return {
        quests: orderPackBySkill(keptQuests),
        cached: false,
        allComplete: true,
        source: "catalog",
      };
    }
    slots = biasedSlotsFilling(
      catLevels,
      keptQuests.map((q) => q.category as SkillKey),
      need,
    );
  } else {
    slots = biasedSkillSlots(catLevels, 5);
  }

  const seed = `${uid}:${today}:${refresh ? "r" : "n"}:${keptQuests.map((q) => q.id).join(",")}`;
  const picks = pickCatalogForSlots(slots, seed, exclude);
  const newQuests = await persistPicks(uid, today, picks);
  const allQuests = orderPackBySkill([...keptQuests, ...newQuests]);
  const allQuestIds = allQuests.map((q) => q.id);
  const catalogIds = allQuests.map((q) => q.catalogId).filter(Boolean);

  await setDoc(cacheRef, {
    questIds: allQuestIds,
    catalogIds,
    generatedAt: new Date().toISOString(),
    refreshed: refresh,
    allComplete: false,
    source: "catalog",
  });

  return { quests: allQuests, cached: false, source: "catalog" };
}
