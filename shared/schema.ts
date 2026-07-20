// Shared constants and TypeScript types for the Firebase build of Level Up Life.
// The Drizzle tables are gone — Firestore is the database now.
// Both the client and the Cloud Functions reference the same game constants.

// ---------- Frontend-facing types (mirror Firestore document shapes) ----------

export type User = {
  id: string; // Firebase uid
  email: string;
  provider: "password" | "google";
  emailVerified: boolean;
  onboarded: boolean;
  notificationsEnabled: boolean;
  createdAt: string;
};

export type Character = {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  pronouns: string | null;
  className: string;
  title: string;
  lifeGoal: string;
  goalsJson: string;
  level: number;
  xp: number;
  totalXp: number;
  spendableXp: number;
  legacyScore: number;
  strength: number;
  intelligence: number;
  discipline: number;
  wealth: number;
  health: number;
  relationships: number;
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string | null;
  hoursInvested: number;
  createdAt: string;
};

export type Category = {
  id: string;
  key: string;
  name: string;
  icon: string;
  color: string;
  xp: number;
  level: number;
  rank: string;
};

export type Quest = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  xpReward: number;
  isDaily: boolean;
  active: boolean;
  createdAt: string;
};

export type InsertQuest = Omit<Quest, "id" | "active" | "createdAt">;

export type QuestCompletion = {
  id: string;
  questId: string;
  questTitle: string;
  category: string;
  difficulty: string;
  xpReward: number;
  completedAt: string;
  completionDate: string;
};

export type Achievement = {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  category: string | null;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  target: number;
};

export type Reward = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  cost: number;
  redeemed: number;
  createdAt: string;
};

export type InsertReward = Omit<Reward, "id" | "redeemed" | "createdAt">;

// ---------- Game constants ----------
export const XP_TO_NEXT_LEVEL = (level: number) => Math.round(50 + level * 75);
export const RANKS = ["Novice", "Apprentice", "Adept", "Expert", "Master", "Grandmaster", "Legend"] as const;
export const rankForLevel = (level: number) => RANKS[Math.min(Math.floor((level - 1) / 5), RANKS.length - 1)];
export const TITLES = [
  { min: 1, title: "Novice Adventurer" },
  { min: 5, title: "Rising Hero" },
  { min: 10, title: "Seasoned Adventurer" },
  { min: 20, title: "Champion" },
  { min: 35, title: "Veteran" },
  { min: 50, title: "Legend" },
  { min: 75, title: "Mythic" },
  { min: 100, title: "Ascended" },
];
export const titleForLevel = (level: number) => {
  let cur = TITLES[0].title;
  for (const t of TITLES) if (level >= t.min) cur = t.title;
  return cur;
};
export const DIFFICULTY_XP: Record<string, number> = { easy: 10, medium: 25, hard: 50 };

export const CATEGORY_DEFS = [
  { key: "health", name: "Health", icon: "💪", color: "#10b981" },
  { key: "career", name: "Career", icon: "💼", color: "#3b82f6" },
  { key: "finance", name: "Finance", icon: "💰", color: "#f59e0b" },
  { key: "family", name: "Family", icon: "❤️", color: "#ef4444" },
  { key: "learning", name: "Learning", icon: "📚", color: "#8b5cf6" },
  { key: "hustle", name: "Side Hustles", icon: "🚀", color: "#ec4899" },
] as const;

export const AVATAR_CLASSES = [
  { key: "warrior", name: "Warrior", emoji: "⚔️", blurb: "Strength and discipline forged daily." },
  { key: "mage", name: "Mage", emoji: "🧙", blurb: "Knowledge is your true power." },
  { key: "ranger", name: "Ranger", emoji: "🏹", blurb: "Patient, precise, in tune with the path." },
  { key: "rogue", name: "Rogue", emoji: "🗡️", blurb: "Clever, agile, finds the angle others miss." },
  { key: "creator", name: "Creator", emoji: "🎨", blurb: "Builds new worlds from nothing." },
  { key: "entrepreneur", name: "Entrepreneur", emoji: "💼", blurb: "Bold ideas, bias to action." },
  { key: "tradesman", name: "Tradesman", emoji: "🛠️", blurb: "Craft mastery through quiet repetition." },
  { key: "parent", name: "Parent", emoji: "👨‍👩‍👧", blurb: "The strongest quest — raising a legacy." },
] as const;

export const STARTING_CLASSES = [
  { key: "entrepreneur", name: "Entrepreneur", emoji: "💼", blurb: "Build something of your own. Side hustle and finance quests prioritized." },
  { key: "tradesman", name: "Tradesman", emoji: "🛠️", blurb: "Master your craft. Career and discipline quests prioritized." },
  { key: "parent", name: "Parent", emoji: "👨‍👩‍👧", blurb: "Family-first hero. Family and health quests prioritized." },
  { key: "athlete", name: "Athlete", emoji: "🏃", blurb: "Body is the base. Health and discipline quests prioritized." },
  { key: "student", name: "Student", emoji: "📚", blurb: "Curiosity is power. Learning quests prioritized." },
  { key: "creator", name: "Creator", emoji: "🎨", blurb: "Make things. Side hustle and learning quests prioritized." },
  { key: "professional", name: "Professional", emoji: "🧠", blurb: "Climb your field. Career and finance quests prioritized." },
] as const;

export const LIFE_GOALS = [
  "Lose Weight",
  "Build Wealth",
  "Get Organized",
  "Improve Relationships",
  "Start a Business",
  "Advance My Career",
  "Become Debt Free",
  "Learn New Skills",
  "Improve Mental Health",
] as const;
