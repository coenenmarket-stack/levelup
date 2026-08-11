import { Gift } from "lucide-react";

type Props = {
  count: number;
};

/** Compact claim affordance near the top of Home when weekly rewards are ready. */
export function WeeklyClaimChip({ count }: Props) {
  if (count <= 0) return null;

  return (
    <button
      type="button"
      onClick={() => {
        document.getElementById("weekly-challenges")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      data-testid="chip-weekly-claim"
      className="w-full flex items-center gap-2 surface rounded-xl px-3.5 py-2.5 border border-accent/35 hover-elevate text-left"
    >
      <Gift className="w-4 h-4 text-accent shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">
          {count === 1 ? "Weekly reward ready" : `${count} weekly rewards ready`}
        </div>
        <div className="text-[11px] text-muted-foreground">Tap to claim XP</div>
      </div>
      <span className="text-xs font-bold text-accent shrink-0">Claim</span>
    </button>
  );
}
