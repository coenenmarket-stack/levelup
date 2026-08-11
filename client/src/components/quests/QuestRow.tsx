import { Check, Loader2, Trash2 } from "lucide-react";
import type { Quest } from "@/lib/types";

const diffMeta: Record<string, { label: string; className: string }> = {
  easy: { label: "Easy", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  medium: { label: "Medium", className: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  hard: { label: "Hard", className: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
};

type Props = {
  quest: Quest;
  variant: "active" | "completed";
  onComplete?: () => void;
  onDelete?: () => void;
  isCompleting?: boolean;
  showDelete?: boolean;
  /** @deprecated Full-row tap removed — use the complete ring. Kept for call-site compat. */
  interactive?: boolean;
  /** Expand description instead of clamping (detail / catalog). */
  expanded?: boolean;
};

export function QuestRow({
  quest,
  variant,
  onComplete,
  onDelete,
  isCompleting = false,
  showDelete = false,
  expanded = false,
}: Props) {
  const m = diffMeta[quest.difficulty] ?? diffMeta.easy;
  const isCompleted = variant === "completed";
  const busy = isCompleting;

  // Active = empty ring (tappable). Completed = filled check.
  // Never show a check on active rows — it reads as "already done".
  const completeControl =
    variant === "active" ? (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onComplete?.();
        }}
        disabled={busy || !onComplete}
        data-testid={`button-complete-${quest.id}`}
        className="w-10 h-10 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all hover-elevate active-elevate-2 border-primary/50 bg-transparent text-primary disabled:opacity-60"
        aria-label={`Mark complete: ${quest.title}`}
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <span className="w-3.5 h-3.5 rounded-full border-2 border-primary/70" aria-hidden />
        )}
      </button>
    ) : (
      <span
        className="w-10 h-10 rounded-full border-2 flex-shrink-0 flex items-center justify-center bg-primary border-primary text-primary-foreground"
        aria-label="Completed"
      >
        <Check className="w-5 h-5" />
      </span>
    );

  return (
    <div
      data-testid={`row-quest-${quest.id}`}
      className={`surface rounded-2xl p-4 flex items-start gap-3 ${isCompleted ? "opacity-80" : ""}`}
    >
      {completeControl}
      <div className="min-w-0 flex-1">
        <div
          className={`font-semibold leading-snug ${expanded ? "" : "line-clamp-3"}`}
          data-testid={`text-quest-title-${quest.id}`}
        >
          {quest.title}
        </div>
        {quest.description && (
          <div
            className={`text-xs text-muted-foreground mt-1 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}
          >
            {quest.description}
          </div>
        )}
        <div className="text-[11px] text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="capitalize">{quest.category}</span>
          <span aria-hidden>·</span>
          <span>{quest.isDaily ? "Daily" : "Side quest"}</span>
          <span
            className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${m.className}`}
          >
            {m.label}
          </span>
          {variant === "active" && onComplete && (
            <span className="text-[10px] text-primary/80">Tap ring to complete</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0 self-start pt-0.5">
        <div className="font-num gold-text font-bold text-sm">+{quest.xpReward}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">XP</div>
      </div>
      {showDelete && variant === "active" && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-muted-foreground hover:text-destructive p-1.5 hover-elevate rounded-lg shrink-0 self-start"
          data-testid={`button-delete-${quest.id}`}
          aria-label="Delete quest"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
