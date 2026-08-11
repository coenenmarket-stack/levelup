import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Gift, Loader2, Trophy } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WeeklyChallengeState } from "@/lib/weeklyChallenges";

export function WeeklyChallengesCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<WeeklyChallengeState>({
    queryKey: ["/api/weekly-challenges"],
  });

  const claimMut = useMutation({
    mutationFn: async (challengeKey: string) => {
      const res = await apiRequest("POST", "/api/weekly-challenges/claim", { challengeKey });
      return res.json() as Promise<{ xpEarned: number }>;
    },
    onSuccess: (result) => {
      void import("@/lib/haptics").then(({ hapticSuccess }) => void hapticSuccess());
      toast({
        title: "Weekly reward claimed",
        description: `+${result.xpEarned} XP`,
      });
      qc.invalidateQueries({ queryKey: ["/api/weekly-challenges"] });
      qc.invalidateQueries({ queryKey: ["/api/character"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (e: any) => {
      toast({
        title: "Couldn't claim reward",
        description: e?.message ?? "Try again",
        variant: "destructive",
      });
    },
  });

  if (isLoading && !data) {
    return (
      <section className="surface rounded-2xl p-4" data-testid="card-weekly-loading">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading weekly challenges…
        </div>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="surface rounded-2xl p-4 space-y-3" data-testid="card-weekly-challenges">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">This week</div>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-2 mt-0.5">
            <Trophy className="w-4 h-4 text-accent" />
            Weekly Challenges
          </h2>
        </div>
        <div className="text-[11px] text-muted-foreground font-num">{data.weekId}</div>
      </div>

      <div className="space-y-2.5">
        {data.challenges.map((c) => {
          const pct = Math.min(100, Math.round((c.progress / c.target) * 100));
          const canClaim = c.completed && !c.rewardClaimed;
          return (
            <div
              key={c.key}
              className="rounded-xl border border-border/60 bg-secondary/20 p-3"
              data-testid={`weekly-challenge-${c.key}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm">{c.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.description}</div>
                </div>
                <div className="text-xs font-num text-muted-foreground shrink-0">
                  {c.progress}/{c.target}
                </div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="text-[11px] text-muted-foreground">
                  Reward · <span className="gold-text font-num font-semibold">+{c.xpReward} XP</span>
                </div>
                {c.rewardClaimed ? (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={!canClaim || claimMut.isPending}
                    onClick={() => claimMut.mutate(c.key)}
                    data-testid={`button-claim-${c.key}`}
                    className="text-xs px-2.5 py-1 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover-elevate flex items-center gap-1"
                  >
                    {claimMut.isPending && claimMut.variables === c.key ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Gift className="w-3.5 h-3.5" />
                    )}
                    Claim
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
