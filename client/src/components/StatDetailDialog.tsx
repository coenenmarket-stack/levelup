import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CoreStatInfo } from "@/lib/statInfo";
import { SKILL_MAX_LEVEL, xpToNextSkillLevel } from "@shared/schema";
import { Sparkles, TrendingUp, Swords } from "lucide-react";

type Props = {
  stat: CoreStatInfo | null;
  /** Current skill level 1–99 */
  level: number;
  /** Cumulative total XP in this stat (optional; used for remainder bar). */
  totalXp?: number;
  /** Remainder XP within the current level (preferred when available). */
  xpIntoLevel?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StatDetailDialog({
  stat,
  level,
  totalXp,
  xpIntoLevel,
  open,
  onOpenChange,
}: Props) {
  if (!stat) return null;

  const cappedLevel = Math.max(1, Math.min(SKILL_MAX_LEVEL, Math.floor(level || 1)));
  const xpToNext = xpToNextSkillLevel(cappedLevel);
  const into =
    typeof xpIntoLevel === "number"
      ? Math.max(0, xpIntoLevel)
      : 0;
  const maxed = cappedLevel >= SKILL_MAX_LEVEL;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md sm:rounded-2xl p-0 overflow-hidden border-card-border"
        data-testid={`dialog-stat-${stat.key}`}
      >
        <div
          className="px-6 pt-6 pb-5"
          style={{
            background: `linear-gradient(135deg, ${stat.color}22 0%, transparent 60%)`,
          }}
        >
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                style={{
                  background: `${stat.color}22`,
                  border: `1px solid ${stat.color}55`,
                }}
              >
                {stat.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-xl font-extrabold tracking-tight">
                  {stat.label}
                </DialogTitle>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Level</span>
                  <span className="font-num text-2xl font-bold" style={{ color: stat.color }}>
                    {cappedLevel}
                  </span>
                  <span className="text-xs text-muted-foreground">/ {SKILL_MAX_LEVEL}</span>
                </div>
              </div>
            </div>
            {!maxed ? (
              <div>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
                  <span>XP to level {cappedLevel + 1}</span>
                  <span className="font-num normal-case tracking-normal">
                    {into.toLocaleString()} / {xpToNext.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary/50 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${xpToNext > 0 ? Math.min(100, (into / xpToNext) * 100) : 0}%`,
                      background: `linear-gradient(90deg, ${stat.color}, ${stat.color}aa)`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm font-semibold" style={{ color: stat.color }}>
                Maxed — 99 achieved
              </div>
            )}
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed sr-only">
              {stat.summary}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <InfoBlock
            icon={<Sparkles className="w-4 h-4" style={{ color: stat.color }} />}
            title="What it is"
            body={stat.summary}
          />
          <InfoBlock
            icon={<TrendingUp className="w-4 h-4" style={{ color: stat.color }} />}
            title="How it improves your life"
            body={stat.improvesLife}
          />
          <InfoBlock
            icon={<Swords className="w-4 h-4" style={{ color: stat.color }} />}
            title="How to level it up"
            body={stat.howToLevel}
          />
          {typeof totalXp === "number" && (
            <div className="pt-1 text-xs text-muted-foreground">
              Lifetime XP: <span className="font-num text-foreground">{totalXp.toLocaleString()}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoBlock({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed pl-6">{body}</p>
    </div>
  );
}
