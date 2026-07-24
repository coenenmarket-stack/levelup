// Firestore-backed adapter that preserves the existing `apiRequest(...)` and
// default queryFn interfaces used throughout the app. Pages, hooks, and the
// game context all keep calling `apiRequest("GET", "/api/character")` etc.;
// this file dispatches those calls to Firestore (for plain CRUD) or to
// Firebase Cloud Functions (for server-authoritative game logic).
//
// This file replaces the old fetch()-based Express client.

import { QueryClient, QueryFunction } from "@tanstack/react-query";
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, orderBy, Timestamp, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  finalizeOnboardingLocal,
  completeQuestLocal,
  redeemRewardLocal,
} from "./gameLogic";

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function requireUid(): string {
  const u = auth.currentUser;
  if (!u) throw new Error("401: Not signed in");
  return u.uid;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Load today's completed quest IDs for the signed-in user. */
async function getTodayCompletedQuestIds(uid: string): Promise<Set<string>> {
  const compSnap = await getDocs(query(
    collection(db, "characters", uid, "completions"),
    where("completionDate", "==", todayISO()),
  ));
  return new Set(compSnap.docs.map(d => String((d.data() as any).questId)));
}

/** Attach completedToday from today's completion log (not stored on quest docs). */
function enrichQuestsWithCompletion<T extends { id: string | number }>(
  quests: T[],
  completedIds: Set<string>,
): (T & { completedToday: boolean })[] {
  return quests.map(q => ({
    ...q,
    completedToday: completedIds.has(String(q.id)),
  }));
}

async function enrichQuestsForUser<T extends { id: string | number }>(
  uid: string,
  quests: T[],
): Promise<(T & { completedToday: boolean })[]> {
  const completedIds = await getTodayCompletedQuestIds(uid);
  return enrichQuestsWithCompletion(quests, completedIds);
}

const PACK_CATEGORIES = new Set(["health", "wealth", "career", "family", "mindset"]);
const PACK_CATEGORY_ORDER = ["health", "wealth", "career", "family", "mindset"];

/** Merge pack quests with today's completions; reconstruct completed quests if docs were removed. */
async function mergePackWithCompletions(uid: string, packQuests: Array<{ id: string | number; category: string; [key: string]: any }>) {
  const completedIds = await getTodayCompletedQuestIds(uid);
  const merged = enrichQuestsWithCompletion(packQuests, completedIds);
  const knownIds = new Set(merged.map(q => String(q.id)));

  const compSnap = await getDocs(query(
    collection(db, "characters", uid, "completions"),
    where("completionDate", "==", todayISO()),
  ));

  for (const docSnap of compSnap.docs) {
    const c = docSnap.data() as any;
    const qid = String(c.questId);
    if (!PACK_CATEGORIES.has(c.category)) continue;
    if (knownIds.has(qid)) continue;
    if (!completedIds.has(qid)) continue;
    merged.push({
      id: qid,
      title: c.questTitle,
      description: null,
      category: c.category,
      difficulty: c.difficulty ?? "easy",
      xpReward: c.xpReward ?? 10,
      isDaily: true,
      active: true,
      completedToday: true,
    } as any);
    knownIds.add(qid);
  }

  merged.sort(
    (a, b) => PACK_CATEGORY_ORDER.indexOf(a.category) - PACK_CATEGORY_ORDER.indexOf(b.category),
  );
  return merged;
}

// Firestore Timestamps -> ISO strings for app consumption
function normalize(value: any): any {
  if (value == null) return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object") {
    const out: any = {};
    for (const k of Object.keys(value)) out[k] = normalize(value[k]);
    return out;
  }
  return value;
}

function docToObj<T = any>(snap: any): T {
  const data = snap.data() ?? {};
  return normalize({ id: snap.id, ...data });
}

// XP curve mirror of shared/schema.ts so we can compute xpToNext client-side
const XP_TO_NEXT_LEVEL = (level: number) => Math.round(50 + level * 75);

// Title lookup mirror
const TITLES = [
  { min: 1, title: "Novice Adventurer" },
  { min: 5, title: "Rising Hero" },
  { min: 10, title: "Seasoned Adventurer" },
  { min: 20, title: "Champion" },
  { min: 35, title: "Veteran" },
  { min: 50, title: "Legend" },
  { min: 75, title: "Mythic" },
  { min: 100, title: "Ascended" },
];

// ------------------------------------------------------------
// Read handlers (GET /api/...)
// ------------------------------------------------------------

