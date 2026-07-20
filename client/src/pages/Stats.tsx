import { useQuery } from "@tanstack/react-query";
import type { Stats } from "@/lib/types";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { Trophy, Flame, Zap, CheckCircle2, Clock } from "lucide-react";

export default function StatsPage() {
  const { data: stats } = useQuery<Stats>({ queryKey: ["/api/stats"] });
  if (!stats) return null;

  const days = stats.weekly.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-page-title">Statistics</h1>
        <p className="text-sm text-muted-foreground">Your lifetime journey, by the numbers.</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <KpiCard label="Total XP earned" value={stats.totalXp.toLocaleString()} icon={<Zap className="w-4 h-4 text-accent" />} accent />
        <KpiCard label="Quests completed" value={stats.tasksCompleted} icon={<CheckCircle2 className="w-4 h-4 text-primary" />} />
        <KpiCard label="Current streak" value={stats.currentStreak} icon={<Flame className="w-4 h-4 text-accent" />} />
        <KpiCard label="Longest streak" value={stats.longestStreak} icon={<Flame className="w-4 h-4 text-accent" />} />
        <KpiCard label="Current level" value={stats.level} accent />
        <KpiCard label="Achievements" value={`${stats.achievementCount}/${stats.achievementTotal}`} icon={<Trophy className="w-4 h-4 text-accent" />} />
        <KpiCard label="Hours invested" value={stats.hoursInvested ?? 0} icon={<Clock className="w-4 h-4 text-primary" />} />
      </div>

      <section className="surface rounded-2xl p-4" data-testid="chart-weekly-xp">
        <h2 className="text-sm font-bold tracking-tight mb-2">XP earned · last 7 days</h2>
        <div className="h-44 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(220 18% 18%)" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(215 15% 65%)" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(215 15% 65%)" }} width={28} />
              <Tooltip
                contentStyle={{ background: "hsl(222 24% 11%)", border: "1px solid hsl(220 18% 20%)", borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: "hsl(220 18% 18%)" }}
              />
              <Bar dataKey="xp" radius={[6, 6, 0, 0]}>
                {days.map((_, i) => <Cell key={i} fill="hsl(158 70% 52%)" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="surface rounded-2xl p-4" data-testid="section-category-ranking">
        <h2 className="text-sm font-bold tracking-tight mb-3">Category rankings</h2>
        <div className="space-y-2.5">
          {[...stats.categories].sort((a, b) => b.level - a.level || b.xp - a.xp).map((c, i) => {
            const max = Math.max(...stats.categories.map(x => x.level * 100 + x.xp));
            const score = c.level * 100 + c.xp;
            const pct = Math.max(6, (score / max) * 100);
            return (
              <div key={c.id} className="flex items-center gap-3" data-testid={`rank-${c.id}`}>
                <div className="font-num font-bold text-sm w-5 text-muted-foreground">{i + 1}</div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: `${c.color}22`, border: `1px solid ${c.color}55` }}>{c.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">Lv. <span className="font-num text-foreground">{c.level}</span></div>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, icon, accent }: { label: string; value: string | number; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <div className="surface rounded-xl p-3.5">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        {icon}
      </div>
      <div className={`mt-1.5 font-num font-bold text-2xl ${accent ? "gold-text" : ""}`}>{value}</div>
    </div>
  );
}
