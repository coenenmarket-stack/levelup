import { useQuery } from "@tanstack/react-query";
import type { Achievement } from "@/lib/types";
import { Lock } from "lucide-react";

const rarities = ["legendary", "epic", "rare", "common"] as const;

export default function Achievements() {
  const { data: achs } = useQuery<Achievement[]>({ queryKey: ["/api/achievements"] });
  const unlocked = (achs ?? []).filter(a => a.unlocked).length;
  const total = achs?.length ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-page-title">Achievements</h1>
        <p className="text-sm text-muted-foreground"><span className="font-num text-foreground">{unlocked}</span> of <span className="font-num text-foreground">{total}</span> unlocked</p>
      </div>

      {rarities.map((r) => {
        const items = (achs ?? []).filter(a => a.rarity === r);
        if (items.length === 0) return null;
        return (
          <section key={r} className="space-y-2.5" data-testid={`section-rarity-${r}`}>
            <h2 className={`text-xs uppercase tracking-[0.2em] font-bold rarity-${r}`}>{r}</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {items.map((a) => {
                const pct = Math.min(100, (a.progress / a.target) * 100);
                return (
                  <div
                    key={a.id}
                    className={`surface rounded-xl p-3.5 ${a.unlocked ? `rarity-bg-${a.rarity} border-2 rarity-${a.rarity}` : ""}`}
                    data-testid={`card-achievement-${a.id}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${a.unlocked ? "" : "bg-secondary/40 border border-card-border opacity-50"}`}>
                        {a.unlocked ? a.icon : <Lock className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`font-bold text-sm leading-tight ${a.unlocked ? "" : "text-muted-foreground"}`}>{a.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{a.description}</div>
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                        <div className={`h-full rounded-full ${a.unlocked ? "bg-accent" : "bg-primary/70"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 font-num text-right">{a.progress}/{a.target}</div>
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
