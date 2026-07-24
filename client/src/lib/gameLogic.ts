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
  doc, collection, getDoc, getDocs, addDoc, updateDoc, writeBatch,
  query, where, limit,
} from "firebase/firestore";
import { db } from "./firebase";

// ============================================================================
// Game constants (mirrors of functions/src/index.ts)
// ============================================================================

export const XP_TO_NEXT_LEVEL = (level: number) => Math.round(50 + level * 75);
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

// New 6-category model. Hustle is split out into Side Hustles (Phase 5, separate hub).
// Legacy is a derived score (avg of the 5 trainable stats), so it's not a quest category.
const CATEGORY_DEFS = [
  { key: "health", name: "Health", icon: "💪", color: "#10b981" },
  { key: "wealth", name: "Wealth", icon: "💰", color: "#f59e0b" },
  { key: "career", name: "Career", icon: "💼", color: "#3b82f6" },
  { key: "family", name: "Family", icon: "❤️", color: "#ef4444" },
  { key: "mindset", name: "Mindset", icon: "🧠", color: "#8b5cf6" },
];

export const SCHEMA_VERSION = 4;

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

// Maps quest categories → stats they bump on completion.
// Stat keys stay the same for back-compat: strength=Health, wealth=Wealth,
// intelligence=Career, relationships=Family, discipline=Mindset.
const CATEGORY_STAT_IMPACT: Record<string, string[]> = {
  health: ["strength"],
  wealth: ["wealth"],
  career: ["intelligence"],
  family: ["relationships"],
  mindset: ["discipline"],
  // Legacy categories — still accepted at completion time so old data stays usable.
  finance: ["wealth"],
  learning: ["intelligence"],
  hustle: ["wealth", "intelligence"],
};

const todayISO = () => new Date().toISOString().slice(0, 10);
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

  // Starting stats: 10–100 scale, linear from a 1–10 input.
  const base = (n: number) => Math.max(10, Math.min(100, 10 + Math.round(n * 9)));
  let strength = base(healthScore);
  let wealth = base(wealthScore);
  let intelligence = base(careerScore);
  let relationships = base(familyScore);
  let discipline = base(mindsetScore);
  // 'health' stat slot kept for back-compat with old UI — mirrors strength.
  let health = strength;

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

  // Legacy Score = Total Mastery (sum of skill levels). Every character starts at level 1 in all
  // 5 categories, so starting total = 5. (Max = 5 × 99 = 495.)
  const legacyScore = 5;

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

  // Seed categories
  const catBatch = writeBatch(db);
  for (const cat of CATEGORY_DEFS) {
    const ref = doc(collection(charRef, "categories"), cat.key);
    catBatch.set(ref, {
      key: cat.key, name: cat.name, icon: cat.icon, color: cat.color,
      xp: 0, level: 1, rank: "Novice",
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

  // Seed achievements
  const aBatch = writeBatch(db);
  for (const a of ACHIEVEMENT_TEMPLATES) {
    const ref = doc(collection(charRef, "achievements"), a.key);
    aBatch.set(ref, {
      key: a.key, name: a.name, description: a.description,
      icon: a.icon, rarity: a.rarity, category: a.category,
      unlocked: false, unlockedAt: null, progress: 0, target: a.target,
    });
  }
  await aBatch.commit();

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

  const [questSnap, charSnap] = await Promise.all([getDoc(questRef), getDoc(charRef)]);
  if (!questSnap.exists()) throw new Error("Quest not found");
  if (!charSnap.exists()) throw new Error("Character not found");

  const quest: any = questSnap.data();
  const char: any = charSnap.data();

  if (quest.isDaily) {
    const dup = await getDocs(query(
      collection(charRef, "completions"),
      where("questId", "==", questId),
      where("completionDate", "==", today),
      limit(1),
    ));
    if (!dup.empty) throw new Error("Already completed today");
  }

  // Append completion
  await addDoc(collection(charRef, "completions"), {
    questId,
    questTitle: quest.title,
    category: quest.category,
    difficulty: quest.difficulty,
    xpReward: quest.xpReward,
    completedAt: nowISO(),
    completionDate: today,
  });

  // Streak (compute before XP so multiplier can use today's streak)
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

  // Streak XP multiplier: +5% per streak day, capped at +50%
  const streakMult = 1 + Math.min(0.5, currentStreak * 0.05);
  const baseXp = Number(quest.xpReward) || 0;
  const awardedXp = Math.max(1, Math.round(baseXp * streakMult));
  const streakBonusXp = awardedXp - baseXp;

  // XP + level
  const oldLevel = char.level ?? 1;
  let xp = (char.xp ?? 0) + awardedXp;
  let level = oldLevel;
  let leveledUp = false;
  while (xp >= XP_TO_NEXT_LEVEL(level)) {
    xp -= XP_TO_NEXT_LEVEL(level);
    level++;
    leveledUp = true;
  }

  // Stat bumps
  const impactStats = CATEGORY_STAT_IMPACT[quest.category] ?? [];
  const statBump = quest.difficulty === "hard" ? 2 : quest.difficulty === "medium" ? 1 : 0;
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
    updates[stat] = Math.min(100, (char[stat] ?? 10) + (statBump || 1));
  }

  // Category XP (apply BEFORE computing Legacy so total-level is fresh)
  const catRef = doc(charRef, "categories", quest.category);
  const catSnap = await getDoc(catRef);
  let questCategoryLevel: number | null = null;
  if (catSnap.exists()) {
    const cat: any = catSnap.data();
    let newXp = (cat.xp ?? 0) + awardedXp;
    let newLevel = cat.level ?? 1;
    while (newXp >= XP_TO_NEXT_LEVEL(newLevel)) {
      newXp -= XP_TO_NEXT_LEVEL(newLevel);
      newLevel++;
    }
    questCategoryLevel = newLevel;
    await updateDoc(catRef, { xp: newXp, level: newLevel, rank: rankForLevel(newLevel) });
  }

  // Legacy Score = Total Mastery (sum of skill levels) (sum of all 5 category levels, capped 99 each).
  // Read every category, but substitute the freshly-bumped level for the quest's category.
  const allCatsSnap = await getDocs(collection(charRef, "categories"));
  let totalLevel = 0;
  for (const d of allCatsSnap.docs) {
    const c: any = d.data();
    const lvl =
      d.id === quest.category && questCategoryLevel != null
        ? questCategoryLevel
        : (c.level ?? 1);
    totalLevel += Math.min(99, Math.max(1, lvl));
  }
  updates.legacyScore = totalLevel; // now 5..495 (sum of all 5 skill levels)
  await updateDoc(charRef, updates);

  // Update achievements
  const [compsSnap, achsSnap] = await Promise.all([
    getDocs(collection(charRef, "completions")),
    getDocs(collection(charRef, "achievements")),
  ]);
  const allComps = compsSnap.docs.map(d => d.data() as any);
  const newChar = { ...char, ...updates };

  const newlyUnlocked: any[] = [];
  const aBatch = writeBatch(db);
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

  const updatedCharSnap = await getDoc(charRef);
  const updatedChar: any = { id: uid, userId: uid, ...updatedCharSnap.data() };
  updatedChar.xpToNext = XP_TO_NEXT_LEVEL(updatedChar.level);
  try { updatedChar.goals = JSON.parse(updatedChar.goalsJson || "[]"); } catch { updatedChar.goals = []; }

  return {
    character: updatedChar,
    leveledUp,
    oldLevel,
    newLevel: level,
    xpEarned: awardedXp,
    streakBonusXp,
    newlyUnlocked,
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
