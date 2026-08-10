import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
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
import { WeeklyChallengesCard } from "@/components/dashboard/WeeklyChallengesCard";
import { StreakStatusStrip } from "@/components/dashboard/StreakStatusStrip";
import { QUEST_CATALOG } from "@/lib/questCatalog";
import { SoftPersonalizePrompt } from "@/components/dashboard/SoftPersonalizePrompt";
import { RecommendedNextActionCard } from "@/components/dashboard/RecommendedNextActionCard";
import { SocialHomeCard } from "@/components/SocialHomeCard";
import { PushOptInCard } from "@/components/PushOptInCard";
import { LAUNCH_FLAGS } from "@/lib/featureFlags";
import { readPersonalization } from "@/lib/personalization/store";
import {
  DEFAULT_PERSONALIZATION,
  shouldShowSoftPersonalizePrompt,
  type PersonalizationPrefs,
} from "@/lib/personalization/types";
import { pickRecommendedNextAction } from "@/lib/personalization/nextAction";
import { getStreakStatus } from "@/lib/streak";
import { getCareerPath } from "@/lib/careerPaths";
import { listGoals } from "@/lib/personalization/goals";
import { primaryGoalLabel, rankAll, scoreQuest } from "@/lib/personalization/engine";
import { getCertificationById } from "@/lib/certifications";
import { getSideHustleById } from "@/lib/sideHustles";
import { readCertProgress, readHustleProgress } from "@/lib/personalization/guideProgress";
import type { WeeklyChallengeState } from "@/lib/weeklyChallenges";

const AVATAR_EMOJI: Record<string, string> = Object.fromEntries(AVATAR_CLASSES.map(a => [a.key, a.emoji]));

type DailyPack = { quests: Quest[]; cached?: boolean; allComplete?: boolean };

