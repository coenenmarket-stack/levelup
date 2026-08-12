import { useState } from "react";
import { Check, ChevronDown, Loader2, Trash2 } from "lucide-react";
import type { Quest } from "@/lib/types";
import { explainQuest } from "@/lib/questCatalog/types";
import { QUEST_CATALOG } from "@/lib/questCatalog";

const catalogById = new Map(QUEST_CATALOG.map((q) => [q.id, q]));

const diffMeta: Record<string, { label: string; className: string }> = {
  easy: { label: "Easy", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  medium: { label: "Medium", className: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  hard: { label: "Hard", className: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
};

type Props = {
  quest: Quest & { howto?: string | null };
  variant: "active" | "completed";
  onComplete?: () => void;
  onDelete?: () => void;
  isCompleting?: boolean;
  showDelete?: boolean;
  /** @deprecated Full-row tap removed — use the complete ring. Kept for call-site compat. */
  interactive?: boolean;
  /** Start expanded (e.g. completed section). */
  expanded?: boolean;
  /** Prefer expandable detail (default true). */
  expandable?: boolean;
};

export function QuestRow({
  quest,
  variant,
  onComplete,
  onDelete,
  isCompleting = false,
  showDelete = false,
  expanded: expandedProp = false,
  expandable = true,
}: Props) {
  const [open, setOpen] = useState(expandedProp);
  const m = diffMeta[quest.difficulty] ?? diffMeta.easy;
  const isCompleted = variant === "completed";
  const busy = isCompleting;
  const showDetail = expandable ? open : expandedProp;
  const catalog = quest.catalogId ? catalogById.get(String(quest.catalogId)) : undefined;
  const explanation = explainQuest({
    title: quest.title,
    description: quest.description ?? catalog?.description,
    howto: quest.howto ?? catalog?.howto,
    category: quest.category,
    isDaily: quest.isDaily,
  });

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
      className={`surface rounded-2xl p-4 ${isCompleted ? "opacity-80" : ""}`}
    >
      <div className="flex items-start gap-3">
        {completeControl}
        <button
          type="button"
          className="min-w-0 flex-1 text-left hover-elevate rounded-lg -m-1 p-1"
          onClick={() => expandable && setOpen((v) => !v)}
          aria-expanded={showDetail}
          data-testid={`button-expand-quest-${quest.id}`}
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div
                className={`font-semibold leading-snug ${showDetail ? "" : "line-clamp-3"}`}
                data-testid={`text-quest-title-${quest.id}`}
              >
                {quest.title}
              </div>
              {(quest.description || catalog?.description) && (
                <div
                  className={`text-xs text-muted-foreground mt-1 leading-relaxed ${
                    showDetail ? "" : "line-clamp-2"
                  }`}
                >
                  {quest.description || catalog?.description}
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
                {expandable && (
                  <span className="text-[10px] text-primary/80">
                    {showDetail ? "Tap to hide details" : "Tap for details"}
                  </span>
                )}
              </div>
            </div>
            {expandable && (
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform ${
                  showDetail ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            )}
          </div>
        </button>
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

      {showDetail && (
        <div
          className="mt-3 ml-[3.25rem] space-y-2.5 border-t border-card-border/70 pt-3"
          data-testid={`quest-detail-${quest.id}`}
        >
          <DetailBlock label="What to do" body={explanation.what} />
          <DetailBlock label="How to complete" body={explanation.howto} />
          <DetailBlock label="Why it matters" body={explanation.why} />
          {variant === "active" && onComplete && (
            <p className="text-[11px] text-muted-foreground">
              When you finish, tap the empty ring to mark complete.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DetailBlock({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
        {label}
      </div>
      <p className="text-sm text-foreground/90 mt-0.5 leading-relaxed whitespace-pre-wrap">{body}</p>
    </div>
  );
}
