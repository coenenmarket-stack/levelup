import { createContext, useContext, useState, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import type { Character, Quest, CompleteResult, Achievement, Category } from "./types";
import { useToast } from "@/hooks/use-toast";
import { XPFloats, type XPFloat } from "@/components/XPGainToast";
import { LevelUpOverlay } from "@/components/LevelUpOverlay";
import { postProgressActivity, syncPublicProfileLocal } from "./friends";
import { useAuth } from "./auth";

type DailyPack = { quests: Quest[]; cached?: boolean; fallback?: boolean };

type GameCtx = {
  character: Character | undefined;
  completeQuest: (quest: Quest) => void;
  isCompleting: boolean;
};
const Ctx = createContext<GameCtx | null>(null);

function markQuestCompletedInList(quests: Quest[] | undefined, questId: string | number): Quest[] | undefined {
  if (!quests) return quests;
  const id = String(questId);
  return quests.map(q => (String(q.id) === id ? { ...q, completedToday: true } : q));
}

export function GameProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { me } = useAuth();
  const [floats, setFloats] = useState<XPFloat[]>([]);
  const [levelUp, setLevelUp] = useState<{ open: boolean; level: number }>({ open: false, level: 0 });

  const { data: character } = useQuery<Character>({ queryKey: ["/api/character"] });

  const completeMut = useMutation({
    mutationFn: async (questId: string | number) => {
      const res = await apiRequest("POST", `/api/quests/${questId}/complete`);
      return (await res.json()) as CompleteResult & { _questCategory?: string };
    },
    onMutate: async (questId) => {
      await qc.cancelQueries({ queryKey: ["/api/quests"] });
      await qc.cancelQueries({ queryKey: ["/api/daily-pack"] });

      const previousQuests = qc.getQueryData<Quest[]>(["/api/quests"]);
      const previousPack = qc.getQueryData<{ quests: Quest[] }>(["/api/daily-pack"]);
      const quest =
        previousQuests?.find((q) => String(q.id) === String(questId))
        ?? previousPack?.quests?.find((q) => String(q.id) === String(questId));

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
    onSuccess: async (result, _questId, context) => {
      const id = Date.now();
      setFloats((s) => [...s, { id, amount: result.xpEarned }]);
      setTimeout(() => setFloats((s) => s.filter((x) => x.id !== id)), 1600);

      if (result.streakBonusXp && result.streakBonusXp > 0) {
        toast({
          title: "Streak bonus",
          description: `+${result.streakBonusXp} XP from your streak`,
        });
      }

      if (result.leveledUp) {
        setLevelUp({ open: true, level: result.newLevel });
      }

      result.newlyUnlocked.forEach((a: Achievement) => {
        toast({
          title: `${a.icon}  Achievement unlocked`,
          description: `${a.name} — ${a.description}`,
        });
      });

      qc.invalidateQueries({ queryKey: ["/api/character"] });
      qc.invalidateQueries({ queryKey: ["/api/quests"] });
      qc.invalidateQueries({ queryKey: ["/api/daily-pack"] });
      qc.invalidateQueries({ queryKey: ["/api/categories"] });
      qc.invalidateQueries({ queryKey: ["/api/completions"] });
      qc.invalidateQueries({ queryKey: ["/api/achievements"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      qc.invalidateQueries({ queryKey: ["friend-activity"] });

      // Friends activity + public profile (best-effort)
      const uid = me?.id ? String(me.id) : "";
      if (uid) {
        const category = context?.questCategory;
        void postProgressActivity({ type: "quest", category });
        if (result.leveledUp) {
          void postProgressActivity({ type: "levelUp", level: result.newLevel });
        }
        try {
          const cats = qc.getQueryData<Category[]>(["/api/categories"]) ?? [];
          await syncPublicProfileLocal(uid, result.character, cats, {
            showLifeGoal: me?.showLifeGoal !== false,
          });
        } catch (e) {
          console.warn("syncPublicProfileLocal failed", e);
        }
      }
    },
    onError: (e: any, _questId, context) => {
      if (context?.previousQuests) {
        qc.setQueryData(["/api/quests"], context.previousQuests);
      }
      if (context?.previousPack) {
        qc.setQueryData(["/api/daily-pack"], context.previousPack);
      }
      toast({ title: "Couldn't complete", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Ctx.Provider value={{
      character,
      completeQuest: (q) => completeMut.mutate(q.id),
      isCompleting: completeMut.isPending,
    }}>
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
