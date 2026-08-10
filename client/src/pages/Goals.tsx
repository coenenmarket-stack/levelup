import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  computeGoalProgress,
  deleteGoal,
  listGoals,
  upsertGoal,
  type GoalType,
  type UserGoal,
} from "@/lib/personalization/goals";
import { listPathProgress } from "@/lib/personalization/careerProgress";
import { getCareerPath } from "@/lib/careerPaths";
import { Loader2, Plus, Target, Trash2 } from "lucide-react";

const TYPES: { key: GoalType; label: string }[] = [
  { key: "skill", label: "Skill improvement" },
  { key: "career_path", label: "Career path" },
  { key: "certification", label: "Certification" },
  { key: "side_hustle", label: "Side hustle" },
  { key: "custom", label: "Custom personal goal" },
];

export default function GoalsPage() {
  const { me } = useAuth();
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [pathProgress, setPathProgress] = useState<Record<string, { done: number; total: number }>>({});
  const [title, setTitle] = useState("");
  const [type, setType] = useState<GoalType>("custom");
  const [busy, setBusy] = useState(false);

  async function reload() {
    if (!me?.id) return;
    const uid = String(me.id);
    const [g, paths] = await Promise.all([listGoals(uid), listPathProgress(uid)]);
    setGoals(g);
    const map: Record<string, { done: number; total: number }> = {};
    for (const p of paths) {
      const def = getCareerPath(p.pathId);
      map[p.pathId] = {
        done: p.completedMilestoneIds.length,
        total: def?.milestones.length ?? Math.max(1, p.completedMilestoneIds.length),
      };
    }
    setPathProgress(map);
  }

  useEffect(() => {
    void reload();
  }, [me?.id]);

  async function add() {
    if (!me?.id || !title.trim()) return;
    setBusy(true);
    try {
      await upsertGoal(String(me.id), { title: title.trim(), type });
      setTitle("");
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function complete(goal: UserGoal) {
    if (!me?.id) return;
    await upsertGoal(String(me.id), { ...goal, status: "completed", manualProgress: 100 });
    await reload();
  }

  async function bumpCustom(goal: UserGoal, delta: number) {
    if (!me?.id || goal.type !== "custom") return;
    await upsertGoal(String(me.id), {
      ...goal,
      manualProgress: Math.min(100, Math.max(0, goal.manualProgress + delta)),
    });
    await reload();
  }

  async function remove(id: string) {
    if (!me?.id) return;
    await deleteGoal(String(me.id), id);
    await reload();
  }

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" /> Goals
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lightweight targets — not a project manager.
        </p>
      </div>

      <section className="surface rounded-2xl p-4 space-y-3">
        <div className="text-sm font-semibold">Add a goal</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What are you working toward?"
          className="w-full rounded-xl border border-card-border bg-transparent px-3 py-2 text-sm"
          data-testid="input-goal-title"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as GoalType)}
          className="w-full rounded-xl border border-card-border bg-transparent px-3 py-2 text-sm"
        >
          {TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !title.trim()}
          onClick={() => void add()}
          className="rounded-xl bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add goal
        </button>
      </section>

      <section className="space-y-2">
        {goals.length === 0 ? (
          <div className="text-sm text-muted-foreground surface rounded-xl p-4">
            No goals yet. Add one from a skill, path, cert, hustle, or custom target.
          </div>
        ) : (
          goals.map((g) => {
            const pathCtx =
              g.type === "career_path" && g.relatedEntityId
                ? pathProgress[g.relatedEntityId]
                : g.type === "career_path"
                  ? Object.values(pathProgress)[0]
                  : undefined;
            const pct = computeGoalProgress(g, {
              pathMilestoneDone: pathCtx?.done,
              pathMilestoneTotal: pathCtx?.total,
            });
            return (
              <div key={g.id} className="surface rounded-xl p-3 space-y-2" data-testid={`goal-${g.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sm">{g.title}</div>
                    <div className="text-[11px] text-muted-foreground capitalize">
                      {g.type.replace("_", " ")} · {g.status}
                    </div>
                  </div>
                  <button type="button" onClick={() => void remove(g.id)} aria-label="Delete goal">
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{pct}%</span>
                  <div className="flex gap-2">
                    {g.type === "custom" && g.status === "active" && (
                      <button type="button" onClick={() => void bumpCustom(g, 25)}>
                        +25%
                      </button>
                    )}
                    {g.status === "active" && (
                      <button type="button" className="text-primary" onClick={() => void complete(g)}>
                        Mark done
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
