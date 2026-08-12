// Client-side game logic.
//
// Originally these three operations lived in Cloud Functions for server
// authority. Because we deployed on the Spark (free) plan, Cloud Functions
// aren't available, so the logic runs in the browser and writes directly to
// Firestore. This is fine for a personal/test app — Firestore rules still
// enforce that you can only touch your own user's data. A determined user
// could edit their XP via the browser console, but that just cheats their
// own game.

import {
  doc, collection, getDoc, getDocs, addDoc, updateDoc, writeBatch, setDoc,
  query, where, limit, runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";
import { candidateDayKeys, dayKeyLocal, isCompletionToday } from "./dayKey";
import { nextStreakState, streakXpMultiplier } from "./streak";
import { syncWeeklyChallengeProgress } from "./weeklyChallenges";
import {
  evaluateAchievements,
  seedAchievementsOnOnboarding,
} from "./achievements";
import {
  XP_TO_NEXT_LEVEL,
  SKILL_XP_BY_DIFFICULTY,
  applySkillXp,
  xpForLevel,
  xpToNextSkillLevel,
  startingLevelFromAssessment,
  skillRankForLevel,
  SKILL_MAX_LEVEL,
} from "@shared/schema";

// ============================================================================
// Game constants
// ============================================================================

const titleForLevel = (level: number) => {
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
  let cur = TITLES[0].title;
  for (const t of TITLES) if (level >= t.min) cur = t.title;
  return cur;
};

export { XP_TO_NEXT_LEVEL };

// Five trainable skill trees (OSRS-style 1–99).
const CATEGORY_DEFS = [
  { key: "health", name: "Health", icon: "💪", color: "#10b981" },
  { key: "wealth", name: "Wealth", icon: "💰", color: "#f59e0b" },
  { key: "career", name: "Career", icon: "💼", color: "#3b82f6" },
  { key: "family", name: "Family", icon: "❤️", color: "#ef4444" },
  { key: "mindset", name: "Mindset", icon: "🧠", color: "#8b5cf6" },
];

/** Bump schema to force hard reset + re-onboarding for OSRS skill progression. */
export const SCHEMA_VERSION = 5;

const CORE_STAT_KEYS = [
  "strength",
  "intelligence",
  "discipline",
  "wealth",
  "health",
  "relationships",
] as const;
type CoreStatKey = (typeof CORE_STAT_KEYS)[number];

function skillXpForDifficulty(difficulty: string): number {
  return SKILL_XP_BY_DIFFICULTY[difficulty] ?? SKILL_XP_BY_DIFFICULTY.easy;
}

function totalXpForStat(char: any, key: CoreStatKey): number {
  const xpKey = `${key}Xp`;
  if (typeof char[xpKey] === "number") return char[xpKey];
  const level = Math.max(1, Math.min(SKILL_MAX_LEVEL, Number(char[key]) || 1));
  return xpForLevel(level);
}

// Universal quests every class gets a slice of — covers the broad-strokes
// habits everyone benefits from.
const UNIVERSAL_QUESTS: Array<any> = [
  // Health basics
  { title: "Drink 8 glasses of water", description: "Hydration is a quiet superpower", category: "health", difficulty: "easy", xpReward: 10, isDaily: true },
  { title: "Hit your daily steps", description: "Movement keeps the body honest", category: "health", difficulty: "easy", xpReward: 10, isDaily: true },
  { title: "Make your bed", description: "Start the day with a win", category: "health", difficulty: "easy", xpReward: 10, isDaily: true },
  { title: "10 minutes of stretching", description: "Mobility is longevity", category: "health", difficulty: "easy", xpReward: 10, isDaily: true },
  { title: "Eat a vegetable with every meal", description: "Small swaps, big payoffs", category: "health", difficulty: "easy", xpReward: 10, isDaily: true },
  { title: "Lights out by 11pm", description: "Sleep is the cheat code", category: "health", difficulty: "medium", xpReward: 25, isDaily: true },
  { title: "No screens 30 min before bed", description: "Wind down the right way", category: "health", difficulty: "medium", xpReward: 25, isDaily: true },
  { title: "5 minutes of meditation", description: "Train the inner muscle", category: "health", difficulty: "easy", xpReward: 10, isDaily: true },
  { title: "30-minute workout", description: "Lift, run, ride — anything that moves you", category: "health", difficulty: "medium", xpReward: 25, isDaily: true },
  { title: "No fast food today", description: "Cook one meal, save your future self", category: "health", difficulty: "medium", xpReward: 25, isDaily: true },
  { title: "Cold shower or contrast finish", description: "Discipline you can feel", category: "health", difficulty: "medium", xpReward: 25, isDaily: true },

  // Mindset / discipline
  { title: "Journal 5 minutes", description: "Get the noise on paper", category: "mindset", difficulty: "easy", xpReward: 10, isDaily: true },
  { title: "Write 3 things you're grateful for", description: "Cheap, powerful, repeat", category: "family", difficulty: "easy", xpReward: 10, isDaily: true },
  { title: "Plan tomorrow tonight", description: "Tomorrow-you will thank you", category: "career", difficulty: "easy", xpReward: 10, isDaily: true },
  { title: "No social media before noon", description: "Protect your first hours", category: "career", difficulty: "medium", xpReward: 25, isDaily: true },

  // Connection
  { title: "Text a friend or family member", description: "Tend the people that matter", category: "family", difficulty: "easy", xpReward: 10, isDaily: true },
  { title: "Call someone who matters", description: "5 minutes can change a day", category: "family", difficulty: "easy", xpReward: 10, isDaily: true },
  { title: "Pay someone a real compliment", description: "Be the reason someone smiles", category: "family", difficulty: "easy", xpReward: 10, isDaily: true },
  { title: "Spend 30 min phone-free with loved ones", description: "Presence > pixels", category: "family", difficulty: "medium", xpReward: 25, isDaily: true },

  // Learning
  { title: "Read 10 pages", description: "Compound your mind", category: "mindset", difficulty: "easy", xpReward: 10, isDaily: true },
  { title: "Listen to 1 podcast episode", description: "Learn while you move", category: "mindset", difficulty: "easy", xpReward: 10, isDaily: true },
  { title: "Learn one new word", description: "Vocabulary is leverage", category: "mindset", difficulty: "easy", xpReward: 10, isDaily: true },
  { title: "Watch a tutorial in your field", description: "Sharpen the edge", category: "mindset", difficulty: "medium", xpReward: 25, isDaily: true },

  // Money
  { title: "Log today's spending", description: "Awareness is the first step", category: "wealth", difficulty: "easy", xpReward: 10, isDaily: true },
  { title: "Skip one impulse purchase", description: "Pay your future self", category: "wealth", difficulty: "medium", xpReward: 25, isDaily: true },
  { title: "Pack lunch / make coffee at home", description: "Tiny choices stack", category: "wealth", difficulty: "easy", xpReward: 10, isDaily: true },

  // Home / environment
  { title: "Tidy one room for 10 minutes", description: "Order in space, order in mind", category: "health", difficulty: "easy", xpReward: 10, isDaily: true },
  { title: "Inbox to zero", description: "Reclaim your attention", category: "career", difficulty: "medium", xpReward: 25, isDaily: true },

  // Bigger milestones (weekly, not daily)
  { title: "Plan next week on Sunday", description: "Calendar the wins you want", category: "career", difficulty: "medium", xpReward: 25, isDaily: false },
  { title: "7-day workout streak", description: "A full week of movement", category: "health", difficulty: "hard", xpReward: 50, isDaily: false },
  { title: "Read a full book", description: "Front to back, no skimming", category: "mindset", difficulty: "hard", xpReward: 50, isDaily: false },
  { title: "Save your first $100 this month", description: "Set the floor", category: "wealth", difficulty: "hard", xpReward: 50, isDaily: false },
];

// Class-flavored quests stack on top of the universal pool.
const CLASS_QUEST_TEMPLATES: Record<string, Array<any>> = {
  entrepreneur: [
    { title: "Pitch your idea to one person", description: "Out loud, in front of someone real", category: "career", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "List one product or service", description: "Inventory grows your shop", category: "career", difficulty: "medium", xpReward: 25, isDaily: false },
    { title: "Talk to one customer", description: "They know what you don't", category: "career", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Review weekly cashflow", description: "Know where every dollar is going", category: "wealth", difficulty: "medium", xpReward: 25, isDaily: false },
    { title: "Ship one tiny feature", description: "Done beats perfect", category: "career", difficulty: "hard", xpReward: 50, isDaily: false },
    { title: "Send 3 cold outreach messages", description: "Quiet shops don't sell", category: "career", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Read 10 pages of business writing", description: "Compound knowledge", category: "mindset", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Update your pipeline", description: "See the funnel, work the funnel", category: "career", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Write one piece of content", description: "Build the asset that compounds", category: "career", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Run a small experiment", description: "Test, don't guess", category: "career", difficulty: "hard", xpReward: 50, isDaily: false },
  ],
  tradesman: [
    { title: "Sharpen or maintain a tool", description: "Care for the things that earn you a living", category: "career", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Practice one technique 30 minutes", description: "Reps build mastery", category: "career", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Finish a certification module", description: "Push your trade forward", category: "career", difficulty: "hard", xpReward: 50, isDaily: false },
    { title: "Inventory your supplies", description: "Run out, lose the day", category: "career", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Track a job's hours and cost", description: "Margins matter", category: "wealth", difficulty: "medium", xpReward: 25, isDaily: false },
    { title: "Quote one new job", description: "The next gig starts here", category: "wealth", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Watch a trade tutorial", description: "Steal a trick from the pros", category: "mindset", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Mentor or help a coworker", description: "Teaching sharpens you too", category: "career", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Review safety protocols", description: "Go home in one piece", category: "career", difficulty: "easy", xpReward: 10, isDaily: true },
  ],
  parent: [
    { title: "10 minutes of undivided kid time", description: "No phone, just presence", category: "family", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Family meal together", description: "Table > screen", category: "family", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Plan a family activity", description: "Make memories on purpose", category: "family", difficulty: "hard", xpReward: 50, isDaily: false },
    { title: "Read with your kid", description: "Books beat noise", category: "mindset", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Bedtime story or song", description: "End the day in love", category: "family", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Date night (or solo recharge)", description: "Pour back into the cup", category: "family", difficulty: "medium", xpReward: 25, isDaily: false },
    { title: "One chore as a team", description: "Build little teammates", category: "family", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Talk to your partner without screens", description: "Marriages live in attention", category: "family", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Ask your kid one open-ended question", description: "Learn who they're becoming", category: "family", difficulty: "easy", xpReward: 10, isDaily: true },
  ],
  athlete: [
    { title: "Hard training session", description: "Push the ceiling", category: "health", difficulty: "hard", xpReward: 50, isDaily: false },
    { title: "Easy recovery cardio", description: "Active rest beats no rest", category: "health", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Hit your protein target", description: "Build the engine", category: "health", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Mobility / foam roll 10 min", description: "Bullet-proof the body", category: "health", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Log today's training", description: "Track or you can't tell", category: "health", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Sport-specific skill work", description: "Drill what wins games", category: "health", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Cook a clean meal", description: "Fuel matters", category: "health", difficulty: "medium", xpReward: 25, isDaily: false },
    { title: "8 hours of sleep", description: "Recovery is training", category: "health", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Set a new PR", description: "Reach further than yesterday", category: "health", difficulty: "hard", xpReward: 50, isDaily: false },
  ],
  student: [
    { title: "Study 30 minutes", description: "Deep focus on a skill or course", category: "mindset", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Finish a course module", description: "Stack the wins", category: "mindset", difficulty: "hard", xpReward: 50, isDaily: false },
    { title: "Active recall practice", description: "Test yourself, not your notes", category: "mindset", difficulty: "medium", xpReward: 25, isDaily: false },
    { title: "Re-read yesterday's notes", description: "Tiny review beats a cram", category: "mindset", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Teach today's topic to a wall", description: "If you can explain it, you know it", category: "mindset", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Office hours / ask a question", description: "The dumb question got asked first", category: "mindset", difficulty: "easy", xpReward: 10, isDaily: false },
    { title: "Pomodoro x 4", description: "Two hours of real focus", category: "mindset", difficulty: "hard", xpReward: 50, isDaily: true },
    { title: "Outline next week's assignments", description: "See the road before you walk it", category: "career", difficulty: "easy", xpReward: 10, isDaily: false },
    { title: "Submit one assignment early", description: "Stop being the deadline person", category: "career", difficulty: "hard", xpReward: 50, isDaily: false },
  ],
  creator: [
    { title: "Make one new thing", description: "Anything. Just ship it.", category: "career", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Post to your audience", description: "Show your work", category: "career", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Study a creator you admire", description: "Steal like an artist", category: "mindset", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Finish a project", description: "Done > started", category: "career", difficulty: "hard", xpReward: 50, isDaily: false },
    { title: "Capture 3 ideas in your notes", description: "Catch lightning before it fades", category: "mindset", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Reply to your audience", description: "Conversations build cathedrals", category: "career", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Batch a week of content", description: "Future-you gets a day off", category: "career", difficulty: "hard", xpReward: 50, isDaily: false },
    { title: "Practice your craft 30 min", description: "Skill, not luck", category: "mindset", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Collaborate with another creator", description: "Cross-pollinate audiences", category: "career", difficulty: "medium", xpReward: 25, isDaily: false },
  ],
  professional: [
    { title: "Plan your top 3", description: "Three things, that's it", category: "career", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Deep work block (60 min)", description: "No meetings, no Slack", category: "career", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Finish a certification module", description: "Stay sharp", category: "career", difficulty: "hard", xpReward: 50, isDaily: false },
    { title: "Review weekly budget", description: "Know where every dollar is going", category: "wealth", difficulty: "medium", xpReward: 25, isDaily: false },
    { title: "Document one process", description: "Build the system that frees you", category: "career", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "One networking touch", description: "Stay top-of-mind", category: "career", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Ship a draft, don't polish", description: "Feedback beats perfection", category: "career", difficulty: "medium", xpReward: 25, isDaily: true },
    { title: "Block 30 min for thinking", description: "Strategy needs space", category: "career", difficulty: "easy", xpReward: 10, isDaily: true },
    { title: "Negotiate or ask for something", description: "Closed mouths don't get fed", category: "career", difficulty: "hard", xpReward: 50, isDaily: false },
  ],
};

const STARTER_REWARDS = [
  { name: "Favorite Coffee", description: "Treat yourself to that good brew", icon: "☕", cost: 100 },
  { name: "Movie Night", description: "Pick a film, get the snacks", icon: "🎬", cost: 500 },
  { name: "New Tool", description: "Something useful you've had your eye on", icon: "🛠️", cost: 1000 },
  { name: "Weekend Trip", description: "A real adventure", icon: "🏞️", cost: 5000 },
];

// Maps quest categories → core stats that gain OSRS skill XP on completion.
const CATEGORY_STAT_IMPACT: Record<string, CoreStatKey[]> = {
  health: ["strength", "health"],
  wealth: ["wealth"],
  career: ["intelligence"],
  family: ["relationships"],
  mindset: ["discipline"],
  // Legacy categories
  finance: ["wealth"],
  learning: ["intelligence"],
  hustle: ["wealth", "intelligence"],
};

const todayISO = () => dayKeyLocal();
const nowISO = () => new Date().toISOString();

// ============================================================================
// finalizeOnboarding — seed character + categories + quests + achievements + rewards
// ============================================================================

export interface FinalizeInput {
  characterName: string;
  avatar: string;
  photoURL?: string | null;
  pronouns?: string | null;
  className: string;
  goals: string[];
  // New shape: 1–10 average score per area, computed from the 10-question life assessment.
  // Older callers may still pass the legacy shape; we normalize below.
  assessment: {
    health?: number;
    wealth?: number;
    career?: number;
    family?: number;
    mindset?: number;
    // Legacy fields (ignored if new ones are present).
    finance?: number;
    relationships?: number;
    learning?: number;
    discipline?: number;
  };
}

export async function finalizeOnboardingLocal(uid: string, input: FinalizeInput) {
  // Normalize new → legacy mapping. If a new field is missing, fall back to a legacy field.
  const a = input.assessment ?? {};
  const healthScore = a.health ?? 5;
  const wealthScore = a.wealth ?? a.finance ?? 5;
  const careerScore = a.career ?? a.learning ?? 5;
  const familyScore = a.family ?? a.relationships ?? 5;
  const mindsetScore = a.mindset ?? a.discipline ?? 5;

  // Starting core-stat LEVELS (1–10 from assessment), not the old 10–100 flat scores.
  let strength = startingLevelFromAssessment(healthScore);
  let health = startingLevelFromAssessment(healthScore);
  let wealth = startingLevelFromAssessment(wealthScore);
  let intelligence = startingLevelFromAssessment(careerScore);
  let relationships = startingLevelFromAssessment(familyScore);
  let discipline = startingLevelFromAssessment(mindsetScore);

  const classBonusLevels: Record<string, Partial<Record<CoreStatKey, number>>> = {
    entrepreneur: { wealth: 2, intelligence: 1, discipline: 1 },
    tradesman: { discipline: 2, strength: 1, wealth: 1 },
    parent: { relationships: 2, discipline: 1, health: 1 },
    athlete: { strength: 2, health: 2, discipline: 1 },
    student: { intelligence: 2, discipline: 1 },
    creator: { intelligence: 2, relationships: 1, discipline: 1 },
    professional: { intelligence: 2, wealth: 1, discipline: 1 },
  };
  const cb = classBonusLevels[input.className] ?? {};
  const bump = (cur: number, add: number | undefined) =>
    Math.min(SKILL_MAX_LEVEL, cur + (add ?? 0));
  strength = bump(strength, cb.strength);
  health = bump(health, cb.health);
  intelligence = bump(intelligence, cb.intelligence);
  discipline = bump(discipline, cb.discipline);
  wealth = bump(wealth, cb.wealth);
  relationships = bump(relationships, cb.relationships);

  const strengthXp = xpForLevel(strength);
  const healthXp = xpForLevel(health);
  const intelligenceXp = xpForLevel(intelligence);
  const disciplineXp = xpForLevel(discipline);
  const wealthXp = xpForLevel(wealth);
  const relationshipsXp = xpForLevel(relationships);

  // Category starting levels mirror the assessment for that life area.
  const categoryStartLevel: Record<string, number> = {
    health: startingLevelFromAssessment(healthScore),
    wealth: startingLevelFromAssessment(wealthScore),
    career: startingLevelFromAssessment(careerScore),
    family: startingLevelFromAssessment(familyScore),
    mindset: startingLevelFromAssessment(mindsetScore),
  };

  // Legacy Score = sum of skill-tree levels (5..495).
  const legacyScore = Object.values(categoryStartLevel).reduce((s, n) => s + n, 0);

  const charDoc = {
    name: input.characterName,
    avatar: input.avatar,
    photoURL: input.photoURL ?? null,
    pronouns: input.pronouns ?? null,
    className: input.className,
    title: titleForLevel(1),
    lifeGoal: input.goals[0] ? `Pursue: ${input.goals[0]}` : "Become the best version of myself",
    goalsJson: JSON.stringify(input.goals),
    level: 1,
    xp: 0,
    totalXp: 0,
    spendableXp: 0,
    legacyScore,
    schemaVersion: SCHEMA_VERSION,
    strength, intelligence, discipline, wealth, health, relationships,
    strengthXp, intelligenceXp, disciplineXp, wealthXp, healthXp, relationshipsXp,
    currentStreak: 0,
    longestStreak: 0,
    lastCompletionDate: null,
    hoursInvested: 0,
    createdAt: nowISO(),
  };

  const charRef = doc(db, "characters", uid);

  // Wipe any existing subcollections (for re-onboarding)
  for (const sub of ["quests", "categories", "achievements", "rewards", "completions"]) {
    const existing = await getDocs(collection(charRef, sub));
    if (existing.size > 0) {
      const batch = writeBatch(db);
      existing.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }

  // Write the character document
  const { setDoc } = await import("firebase/firestore");
  await setDoc(charRef, charDoc);

  // Seed categories (OSRS skill trees) — start at assessment level.
  const catBatch = writeBatch(db);
  for (const cat of CATEGORY_DEFS) {
    const ref = doc(collection(charRef, "categories"), cat.key);
    const level = categoryStartLevel[cat.key] ?? 1;
    const totalXp = xpForLevel(level);
    catBatch.set(ref, {
      key: cat.key, name: cat.name, icon: cat.icon, color: cat.color,
      xp: 0,
      totalXp,
      level,
      rank: skillRankForLevel(level),
    });
  }
  await catBatch.commit();

  // Seed quests — universal pool (random sample) + full class-specific list,
  // de-duplicated by title so we don't double-seed shared habits.
  const classQuests = (CLASS_QUEST_TEMPLATES[input.className] ?? CLASS_QUEST_TEMPLATES.professional)
    .map(q => ({ ...q, classTag: input.className }));
  // Seed the full universal pool so daily rotation has lots to pick from.
  const universalSeed = UNIVERSAL_QUESTS.map(q => ({ ...q, classTag: null }));
  const seen = new Set<string>();
  const seedQuests = [...classQuests, ...universalSeed].filter(q => {
    if (seen.has(q.title)) return false;
    seen.add(q.title);
    return true;
  });
  for (const q of seedQuests) {
    await addDoc(collection(charRef, "quests"), { ...q, active: true, createdAt: nowISO() });
  }

  // Seed achievements (Phase 2 expanded catalog)
  await seedAchievementsOnOnboarding(uid);

  // Seed rewards
  for (const r of STARTER_REWARDS) {
    await addDoc(collection(charRef, "rewards"), { ...r, redeemed: 0, createdAt: nowISO() });
  }

  // Mark user as onboarded
  await setDoc(doc(db, "users", uid), { onboarded: true }, { merge: true });

  return { id: uid, userId: uid, ...charDoc };
}

// ============================================================================
// completeQuest — XP / level / streak / achievements / category XP
// ============================================================================

export async function completeQuestLocal(uid: string, questId: string) {
  const charRef = doc(db, "characters", uid);
  const questRef = doc(charRef, "quests", questId);
  const today = todayISO();
  const dayKeys = candidateDayKeys();

  const [questSnap, charSnap] = await Promise.all([getDoc(questRef), getDoc(charRef)]);
  if (!questSnap.exists()) throw new Error("Quest not found");
  if (!charSnap.exists()) throw new Error("Character not found");

  const quest: any = questSnap.data();
  const char: any = charSnap.data();

  // Block same-day re-completion (local today + legacy UTC today when they differ).
  for (const day of dayKeys) {
    const dup = await getDocs(query(
      collection(charRef, "completions"),
      where("questId", "==", questId),
      where("completionDate", "==", day),
      limit(1),
    ));
    if (!dup.empty) throw new Error("Already completed today");

    const legacyRef = doc(charRef, "completions", `${questId}_${day}`);
    const legacySnap = await getDoc(legacyRef);
    if (legacySnap.exists()) throw new Error("Already completed today");
  }

  const completionPayload = {
    questId,
    questTitle: quest.title,
    category: quest.category,
    difficulty: quest.difficulty,
    xpReward: quest.xpReward,
    completedAt: nowISO(),
    completionDate: today,
  };
  const completionRef = doc(charRef, "completions", `${questId}_${today}`);
  try {
    await runTransaction(db, async (tx) => {
      const existing = await tx.get(completionRef);
      if (existing.exists()) throw new Error("Already completed today");
      // Also lock against legacy UTC doc colliding in the same transaction window
      for (const day of dayKeys) {
        if (day === today) continue;
        const other = await tx.get(doc(charRef, "completions", `${questId}_${day}`));
        if (other.exists()) throw new Error("Already completed today");
      }
      tx.set(completionRef, completionPayload);
    });
  } catch (e: any) {
    if (String(e?.message || e).includes("Already completed today")) throw e;
    const existing = await getDoc(completionRef);
    if (existing.exists()) throw new Error("Already completed today");
    await setDoc(completionRef, completionPayload);
  }

  // Streak — local day; one calendar day counts once (compat with legacy UTC lastCompletionDate)
  const last = char.lastCompletionDate ?? null;
  let currentStreak = char.currentStreak ?? 0;
  let longestStreak = char.longestStreak ?? 0;
  if (isCompletionToday(last)) {
    // Already completed something earlier today — streak unchanged
  } else {
    const next = nextStreakState({
      currentStreak,
      longestStreak,
      lastCompletionDate: last,
      today,
    });
    currentStreak = next.currentStreak;
    longestStreak = next.longestStreak;
  }

  // Streak XP multiplier: +5% per streak day, capped at +50% (shared helper)
  const streakMult = streakXpMultiplier(currentStreak);
  const baseXp = Number(quest.xpReward) || 0;
  const awardedXp = Math.max(1, Math.round(baseXp * streakMult));
  const streakBonusXp = awardedXp - baseXp;

  // Hero / account XP + level (lighter curve — separate from skill grind)
  const oldLevel = char.level ?? 1;
  let xp = (char.xp ?? 0) + awardedXp;
  let level = oldLevel;
  let leveledUp = false;
  while (xp >= XP_TO_NEXT_LEVEL(level)) {
    xp -= XP_TO_NEXT_LEVEL(level);
    level++;
    leveledUp = true;
  }

  // OSRS skill XP for the matching skill tree + core stats
  const baseSkillXp = skillXpForDifficulty(quest.difficulty);
  const awardedSkillXp = Math.max(1, Math.round(baseSkillXp * streakMult));
  const impactStats = CATEGORY_STAT_IMPACT[quest.category] ?? [];

  const updates: any = {
    xp,
    level,
    title: titleForLevel(level),
    totalXp: (char.totalXp ?? 0) + awardedXp,
    spendableXp: (char.spendableXp ?? 0) + awardedXp,
    currentStreak,
    longestStreak,
    lastCompletionDate: today,
    hoursInvested: (char.hoursInvested ?? 0) + (quest.difficulty === "hard" ? 60 : quest.difficulty === "medium" ? 30 : 10),
  };

  for (const stat of impactStats) {
    const prevTotal = totalXpForStat(char, stat);
    const progress = applySkillXp(prevTotal, awardedSkillXp);
    updates[stat] = progress.level;
    updates[`${stat}Xp`] = progress.totalXp;
  }

  // Category / skill-tree XP (OSRS curve, cap 99)
  const catRef = doc(charRef, "categories", quest.category);
  const catSnap = await getDoc(catRef);
  let questCategoryLevel: number | null = null;
  if (catSnap.exists()) {
    const cat: any = catSnap.data();
    const prevTotal =
      typeof cat.totalXp === "number"
        ? cat.totalXp
        : xpForLevel(cat.level ?? 1) + (cat.xp ?? 0);
    const progress = applySkillXp(prevTotal, awardedSkillXp);
    questCategoryLevel = progress.level;
    await updateDoc(catRef, {
      xp: progress.xp,
      totalXp: progress.totalXp,
      level: progress.level,
      rank: skillRankForLevel(progress.level),
    });
  }

  // Legacy Score = sum of skill-tree levels (capped 99 each) → 5..495
  const allCatsSnap = await getDocs(collection(charRef, "categories"));
  let totalLevel = 0;
  for (const d of allCatsSnap.docs) {
    const c: any = d.data();
    const lvl =
      d.id === quest.category && questCategoryLevel != null
        ? questCategoryLevel
        : (c.level ?? 1);
    totalLevel += Math.min(SKILL_MAX_LEVEL, Math.max(1, lvl));
  }
  updates.legacyScore = totalLevel;
  await updateDoc(charRef, updates);

  const updatedCharSnap = await getDoc(charRef);
  const updatedChar: any = { id: uid, userId: uid, ...updatedCharSnap.data() };
  updatedChar.xpToNext = XP_TO_NEXT_LEVEL(updatedChar.level);
  try { updatedChar.goals = JSON.parse(updatedChar.goalsJson || "[]"); } catch { updatedChar.goals = []; }

  // Defer achievement + weekly sync so the UI unlocks immediately for the next quest.
  // Failures here must never block further completions in the same session.
  void (async () => {
    try {
      const [compsSnap, catsSnap2] = await Promise.all([
        getDocs(collection(charRef, "completions")),
        getDocs(collection(charRef, "categories")),
      ]);
      const allComps = compsSnap.docs.map(d => d.data() as any);
      const categoryLevels: Record<string, number> = {};
      catsSnap2.forEach((d) => {
        const c: any = d.data();
        if (c.key) categoryLevels[c.key] = c.level ?? 1;
      });
      if (questCategoryLevel != null) categoryLevels[quest.category] = questCategoryLevel;
      await evaluateAchievements(uid, {
        allComps,
        character: { ...char, ...updates },
        categoryLevels,
      });
    } catch (e) {
      console.warn("deferred achievement eval failed", e);
    }
    try {
      await syncWeeklyChallengeProgress(uid);
    } catch (e) {
      console.warn("deferred weekly sync failed", e);
    }
  })();

  return {
    character: updatedChar,
    leveledUp,
    oldLevel,
    newLevel: level,
    xpEarned: awardedXp,
    skillXpEarned: awardedSkillXp,
    streakBonusXp,
    newlyUnlocked: [] as any[],
    xpToNext: XP_TO_NEXT_LEVEL(level),
  };
}

// ============================================================================
// redeemReward — deduct spendableXp, increment redeemed count
// ============================================================================

export async function redeemRewardLocal(uid: string, rewardId: string) {
  const charRef = doc(db, "characters", uid);
  const rewardRef = doc(charRef, "rewards", rewardId);

  const [charSnap, rewardSnap] = await Promise.all([getDoc(charRef), getDoc(rewardRef)]);
  if (!rewardSnap.exists()) throw new Error("Reward not found");
  if (!charSnap.exists()) throw new Error("Character not found");

  const reward: any = rewardSnap.data();
  const char: any = charSnap.data();
  if ((char.spendableXp ?? 0) < reward.cost) throw new Error("Not enough XP");

  await updateDoc(charRef, { spendableXp: (char.spendableXp ?? 0) - reward.cost });
  await updateDoc(rewardRef, { redeemed: (reward.redeemed ?? 0) + 1 });

  const [newCharSnap, newRewardSnap] = await Promise.all([getDoc(charRef), getDoc(rewardRef)]);
  return {
    character: { id: uid, userId: uid, ...newCharSnap.data() },
    reward: { id: rewardId, ...newRewardSnap.data() },
  };
}
