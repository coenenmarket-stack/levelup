export type MindsetPractice = {
  id: string;
  name: string;
  duration: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  steps: string[];
};

export const MINDSET_PRACTICES: MindsetPractice[] = [
  {
    id: "box-breathing",
    name: "Box Breathing",
    duration: "4 min",
    difficulty: "Easy",
    description: "Reset your nervous system in under 5 minutes. Used by Navy SEALs before high-stress operations.",
    steps: [
      "Inhale through your nose for 4 seconds",
      "Hold your breath for 4 seconds",
      "Exhale through your mouth for 4 seconds",
      "Hold empty for 4 seconds — repeat for 4 rounds",
    ],
  },
  {
    id: "5-4-3-2-1",
    name: "5-4-3-2-1 Grounding",
    duration: "2 min",
    difficulty: "Easy",
    description: "Snap out of anxiety or rumination by anchoring into your senses.",
    steps: [
      "Name 5 things you can see",
      "Name 4 things you can touch",
      "Name 3 things you can hear",
      "Name 2 things you can smell",
      "Name 1 thing you can taste",
    ],
  },
  {
    id: "morning-pages",
    name: "Morning Pages",
    duration: "15 min",
    difficulty: "Medium",
    description: "Brain-dump three pages of stream-of-consciousness writing first thing in the morning. Clears mental clutter.",
    steps: [
      "Open a notebook or notes app",
      "Set a timer for 15 minutes",
      "Write whatever's in your head — no editing, no judgment",
      "Don't reread. Just close the page when done.",
    ],
  },
  {
    id: "evening-review",
    name: "Evening Review",
    duration: "5 min",
    difficulty: "Easy",
    description: "End your day with intent. Track what worked, what didn't, and what to try tomorrow.",
    steps: [
      "What went well today? (1 thing)",
      "What didn't go well? (1 thing)",
      "What will I do differently tomorrow? (1 thing)",
    ],
  },
  {
    id: "fear-setting",
    name: "Fear-Setting",
    duration: "20 min",
    difficulty: "Hard",
    description: "Tim Ferriss' decision-making exercise. Beats overthinking by defining the worst case in writing.",
    steps: [
      "Define the change you're considering",
      "List the worst things that could happen",
      "List how you'd repair the damage if they did",
      "List the benefits of attempting it",
      "List the cost of inaction in 6 months / 1 year / 3 years",
    ],
  },
  {
    id: "ten-ten-ten",
    name: "10-10-10 Decision Test",
    duration: "3 min",
    difficulty: "Easy",
    description: "Quickly stress-test any choice. Stops emotional decisions in their tracks.",
    steps: [
      "How will I feel about this in 10 minutes?",
      "How will I feel about this in 10 months?",
      "How will I feel about this in 10 years?",
    ],
  },
];

/** Rotate a practice by day-of-year for Dashboard “More to do”. */
export function practiceForToday(date = new Date()): MindsetPractice {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return MINDSET_PRACTICES[day % MINDSET_PRACTICES.length];
}
