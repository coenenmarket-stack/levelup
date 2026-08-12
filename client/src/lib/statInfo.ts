/** Copy and metadata for the six core RPG stats shown on the Profile page. */

export type CoreStatKey =
  | "strength"
  | "intelligence"
  | "discipline"
  | "wealth"
  | "health"
  | "relationships";

export type CoreStatInfo = {
  key: CoreStatKey;
  label: string;
  emoji: string;
  color: string;
  /** One-line what this stat measures. */
  summary: string;
  /** How leveling this up improves real life. */
  improvesLife: string;
  /** Which quests / habits raise it. */
  howToLevel: string;
};

export const CORE_STATS: readonly CoreStatInfo[] = [
  {
    key: "strength",
    label: "Strength",
    emoji: "💪",
    color: "#ef4444",
    summary:
      "Your physical power — the energy and capacity you bring to training, work, and daily movement.",
    improvesLife:
      "Higher Strength means better stamina, easier workouts, and a body that keeps up with your ambitions. It compounds into confidence, resilience, and longevity.",
    howToLevel:
      "Complete Health quests for Strength XP (OSRS curve, caps at 99). Early levels fly — late game is a real grind.",
  },
  {
    key: "intelligence",
    label: "Intelligence",
    emoji: "🧠",
    color: "#8b5cf6",
    summary:
      "Your mental edge — learning, problem-solving, and career skill that open better opportunities.",
    improvesLife:
      "Raising Intelligence sharpens decision-making, speeds up skill growth, and helps you earn more and contribute at a higher level at work.",
    howToLevel:
      "Complete Career quests for Intelligence XP. Hitting 99 means months of deliberate practice — treat it like a cape.",
  },
  {
    key: "discipline",
    label: "Discipline",
    emoji: "🎯",
    color: "#f59e0b",
    summary:
      "Your ability to follow through — habits, focus, and doing the hard thing when motivation fades.",
    improvesLife:
      "Discipline turns goals into systems. It protects your streak, reduces decision fatigue, and makes every other stat easier to raise.",
    howToLevel:
      "Complete Mindset quests for Discipline XP. Consistency compounds; 99 is earned one day at a time.",
  },
  {
    key: "wealth",
    label: "Wealth",
    emoji: "💰",
    color: "#10b981",
    summary:
      "Your financial health — saving, investing, earning power, and control over money stress.",
    improvesLife:
      "Growing Wealth buys freedom: less anxiety, more options, and the runway to invest in health, family, and long-term goals.",
    howToLevel:
      "Complete Wealth quests for Wealth XP. Budgeting and income actions stack toward a hard-earned 99.",
  },
  {
    key: "health",
    label: "Health",
    emoji: "❤️",
    color: "#ec4899",
    summary:
      "Your overall vitality — sleep, recovery, nutrition, and how well your body and mind feel day to day.",
    improvesLife:
      "Strong Health is the foundation for everything else. Better energy, mood, and recovery make Strength, Discipline, and Relationships easier to build.",
    howToLevel:
      "Complete Health quests for Health XP (sleep, nutrition, recovery). Shares the Health skill tree grind to 99.",
  },
  {
    key: "relationships",
    label: "Relationships",
    emoji: "🤝",
    color: "#3b82f6",
    summary:
      "The quality of your connections — family, partners, friends, and the people who matter most.",
    improvesLife:
      "Investing in Relationships builds belonging, support, and legacy. Strong bonds buffer stress and make wins more meaningful.",
    howToLevel:
      "Complete Family quests for Relationships XP. Presence over time is how you push toward 99.",
  },
] as const;

export const CORE_STAT_BY_KEY: Record<CoreStatKey, CoreStatInfo> = Object.fromEntries(
  CORE_STATS.map((s) => [s.key, s]),
) as Record<CoreStatKey, CoreStatInfo>;

/** Skill-tree (category) explanations for the Character page. */
export type SkillTreeInfo = {
  key: string;
  summary: string;
  improvesLife: string;
  howToLevel: string;
};

export const SKILL_TREE_INFO: Record<string, SkillTreeInfo> = {
  health: {
    key: "health",
    summary: "Train your body and recovery so you have energy for every other quest.",
    improvesLife:
      "Consistent Health practice raises strength, sleep quality, and daily energy — the base layer of a leveled-up life.",
    howToLevel: "Log workouts, steps, water, sleep, and recovery as Health quests — OSRS XP curve to 99.",
  },
  wealth: {
    key: "wealth",
    summary: "Build money skills that create security and optionality.",
    improvesLife:
      "Wealth mastery cuts stress and funds the lifestyle, tools, and experiences you care about.",
    howToLevel: "Track spending, save, pay down debt, and grow income through Wealth quests toward 99.",
  },
  career: {
    key: "career",
    summary: "Level the craft you get paid for — skills, reputation, and promotions.",
    improvesLife:
      "Career growth compounds into better pay, more interesting work, and stronger Intelligence.",
    howToLevel: "Ship work tasks, earn certifications, and practice deliberately via Career quests to 99.",
  },
  family: {
    key: "family",
    summary: "Invest in the people who make the grind worth it.",
    improvesLife:
      "Family skill raises Relationships and leaves a legacy of presence, not just productivity.",
    howToLevel: "Protect quality time, date nights, and parenting goals as Family quests on the road to 99.",
  },
  mindset: {
    key: "mindset",
    summary: "Train attention, resilience, and the stories you tell yourself.",
    improvesLife:
      "Mindset fuels Discipline — you show up when it is hard and bounce back faster after setbacks.",
    howToLevel: "Read, journal, meditate, and run focus practices as Mindset quests. 99 is a long grind.",
  },
  // Legacy category keys still present in older characters
  finance: {
    key: "finance",
    summary: "Money management — budgeting, saving, and investing.",
    improvesLife: "Financial clarity reduces stress and grows your Wealth stat.",
    howToLevel: "Complete Finance quests around budgets, savings, and debt.",
  },
  learning: {
    key: "learning",
    summary: "Curiosity and continuous skill growth.",
    improvesLife: "Learning keeps Intelligence rising and opens new career paths.",
    howToLevel: "Read, take courses, and finish tutorials as Learning quests.",
  },
  hustle: {
    key: "hustle",
    summary: "Side projects that turn ideas into income.",
    improvesLife: "Hustle builds Wealth and Intelligence while creating ownership.",
    howToLevel: "Ship products, sales, listings, and marketing as Side Hustle quests.",
  },
};
