import { Progress } from "@/components/ui/progress";
import type { DailyProgress } from "@/lib/questUtils";

type Props = {
  progress: DailyProgress;
  "data-testid"?: string;
};

export function DailyProgressBar({ progress, "data-testid": testId = "daily-progress" }: Props) {
  return (
    <div className="surface rounded-xl p-3.5" data-testid={testId}>
      <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
        <span data-testid={`${testId}-completed`}>
          <span className="font-num text-foreground font-semibold">{progress.completed}</span> completed
        </span>
        <span data-testid={`${testId}-remaining`}>
          <span className="font-num text-foreground font-semibold">{progress.remaining}</span> remaining
        </span>
        <span data-testid={`${testId}-percentage`}>
          <span className="font-num text-foreground font-semibold">{progress.percentage}%</span>
        </span>
      </div>
      <Progress value={progress.percentage} className="h-2 mt-2.5" data-testid={`${testId}-bar`} />
    </div>
  );
}
