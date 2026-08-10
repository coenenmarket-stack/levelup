import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Achievement } from "@/lib/types";
import { CheckCircle2, Lock } from "lucide-react";

const rarities = ["legendary", "epic", "rare", "common"] as const;

type State = "earned" | "in_progress" | "locked";

function achievementState(a: Achievement): State {
  if (a.unlocked) return "earned";
  if ((a.progress ?? 0) > 0) return "in_progress";
  return "locked";
}

export default function Achievements() {
  const { data: achs } = useQuery<Achievement[]>({ queryKey: ["/api/achievements"] });
  const unlocked = (achs ?? []).filter((a) => a.unlocked).length;
  const total = achs?.length ?? 0;

  const byRarity = useMemo(() => {
    const map: Record<string, Achievement[]> = {};
    for (const r of rarities) map[r] = [];
    for (const a of achs ?? []) {
      const r = a.rarity in map ? a.rarity : "common";
      map[r].push(a);
    }
    for (const r of rarities) {
      map[r].sort((a, b) => {
        const sa = achievementState(a);
        const sb = achievementState(b);
        const order = { earned: 0, in_progress: 1, locked: 2 };
        return order[sa] - order[sb] || a.name.localeCompare(b.name);
      });
    }
    return map;
  }, [achs]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-page-title">Achievements</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-num text-foreground">{unlocked}</span> of{" "}
          <span className="font-num text-foreground">{total}</span> earned
        </p>
      </div>

      {rarities.map((r) => {
        const items = byRarity[r] ?? [];
        if (items.length === 0) return null;
        return (
          <section key={r} className="space-y-2.5" data-testid={`section-rarity-${r}`}>
            <h2 className={`text-xs uppercase tracking-[0.2em] font-bold rarity-${r}`}>{r}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {items.map((a) => {
                const state = achievementState(a);
                const pct = Math.min(100, ((a.progress ?? 0) / Math.max(1, a.target)) * 100);
                return (
                  <div
                    key={a.id}
                    className={`surface rounded-xl p-3.5 ${
                      state === "earned" ? `rarity-bg-${a.rarity} border border-accent/40` : ""
                    }`}
                    data-testid={`card-achievement-${a.key ?? a.id}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                          state === "earned" ? "" : "bg-secondary/40 border border-card-border opacity-60"
                        }`}
                      >
                        {state === "earned" ? a.icon : <Lock className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <div className={`font-bold text-sm leading-tight ${state === "locked" ? "text-muted-foreground" : ""}`}>
                            {a.name}
                          </div>
                          {state === "earned" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{a.description}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                          {state === "earned" ? "Earned" : state === "in_progress" ? "In progress" : "Locked"}
                          {a.unlockedAt && state === "earned" ? (
                            <span className="normal-case tracking-normal"> · {new Date(a.unlockedAt).toLocaleDateString()}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${state === "earned" ? "bg-accent" : "bg-primary/70"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 font-num text-right">
                        {a.progress}/{a.target}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