async function readCharacter(uid: string) {
  const snap = await getDoc(doc(db, "characters", uid));
  if (!snap.exists()) throw new Error("404: Character not found");
  const c: any = docToObj(snap);
  c.userId = uid;
  c.xpToNext = XP_TO_NEXT_LEVEL(c.level);
  // goalsJson is stored as actual JSON string; expose parsed `goals` array
  try {
    c.goals = JSON.parse(c.goalsJson || "[]");
  } catch {
    c.goals = [];
  }
  return c;
}

// Tiny stable string hash so the daily rotation is the same across a user's devices.
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// Day index = whole days since UTC epoch. Same value all day, increments at midnight UTC.
function dayIndex(iso: string): number {
  return Math.floor(new Date(iso + "T00:00:00Z").getTime() / 86400000);
}

/**
 * Daily quest rotation.
 * - Class-specific quests (those with a className tag) are always shown.
 * - Universal quests rotate: a deterministic subset of ~6 is chosen each day,
 *   based on (uid + dayIndex), so the list changes every 24h but stays stable for the day.
 * - If a quest was already completed today, it stays visible so the user sees the check.
 */
function rotateDaily(quests: any[], uid: string, todayCompletedIds: Set<string>): any[] {
  const UNIVERSAL_PER_DAY = 6;
  const classQuests: any[] = [];
  const universal: any[] = [];
  for (const q of quests) {
    if (q.classTag) classQuests.push(q);
    else universal.push(q);
  }
  if (universal.length <= UNIVERSAL_PER_DAY) {
    return [...classQuests, ...universal];
  }
  const seed = hashStr(uid + ":" + dayIndex(todayISO()));
  // Deterministic shuffle (mulberry32-ish) seeded by (uid + day).
  let s = seed || 1;
  const rand = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const shuffled = [...universal].sort((a, b) => {
    const ka = hashStr(a.id) ^ seed;
    const kb = hashStr(b.id) ^ seed;
    return ka - kb;
  });
  // Use deterministic randomness for stability
  void rand;
  let chosen = shuffled.slice(0, UNIVERSAL_PER_DAY);
  // Always keep any universal quest the user already completed today, so checks stay visible.
  const chosenIds = new Set(chosen.map(q => q.id));
  for (const q of universal) {
    if (todayCompletedIds.has(q.id) && !chosenIds.has(q.id)) {
      chosen.push(q);
      chosenIds.add(q.id);
    }
  }
  return [...classQuests, ...chosen];
}

async function readQuests(uid: string) {
  const q = query(
    collection(db, "characters", uid, "quests"),
    where("active", "==", true),
  );
  const snap = await getDocs(q);
  const quests = snap.docs.map(docToObj as any);
  const completedQuestIds = await getTodayCompletedQuestIds(uid);
  const rotated = rotateDaily(quests, uid, completedQuestIds);
  return enrichQuestsWithCompletion(rotated, completedQuestIds)
    .sort((a: any, b: any) => (a.createdAt || "").localeCompare(b.createdAt || ""));
}

async function readCategories(uid: string) {
  const snap = await getDocs(collection(db, "characters", uid, "categories"));
  return snap.docs.map(docToObj);
}

async function readAchievements(uid: string) {
  const snap = await getDocs(collection(db, "characters", uid, "achievements"));
  return snap.docs.map(docToObj);
}

async function readCompletions(uid: string) {
  const snap = await getDocs(query(
    collection(db, "characters", uid, "completions"),
    orderBy("completedAt", "desc"),
  ));
  return snap.docs.map(docToObj);
}

async function readRewards(uid: string) {
  const snap = await getDocs(collection(db, "characters", uid, "rewards"));
  return snap.docs.map(docToObj);
}

async function readStats(uid: string) {
  // Compose stats from character + completions + categories + achievements
  const [character, completions, categories, achievements] = await Promise.all([
    readCharacter(uid),
    readCompletions(uid),
    readCategories(uid),
    readAchievements(uid),
  ]);

  // Weekly: last 7 days, sum XP and quest counts per date
  const days: { date: string; xp: number; quests: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    days.push({ date, xp: 0, quests: 0 });
  }
  const idx: Record<string, number> = {};
  days.forEach((d, i) => { idx[d.date] = i; });
  for (const c of completions as any[]) {
    const date = c.completionDate;
    if (idx[date] !== undefined) {
      days[idx[date]].xp += c.xpReward || 0;
      days[idx[date]].quests += 1;
    }
  }

  return {
    totalXp: character.totalXp,
    tasksCompleted: completions.length,
    currentStreak: character.currentStreak,
    longestStreak: character.longestStreak,
    level: character.level,
    achievementCount: (achievements as any[]).filter((a) => a.unlocked).length,
    achievementTotal: achievements.length,
    hoursInvested: character.hoursInvested,
    weekly: days,
    categories,
  };
}

