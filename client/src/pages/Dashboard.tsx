import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { useGame } from "@/lib/game";
import { useAuth } from "@/lib/auth";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import type { Quest, Category } from "@/lib/types";
import { XPBar } from "@/components/XPBar";
import { Skeleton } from "@/components/ui/skeleton";
import { AVATAR_CLASSES } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { DailyProgressBar } from "@/components/quests/DailyProgressBar";
import { QuestRow } from "@/components/quests/QuestRow";
import { QuestSection } from "@/components/quests/QuestSection";
import { splitQuestsByCompletion, computeDailyProgress } from "@/lib/questUtils";
import { getWeakestCategory, getTodaysMission, getTodaysFocus } from "@/lib/dashboardUtils";
import { TodaysMissionCard } from "@/components/dashboard/TodaysMission";
import { TodaysFocusCard } from "@/components/dashboard/TodaysFocus";
import { MoreToDoStrip } from "@/components/dashboard/MoreToDoStrip";
import { ContinueJourney } from "@/components/dashboard/ContinueJourney";

const AVATAR_EMOJI: Record<string, string> = Object.fromEntries(AVATAR_CLASSES.map(a => [a.key, a.emoji]));

type DailyPack = { quests: Quest[]; cached?: boolean; allComplete?: boolean };

export default function Dashboard() {
  const { character, completeQuest, isCompleting } = useGame();
  const { me } = useAuth();
  const qc = useQueryClient();
  const { data: cats } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const { data: pack, isLoading: packLoading } = useQuery<DailyPack>({
    queryKey: ["/api/daily-pack"],
  });

  const refreshMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/daily-pack", { refresh: true });
      return res.json() as Promise<DailyPack>;
    },
    onSuccess: (data) => {
      qc.setQueryData(["/api/daily-pack"], data);
      qc.invalidateQueries({ queryKey: ["/api/quests"] });
    },
  });

  if (!character) return <DashboardSkeleton />;

  const packQuests: Quest[] = (pack?.quests ?? []) as Quest[];
  const { active: packActive, completedToday: packCompleted } = splitQuestsByCompletion(packQuests);
  const packProgress = computeDailyProgress(packActive, packCompleted);
  const weakest = getWeakestCategory(cats ?? []);
  const mission = getTodaysMission(packActive, pack?.allComplete || (packProgress.total > 0 && packProgress.remaining === 0));
  const focus = getTodaysFocus(weakest, character);

  return (
    <div className="space-y-4">
      {me?.id && <WelcomeDialog userId={String(me.id)} />}

      {/* 1. Hero / Level card */}
      <motion.section
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="surface rounded-2xl p-5 emerald-glow"
        data-testid="card-hero"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-secondary/60 border border-card-border flex items-center justify-center text-3xl overflow-hidden">
            {character.photoURL
              ? <img src={character.photoURL} alt={character.name} className="w-full h-full object-cover" />
              : <span>{AVATAR_EMOJI[character.avatar] ?? "🛡️"}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{character.name}</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-sm text-muted-foreground">Level</span>
              <span className="font-num text-3xl font-extrabold gold-text leading-none" data-testid="text-level">{character.level}</span>
            </div>
            {character.title && <div className="text-[11px] text-accent mt-0.5" data-testid="text-title">{character.title}</div>}
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Streak</div>
            <div className="flex items-center gap-1 justify-end">
              <Flame className={`w-5 h-5 text-accent ${character.currentStreak > 0 ? "animate-flame" : ""}`} />
              <span className="font-num text-2xl font-bold" data-testid="text-streak">{character.currentStreak}</span>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <XPBar value={character.xp} max={character.xpToNext ?? character.level * 100} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Total: <span className="text-foreground font-num">{character.totalXp.toLocaleString()}</span> XP</span>
          <span>Spendable: <span className="gold-text font-num font-semibold">{character.spendableXp.toLocaleString()}</span></span>
        </div>
      </motion.section>

      {/* 2. Today's Mission */}
      <TodaysMissionCard
        mission={mission}
        onStart={mission.quest ? () => completeQuest(mission.quest!) : undefined}
        isCompleting={isCompleting}
      />

      {/* 3. Today's Focus */}
      <TodaysFocusCard title={focus.title} body={focus.body} />

      {/* Daily pack: progress + active + completed */}
      <section className="space-y-3" data-testid="section-todays-quests">
        <div className="flex items-baseline justify-between px-0.5">
          <h2 className="text-base font-bold tracking-tight">Daily Missions</h2>
          <button
            onClick={() => refreshMut.mutate()}
            disabled={refreshMut.isPending || pack?.allComplete}
            data-testid="button-refresh-pack"
            className="text-xs text-primary hover-elevate rounded px-2 py-1 flex items-center gap-1.5 disabled:opacity-60"
            aria-label="Refresh incomplete daily quests"
            title={pack?.allComplete ? "All missions complete for today" : "Refresh incomplete quests"}
          >
            {refreshMut.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Refresh</span>
          </button>
        </div>

        {/* 4. Daily Progress */}
        {packProgress.total > 0 && (
          <DailyProgressBar progress={packProgress} data-testid="dashboard-daily-progress" />
        )}

        {(packLoading || refreshMut.isPending) && packQuests.length === 0 ? (
          <div className="space-y-2.5">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : packQuests.length === 0 ? (
          <div className="surface rounded-xl p-6 text-center">
            <Sparkles className="w-7 h-7 text-accent mx-auto mb-2" />
            <div className="font-semibold">Your daily pack is being prepared</div>
            <div className="text-sm text-muted-foreground mt-1">Tap Refresh to generate today&apos;s quests.</div>
          </div>
        ) : (
          <>
            {/* 5. Active Quests */}
            <QuestSection
              title="Active Quests"
              count={packActive.length}
              emptyMessage={
                pack?.allComplete || packProgress.remaining === 0
                  ? "All missions complete — legendary work today."
                  : "All daily quests cleared."
              }
              data-testid="section-pack-active"
            >
              {packActive.map((q) => (
                <QuestRow
                  key={q.id}
                  quest={q}
                  variant="active"
                  onComplete={() => completeQuest(q)}
                  isCompleting={isCompleting}
                  interactive
                />
              ))}
            </QuestSection>

            {/* 6. Completed Today */}
            <QuestSection
              title="Completed Today"
              count={packCompleted.length}
              collapsible
              data-testid="section-pack-completed"
            >
              {packCompleted.map((q) => (
                <QuestRow
                  key={q.id}
                  quest={q}
                  variant="completed"
                  onCompleteAgain={!q.isDaily ? () => completeQuest(q) : undefined}
                  isCompleting={isCompleting}
                />
              ))}
            </QuestSection>
          </>
        )}
      </section>

      {/* More to do */}
      <MoreToDoStrip />

      {/* 7. Continue Journey */}
      <ContinueJourney />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}
