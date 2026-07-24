// Level Up Life — Cloud Functions
// Server-authoritative game logic. The client cannot grant itself XP, unlock
// achievements, or spend XP on rewards directly because Firestore rules block
// writes to characters/{uid} (game-progress fields), categories, completions,
// achievements, and reward.redeemed. All those mutations flow through these
// callable functions, which use the Admin SDK to bypass rules.

import { onCall, onRequest, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, type DocumentReference, type CollectionReference } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { CLASS_CERT_HINTS, COACH_PERSONA } from "./coachContext";

const NATIVE_GOOGLE_SCHEME = "com.coenenmarket.leveluplife://google-auth";
const NATIVE_GOOGLE_SESSION_TTL_MS = 5 * 60 * 1000;

initializeApp();
const db = getFirestore();

// Gemini API key as a Secret. Set with:
//   firebase functions:secrets:set GEMINI_API_KEY
// Get a free key at https://aistudio.google.com/apikey
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// ----------------------------------------------------------------------------
// Game constants (mirrored from shared/schema.ts so functions are self-contained)
// ----------------------------------------------------------------------------

const XP_TO_NEXT_LEVEL = (level: number) => Math.round(50 + level * 75);
const RANKS = ["Novice", "Apprentice", "Adept", "Expert", "Master", "Grandmaster", "Legend"];
const rankForLevel = (level: number) => RANKS[Math.min(Math.floor((level - 1) / 5), RANKS.length - 1)];

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
const titleForLevel = (level: number) => {
  let cur = TITLES[0].title;
  for (const t of TITLES) if (level >= t.min) cur = t.title;
  return cur;
};

const CATEGORY_DEFS = [
  { key: "health", name: "Health", icon: "💪", color: "#10b981" },
  { key: "career", name: "Career", icon: "💼", color: "#3b82f6" },
  { key: "finance", name: "Finance", icon: "💰", color: "#f59e0b" },
  { key: "family", name: "Family", icon: "❤️", color: "#ef4444" },
  { key: "learning", name: "Learning", icon: "📚", color: "#8b5cf6" },
  { key: "hustle", name: "Side Hustles", icon: "🚀", color: "#ec4899" },
];

