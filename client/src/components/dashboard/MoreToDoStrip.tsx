import { Link } from "wouter";
import { Brain, Swords } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { practiceForToday } from "@/lib/mindsetPractices";
import type { Quest } from "@/lib/types";
import { useGame } from "@/lib/game";

export function MoreToDoStrip() {
  const { completeQuest, isCompleting } = useGame();
  const practice = practiceForToday();
  const { data: quests } = useQuery<Quest[]>({ queryKey: ["/api/quests"] });

  const sideQuest = (quests ?? []).find(
    (q) => !q.isDaily && q.active !== false && !q.completedToday,
  );

  return (
    <section className="space-y-2.5" data-testid="section-more-to-do">
      <h2 className="text-sm font-bold tracking-tight px-0.5">More to do</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          href="/mindset"
          data-testid="more-practice"
          className="surface rounded-xl p-3.5 flex items-start gap-3 hover-elevate text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0">
            <Brain className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Mindset</div>
            <div className="font-semibold text-sm truncate">{practice.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{practice.duration} · {practice.difficulty}</div>
          </div>
        </Link>

        {sideQuest ? (
          <button
            type="button"
            data-testid="more-side-quest"
            disabled={isCompleting}
            onClick={() => completeQuest(sideQuest)}
            className="surface rounded-xl p-3.5 flex items-start gap-3 hover-elevate text-left disabled:opacity-60"
          >
            <div className="w-9 h-9 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0">
              <Swords className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Side quest</div>
              <div className="font-semibold text-sm truncate">{sideQuest.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                {sideQuest.category} · +{sideQuest.xpReward} XP
              </div>
            </div>
          </button>
        ) : (
          <Link
            href="/quests"
            data-testid="more-quests-link"
            className="surface rounded-xl p-3.5 flex items-start gap-3 hover-elevate text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0">
              <Swords className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Side quest</div>
              <div className="font-semibold text-sm">Browse quests</div>
              <div className="text-xs text-muted-foreground mt-0.5">Pick something extra for today</div>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
