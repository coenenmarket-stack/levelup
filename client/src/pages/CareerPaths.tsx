import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useAuth } from "@/lib/auth";
import { useGame } from "@/lib/game";
import {
  CAREER_PATHS,
  CAREER_PATH_COUNT,
  getCareerPath,
  resolvedCertIds,
  resolvedHustleIds,
  type CareerPath,
} from "@/lib/careerPaths";
import { getCertificationById } from "@/lib/certifications";
import { SIDE_HUSTLES } from "@/lib/sideHustles";
import { readPersonalization, writePersonalization } from "@/lib/personalization/store";
import { rankAll, scoreCareerPath } from "@/lib/personalization/engine";
import type { PersonalizationPrefs } from "@/lib/personalization/types";
import { DEFAULT_PERSONALIZATION } from "@/lib/personalization/types";
import {
  listPathProgress,
  readPathProgress,
  saveOrStartPath,
  toggleMilestone,
  type CareerPathProgress,
} from "@/lib/personalization/careerProgress";
import { writeFeedback } from "@/lib/personalization/feedback";
import { ArrowLeft, Bookmark, CheckCircle2, Map, Play } from "lucide-react";

export default function CareerPathsPage() {
  const { me } = useAuth();
  const { character } = useGame();
  const [prefs, setPrefs] = useState<PersonalizationPrefs>(DEFAULT_PERSONALIZATION);
  const [progress, setProgress] = useState<CareerPathProgress[]>([]);

  useEffect(() => {
    if (!me?.id) return;
    void readPersonalization(String(me.id)).then(setPrefs);
    void listPathProgress(String(me.id)).then(setProgress);
  }, [me?.id]);

  const levels = useMemo(() => {
    const out: Record<string, number> = {};
    // categories come via character indirectly — use flat defaults if missing
    out.health = 2;
    out.wealth = 2;
    out.career = 2;
    out.family = 2;
    out.mindset = 2;
    return out;
  }, [character]);

  const ranked = useMemo(
    () => rankAll(CAREER_PATHS, scoreCareerPath, { prefs, categoryLevels: levels }, 40),
    [prefs, levels],
  );

  const activeIds = new Set(progress.filter((p) => p.status === "active").map((p) => p.pathId));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Map className="w-6 h-6 text-primary" /> Career Paths
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {CAREER_PATH_COUNT} practical pathways. Outcomes vary by employer, location, and qualifications.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-bold">Recommended for you</h2>
        {ranked.slice(0, 5).map((r) => (
          <PathRow key={r.item.id} path={r.item} reason={r.reasons[0]} active={activeIds.has(r.item.id)} />
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold">All paths</h2>
        {ranked.map((r) => (
          <PathRow key={`all-${r.item.id}`} path={r.item} reason={r.reasons[0]} active={activeIds.has(r.item.id)} />
        ))}
      </section>
    </div>
  );
}

function PathRow({ path, reason, active }: { path: CareerPath; reason?: string; active?: boolean }) {
  return (
    <Link
      href={`/career-paths/${path.id}`}
      className="block surface rounded-xl px-3 py-3 hover-elevate"
      data-testid={`career-path-${path.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-sm">{path.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{path.category} · {path.difficulty}</div>
          {reason && <div className="text-xs text-primary mt-1">{reason}</div>}
        </div>
        {active && <span className="text-[10px] uppercase tracking-wide text-accent">Active</span>}
      </div>
    </Link>
  );
}

export function CareerPathDetailPage() {
  const params = useParams<{ id: string }>();
  const { me } = useAuth();
  const [, navigate] = useLocation();
  const path = getCareerPath(params.id ?? "");
  const [progress, setProgress] = useState<CareerPathProgress | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!me?.id || !path) return;
    void readPathProgress(String(me.id), path.id).then(setProgress);
  }, [me?.id, path?.id]);

  if (!path) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={() => navigate("/career-paths")} className="text-sm text-primary flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p>Path not found.</p>
      </div>
    );
  }

  const certs = resolvedCertIds(path)
    .map((id) => getCertificationById(id))
    .filter(Boolean);
  const hustles = resolvedHustleIds(path)
    .map((id) => SIDE_HUSTLES.find((h) => h.id === id))
    .filter(Boolean);

  async function onStart() {
    if (!me?.id) return;
    setBusy(true);
    try {
      const p = await saveOrStartPath(String(me.id), path!.id, "active");
      setProgress(p);
      await writePersonalization(String(me.id), { activeCareerPathId: path!.id });
      await writeFeedback(String(me.id), {
        entityId: path!.id,
        entityType: "career_path",
        kind: "started",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (!me?.id) return;
    setBusy(true);
    try {
      const p = await saveOrStartPath(String(me.id), path!.id, progress?.status === "active" ? "active" : "saved");
      setProgress(p);
      await writeFeedback(String(me.id), {
        entityId: path!.id,
        entityType: "career_path",
        kind: "saved",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onDismiss() {
    if (!me?.id) return;
    await writeFeedback(String(me.id), {
      entityId: path!.id,
      entityType: "career_path",
      kind: "not_interested",
    });
    navigate("/career-paths");
  }

  async function onToggle(mid: string) {
    if (!me?.id) return;
    const p = await toggleMilestone(String(me.id), path!.id, mid);
    setProgress(p);
  }

  const done = new Set(progress?.completedMilestoneIds ?? []);

  return (
    <div className="space-y-4 pb-8">
      <button type="button" onClick={() => navigate("/career-paths")} className="text-sm text-primary flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> All paths
      </button>

      <header className="space-y-1">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{path.category}</div>
        <h1 className="text-2xl font-extrabold tracking-tight">{path.title}</h1>
        <p className="text-sm text-muted-foreground">{path.description}</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onStart()}
          className="rounded-xl bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold flex items-center gap-1.5 hover-elevate"
        >
          <Play className="w-4 h-4" /> Start path
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSave()}
          className="rounded-xl surface px-3 py-2 text-sm font-semibold flex items-center gap-1.5 hover-elevate"
        >
          <Bookmark className="w-4 h-4" /> Save
        </button>
        <button type="button" onClick={() => void onDismiss()} className="text-xs text-muted-foreground px-2">
          Not interested
        </button>
      </div>

      <Block title="Where you may be starting">
        <ul className="text-sm space-y-1">
          {path.entryRoles.map((r) => (
            <li key={r}>· {r}</li>
          ))}
        </ul>
      </Block>

      <Block title="Possible next role">
        <ul className="text-sm space-y-1">
          {path.targetRoles.map((r) => (
            <li key={r}>· {r}</li>
          ))}
        </ul>
      </Block>

      <Block title="Skills to build">
        <div className="flex flex-wrap gap-2">
          {path.relatedSkills.map((s) => (
            <span key={s} className="text-xs rounded-lg border border-card-border px-2 py-1 capitalize">
              {s}
            </span>
          ))}
        </div>
      </Block>

      <Block title="Experience milestones">
        <ul className="space-y-2">
          {path.milestones.map((m) => {
            const checked = done.has(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => void onToggle(m.id)}
                  className="w-full text-left flex items-start gap-2 text-sm hover-elevate rounded-lg px-1 py-1"
                >
                  <CheckCircle2 className={`w-4 h-4 mt-0.5 ${checked ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={checked ? "line-through text-muted-foreground" : ""}>{m.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Block>

      {certs.length > 0 && (
        <Block title="Suggested certifications">
          <ul className="text-sm space-y-1">
            {certs.map((c) => (
              <li key={c!.id}>
                <Link href="/certifications" className="text-primary">
                  {c!.name}
                </Link>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {hustles.length > 0 && (
        <Block title="Possible side hustles">
          <ul className="text-sm space-y-1">
            {hustles.map((h) => (
              <li key={h!.id}>
                <Link href="/side-hustles" className="text-primary">
                  {h!.name}
                </Link>
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block title="Step-by-step direction">
        <p className="text-sm text-muted-foreground">{path.typicalDirection}</p>
      </Block>

      <p className="text-xs text-muted-foreground border-t border-card-border pt-3">
        Important: Career outcomes vary by employer, location, experience, and qualifications.
        {path.disclaimer ? ` ${path.disclaimer}` : ""} Where licensing matters, verify local requirements.
        This is not a guarantee of employment or income.
      </p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
