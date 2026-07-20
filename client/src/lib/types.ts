// Mirror of server-side shapes for the frontend.
export type Me = {
  id: number;
  email: string;
  provider: "password" | "google" | "apple";
  emailVerified: boolean;
  onboarded: boolean;
  notificationsEnabled: boolean;
  createdAt: string;
};

export type Character = {
  id: number;
  userId: number;
  name: string;
  avatar: string;
  photoURL?: string | null;
  pronouns: string | null;
  className: string;
  title: string;
  lifeGoal: string;
  goalsJson: string;
  goals: string[];
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
  xpToNext?: number;
};

export type Category = {
  id: number;
  userId: number;
  key: string;
  name: string;
  icon: string;
  color: string;
  xp: number;
  level: number;
  rank: string;
};

export type Quest = {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  xpReward: number;
  isDaily: boolean;
  active: boolean;
  createdAt: string;
  completedToday?: boolean;
};

export type Achievement = {
  id: number;
  userId: number;
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
  id: number;
  userId: number;
  name: string;
  description: string | null;
  icon: string;
  cost: number;
  redeemed: number;
  createdAt: string;
};

export type Stats = {
  totalXp: number;
  tasksCompleted: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  achievementCount: number;
  achievementTotal: number;
  hoursInvested: number;
  weekly: { date: string; xp: number; quests: number }[];
  categories: Category[];
};

export type CompleteResult = {
  character: Character;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  xpEarned: number;
  newlyUnlocked: Achievement[];
  xpToNext: number;
};
