import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  ArrowLeft,
  Clock,
  DollarSign,
  Wrench,
  AlertTriangle,
  Swords,
  Sparkles,
  Bookmark,
  Play,
} from "lucide-react";
import { Link } from "wouter";
import {
  SIDE_HUSTLES,
  SIDE_HUSTLE_CATEGORIES,
  getSideHustleById,
  type SideHustle,
} from "@/lib/sideHustles";
import { useAuth } from "@/lib/auth";
import {
  mergeHustleProgress,
  readHustleProgress,
  toggleId,
  writeHustleProgress,
  type HustleGuideProgress,
} from "@/lib/personalization/guideProgress";
import { writeFeedback } from "@/lib/personalization/feedback";

const COST_LABEL: Record<SideHustle["startupCost"], string> = {
  Free: "Free to start",
  $: "Low startup",
  $$: "Moderate startup",
  $$$: "Higher startup",
};

export default function SideHustlesPage() {
  const { me } = useAuth();
  const uid = me?.id ? String(me.id) : "anon";
  const [filter, setFilter] = useState<SideHustle["category"] | "All">("All");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [progress, setProgress] = useState<HustleGuideProgress>(() => mergeHustleProgress(null));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (uid === "anon") return;
      const next = await readHustleProgress(uid);
      if (!cancelled) setProgress(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const visible = useMemo(
    () => (filter === "All" ? SIDE_HUSTLES : SIDE_HUSTLES.filter((h) => h.category === filter)),
    [filter],
  );

  const detail = detailId ? getSideHustleById(detailId) : null;
  if (detail) {
    return (
      <SideHustleDetail
        hustle={detail}
        progress={progress}
        onBack={() => setDetailId(null)}
        onSave={async () => {
          const next = mergeHustleProgress({
            ...progress,
            saved: toggleId(progress.saved, detail.id),
          });
          setProgress(next);
          if (uid !== "anon") {
            await writeHustleProgress(uid, next);
            await writeFeedback(uid, { entityId: detail.id, entityType: "side_hustle", kind: "saved" });
          }
        }}
        onStart={async () => {
          const next = mergeHustleProgress({
            ...progress,
            started: Array.from(new Set([...progress.started, detail.id])),
            saved: progress.saved.includes(detail.id)
              ? progress.saved
              : [...progress.saved, detail.id],
          });
          setProgress(next);
          if (uid !== "anon") {
            await writeHustleProgress(uid, next);
            await writeFeedback(uid, { entityId: detail.id, entityType: "side_hustle", kind: "started" });
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-primary" strokeWidth={2.4} />
          <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-page-title">
            Side Hustles
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {SIDE_HUSTLES.length} practical guides — pick a path, follow the steps, stack Wealth & Career XP with related quests.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="hustle-filter-chips">
        {(["All", ...SIDE_HUSTLE_CATEGORIES] as const).map((cat) => {
          const active = filter === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              data-testid={`hustle-chip-${String(cat).toLowerCase().replace(/\s+/g, "-")}`}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-card-border hover-elevate"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      <div className="space-y-2.5">
        {visible.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => setDetailId(h.id)}
            data-testid={`hustle-${h.id}`}
            className="w-full text-left surface rounded-2xl p-4 hover-elevate"
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-card border border-card-border flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5 text-primary" strokeWidth={2.4} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-bold">{h.name}</div>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground border border-card-border rounded-md px-1.5 py-0.5">
                    {h.skillLevel}
                  </span>
                  {progress.started.includes(h.id) && (
                    <span className="text-[10px] uppercase tracking-wide text-accent">Started</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{h.tagline}</div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {COST_LABEL[h.startupCost]}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    First dollar · {h.timeToFirstDollar}
                  </span>
                  <span>{h.category}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-center text-muted-foreground px-4 pt-2">
        Guides are educational — earnings vary. No guarantees. Pair with Wealth and Career quests for XP.
      </p>
    </div>
  );
}

function SideHustleDetail({
  hustle,
  progress,
  onBack,
  onSave,
  onStart,
}: {
  hustle: SideHustle;
  progress: HustleGuideProgress;
  onBack: () => void;
  onSave: () => void;
  onStart: () => void;
}) {
  const saved = progress.saved.includes(hustle.id);
  const started = progress.started.includes(hustle.id);
  return (
    <div className="space-y-5" data-testid={`hustle-detail-${hustle.id}`}>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover-elevate rounded-lg px-1 py-1 -ml-1"
        data-testid="button-hustle-back"
      >
        <ArrowLeft className="w-4 h-4" />
        All side hustles
      </button>

      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {hustle.category} · {hustle.skillLevel}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight mt-1 leading-tight">{hustle.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">{hustle.tagline}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onStart}
          className="rounded-xl bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold flex items-center gap-1.5 hover-elevate"
          data-testid="button-hustle-start"
        >
          <Play className="w-4 h-4" /> {started ? "Started" : "Start"}
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded-xl surface px-3 py-2 text-sm font-semibold flex items-center gap-1.5 hover-elevate"
          data-testid="button-hustle-save"
        >
          <Bookmark className="w-4 h-4" /> {saved ? "Saved" : "Save"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <DollarSign className="w-3.5 h-3.5 text-primary" />
          {COST_LABEL[hustle.startupCost]}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-accent" />
          First dollar · {hustle.timeToFirstDollar}
        </span>
      </div>

      <section className="surface rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-bold">Overview</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{hustle.overview}</p>
      </section>

      <section className="surface rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-bold">Steps</h2>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          {hustle.steps.map((s) => (
            <li key={s} className="leading-relaxed">
              {s}
            </li>
          ))}
        </ol>
      </section>

      <section className="surface rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" />
          Tools
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {hustle.tools.map((t) => (
            <span
              key={t}
              className="text-[11px] border border-card-border rounded-md px-2 py-1 text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      <section className="surface rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-accent" />
          Common pitfalls
        </h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {hustle.pitfalls.map((p) => (
            <li key={p} className="flex gap-2">
              <span className="text-accent mt-0.5">»</span>
              <span className="leading-relaxed">{p}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Swords className="w-4 h-4 text-primary" />
          Related quest ideas
        </h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {hustle.relatedQuestIdeas.map((q) => (
            <li key={q} className="leading-relaxed">
              {q}
            </li>
          ))}
        </ul>
        <Link
          href="/quests"
          data-testid="link-hustle-to-quests"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover-elevate rounded-lg px-2 py-1.5 -ml-2"
        >
          <Sparkles className="w-4 h-4" />
          Open Quests catalog
        </Link>
      </section>

      {hustle.relatedSkills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {hustle.relatedSkills.map((s) => (
            <span
              key={s}
              className="text-[10px] uppercase tracking-[0.15em] border border-card-border rounded-md px-2 py-1 capitalize text-muted-foreground"
            >
              Skill · {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