const CLASS_QUEST_TEMPLATES: Record<string, Array<any>> = {
  entrepreneur: [
    { title: "Pitch your idea to one person", description: "Out loud, in front of someone real", category: "hustle", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "List one product or service", description: "Inventory grows your shop", category: "hustle", difficulty: "medium", xpReward: 25, isDaily: false },
    { title: "Review weekly cashflow", description: "Know where every dollar is going", category: "finance", difficulty: "medium", xpReward: 25, isDaily: false },
    { title: "Ship one tiny feature", description: "Done beats perfect", category: "hustle", difficulty: "hard", xpReward: 50, isDaily: false },
    { title: "Read 10 pages of business writing", description: "Compound knowledge", category: "learning", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Drink 8 glasses of water", description: "Founder fuel", category: "health", difficulty: "easy", xpReward: 10, isDaily: true },
  ],
  tradesman: [
    { title: "Sharpen or maintain a tool", description: "Care for the things that earn you a living", category: "career", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Practice one technique 30 minutes", description: "Reps build mastery", category: "career", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Finish a certification module", description: "Push your trade forward", category: "career", difficulty: "hard", xpReward: 50, isDaily: false },
    { title: "Track a job's hours and cost", description: "Margins matter", category: "finance", difficulty: "medium", xpReward: 25, isDaily: false },
    { title: "30-minute workout", description: "Strong body, steady hands", category: "health", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Make your bed", description: "Start the day with a win", category: "health", difficulty: "easy", xpReward: 10, isDaily: true },
  ],
  parent: [
    { title: "10 minutes of undivided kid time", description: "No phone, just presence", category: "family", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Family meal together", description: "Table > screen", category: "family", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Plan a family activity", description: "Make memories on purpose", category: "family", difficulty: "hard", xpReward: 50, isDaily: false },
    { title: "30-minute workout", description: "Keep up with the kids", category: "health", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Read with your kid", description: "Books beat noise", category: "learning", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Drink 8 glasses of water", description: "Stay hydrated", category: "health", difficulty: "easy", xpReward: 10, isDaily: true },
  ],
  athlete: [
    { title: "30-minute workout", description: "Move your body, build your strength", category: "health", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Hit your daily steps", description: "Consistency over intensity", category: "health", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "8 hours of sleep", description: "Recovery is training", category: "health", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Hard training session", description: "Push the ceiling", category: "health", difficulty: "hard", xpReward: 50, isDaily: false },
    { title: "Drink 8 glasses of water", description: "Hydration is performance", category: "health", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Cook a clean meal", description: "Fuel matters", category: "health", difficulty: "medium", xpReward: 25, isDaily: false },
  ],
  student: [
    { title: "Read 10 pages", description: "Grow your mind every day", category: "learning", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Study 30 minutes", description: "Deep focus on a skill or course", category: "learning", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Finish a course module", description: "Stack the wins", category: "learning", difficulty: "hard", xpReward: 50, isDaily: false },
    { title: "Make your bed", description: "Start the day right", category: "health", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Active recall practice", description: "Test yourself, not your notes", category: "learning", difficulty: "medium", xpReward: 25, isDaily: false },
    { title: "30-minute workout", description: "A strong body sharpens the mind", category: "health", difficulty: "medium", xpReward: 25, isDaily: true },
  ],
  creator: [
    { title: "Make one new thing", description: "Anything. Just ship it.", category: "hustle", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Post to your audience", description: "Show your work", category: "hustle", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Study a creator you admire", description: "Steal like an artist", category: "learning", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Finish a project", description: "Done > started", category: "hustle", difficulty: "hard", xpReward: 50, isDaily: false },
    { title: "Read 10 pages", description: "Input shapes output", category: "learning", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "30-minute workout", description: "Body holds the mind", category: "health", difficulty: "medium", xpReward: 25, isDaily: false },
  ],
  professional: [
    { title: "Plan your top 3", description: "Three things, that's it", category: "career", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Deep work block (60 min)", description: "No meetings, no Slack", category: "career", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Finish a certification module", description: "Stay sharp", category: "career", difficulty: "hard", xpReward: 50, isDaily: false },
    { title: "Review weekly budget", description: "Know where every dollar is going", category: "finance", difficulty: "medium", xpReward: 25, isDaily: false },
    { title: "30-minute workout", description: "Energy is your edge", category: "health", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Read 10 pages", description: "Compound your expertise", category: "learning", difficulty: "easy", xpReward: 10, isDaily: true },
  ],
};

const ACHIEVEMENT_TEMPLATES = [
  { key: "first-quest", name: "First Step", description: "Complete your first quest", icon: "🌱", rarity: "common", category: null, target: 1 },
  { key: "10-quests", name: "Getting Started", description: "Complete 10 quests", icon: "⭐", rarity: "common", category: null, target: 10 },
  { key: "100-quests", name: "Centurion", description: "Complete 100 quests", icon: "💯", rarity: "rare", category: null, target: 100 },
  { key: "streak-7", name: "7 Day Streak", description: "Stay consistent for a week", icon: "🔥", rarity: "common", category: null, target: 7 },
  { key: "streak-30", name: "30 Day Streak", description: "A month of dedication", icon: "🔥", rarity: "rare", category: null, target: 30 },
  { key: "streak-100", name: "100 Day Streak", description: "Unbreakable habits", icon: "🔥", rarity: "legendary", category: null, target: 100 },
  { key: "first-workout", name: "First Workout", description: "Complete your first health quest", icon: "💪", rarity: "common", category: "health", target: 1 },
  { key: "10-workouts", name: "Gym Rat", description: "Complete 10 health quests", icon: "🏋️", rarity: "rare", category: "health", target: 10 },
  { key: "100-workouts", name: "Iron Will", description: "Complete 100 health quests", icon: "🥇", rarity: "epic", category: "health", target: 100 },
  { key: "save-100", name: "Save First $100", description: "Complete 4 finance quests", icon: "💵", rarity: "common", category: "finance", target: 4 },
  { key: "save-1000", name: "Save First $1,000", description: "Complete 20 finance quests", icon: "💰", rarity: "rare", category: "finance", target: 20 },
  { key: "debt-crusher", name: "Debt Crusher", description: "Complete 50 finance quests", icon: "⚒️", rarity: "epic", category: "finance", target: 50 },
  { key: "first-cert", name: "Complete Certification", description: "Complete a hard career quest", icon: "🎓", rarity: "rare", category: "career", target: 1 },
  { key: "first-promo", name: "First Promotion", description: "Complete 25 career quests", icon: "📈", rarity: "epic", category: "career", target: 25 },
  { key: "family-bonded", name: "Family Bonded", description: "Complete 25 family quests", icon: "❤️", rarity: "epic", category: "family", target: 25 },
  { key: "scholar", name: "Scholar", description: "Complete 50 learning quests", icon: "📚", rarity: "epic", category: "learning", target: 50 },
  { key: "side-success", name: "Side Hustle Success", description: "Complete 25 side hustle quests", icon: "🚀", rarity: "epic", category: "hustle", target: 25 },
  { key: "level-5", name: "Rising Hero", description: "Reach level 5", icon: "🆙", rarity: "common", category: null, target: 5 },
  { key: "level-10", name: "Seasoned Adventurer", description: "Reach level 10", icon: "⚔️", rarity: "rare", category: null, target: 10 },
  { key: "level-25", name: "Champion", description: "Reach level 25", icon: "👑", rarity: "epic", category: null, target: 25 },
  { key: "level-50", name: "Legend", description: "Reach level 50", icon: "🏆", rarity: "legendary", category: null, target: 50 },
];

const STARTER_REWARDS = [
  { name: "Favorite Coffee", description: "Treat yourself to that good brew", icon: "☕", cost: 100 },
  { name: "Movie Night", description: "Pick a film, get the snacks", icon: "🎬", cost: 500 },
  { name: "New Tool", description: "Something useful you've had your eye on", icon: "🛠️", cost: 1000 },
  { name: "Weekend Trip", description: "A real adventure", icon: "🏞️", cost: 5000 },
];

const CATEGORY_STAT_IMPACT: Record<string, string[]> = {
  health: ["strength", "health"],
  career: ["intelligence", "discipline"],
  finance: ["wealth", "discipline"],
  family: ["relationships"],
  learning: ["intelligence"],
  hustle: ["wealth", "intelligence"],
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function requireAuth(req: CallableRequest): string {
  if (!req.auth?.uid) throw new HttpsError("unauthenticated", "Sign in first");
  return req.auth.uid;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const nowISO = () => new Date().toISOString();

// ----------------------------------------------------------------------------
// finalizeOnboarding — seeds character + categories + quests + achievements + rewards
// ----------------------------------------------------------------------------

const FinalizeSchema = z.object({
  characterName: z.string().min(1).max(40),
  avatar: z.string().min(1),
  pronouns: z.string().max(40).optional().nullable(),
  className: z.string().min(1),
  goals: z.array(z.string()).min(1).max(20),
  assessment: z.object({
    health: z.number().int().min(1).max(10),
    career: z.number().int().min(1).max(10),
    finance: z.number().int().min(1).max(10),
    relationships: z.number().int().min(1).max(10),
    learning: z.number().int().min(1).max(10),
    discipline: z.number().int().min(1).max(10),
  }),
});

export const finalizeOnboarding = onCall({ region: "us-central1" }, async (req) => {
  const uid = requireAuth(req);
  const parsed = FinalizeSchema.safeParse(req.data);
  if (!parsed.success) throw new HttpsError("invalid-argument", parsed.error.issues[0]?.message ?? "Invalid input");
  const input = parsed.data;

  // Compute starting stats
  const base = (n: number) => 10 + Math.round(n * 9);
  let strength = base(input.assessment.health);
  let intelligence = base(input.assessment.learning);
  let discipline = base(input.assessment.discipline);
  let wealth = base(input.assessment.finance);
  let health = base(input.assessment.health);
  let relationships = base(input.assessment.relationships);

  intelligence = Math.min(100, Math.round((intelligence + base(input.assessment.career)) / 2));
  discipline = Math.min(100, Math.round((discipline + base(input.assessment.career) * 0.5) / 1.5));

  const classBonus: Record<string, any> = {
    entrepreneur: { wealth: 8, intelligence: 6, discipline: 4 },
    tradesman: { discipline: 8, strength: 6, wealth: 4 },
    parent: { relationships: 10, discipline: 6, health: 4 },
    athlete: { strength: 10, health: 8, discipline: 4 },
    student: { intelligence: 10, discipline: 6, wealth: 0 },
    creator: { intelligence: 8, relationships: 4, discipline: 4 },
    professional: { intelligence: 8, wealth: 6, discipline: 4 },
  };
  const cb = classBonus[input.className] ?? {};
  strength = Math.min(100, strength + (cb.strength ?? 0));
  intelligence = Math.min(100, intelligence + (cb.intelligence ?? 0));
  discipline = Math.min(100, discipline + (cb.discipline ?? 0));
  wealth = Math.min(100, wealth + (cb.wealth ?? 0));
  health = Math.min(100, health + (cb.health ?? 0));
  relationships = Math.min(100, relationships + (cb.relationships ?? 0));

  const charDoc = {
    name: input.characterName,
    avatar: input.avatar,
    pronouns: input.pronouns ?? null,
    className: input.className,
    title: titleForLevel(1),
    lifeGoal: input.goals[0] ? `Pursue: ${input.goals[0]}` : "Become the best version of myself",
    goalsJson: JSON.stringify(input.goals),
    level: 1,
    xp: 0,
    totalXp: 0,
    spendableXp: 0,
    legacyScore: 0,
    strength, intelligence, discipline, wealth, health, relationships,
    currentStreak: 0,
    longestStreak: 0,
    lastCompletionDate: null,
    hoursInvested: 0,
    createdAt: nowISO(),
  };

  // Wipe existing subcollections (in case of restart) and seed fresh
  const charRef = db.doc(`characters/${uid}`);
  const subPaths = ["quests", "categories", "achievements", "rewards", "completions"];
  for (const sub of subPaths) {
    const snap = await charRef.collection(sub).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    if (snap.docs.length > 0) await batch.commit();
  }

  // Write character
  await charRef.set(charDoc);

  // Seed categories
  const catBatch = db.batch();
  for (const cat of CATEGORY_DEFS) {
    catBatch.set(charRef.collection("categories").doc(cat.key), {
      key: cat.key, name: cat.name, icon: cat.icon, color: cat.color,
      xp: 0, level: 1, rank: "Novice",
    });
  }
  await catBatch.commit();

  // Seed quests
  const template = CLASS_QUEST_TEMPLATES[input.className] ?? CLASS_QUEST_TEMPLATES.professional;
  const qBatch = db.batch();
  for (const q of template) {
    qBatch.set(charRef.collection("quests").doc(), { ...q, active: true, createdAt: nowISO() });
  }
  await qBatch.commit();

  // Seed achievements
  const aBatch = db.batch();
  for (const a of ACHIEVEMENT_TEMPLATES) {
    aBatch.set(charRef.collection("achievements").doc(a.key), {
      key: a.key, name: a.name, description: a.description,
      icon: a.icon, rarity: a.rarity, category: a.category,
      unlocked: false, unlockedAt: null, progress: 0, target: a.target,
    });
  }
  await aBatch.commit();

  // Seed rewards
  const rBatch = db.batch();
  for (const r of STARTER_REWARDS) {
    rBatch.set(charRef.collection("rewards").doc(), { ...r, redeemed: 0, createdAt: nowISO() });
  }
  await rBatch.commit();

  // Mark onboarded on user profile
  await db.doc(`users/${uid}`).set({ onboarded: true }, { merge: true });

  return { character: { id: uid, userId: uid, ...charDoc } };
});

// ----------------------------------------------------------------------------
// completeQuest — server-authoritative XP / level / streak / achievements / category XP
// ----------------------------------------------------------------------------

const CompleteSchema = z.object({ questId: z.string().min(1) });

export const completeQuest = onCall({ region: "us-central1" }, async (req) => {
  const uid = requireAuth(req);
  const parsed = CompleteSchema.safeParse(req.data);
  if (!parsed.success) throw new HttpsError("invalid-argument", "Missing questId");
  const { questId } = parsed.data;

  const charRef = db.doc(`characters/${uid}`);
  const questRef = charRef.collection("quests").doc(questId);
  const today = todayISO();

  const [questSnap, charSnap] = await Promise.all([questRef.get(), charRef.get()]);
  if (!questSnap.exists) throw new HttpsError("not-found", "Quest not found");
  if (!charSnap.exists) throw new HttpsError("failed-precondition", "Character not found");

  const quest: any = questSnap.data();
  const char: any = charSnap.data();

  if (quest.isDaily) {
    const dup = await charRef.collection("completions")
      .where("questId", "==", questId)
      .where("completionDate", "==", today)
      .limit(1)
      .get();
    if (!dup.empty) throw new HttpsError("failed-precondition", "Already completed today");
  }

  // Append completion
  const completionData = {
    questId,
    questTitle: quest.title,
    category: quest.category,
    difficulty: quest.difficulty,
    xpReward: quest.xpReward,
    completedAt: nowISO(),
    completionDate: today,
  };
  await charRef.collection("completions").add(completionData);

  // XP + level
  const oldLevel = char.level ?? 1;
  let xp = (char.xp ?? 0) + quest.xpReward;
  let level = oldLevel;
  let leveledUp = false;
  while (xp >= XP_TO_NEXT_LEVEL(level)) {
    xp -= XP_TO_NEXT_LEVEL(level);
    level++;
    leveledUp = true;
  }

  // Streak
  const last = char.lastCompletionDate;
  let currentStreak = char.currentStreak ?? 0;
  if (last !== today) {
    if (last) {
      const diff = Math.round((new Date(today).getTime() - new Date(last).getTime()) / 86_400_000);
      if (diff === 1) currentStreak += 1;
      else if (diff > 1) currentStreak = 1;
      else currentStreak = Math.max(currentStreak, 1);
    } else {
      currentStreak = 1;
    }
  }
  const longestStreak = Math.max(char.longestStreak ?? 0, currentStreak);

  // Stat bumps
  const impactStats = CATEGORY_STAT_IMPACT[quest.category] ?? [];
  const statBump = quest.difficulty === "hard" ? 2 : quest.difficulty === "medium" ? 1 : 0;
  const updates: any = {
    xp,
    level,
    title: titleForLevel(level),
    totalXp: (char.totalXp ?? 0) + quest.xpReward,
    spendableXp: (char.spendableXp ?? 0) + quest.xpReward,
    currentStreak,
    longestStreak,
    lastCompletionDate: today,
    legacyScore: (char.legacyScore ?? 0) + quest.xpReward,
    hoursInvested: (char.hoursInvested ?? 0) + (quest.difficulty === "hard" ? 60 : quest.difficulty === "medium" ? 30 : 10),
  };
  for (const stat of impactStats) {
    updates[stat] = Math.min(100, (char[stat] ?? 10) + (statBump || 1));
  }
  await charRef.update(updates);

  // Category XP
  const catRef = charRef.collection("categories").doc(quest.category);
  const catSnap = await catRef.get();
  if (catSnap.exists) {
    const cat: any = catSnap.data();
    let newXp = (cat.xp ?? 0) + quest.xpReward;
    let newLevel = cat.level ?? 1;
    while (newXp >= XP_TO_NEXT_LEVEL(newLevel)) {
      newXp -= XP_TO_NEXT_LEVEL(newLevel);
      newLevel++;
    }
    await catRef.update({ xp: newXp, level: newLevel, rank: rankForLevel(newLevel) });
  }

  // Update achievements
  const [compsSnap, achsSnap] = await Promise.all([
    charRef.collection("completions").get(),
    charRef.collection("achievements").get(),
  ]);
  const allComps = compsSnap.docs.map(d => d.data() as any);
  const newChar = { ...char, ...updates };

  const newlyUnlocked: any[] = [];
  const aBatch = db.batch();
  for (const aDoc of achsSnap.docs) {
    const a: any = aDoc.data();
    let progress = a.progress ?? 0;
    if (a.key === "first-quest" || a.key === "10-quests" || a.key === "100-quests") {
      progress = allComps.length;
    } else if (a.key === "streak-7" || a.key === "streak-30" || a.key === "streak-100") {
      progress = newChar.longestStreak;
    } else if (a.key === "level-5" || a.key === "level-10" || a.key === "level-25" || a.key === "level-50") {
      progress = newChar.level;
    } else if (a.key === "first-workout" || a.key === "10-workouts" || a.key === "100-workouts") {
      progress = allComps.filter(c => c.category === "health").length;
    } else if (a.key === "save-100" || a.key === "save-1000" || a.key === "debt-crusher") {
      progress = allComps.filter(c => c.category === "finance").length;
    } else if (a.key === "first-cert") {
      progress = allComps.filter(c => c.category === "career" && c.difficulty === "hard").length;
    } else if (a.key === "first-promo") {
      progress = allComps.filter(c => c.category === "career").length;
    } else if (a.key === "family-bonded") {
      progress = allComps.filter(c => c.category === "family").length;
    } else if (a.key === "scholar") {
      progress = allComps.filter(c => c.category === "learning").length;
    } else if (a.key === "side-success") {
      progress = allComps.filter(c => c.category === "hustle").length;
    }
    const shouldUnlock = !a.unlocked && progress >= (a.target ?? 1);
    if (progress !== a.progress || shouldUnlock) {
      aBatch.update(aDoc.ref, {
        progress,
        unlocked: shouldUnlock ? true : a.unlocked,
        unlockedAt: shouldUnlock ? nowISO() : a.unlockedAt,
      });
      if (shouldUnlock) {
        newlyUnlocked.push({ id: aDoc.id, ...a, progress, unlocked: true, unlockedAt: nowISO() });
      }
    }
  }
  await aBatch.commit();

  const updatedCharSnap = await charRef.get();
  const updatedChar: any = { id: uid, userId: uid, ...updatedCharSnap.data() };
  updatedChar.xpToNext = XP_TO_NEXT_LEVEL(updatedChar.level);
  try { updatedChar.goals = JSON.parse(updatedChar.goalsJson || "[]"); } catch { updatedChar.goals = []; }

  return {
    character: updatedChar,
    leveledUp,
    oldLevel,
    newLevel: level,
    xpEarned: quest.xpReward,
    newlyUnlocked,
    xpToNext: XP_TO_NEXT_LEVEL(level),
  };
});

// ----------------------------------------------------------------------------
// redeemReward — server-authoritative spendableXp deduction
// ----------------------------------------------------------------------------

const RedeemSchema = z.object({ rewardId: z.string().min(1) });

export const redeemReward = onCall({ region: "us-central1" }, async (req) => {
  const uid = requireAuth(req);
  const parsed = RedeemSchema.safeParse(req.data);
  if (!parsed.success) throw new HttpsError("invalid-argument", "Missing rewardId");
  const { rewardId } = parsed.data;

  const charRef = db.doc(`characters/${uid}`);
  const rewardRef = charRef.collection("rewards").doc(rewardId);

  const [charSnap, rewardSnap] = await Promise.all([charRef.get(), rewardRef.get()]);
  if (!rewardSnap.exists) throw new HttpsError("not-found", "Reward not found");
  if (!charSnap.exists) throw new HttpsError("failed-precondition", "Character not found");

  const reward: any = rewardSnap.data();
  const char: any = charSnap.data();
  if ((char.spendableXp ?? 0) < reward.cost) throw new HttpsError("failed-precondition", "Not enough XP");

  await charRef.update({ spendableXp: (char.spendableXp ?? 0) - reward.cost });
  await rewardRef.update({ redeemed: (reward.redeemed ?? 0) + 1 });

  const [newCharSnap, newRewardSnap] = await Promise.all([charRef.get(), rewardRef.get()]);
  return {
    character: { id: uid, userId: uid, ...newCharSnap.data() },
    reward: { id: rewardId, ...newRewardSnap.data() },
  };
});

// ----------------------------------------------------------------------------
// aiCoach — Gemini-backed coaching reply (free tier: 1500 req/day on Flash)
// ----------------------------------------------------------------------------

const CoachSchema = z.object({ message: z.string().min(1).max(1000) });

function parseGoals(char: any): string[] {
  try {
    return JSON.parse(char.goalsJson || "[]");
  } catch {
    return [];
  }
}

function weakestAndStrongest(categories: any[]): { weakest: any | null; strongest: any | null } {
  if (!categories.length) return { weakest: null, strongest: null };
  const sorted = [...categories].sort((a, b) => (a.level ?? 1) - (b.level ?? 1) || (a.xp ?? 0) - (b.xp ?? 0));
  return { weakest: sorted[0], strongest: sorted[sorted.length - 1] };
}

async function buildCoachContext(uid: string, char: any): Promise<string> {
  const charRef = db.doc(`characters/${uid}`);
  const today = todayUtc();

  const [catsSnap, compsSnap, questsSnap] = await Promise.all([
    charRef.collection("categories").get(),
    charRef.collection("completions").orderBy("completedAt", "desc").limit(10).get(),
    charRef.collection("quests").where("active", "==", true).get(),
  ]);

  const categories = catsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  const { weakest, strongest } = weakestAndStrongest(categories);
  const goals = parseGoals(char);

  const completedTodayIds = new Set<string>();
  const recentCompleted: string[] = [];
  compsSnap.docs.forEach(d => {
    const c = d.data() as any;
    if (c.completionDate === today) completedTodayIds.add(String(c.questId));
    if (recentCompleted.length < 5) {
      recentCompleted.push(`${c.questTitle} (+${c.xpReward} XP, ${c.category})`);
    }
  });

  const activeQuests = questsSnap.docs
    .map(d => ({ id: d.id, ...(d.data() as any) }))
    .filter(q => !completedTodayIds.has(String(q.id)))
    .slice(0, 8)
    .map(q => `${q.title} (${q.category}, ${q.difficulty}, +${q.xpReward} XP)`);

  const certHints = CLASS_CERT_HINTS[char.className] ?? CLASS_CERT_HINTS.professional;

  return `${COACH_PERSONA}

HERO SHEET:
- Name: ${char.name}
- Class: ${char.className} | Title: ${char.title ?? "Adventurer"}
- Level: ${char.level} | XP in bar: ${char.xp ?? 0} | Total XP earned: ${char.totalXp ?? 0} | Spendable XP: ${char.spendableXp ?? 0}
- Streak: ${char.currentStreak ?? 0} days (longest: ${char.longestStreak ?? 0})
- Life goal: ${char.lifeGoal || "Become the best version of myself"}
- Personal goals: ${goals.join("; ") || "none set"}
- Life stats: STR ${char.strength ?? 10}, INT ${char.intelligence ?? 10}, DIS ${char.discipline ?? 10}, WLT ${char.wealth ?? 10}, HP ${char.health ?? 10}, REL ${char.relationships ?? 10}
- Weakest category: ${weakest ? `${weakest.name} (Lv.${weakest.level}, ${weakest.rank})` : "unknown"}
- Strongest category: ${strongest ? `${strongest.name} (Lv.${strongest.level}, ${strongest.rank})` : "unknown"}
- Recent completions: ${recentCompleted.join("; ") || "none yet"}
- Active quests today: ${activeQuests.join("; ") || "none pending"}
- Career/cert paths to mention if relevant: ${certHints.join("; ")}`;
}

export const aiCoach = onCall({ region: "us-central1", secrets: [GEMINI_API_KEY] }, async (req) => {
  const uid = requireAuth(req);
  const parsed = CoachSchema.safeParse(req.data);
  if (!parsed.success) throw new HttpsError("invalid-argument", "Missing message");

  const charSnap = await db.doc(`characters/${uid}`).get();
  if (!charSnap.exists) return { reply: "Finish onboarding to unlock coaching.", fallback: true };

  const char: any = charSnap.data();
  const key = GEMINI_API_KEY.value();
  if (!key) {
    return { reply: "Coach is unavailable right now. Make one tiny move toward your next quest in the next 10 minutes — that's the win.", fallback: true };
  }

  try {
    const client = new GoogleGenerativeAI(key);
    const systemInstruction = await buildCoachContext(uid, char);
    const model = client.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 },
      } as any,
    });
    const result = await model.generateContent(parsed.data.message);
    const reply = result.response.text().trim() || "Take one small step right now. Momentum compounds.";
    return { reply };
  } catch (e: any) {
    console.error("aiCoach error", e);
    return { reply: "Coach is offline. Pick the smallest version of your next quest and do it in the next 10 minutes.", fallback: true };
  }
});

// ----------------------------------------------------------------------------
// generateQuests — Gemini-backed personalized daily quest pack (one per skill)
// ----------------------------------------------------------------------------

const GenSchema = z.object({
  refresh: z.boolean().optional(), // when true, ignore today's cache and regen
});

const SKILL_KEYS = ["health", "wealth", "career", "family", "mindset"] as const;
type SkillKey = typeof SKILL_KEYS[number];

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function orderQuestsBySkill(quests: any[]): any[] {
  const order = new Map(SKILL_KEYS.map((k, i) => [k, i]));
  return [...quests].sort(
    (a, b) => (order.get(a.category) ?? 99) - (order.get(b.category) ?? 99),
  );
}

async function getTodayCompletedQuestIds(charRef: DocumentReference): Promise<Set<string>> {
  const today = todayUtc();
  const compSnap = await charRef.collection("completions")
    .where("completionDate", "==", today)
    .get();
  return new Set(compSnap.docs.map(d => String((d.data() as any).questId)));
}

type PackItem = { category: SkillKey; title: string; description: string; difficulty: "easy"|"medium"|"hard"; xpReward: number };

// Hard-coded fallback pack so the UI always has something to show, even if
// Gemini errors. One quest per skill.
function fallbackPack(categories?: SkillKey[]): PackItem[] {
  const all: PackItem[] = [
    { category: "health",   title: "30-minute brisk walk",         description: "Move your body and clear your head.",          difficulty: "easy",   xpReward: 15 },
    { category: "wealth",   title: "Log today's spending",         description: "Track every dollar that left your wallet.",     difficulty: "easy",   xpReward: 15 },
    { category: "career",   title: "45 min deep work on top task", description: "Phone off, one tab, one task that moves the needle.", difficulty: "medium", xpReward: 30 },
    { category: "family",   title: "Call someone you love",        description: "Five minutes can change a day.",                difficulty: "easy",   xpReward: 15 },
    { category: "mindset",  title: "10 pages of a good book",      description: "Compound your mind.",                            difficulty: "easy",   xpReward: 15 },
  ];
  if (!categories?.length) return all;
  return all.filter(p => categories.includes(p.category));
}

async function generatePackItems(
  char: any,
  catLevels: Record<string, number>,
  categories: SkillKey[],
): Promise<PackItem[]> {
  if (!categories.length) return [];
  let pack = fallbackPack(categories);
  const key = GEMINI_API_KEY.value();
  if (!key) return pack;

  try {
    const client = new GoogleGenerativeAI(key);
    const catList = categories.join(", ");
    const sys = `You generate daily real-life action quests for an RPG-style self-improvement app. Return STRICTLY valid JSON: an array of EXACTLY ${categories.length} objects, one per category: ${catList}.

Each object MUST have these keys:
- category: one of ${categories.map(c => `"${c}"`).join(" | ")}
- title: short imperative action (max 60 chars), starts with a verb, no emoji
- description: one short sentence of WHY or HOW (max 90 chars)
- difficulty: "easy" | "medium" | "hard"
- xpReward: integer 10 (easy) | 25 (medium) | 50 (hard)

No markdown, no code fences, no commentary. JSON array only.

Tailor quests to this hero:
- Name: ${char.name}
- Class: ${char.className}
- Life goal: ${char.lifeGoal || "general growth"}
- Personal goals: ${(char.goals || []).join(", ") || "unspecified"}
- Streak days: ${char.currentStreak ?? 0}
- Skill levels: health=${catLevels.health ?? 1}, wealth=${catLevels.wealth ?? 1}, career=${catLevels.career ?? 1}, family=${catLevels.family ?? 1}, mindset=${catLevels.mindset ?? 1}

Quests must be doable today in under 90 minutes, concrete, and personalized.`;

    const model = client.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: sys,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.85,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      } as any,
    });
    const result = await model.generateContent(`Generate quests for: ${catList}`);
    const raw = result.response.text().trim();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned: PackItem[] = [];
      const seen = new Set<string>();
      for (const skill of categories) {
        const q = parsed.find((p: any) => p?.category === skill);
        if (!q || seen.has(skill)) continue;
        seen.add(skill);
        const difficulty = ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "easy";
        const xpReward = difficulty === "hard" ? 50 : difficulty === "medium" ? 25 : 10;
        cleaned.push({
          category: skill,
          title: String(q.title || "Take one small action").slice(0, 80),
          description: String(q.description || "Make today count.").slice(0, 120),
          difficulty,
          xpReward,
        });
      }
      if (cleaned.length === categories.length) pack = cleaned;
    }
  } catch (e: any) {
    console.error("generatePackItems error", e);
  }
  return pack;
}

