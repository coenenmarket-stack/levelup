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
  /** Wrap the row in a full-width button (Dashboard tap-to-complete). */
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
  interactive = false,
  expanded = false,
}: Props) {
  const m = diffMeta[quest.difficulty] ?? diffMeta.easy;
  const isCompleted = variant === "completed";
  const busy = isCompleting;

  const completeControl =
    variant === "active" ? (
      interactive ? (
        <span
          className="w-10 h-10 rounded-full border-2 flex-shrink-0 flex items-center justify-center border-primary/40 bg-primary/10"
          aria-hidden
        />
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onComplete?.();
          }}
          disabled={busy}
          data-testid={`button-complete-${quest.id}`}
          className="w-10 h-10 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all hover-elevate active-elevate-2 border-primary/50 bg-primary/10 text-primary disabled:opacity-60"
          aria-label={`Complete quest: ${quest.title}`}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 opacity-40" />}
        </button>
      )
    ) : (
      <span
        className="w-10 h-10 rounded-full border-2 flex-shrink-0 flex items-center justify-center bg-primary border-primary text-primary-foreground"
        aria-label="Completed"
      >
        <Check className="w-5 h-5" />
      </span>
    );

  const inner = (
    <>
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
    </>
  );

  const className = `surface rounded-2xl p-4 flex items-start gap-3 ${
    interactive && variant === "active"
      ? "w-full text-left hover-elevate active-elevate-2"
      : ""
  } ${isCompleted ? "opacity-80" : ""}`;

  if (interactive && variant === "active") {
    return (
      <button
        type="button"
        onClick={onComplete}
        disabled={busy}
        data-testid={`row-quest-${quest.id}`}
        className={className}
        aria-label={`Complete quest: ${quest.title}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div data-testid={`row-quest-${quest.id}`} className={className}>
      {inner}
    </div>
  );
}
