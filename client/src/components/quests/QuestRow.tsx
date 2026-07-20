import { Check, Loader2, Trash2, RotateCcw } from "lucide-react";
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
  onCompleteAgain?: () => void;
  onDelete?: () => void;
  isCompleting?: boolean;
  showDelete?: boolean;
  /** Wrap the row in a full-width button (Dashboard tap-to-complete). */
  interactive?: boolean;
};

export function QuestRow({
  quest,
  variant,
  onComplete,
  onCompleteAgain,
  onDelete,
  isCompleting = false,
  showDelete = false,
  interactive = false,
}: Props) {
  const m = diffMeta[quest.difficulty] ?? diffMeta.easy;
  const isCompleted = variant === "completed";
  const canCompleteAgain = isCompleted && !quest.isDaily && onCompleteAgain;

  const completeControl =
    variant === "active" ? (
      interactive ? (
        <span className="w-9 h-9 rounded-full border-2 flex-shrink-0 flex items-center justify-center border-card-border bg-secondary/40" />
      ) : (
        <button
          type="button"
          onClick={onComplete}
          disabled={isCompleting}
          data-testid={`button-complete-${quest.id}`}
          className="w-9 h-9 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all hover-elevate active-elevate-2 border-card-border bg-secondary/30"
          aria-label="Complete quest"
        >
          {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        </button>
      )
    ) : (
      <span className="w-9 h-9 rounded-full border-2 flex-shrink-0 flex items-center justify-center bg-primary border-primary text-primary-foreground">
        <Check className="w-5 h-5" />
      </span>
    );

  const inner = (
    <>
      {completeControl}
      <div className="min-w-0 flex-1">
        <div
          className="font-semibold leading-tight line-clamp-2"
          data-testid={`text-quest-title-${quest.id}`}
        >
          {quest.title}
        </div>
        {quest.description && (
          <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{quest.description}</div>
        )}
        <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
          <span className="capitalize">{quest.category}</span>
          <span>·</span>
          <span>{quest.isDaily ? "Daily" : "Side quest"}</span>
        </div>
      </div>
      <div className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md border ${m.className}`}>
        {m.label}
      </div>
      <div className="text-right">
        <div className="font-num gold-text font-bold text-sm">+{quest.xpReward}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">XP</div>
      </div>
      {canCompleteAgain && (
        <button
          type="button"
          onClick={onCompleteAgain}
          disabled={isCompleting}
          data-testid={`button-complete-again-${quest.id}`}
          className="text-xs font-semibold text-primary hover-elevate rounded-lg px-2 py-1.5 flex items-center gap-1 shrink-0"
          aria-label="Complete again"
        >
          {isCompleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          Again
        </button>
      )}
      {showDelete && variant === "active" && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive p-1 hover-elevate rounded"
          data-testid={`button-delete-${quest.id}`}
          aria-label="Delete quest"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </>
  );

  const className = `surface rounded-xl p-4 flex items-center gap-3 ${
    interactive && variant === "active"
      ? "w-full text-left hover-elevate active-elevate-2"
      : ""
  } ${isCompleted ? "opacity-80" : ""}`;

  if (interactive && variant === "active") {
    return (
      <button
        type="button"
        onClick={onComplete}
        disabled={isCompleting}
        data-testid={`row-quest-${quest.id}`}
        className={className}
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