async function persistPackQuests(
  questsCol: CollectionReference,
  items: PackItem[],
  today: string,
): Promise<any[]> {
  const persisted: any[] = [];
  for (const p of items) {
    const ref = await questsCol.add({
      title: p.title,
      description: p.description,
      category: p.category,
      difficulty: p.difficulty,
      xpReward: p.xpReward,
      isDaily: true,
      active: true,
      classTag: null,
      isAIGenerated: true,
      dailyPackDate: today,
      createdAt: new Date().toISOString(),
    });
    const snap = await ref.get();
    persisted.push({ id: ref.id, ...(snap.data() as any) });
  }
  return persisted;
}

export const generateQuests = onCall({ region: "us-central1", secrets: [GEMINI_API_KEY] }, async (req) => {
  const uid = requireAuth(req);
  const parsed = GenSchema.safeParse(req.data ?? {});
  const refresh = parsed.success ? !!parsed.data.refresh : false;

  const charSnap = await db.doc(`characters/${uid}`).get();
  if (!charSnap.exists) {
    throw new HttpsError("failed-precondition", "Finish onboarding first.");
  }
  const char: any = charSnap.data();
  try {
    char.goals = JSON.parse(char.goalsJson || "[]");
  } catch {
    char.goals = [];
  }

  const today = todayUtc();
  const cacheRef = db.doc(`characters/${uid}/dailyPacks/${today}`);
  const charRef = db.doc(`characters/${uid}`);
  const questsCol = charRef.collection("quests");

  if (!refresh) {
    const cached = await cacheRef.get();
    if (cached.exists) {
      const ids: string[] = (cached.data() as any).questIds ?? [];
      if (ids.length) {
        const docs = await Promise.all(ids.map(id => questsCol.doc(id).get()));
        const quests = docs.filter(d => d.exists).map(d => ({ id: d.id, ...(d.data() as any) }));
        if (quests.length === ids.length && quests.length > 0) {
          return { quests: orderQuestsBySkill(quests), cached: true };
        }
      }
    }
  }

  let keptQuests: any[] = [];
  let categoriesToGenerate: SkillKey[] = [...SKILL_KEYS];

  if (refresh) {
    const cached = await cacheRef.get();
    const cachedIds: string[] = cached.exists ? ((cached.data() as any).questIds ?? []) : [];
    const completedToday = await getTodayCompletedQuestIds(charRef);

    const keepIds: string[] = [];
    const deleteIds: string[] = [];
    for (const id of cachedIds) {
      if (completedToday.has(id)) keepIds.push(id);
      else deleteIds.push(id);
    }

    await Promise.all(deleteIds.map(id => questsCol.doc(id).delete().catch(() => null)));

    if (keepIds.length) {
      const keptDocs = await Promise.all(keepIds.map(id => questsCol.doc(id).get()));
      keptQuests = keptDocs.filter(d => d.exists).map(d => ({ id: d.id, ...(d.data() as any) }));
    }

    const keptCategories = new Set(keptQuests.map(q => q.category));
    categoriesToGenerate = SKILL_KEYS.filter(k => !keptCategories.has(k));

    // Option A: all missions complete — return kept only, no new quests.
    if (categoriesToGenerate.length === 0) {
      await cacheRef.set({
        questIds: keepIds,
        generatedAt: FieldValue.serverTimestamp(),
        refreshed: true,
        allComplete: true,
      });
      return { quests: orderQuestsBySkill(keptQuests), cached: false, allComplete: true };
    }
  }

  const catsSnap = await charRef.collection("categories").get();
  const catLevels: Record<string, number> = {};
  catsSnap.forEach(d => { const v = d.data() as any; catLevels[v.key] = v.level ?? 1; });

  const packItems = await generatePackItems(char, catLevels, categoriesToGenerate);
  const newQuests = await persistPackQuests(questsCol, packItems, today);

  const allQuests = orderQuestsBySkill([...keptQuests, ...newQuests]);
  const allQuestIds = allQuests.map(q => q.id);

  await cacheRef.set({
    questIds: allQuestIds,
    generatedAt: FieldValue.serverTimestamp(),
    refreshed: refresh,
  });

  return { quests: allQuests, cached: false };
});

