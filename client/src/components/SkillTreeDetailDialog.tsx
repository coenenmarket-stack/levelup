import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SkillTreeInfo } from "@/lib/statInfo";
import { SKILL_MAX_LEVEL, xpToNextSkillLevel } from "@shared/schema";
import { Sparkles, TrendingUp, Swords } from "lucide-react";

type CategoryLike = {
  key: string;
  name: string;
  icon: string;
  color: string;
  level: number;
  xp: number;
  rank: string;
  totalXp?: number;
  xpToNext?: number;
};

type Props = {
  category: CategoryLike | null;
  info: SkillTreeInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SkillTreeDetailDialog({ category, info, open, onOpenChange }: Props) {
  if (!category) return null;

  const summary = info?.summary ?? `${category.name} is one of your life skill trees.`;
  const improves =
    info?.improvesLife ??
    "Raising this skill compounds into real progress across your quests and Legacy score.";
  const howTo =
    info?.howToLevel ?? `Complete ${category.name} quests to earn XP and level up this tree.`;
  const level = Math.max(1, Math.min(SKILL_MAX_LEVEL, category.level || 1));
  const xpToNext = category.xpToNext ?? xpToNextSkillLevel(level);
  const into = category.xp ?? 0;
  const maxed = level >= SKILL_MAX_LEVEL;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md sm:rounded-2xl p-0 overflow-hidden border-card-border"
        data-testid={`dialog-skill-${category.key}`}
      >
        <div
          className="px-6 pt-6 pb-5"
          style={{
            background: `linear-gradient(135deg, ${category.color}22 0%, transparent 60%)`,
          }}
        >
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                style={{
                  background: `${category.color}22`,
                  border: `1px solid ${category.color}55`,
                }}
              >
                {category.icon}
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-xl font-extrabold tracking-tight">
                  {category.name}
                </DialogTitle>
                <div className="mt-1 text-sm text-muted-foreground">
                  Level <span className="font-num text-foreground font-semibold">{level}</span>
                  <span className="text-muted-foreground"> / {SKILL_MAX_LEVEL}</span>
                  {" · "}
                  <span style={{ color: category.color }}>{category.rank}</span>
                </div>
              </div>
            </div>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed sr-only">
              {summary}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <InfoBlock
            icon={<Sparkles className="w-4 h-4" style={{ color: category.color }} />}
            title="What it is"
            body={summary}
          />
          <InfoBlock
            icon={<TrendingUp className="w-4 h-4" style={{ color: category.color }} />}
            title="How it improves your life"
            body={improves}
          />
          <InfoBlock
            icon={<Swords className="w-4 h-4" style={{ color: category.color }} />}
            title="How to level it up"
            body={howTo}
          />

          <div className="pt-1">
            {maxed ? (
              <div className="text-sm font-semibold" style={{ color: category.color }}>
                Maxed — 99 achieved. This is a true grind cape.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
                  <span>XP to level {level + 1}</span>
                  <span className="font-num normal-case tracking-normal">
                    {into.toLocaleString()} / {xpToNext.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary/50 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${xpToNext > 0 ? Math.min(100, (into / xpToNext) * 100) : 0}%`,
                      background: category.color,
                    }}
                  />
                </div>
              </>
            )}
            {typeof category.totalXp === "number" && (
              <div className="text-xs text-muted-foreground mt-2">
                Lifetime XP:{" "}
                <span className="font-num text-foreground">{category.totalXp.toLocaleString()}</span>
              </div>
            )}
          </div>
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