// ------------------------------------------------------------
// Mutation handlers
// ------------------------------------------------------------

async function patchCharacter(uid: string, body: any) {
  const fields: any = {};
  if (body.name) fields.name = body.name;
  if (body.avatar) fields.avatar = body.avatar;
  if (body.photoURL !== undefined) fields.photoURL = body.photoURL;
  if (body.pronouns !== undefined) fields.pronouns = body.pronouns;
  if (body.className) fields.className = body.className;
  if (body.lifeGoal) fields.lifeGoal = body.lifeGoal;
  if (body.goals) fields.goalsJson = JSON.stringify(body.goals);
  await updateDoc(doc(db, "characters", uid), fields);
  const character = await readCharacter(uid);
  try {
    const { syncPublicProfileLocal } = await import("./friends");
    const categories = await readCategories(uid);
    await syncPublicProfileLocal(uid, character, categories);
  } catch (e) {
    console.warn("public profile sync failed", e);
  }
  return character;
}

async function createQuest(uid: string, body: any) {
  const payload = {
    title: body.title,
    description: body.description ?? null,
    category: body.category,
    difficulty: body.difficulty,
    xpReward: Number(body.xpReward),
    isDaily: body.isDaily ?? true,
    active: true,
    createdAt: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, "characters", uid, "quests"), payload);
  return { id: ref.id, ...payload };
}

async function deleteQuest(uid: string, questId: string) {
  await deleteDoc(doc(db, "characters", uid, "quests", questId));
  return { ok: true };
}

async function createReward(uid: string, body: any) {
  const payload = {
    name: body.name,
    description: body.description ?? null,
    icon: body.icon ?? "🎁",
    cost: Number(body.cost),
    redeemed: 0,
    createdAt: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, "characters", uid, "rewards"), payload);
  return { id: ref.id, ...payload };
}

async function deleteReward(uid: string, rewardId: string) {
  await deleteDoc(doc(db, "characters", uid, "rewards", rewardId));
  return { ok: true };
}

// ------------------------------------------------------------
// Game logic (client-side; runs in the browser, writes to Firestore)
// ------------------------------------------------------------

async function callFinalizeOnboarding(uid: string, body: any) {
  return finalizeOnboardingLocal(uid, body);
}

async function callCompleteQuest(uid: string, questId: string) {
  return completeQuestLocal(uid, questId);
}

async function callRedeemReward(uid: string, rewardId: string) {
  return redeemRewardLocal(uid, rewardId);
}

/**
 * Calls the deployed `generateQuests` Cloud Function (Gemini-backed).
 * Returns a personalized daily quest pack (weakest-skill bias).
 * If `refresh=true`, ignores today's cache and regenerates incomplete slots.
 */
async function callGenerateQuests(uid: string, refresh: boolean) {
  type PackQuest = {
    id?: string;
    category: string;
    title: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
    xpReward: number;
    isDaily?: boolean;
  };
  type Pack = { quests: PackQuest[]; cached?: boolean; fallback?: boolean; allComplete?: boolean };

  const FALLBACK_BY_SKILL: Record<string, PackQuest[]> = {
    health: [
      { category: "health", title: "30-minute brisk walk", description: "Move your body and clear your head.", difficulty: "easy", xpReward: 10 },
      { category: "health", title: "Drink water and stretch", description: "Hydrate and loosen up for 5 minutes.", difficulty: "easy", xpReward: 10 },
    ],
    wealth: [
      { category: "wealth", title: "Log today's spending", description: "Track every dollar that left your wallet.", difficulty: "easy", xpReward: 10 },
    ],
    career: [
      { category: "career", title: "45 min deep work on top task", description: "Phone off, one tab, one task that moves the needle.", difficulty: "medium", xpReward: 25 },
    ],
    family: [
      { category: "family", title: "Call someone you love", description: "Five minutes can change a day.", difficulty: "easy", xpReward: 10 },
    ],
    mindset: [
      { category: "mindset", title: "10 pages of a good book", description: "Compound your mind.", difficulty: "easy", xpReward: 10 },
    ],
  };

  function offlineBiasedPack(): PackQuest[] {
    // Prefer doubling health as a generic "weakest" when offline with no levels.
    const slots = ["health", "health", "wealth", "career", "family"];
    const used: Record<string, number> = {};
    return slots.map((k) => {
      const idx = used[k] ?? 0;
      used[k] = idx + 1;
      const opts = FALLBACK_BY_SKILL[k] ?? FALLBACK_BY_SKILL.mindset;
      return { ...opts[Math.min(idx, opts.length - 1)] };
    });
  }

  let pack: Pack;
  try {
    const { httpsCallable } = await import("firebase/functions");
    const { functions } = await import("./firebase");
    const fn = httpsCallable<{ refresh?: boolean }, Pack>(functions, "generateQuests");
    const res = await fn({ refresh });
    pack = res.data;
  } catch (e: any) {
    console.error("generateQuests call failed", e);
    pack = {
      quests: offlineBiasedPack(),
      cached: false,
      fallback: true,
    };
  }

  const withIds = pack.quests.map((q, i) => ({
    ...q,
    id: q.id ?? `fallback-${i}`,
    isDaily: q.isDaily ?? true,
  }));
  const merged = await mergePackWithCompletions(uid, withIds);
  return { ...pack, quests: merged };
}