// ----------------------------------------------------------------------------
// Native Google sign-in bridge (Capacitor / SFSafariViewController)
// Custom-scheme redirects from JS often never reach the app. An HTTPS 302 to
// the app scheme is reliable, and a short code avoids oversized JWT URLs.
// ----------------------------------------------------------------------------

export const createNativeGoogleSession = onRequest({ cors: true }, async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST required" });
    return;
  }
  const body = typeof req.body === "string"
    ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })()
    : (req.body || {});
  const idToken = typeof body.idToken === "string" ? body.idToken : "";
  const accessToken = typeof body.accessToken === "string" ? body.accessToken : null;
  if (!idToken || idToken.length < 20) {
    res.status(400).json({ error: "idToken required" });
    return;
  }
  const code = randomBytes(24).toString("hex");
  await db.collection("nativeGoogleSessions").doc(code).set({
    idToken,
    accessToken,
    createdAt: FieldValue.serverTimestamp(),
    expiresAtMs: Date.now() + NATIVE_GOOGLE_SESSION_TTL_MS,
  });
  const redirect = `https://us-central1-level-up-life-73702.cloudfunctions.net/completeNativeGoogleAuth?code=${encodeURIComponent(code)}`;
  res.json({ code, redirect });
});

export const completeNativeGoogleAuth = onRequest({ cors: true }, async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!code) {
    res.status(400).send("Missing code");
    return;
  }
  const snap = await db.collection("nativeGoogleSessions").doc(code).get();
  if (!snap.exists) {
    res.status(404).send("Session expired. Close this window and try again in the app.");
    return;
  }
  const expiresAtMs = Number(snap.data()?.expiresAtMs || 0);
  if (expiresAtMs && Date.now() > expiresAtMs) {
    await snap.ref.delete().catch(() => {});
    res.status(410).send("Session expired. Close this window and try again in the app.");
    return;
  }
  // HTTP 302 to custom scheme — SFSafariViewController hands this to the app.
  res.redirect(302, `${NATIVE_GOOGLE_SCHEME}?code=${encodeURIComponent(code)}`);
});

export const claimNativeGoogleSession = onCall(async (request) => {
  const code = typeof request.data?.code === "string" ? request.data.code.trim() : "";
  if (!code) throw new HttpsError("invalid-argument", "code required");
  const ref = db.collection("nativeGoogleSessions").doc(code);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Sign-in session expired. Try again.");
  const data = snap.data() as { idToken?: string; accessToken?: string | null; expiresAtMs?: number };
  await ref.delete().catch(() => {});
  if (data.expiresAtMs && Date.now() > data.expiresAtMs) {
    throw new HttpsError("deadline-exceeded", "Sign-in session expired. Try again.");
  }
  if (!data.idToken) throw new HttpsError("internal", "Session missing token");
  return { idToken: data.idToken, accessToken: data.accessToken || null };
});
