import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  ExternalLink,
  Clock,
  DollarSign,
  Award,
  Bookmark,
  BookmarkCheck,
  Target,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import {
  CERTIFICATIONS,
  CERT_CATEGORIES,
  CERT_COST_DISCLAIMER,
  getCertificationById,
  type CertCategory,
  type Certification,
  type CertCost,
} from "@/lib/certifications";
import { useAuth } from "@/lib/auth";
import {
  mergeCertProgress,
  readCertProgress,
  toggleId,
  writeCertProgress,
  type CertGuideProgress,
} from "@/lib/personalization/guideProgress";
import { useRegisterBackHandler } from "@/lib/navigation/BackHandlerContext";

const COST_COLORS: Record<CertCost, string> = {
  Free: "text-primary",
  $: "text-primary",
  $$: "text-accent",
  $$$: "text-destructive",
};

type CertProgress = CertGuideProgress;

export default function CertificationsPage() {
  const { me } = useAuth();
  const uid = me?.id ? String(me.id) : "anon";
  const [filter, setFilter] = useState<CertCategory | "All" | "Saved" | "Goals">("All");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [progress, setProgress] = useState<CertProgress>(() => mergeCertProgress(null));

  useRegisterBackHandler(() => {
    if (!detailId) return false;
    setDetailId(null);
    return true;
  }, detailId != null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (uid === "anon") {
        setProgress(mergeCertProgress(null));
        return;
      }
      const next = await readCertProgress(uid);
      if (!cancelled) setProgress(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    // Hash deep link: #/certifications?id=...
    const hash = window.location.hash;
    const q = hash.includes("?") ? hash.split("?")[1] : "";
    const params = new URLSearchParams(q);
    const id = params.get("id");
    if (id && getCertificationById(id)) setDetailId(id);
  }, []);

  const update = (next: CertProgress) => {
    setProgress(next);
    if (uid !== "anon") void writeCertProgress(uid, next);
  };

  const visible = useMemo(() => {
    if (filter === "Saved") return CERTIFICATIONS.filter((c) => progress.saved.includes(c.id));
    if (filter === "Goals") return CERTIFICATIONS.filter((c) => progress.goals.includes(c.id));
    if (filter === "All") return CERTIFICATIONS;
    return CERTIFICATIONS.filter((c) => c.category === filter);
  }, [filter, progress.saved, progress.goals]);

  const detail = detailId ? getCertificationById(detailId) : null;

  if (detail) {
    return (
      <CertDetail
        cert={detail}
        progress={progress}
        onBack={() => setDetailId(null)}
        onToggleSave={() => update({ ...progress, saved: toggleId(progress.saved, detail.id) })}
        onToggleGoal={() => update({ ...progress, goals: toggleId(progress.goals, detail.id) })}
        onToggleStarted={() =>
          update({ ...progress, started: toggleId(progress.started, detail.id) })
        }
        onToggleCompleted={() => {
          const completed = toggleId(progress.completed, detail.id);
          const started = completed.includes(detail.id)
            ? Array.from(new Set([...progress.started, detail.id]))
            : progress.started;
          update({ ...progress, completed, started });
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" strokeWidth={2.4} />
          <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-page-title">
            Certifications
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {CERTIFICATIONS.length} real credentials — save goals, track progress, open official providers.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2" data-testid="cert-progress-summary">
        <div className="surface rounded-xl p-3 text-center">
          <div className="font-num text-lg font-bold text-primary">{progress.saved.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Saved</div>
        </div>
        <div className="surface rounded-xl p-3 text-center">
          <div className="font-num text-lg font-bold text-accent">{progress.goals.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Goals</div>
        </div>
        <div className="surface rounded-xl p-3 text-center">
          <div className="font-num text-lg font-bold">{progress.completed.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Done</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="filter-chips">
        {(["All", "Saved", "Goals", ...CERT_CATEGORIES] as const).map((cat) => {
          const active = filter === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              data-testid={`chip-${String(cat).toLowerCase()}`}
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
        {visible.length === 0 ? (
          <div className="surface rounded-2xl p-6 text-center text-sm text-muted-foreground">
            Nothing here yet — save or goal a certification from the list.
          </div>
        ) : (
          visible.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setDetailId(c.id)}
              data-testid={`cert-${c.id}`}
              className="w-full text-left block surface rounded-2xl p-4 hover-elevate"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
                  {progress.completed.includes(c.id) ? (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  ) : (
                    <Award className="w-5 h-5 text-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold leading-snug">{c.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{c.provider}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {progress.saved.includes(c.id) && (
                        <BookmarkCheck className="w-4 h-4 text-primary" aria-label="Saved" />
                      )}
                      {progress.goals.includes(c.id) && (
                        <Target className="w-4 h-4 text-accent" aria-label="Goal" />
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {c.time}
                    </span>
                    <span className={`flex items-center gap-0.5 font-semibold ${COST_COLORS[c.cost]}`}>
                      <DollarSign className="w-3 h-3" />
                      {c.cost === "Free" ? "Free" : c.cost}
                    </span>
                    <span className="text-foreground">{c.payoff}</span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <p className="text-[11px] text-center text-muted-foreground px-4 pt-2">{CERT_COST_DISCLAIMER}</p>
    </div>
  );
}

function CertDetail({
  cert,
  progress,
  onBack,
  onToggleSave,
  onToggleGoal,
  onToggleStarted,
  onToggleCompleted,
}: {
  cert: Certification;
  progress: CertProgress;
  onBack: () => void;
  onToggleSave: () => void;
  onToggleGoal: () => void;
  onToggleStarted: () => void;
  onToggleCompleted: () => void;
}) {
  const saved = progress.saved.includes(cert.id);
  const goal = progress.goals.includes(cert.id);
  const started = progress.started.includes(cert.id);
  const completed = progress.completed.includes(cert.id);

  return (
    <div className="space-y-5" data-testid={`cert-detail-${cert.id}`}>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover-elevate rounded-lg px-1 py-1 -ml-1"
        data-testid="button-cert-back"
      >
        <ArrowLeft className="w-4 h-4" />
        All certifications
      </button>

      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{cert.category}</div>
        <h1 className="text-2xl font-extrabold tracking-tight mt-1 leading-tight">{cert.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">{cert.provider}</p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          {cert.time}
        </span>
        <span className={`flex items-center gap-0.5 font-semibold ${COST_COLORS[cert.cost]}`}>
          <DollarSign className="w-3.5 h-3.5" />
          {cert.cost === "Free" ? "Free" : cert.cost}
        </span>
        <span className="text-foreground">{cert.payoff}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onToggleSave}
          data-testid="button-cert-save"
          className={`rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 border hover-elevate ${
            saved ? "bg-primary/15 border-primary text-primary" : "surface border-card-border"
          }`}
        >
          {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          {saved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          onClick={onToggleGoal}
          data-testid="button-cert-goal"
          className={`rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 border hover-elevate ${
            goal ? "bg-accent/15 border-accent text-accent" : "surface border-card-border"
          }`}
        >
          <Target className="w-4 h-4" />
          {goal ? "On goals" : "Set goal"}
        </button>
        <button
          type="button"
          onClick={onToggleStarted}
          data-testid="button-cert-started"
          className={`rounded-xl py-2.5 text-sm font-semibold border hover-elevate ${
            started ? "bg-secondary border-primary/40" : "surface border-card-border"
          }`}
        >
          {started ? "Started ✓" : "Mark started"}
        </button>
        <button
          type="button"
          onClick={onToggleCompleted}
          data-testid="button-cert-completed"
          className={`rounded-xl py-2.5 text-sm font-semibold border hover-elevate ${
            completed ? "bg-primary text-primary-foreground border-primary" : "surface border-card-border"
          }`}
        >
          {completed ? "Completed ✓" : "Mark complete"}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Progress is saved on this device for your account. It does not award XP (no toggle exploits).
      </p>

      <section className="surface rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-bold">Overview</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{cert.overview}</p>
      </section>

      <section className="surface rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-bold">Who it&apos;s for</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{cert.whoItsFor}</p>
        <div className="text-xs text-muted-foreground pt-1">
          <span className="font-semibold text-foreground">Prerequisites: </span>
          {cert.prerequisites}
        </div>
      </section>

      <section className="surface rounded-2xl p-4 space-y-2">
        <h2 className="text-sm font-bold">How to start</h2>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          {cert.howToStart.map((step) => (
            <li key={step} className="leading-relaxed">
              {step}
            </li>
          ))}
        </ol>
      </section>

      {cert.relatedSkills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {cert.relatedSkills.map((s) => (
            <span
              key={s}
              className="text-[10px] uppercase tracking-[0.15em] border border-card-border rounded-md px-2 py-1 capitalize text-muted-foreground"
            >
              Skill · {s}
            </span>
          ))}
        </div>
      )}

      <a
        href={cert.url}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="link-cert-provider"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover-elevate"
      >
        <ExternalLink className="w-4 h-4" />
        Open official provider
      </a>

      <p className="text-[11px] text-center text-muted-foreground px-2">{CERT_COST_DISCLAIMER}</p>
    </div>
  );
}