export default function Dashboard() {
  const { character, completeQuest, isCompleting, completingQuestId } = useGame();
  const { me } = useAuth();
  const qc = useQueryClient();
  const { data: cats } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const [prefs, setPrefs] = useState<PersonalizationPrefs>(DEFAULT_PERSONALIZATION);
  const [hasOpenGoals, setHasOpenGoals] = useState(false);
  const [activeCertId, setActiveCertId] = useState<string | null>(null);
  const [activeHustleId, setActiveHustleId] = useState<string | null>(null);

  const { data: pack, isLoading: packLoading } = useQuery<DailyPack>({
    queryKey: ["/api/daily-pack"],
  });
  const { data: weekly } = useQuery<WeeklyChallengeState>({
    queryKey: ["/api/weekly-challenges"],
  });

  useEffect(() => {
    if (!me?.id) return;
    const uid = String(me.id);
    void readPersonalization(uid).then(setPrefs);
    void listGoals(uid).then((g) => setHasOpenGoals(g.some((x) => x.status === "active")));
    void readCertProgress(uid).then((p) => {
      const id = p.started.find((x) => !p.completed.includes(x)) ?? null;
      setActiveCertId(id);
    });
    void readHustleProgress(uid).then((p) => {
      const id = p.started.find((x) => !p.completed.includes(x)) ?? null;
      setActiveHustleId(id);
    });
  }, [me?.id]);

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

  const levels = useMemo(() => {
    const out: Record<string, number> = { health: 2, wealth: 2, career: 2, family: 2, mindset: 2 };
    for (const c of cats ?? []) {
      if (c.key) out[c.key] = c.level ?? 1;
    }
    return out;
  }, [cats]);

  if (!character) return <DashboardSkeleton />;

  const packQuests: Quest[] = (pack?.quests ?? []) as Quest[];
  const { active: packActive, completedToday: packCompleted } = splitQuestsByCompletion(packQuests);
  const packProgress = computeDailyProgress(packActive, packCompleted);
  const weakest = getWeakestCategory(cats ?? []);
  const mission = getTodaysMission(packActive, pack?.allComplete || (packProgress.total > 0 && packProgress.remaining === 0));
  const focus = getTodaysFocus(weakest, character);
  const streak = getStreakStatus({
    currentStreak: character.currentStreak,
    longestStreak: character.longestStreak,
    lastCompletionDate: character.lastCompletionDate,
  });

  const topQuest = prefs.personalizationCompleted
    ? rankAll(QUEST_CATALOG, scoreQuest, { prefs, categoryLevels: levels }, 1)[0] ?? null
    : null;

  const activePath = prefs.activeCareerPathId ? getCareerPath(prefs.activeCareerPathId) : null;
  const activeCert = activeCertId ? getCertificationById(activeCertId) : null;
  const activeHustle = activeHustleId ? getSideHustleById(activeHustleId) : null;
  const weeklyClaimable = (weekly?.challenges ?? []).filter((c) => c.completed && !c.rewardClaimed).length;
  const showSoftPrompt = shouldShowSoftPersonalizePrompt(prefs);

  const nextAction = pickRecommendedNextAction({
    prefs,
    dailyIncomplete: packProgress.remaining,
    dailyTotal: packProgress.total,
    weeklyClaimable,
    streakBroken: streak.broken && (character.currentStreak ?? 0) === 0 && !!character.lastCompletionDate,
    topQuest,
    activeCareerPathId: activePath?.id ?? null,
    careerPathTitle: activePath?.title ?? null,
    activeCertId: activeCert?.id ?? null,
    activeCertTitle: activeCert?.name ?? null,
    activeHustleId: activeHustle?.id ?? null,
    activeHustleTitle: activeHustle?.name ?? null,
    hasOpenGoals,
  });

  return (
    <div className="space-y-4">
      {me?.id && <WelcomeDialog userId={String(me.id)} />}

      {me?.id && (
        <SoftPersonalizePrompt
          uid={String(me.id)}
          prefs={prefs}
          onDismissed={setPrefs}
        />
      )}

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
            {prefs.primaryGoal && (
              <div className="text-[11px] text-muted-foreground mt-1">
                Focus: {primaryGoalLabel(prefs.primaryGoal)}
              </div>
            )}
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
        <StreakStatusStrip
          currentStreak={character.currentStreak}
          longestStreak={character.longestStreak}
          lastCompletionDate={character.lastCompletionDate}
        />
      </motion.section>

      {/* Avoid competing personalize CTAs when soft prompt is visible */}
      {!showSoftPrompt && <RecommendedNextActionCard action={nextAction} />}

      {/* 2. Today's Mission */}
      <TodaysMissionCard
        mission={mission}
        onStart={mission.quest ? () => completeQuest(mission.quest!) : undefined}
        isCompleting={isCompleting}
      />

      {/* 3. Today's Focus */}
      <TodaysFocusCard title={focus.title} body={focus.body} />

      {activePath && (
        <Link
          href={`/career-paths/${activePath.id}`}
          className="block surface rounded-xl px-4 py-3 hover-elevate"
          data-testid="card-current-path"
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Current path</div>
          <div className="font-semibold mt-0.5">{activePath.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{activePath.typicalDirection}</div>
        </Link>
      )}

      {/* Daily pack: progress + active + completed */}
      <section className="space-y-3" id="daily-quests" data-testid="section-todays-quests">
        <div className="flex items-baseline justify-between px-0.5">
          <h2 className="text-base font-bold tracking-tight">
            {prefs.personalizationCompleted ? "Today’s Personalized Quests" : "Daily Missions"}
          </h2>
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
            <div className="font-semibold">Ready for today&apos;s missions</div>
            <div className="text-sm text-muted-foreground mt-1">
              Three focused quests from the catalog, weighted toward your goals and weakest skills.
            </div>
            <button
              type="button"
              onClick={() => refreshMut.mutate()}
              disabled={refreshMut.isPending}
              className="mt-3 text-sm text-primary hover-elevate rounded-lg px-3 py-1.5"
              data-testid="button-generate-pack"
            >
              Generate today&apos;s pack
            </button>
          </div>
        ) : pack?.allComplete || (packProgress.total > 0 && packProgress.remaining === 0) ? (
          <>
            <div className="surface rounded-xl p-4 border border-accent/30" data-testid="banner-daily-clear">
              <div className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                Daily missions clear
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Legendary work. Come back tomorrow for a fresh catalog pack — or tackle a side quest below.
              </div>
            </div>
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
                />
              ))}
            </QuestSection>
          </>
        ) : (
          <>
            {/* 5. Active Quests */}
            <QuestSection
              title="Active Quests"
              count={packActive.length}
              emptyMessage="All daily quests cleared."
              data-testid="section-pack-active"
            >
              {packActive.map((q) => (
                <QuestRow
                  key={q.id}
                  quest={q}
                  variant="active"
                  onComplete={() => completeQuest(q)}
                  isCompleting={completingQuestId === String(q.id)}
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
                />
              ))}
            </QuestSection>
          </>
        )}
      </section>

      {/* Weekly challenges */}
      <div id="weekly-challenges">
        <WeeklyChallengesCard />
      </div>

      {/* At most one social growth card — gated until social CF deploy */}
      {me?.id && LAUNCH_FLAGS.socialHomeCardEnabled ? (
        <SocialHomeCard uid={String(me.id)} />
      ) : null}

      {LAUNCH_FLAGS.remotePushEnabled ? <PushOptInCard /> : null}

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