async function callCoach(message: string) {
  // Calls the deployed `aiCoach` Cloud Function (Gemini-backed).
  // Fails soft so the UI never crashes if the function is unavailable.
  try {
    const { httpsCallable } = await import("firebase/functions");
    const { functions } = await import("./firebase");
    const fn = httpsCallable<{ message: string }, { reply: string; fallback?: boolean }>(
      functions,
      "aiCoach",
    );
    const res = await fn({ message });
    return res.data;
  } catch (e: any) {
    console.error("aiCoach call failed", e);
    return {
      reply: "Coach is offline right now. Pick the smallest version of your next quest and do it in the next 10 minutes.",
      fallback: true,
    };
  }
}

// ------------------------------------------------------------
// Router — turns an "/api/..." path + method into a Firestore/Function call
// ------------------------------------------------------------

async function route(method: string, url: string, body: any): Promise<any> {
  const uid = requireUid();

  // Strip query params for routing
  const cleanUrl = url.split("?")[0];

  // GET routes
  if (method === "GET") {
    switch (cleanUrl) {
      case "/api/character": return readCharacter(uid);
      case "/api/quests": return readQuests(uid);
      case "/api/categories": return readCategories(uid);
      case "/api/achievements": return readAchievements(uid);
      case "/api/completions": return readCompletions(uid);
      case "/api/rewards": return readRewards(uid);
      case "/api/stats": return readStats(uid);
      case "/api/daily-pack": return callGenerateQuests(uid, false);
    }
  }

  // PATCH routes
  if (method === "PATCH" && cleanUrl === "/api/character") {
    return patchCharacter(uid, body);
  }

  // POST routes
  if (method === "POST") {
    if (cleanUrl === "/api/onboarding/finalize") return callFinalizeOnboarding(uid, body);
    if (cleanUrl === "/api/quests") return createQuest(uid, body);
    if (cleanUrl === "/api/rewards") return createReward(uid, body);
    if (cleanUrl === "/api/coach") return callCoach(body?.message ?? "");
    if (cleanUrl === "/api/daily-pack") return callGenerateQuests(uid, !!body?.refresh);
    // /api/quests/:id/complete
    const completeMatch = cleanUrl.match(/^\/api\/quests\/([^/]+)\/complete$/);
    if (completeMatch) return callCompleteQuest(uid, completeMatch[1]);
    // /api/rewards/:id/redeem
    const redeemMatch = cleanUrl.match(/^\/api\/rewards\/([^/]+)\/redeem$/);
    if (redeemMatch) return callRedeemReward(uid, redeemMatch[1]);
  }

  // DELETE routes
  if (method === "DELETE") {
    const questMatch = cleanUrl.match(/^\/api\/quests\/([^/]+)$/);
    if (questMatch) return deleteQuest(uid, questMatch[1]);
    const rewardMatch = cleanUrl.match(/^\/api\/rewards\/([^/]+)$/);
    if (rewardMatch) return deleteReward(uid, rewardMatch[1]);
  }

  throw new Error(`Route not found: ${method} ${url}`);
}

// ------------------------------------------------------------
// Public API — drop-in replacement for the old fetch-based client
// ------------------------------------------------------------

// Legacy session-token setters kept for source compatibility; Firebase Auth
// handles session persistence natively now, so these are no-ops.
export function setSessionToken(_token: string | null) {}
export function getSessionToken(): string | null { return null; }

// `apiRequest` returns a Response-like shape so callers can do `.json()`.
export async function apiRequest(method: string, url: string, data?: unknown): Promise<{ json: () => Promise<any> }> {
  const payload = await route(method, url, data);
  return {
    json: async () => payload,
  };
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401 }) =>
  async ({ queryKey }) => {
    try {
      const url = String(queryKey[0]);
      return (await route("GET", url, undefined)) as any;
    } catch (e: any) {
      if (on401 === "returnNull" && /^401:/.test(String(e.message))) return null as any;
      throw e;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
