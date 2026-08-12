import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import type { Character, Quest, CompleteResult, Achievement, Category } from "./types";
import { useToast } from "@/hooks/use-toast";
import { XPFloats, type XPFloat } from "@/components/XPGainToast";
import { LevelUpOverlay } from "@/components/LevelUpOverlay";
import { postProgressActivity, syncPublicProfileLocal } from "./friends";
import { activateReferralAfterQuest } from "./social/api";
import { useAuth } from "./auth";
import { isSocialSurfaceEnabled } from "./featureFlags";

type GameCtx = {
  character: Character | undefined;
  completeQuest: (quest: Quest) => void;
  isCompleting: boolean;
  completingQuestId: string | null;
};

const Ctx = createContext<GameCtx | null>(null);

/** Soft ceiling so a hung Firestore/CF call cannot lock the whole session. */
const COMPLETE_TIMEOUT_MS = 20_000;

function markQuestCompletedInList(quests: Quest[] | undefined, questId: string | number): Quest[] | undefined {
  if (!quests) return quests;
  const id = String(questId);
  return quests.map((q) => (String(q.id) === id ? { ...q, completedToday: true } : q));
}

export function GameProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { me } = useAuth();
  const [floats, setFloats] = useState<XPFloat[]>([]);
  const [levelUp, setLevelUp] = useState<{ open: boolean; level: number }>({ open: false, level: 0 });
  const [completingQuestId, setCompletingQuestId] = useState<string | null>(null);
  const completeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: character } = useQuery<Character>({ queryKey: ["/api/character"] });

  const clearCompletingLock = () => {
    setCompletingQuestId(null);
    if (completeTimeoutRef.current) {
      clearTimeout(completeTimeoutRef.current);
      completeTimeoutRef.current = null;
    }
  };

  useEffect(() => () => clearCompletingLock(), []);

  const completeMut = useMutation({
    mutationFn: async (questId: string | number) => {
      const res = await apiRequest("POST", `/api/quests/${questId}/complete`);
      return (await res.json()) as CompleteResult & { _questCategory?: string };
    },
    onMutate: async (questId) => {
      setCompletingQuestId(String(questId));
      if (completeTimeoutRef.current) clearTimeout(completeTimeoutRef.current);
      completeTimeoutRef.current = setTimeout(() => {
        // Safety valve: never leave the session unable to complete another quest.
        setCompletingQuestId(null);
        completeMut.reset();
        toast({
          title: "Still working…",
          description: "Quest sync is slow. You can try another quest — XP won’t double for the same one today.",
        });
      }, COMPLETE_TIMEOUT_MS);

      await qc.cancelQueries({ queryKey: ["/api/quests"] });
      await qc.cancelQueries({ queryKey: ["/api/daily-pack"] });

      const previousQuests = qc.getQueryData<Quest[]>(["/api/quests"]);
      const previousPack = qc.getQueryData<{ quests: Quest[] }>(["/api/daily-pack"]);
      const quest =
        previousQuests?.find((q) => String(q.id) === String(questId)) ??
        previousPack?.quests?.find((q) => String(q.id) === String(questId));

      if (previousQuests) {
        qc.setQueryData(["/api/quests"], markQuestCompletedInList(previousQuests, questId));
      }
      if (previousPack) {
        qc.setQueryData(["/api/daily-pack"], {
          ...previousPack,
          quests: markQuestCompletedInList(previousPack.quests, questId) ?? [],
        });
      }

      return { previousQuests, previousPack, questCategory: quest?.category };
    },
    onSuccess: (result, questId, context) => {
      const id = Date.now();
      const floatXp = result.skillXpEarned ?? result.xpEarned;
      setFloats((s) => [...s, { id, amount: floatXp }]);
      setTimeout(() => setFloats((s) => s.filter((x) => x.id !== id)), 1600);

      void import("./haptics").then(({ hapticLight, hapticSuccess }) => {
        if (result.leveledUp) void hapticSuccess();
        else void hapticLight();
      });

      if (result.streakBonusXp && result.streakBonusXp > 0) {
        toast({
          title: "Streak bonus",
          description: `+${result.streakBonusXp} XP from your streak`,
        });
      }

      if (result.leveledUp) {
        setLevelUp({ open: true, level: result.newLevel });
      }

      (result.newlyUnlocked ?? []).forEach((a: Achievement) => {
        toast({
          title: `${a.icon}  Achievement unlocked`,
          description: `${a.name} — ${a.description}`,
        });
      });

      // Invalidate without blocking the next completion.
      void qc.invalidateQueries({ queryKey: ["/api/character"] });
      void qc.invalidateQueries({ queryKey: ["/api/quests"] });
      void qc.invalidateQueries({ queryKey: ["/api/daily-pack"] });
      void qc.invalidateQueries({ queryKey: ["/api/categories"] });
      void qc.invalidateQueries({ queryKey: ["/api/completions"] });
      void qc.invalidateQueries({ queryKey: ["/api/achievements"] });
      void qc.invalidateQueries({ queryKey: ["/api/stats"] });
      void qc.invalidateQueries({ queryKey: ["/api/weekly-challenges"] });
      void qc.invalidateQueries({ queryKey: ["friend-activity"] });

      const uid = me?.id ? String(me.id) : "";
      if (uid) {
        // Social CF calls — never await; undeployed functions must not lock quests.
        if (isSocialSurfaceEnabled()) {
          const category = context?.questCategory;
          void postProgressActivity({ type: "quest", category });
          if (result.leveledUp) {
            void postProgressActivity({ type: "levelUp", level: result.newLevel });
          }
          void activateReferralAfterQuest(String(questId));
        }
        void (async () => {
          try {
            // Prefer fresh category levels — cache may still be pre-quest.
            const cats = (await qc.fetchQuery({
              queryKey: ["/api/categories"],
            })) as Category[];
            await syncPublicProfileLocal(uid, result.character, cats, {
              showLifeGoal: me?.showLifeGoal !== false,
            });
          } catch (e) {
            console.warn("syncPublicProfileLocal failed", e);
          }
        })();
      }

      void (async () => {
        try {
          const { syncNotificationsForUser } = await import("./notifications");
          const pack = qc.getQueryData<{ quests?: Array<{ completedToday?: boolean }> }>(["/api/daily-pack"]);
          const incompleteDaily = (pack?.quests ?? []).some((q) => !q.completedToday);
          await syncNotificationsForUser({
            prefs: {
              notificationsEnabled: !!me?.notificationsEnabled,
              notifyDailyQuests: me?.notifyDailyQuests !== false,
              notifyStreakRisk: me?.notifyStreakRisk !== false,
              notifyWeeklyChallenges: me?.notifyWeeklyChallenges !== false,
            },
            currentStreak: result.character?.currentStreak,
            longestStreak: result.character?.longestStreak,
            lastCompletionDate: result.character?.lastCompletionDate ?? null,
            hasIncompleteDaily: incompleteDaily,
          });
        } catch (e) {
          console.warn("notification resync after quest failed", e);
        }
      })();
    },
    onError: (_e: any, _questId, context) => {
      if (context?.previousQuests) {
        qc.setQueryData(["/api/quests"], context.previousQuests);
      }
      if (context?.previousPack) {
        qc.setQueryData(["/api/daily-pack"], context.previousPack);
      }
      toast({
        title: "Couldn't complete",
        description: "Try again in a moment. If it already completed today, XP won't award twice.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      clearCompletingLock();
    },
  });

  return (
    <Ctx.Provider
      value={{
        character,
        completeQuest: (q) => {
          if (q.completedToday) return;
          // Only block double-taps on the in-flight quest (or any in-flight complete).
          if (completingQuestId != null || completeMut.isPending) return;
          completeMut.mutate(q.id);
        },
        isCompleting: completingQuestId != null || completeMut.isPending,
        completingQuestId,
      }}
    >
      {children}
      <XPFloats floats={floats} />
      <LevelUpOverlay
        open={levelUp.open}
        level={levelUp.level}
        characterName={character?.name}
        streak={character?.currentStreak}
        onClose={() => setLevelUp({ open: false, level: 0 })}
      />
    </Ctx.Provider>
  );
}

export const useGame = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGame must be used inside GameProvider");
  return v;
};
