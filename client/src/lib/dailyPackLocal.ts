/**
 * Catalog-driven daily pack assignment (local calendar day).
 *
 * Compatibility:
 * - New packs write to dailyPacks/{localDay} with source "catalog" and size 3.
 * - If local cache is empty, falls back to dailyPacks/{utcDay} when different
 *   (legacy UTC packs from CF or earlier Phase 2).
 * - Already-generated 5-packs for today are returned as-is (no truncation/corruption).
 * - Refresh targets DAILY_PACK_SIZE for new slots but never deletes completed quests.
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
  DAILY_PACK_SIZE,
  orderPackBySkill,
  packQuestDocId,
  pickCatalogForSlots,
  type PackPick,
  type SkillKey,
} from "./dailyPackAssign";
import { candidateDayKeys, dayKeyLocal, dayKeyUtc } from "./dayKey";

export type DailyPackQuest = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  xpReward: number;
  isDaily: boolean;
  active: boolean;
  catalogId?: string;
  dailyPackDate?: string;
  source?: string;
  createdAt: string;
};

export type DailyPackResult = {
  quests: DailyPackQuest[];
  cached?: boolean;
  allComplete?: boolean;
  source: "catalog" | "legacy";
  packSize: number;
  dayKey: string;
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

async function getCompletedQuestIdsForDays(uid: string, days: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  for (const day of days) {
    const snap = await getDocs(
      query(
        collection(db, "characters", uid, "completions"),
        where("completionDate", "==", day),
      ),
    );
    snap.forEach((d) => out.add(String((d.data() as any).questId)));
  }
  return out;
}

/** Catalog IDs used in recent packs (variety). */
async function recentCatalogIds(uid: string, today: string, lookbackDays = 7): Promise<Set<string>> {
  const out = new Set<string>();
  const [y, m, d] = today.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  for (let i = 1; i <= lookbackDays; i++) {
    const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
    const key = dayKeyLocal(dt);
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

async function readPackCache(
  uid: string,
  dayKey: string,
): Promise<{ dayKey: string; data: any; quests: DailyPackQuest[] } | null> {
  const snap = await getDoc(doc(db, "characters", uid, "dailyPacks", dayKey));
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  const ids: string[] = data.questIds ?? [];
  if (!ids.length) return null;
  const quests = await loadQuestsByIds(uid, ids);
  if (quests.length === 0) return null;
  return { dayKey, data, quests };
}

/**
 * Ensure today's catalog pack exists. Refresh replaces incomplete slots only.
 * Preserves already-cached packs (including legacy 5-packs) without truncating.
 */
export async function ensureCatalogDailyPack(
  uid: string,
  refresh = false,
): Promise<DailyPackResult> {
  const now = new Date();
  const localDay = dayKeyLocal(now);
  const utcDay = dayKeyUtc(now);
  const dayCandidates = candidateDayKeys(now);
  const completedToday = await getCompletedQuestIdsForDays(uid, dayCandidates);

  if (!refresh) {
    // Prefer local cache; fall back to UTC legacy cache the same calendar window.
    let cached = await readPackCache(uid, localDay);
    if (!cached && utcDay !== localDay) {
      cached = await readPackCache(uid, utcDay);
    }
    if (cached && cached.quests.length > 0) {
      const allComplete =
        !!cached.data.allComplete ||
        cached.quests.every((q) => completedToday.has(q.id));
      return {
        quests: orderPackBySkill(cached.quests),
        cached: true,
        allComplete,
        source: cached.data.source === "catalog" ? "catalog" : "legacy",
        packSize: cached.quests.length,
        dayKey: cached.dayKey,
      };
    }
  }

  const cacheDay = localDay; // new writes always use local day
  const cacheRef = doc(db, "characters", uid, "dailyPacks", cacheDay);
  const catLevels = await readCategoryLevels(uid);

  let keptQuests: DailyPackQuest[] = [];
  let slots: SkillKey[] = [];
  const exclude = await recentCatalogIds(uid, localDay);

  // Target size: if refreshing an existing larger legacy pack, keep completed and
  // fill only up to DAILY_PACK_SIZE total for new primary UX — but if already have
  // more completed than DAILY_PACK_SIZE, keep them all (never corrupt).
  let targetSize = DAILY_PACK_SIZE;

  if (refresh) {
    // Load whichever cache exists for today
    let cachedIds: string[] = [];
    const localCache = await getDoc(cacheRef);
    if (localCache.exists()) {
      cachedIds = (localCache.data() as any).questIds ?? [];
      const prevSize = cachedIds.length;
      if (prevSize > DAILY_PACK_SIZE) targetSize = prevSize; // don't shrink mid-day
    } else if (utcDay !== localDay) {
      const utcCache = await getDoc(doc(db, "characters", uid, "dailyPacks", utcDay));
      if (utcCache.exists()) {
        cachedIds = (utcCache.data() as any).questIds ?? [];
        if (cachedIds.length > DAILY_PACK_SIZE) targetSize = cachedIds.length;
      }
    }

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
    const need = Math.max(0, targetSize - keptQuests.length);
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
          packSize: keepIds.length,
          dayKey: cacheDay,
        },
        { merge: true },
      );
      return {
        quests: orderPackBySkill(keptQuests),
        cached: false,
        allComplete: true,
        source: "catalog",
        packSize: keptQuests.length,
        dayKey: cacheDay,
      };
    }
    slots = biasedSlotsFilling(
      catLevels,
      keptQuests.map((q) => q.category as SkillKey),
      need,
      targetSize,
    );
  } else {
    slots = biasedSkillSlots(catLevels, DAILY_PACK_SIZE);
  }

  const seed = `${uid}:${cacheDay}:${refresh ? "r" : "n"}:${keptQuests.map((q) => q.id).join(",")}`;
  const picks = pickCatalogForSlots(slots, seed, exclude);
  const newQuests = await persistPicks(uid, cacheDay, picks);
  const allQuests = orderPackBySkill([...keptQuests, ...newQuests]);
  const allQuestIds = allQuests.map((q) => q.id);
  const catalogIds = allQuests.map((q) => q.catalogId).filter(Boolean) as string[];

  await setDoc(cacheRef, {
    questIds: allQuestIds,
    catalogIds,
    generatedAt: new Date().toISOString(),
    refreshed: refresh,
    allComplete: false,
    source: "catalog",
    packSize: allQuests.length,
    dayKey: cacheDay,
  });

  return {
    quests: allQuests,
    cached: false,
    source: "catalog",
    packSize: allQuests.length,
    dayKey: cacheDay,
  };
}
