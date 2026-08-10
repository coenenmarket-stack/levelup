import { Flame } from "lucide-react";
import { getStreakStatus } from "@/lib/streak";

type Props = {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string | null;
};

/** Compact streak status under the hero — risk / bonus messaging only. */
export function StreakStatusStrip({ currentStreak, longestStreak, lastCompletionDate }: Props) {
  const status = getStreakStatus({ currentStreak, longestStreak, lastCompletionDate });

  let message = "Complete any quest today to start or keep your streak.";
  let tone = "text-muted-foreground";
  if (status.protectedToday) {
    message = `Streak safe today · +${status.bonusPct}% XP bonus active`;
    tone = "text-emerald-400";
  } else if (status.atRisk) {
    message = `Streak at risk — complete a quest today to keep ${status.currentStreak} days`;
    tone = "text-accent";
  } else if (status.broken && status.currentStreak === 0) {
    message = "No active streak — one quest today starts the fire again";
  }

  return (
    <div
      className={`mt-3 flex items-start gap-2 text-xs ${tone}`}
      data-testid="strip-streak-status"
    >
      <Flame className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${status.atRisk || status.protectedToday ? "animate-flame" : ""}`} />
      <span>{message}</span>
      {status.longestStreak > 0 && (
        <span className="ml-auto text-muted-foreground font-num shrink-0">Best {status.longestStreak}</span>
      )}
    </div>
  );
}
