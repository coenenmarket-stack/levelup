import { useState } from "react";
import { Check, ChevronDown, Loader2, Plus } from "lucide-react";
import type { QuestCatalogItem } from "@/lib/questCatalog/types";
import { explainQuest } from "@/lib/questCatalog/types";

const diffMeta: Record<string, { label: string; className: string }> = {
  easy: { label: "Easy", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  medium: { label: "Medium", className: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  hard: { label: "Hard", className: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
};

type Props = {
  item: QuestCatalogItem;
  owned: boolean;
  adding: boolean;
  disabled?: boolean;
  onAdd: () => void;
};

export function CatalogQuestCard({ item, owned, adding, disabled, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const m = diffMeta[item.difficulty];
  const explanation = explainQuest(item);

  return (
    <div data-testid={`catalog-quest-${item.id}`} className="surface rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          data-testid={`button-expand-catalog-${item.id}`}
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-snug">{item.title}</div>
              <div
                className={`text-xs text-muted-foreground mt-1 leading-relaxed ${
                  open ? "" : "line-clamp-2"
                }`}
              >
                {item.description}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="capitalize">{item.category}</span>
                <span aria-hidden>·</span>
                <span>{item.isDaily ? "Daily" : "Side quest"}</span>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${m.className}`}
                >
                  {m.label}
                </span>
                <span className="font-num gold-text font-semibold">+{item.xpReward} XP</span>
                <span className="text-[10px] text-primary/80">
                  {open ? "Hide details" : "Tap for details"}
                </span>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform ${
                open ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </div>
        </button>
        <button
          type="button"
          disabled={owned || adding || disabled}
          onClick={onAdd}
          data-testid={`button-add-catalog-${item.id}`}
          className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold bg-primary text-primary-foreground hover-elevate disabled:opacity-60 flex items-center gap-1.5"
        >
          {adding ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : owned ? (
            <>
              <Check className="w-3.5 h-3.5" /> Added
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" /> Add
            </>
          )}
        </button>
      </div>

      {open && (
        <div className="space-y-2.5 border-t border-card-border/70 pt-3" data-testid={`catalog-detail-${item.id}`}>
          <DetailBlock label="What to do" body={explanation.what} />
          <DetailBlock label="How to complete" body={explanation.howto} />
          <DetailBlock label="Why it matters" body={explanation.why} />
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
