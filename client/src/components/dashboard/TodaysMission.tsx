import { Target } from "lucide-react";
import type { TodaysMission } from "@/lib/dashboardUtils";

type Props = {
  mission: TodaysMission;
  onStart?: () => void;
  isCompleting?: boolean;
};

export function TodaysMissionCard({ mission, onStart, isCompleting }: Props) {
  return (
    <section className="surface rounded-2xl p-4 emerald-glow" data-testid="card-todays-mission">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-4 h-4 text-primary" />
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          Today&apos;s Mission
        </h2>
      </div>
      <div className="font-bold text-base leading-snug" data-testid="text-mission-headline">
        {mission.headline}
      </div>
      <p className="text-xs text-muted-foreground mt-1.5" data-testid="text-mission-subtitle">
        {mission.subtitle}
      </p>
      {mission.quest && onStart && (
        <button
          type="button"
          onClick={onStart}
          disabled={isCompleting}
          data-testid="button-start-mission"
          className="mt-3 w-full rounded-xl py-2.5 bg-primary text-primary-foreground text-sm font-semibold hover-elevate active-elevate-2 disabled:opacity-60"
        >
          {isCompleting ? "Completing…" : "Start mission"}
        </button>
      )}
    </section>
  );
}
