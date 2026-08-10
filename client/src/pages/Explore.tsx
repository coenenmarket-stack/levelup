import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useGame } from "@/lib/game";
import { useQuery } from "@tanstack/react-query";
import type { Category } from "@/lib/types";
import { CAREER_PATHS } from "@/lib/careerPaths";
import { CERTIFICATIONS } from "@/lib/certifications";
import { SIDE_HUSTLES } from "@/lib/sideHustles";
import { QUEST_CATALOG } from "@/lib/questCatalog";
import { readPersonalization } from "@/lib/personalization/store";
import {
  rankAll,
  scoreCareerPath,
  scoreCertification,
  scoreQuest,
  scoreSideHustle,
} from "@/lib/personalization/engine";
import { DEFAULT_PERSONALIZATION, type PersonalizationPrefs } from "@/lib/personalization/types";
import { readAllFeedback, feedbackToPenalties, writeFeedback } from "@/lib/personalization/feedback";
import { Compass, GraduationCap, Briefcase, Map, Swords } from "lucide-react";

export default function ExplorePage() {
  const { me } = useAuth();
  const { character } = useGame();
  const { data: cats } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const [prefs, setPrefs] = useState<PersonalizationPrefs>(DEFAULT_PERSONALIZATION);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [penalties, setPenalties] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!me?.id) return;
    void (async () => {
      setPrefs(await readPersonalization(String(me.id)));
      const fb = await readAllFeedback(String(me.id));
      const { penalties: p, dismissedIds } = feedbackToPenalties(fb);
      setPenalties(p);
      setDismissed(dismissedIds);
    })();
  }, [me?.id]);

  const levels = useMemo(() => {
    const out: Record<string, number> = { health: 2, wealth: 2, career: 2, family: 2, mindset: 2 };
    for (const c of cats ?? []) {
      if (c.key) out[c.key] = c.level ?? 1;
    }
    return out;
  }, [cats]);

  const ctx = useMemo(
    () => ({
      prefs,
      categoryLevels: levels,
      feedbackPenalties: penalties,
      dismissedIds: dismissed,
    }),
    [prefs, levels, penalties, dismissed],
  );

  const paths = useMemo(() => rankAll(CAREER_PATHS, scoreCareerPath, ctx, 6), [ctx]);
  const certs = useMemo(() => rankAll(CERTIFICATIONS, scoreCertification, ctx, 6), [ctx]);
  const hustles = useMemo(() => rankAll(SIDE_HUSTLES, scoreSideHustle, ctx, 6), [ctx]);
  const quests = useMemo(() => rankAll(QUEST_CATALOG, scoreQuest, ctx, 6), [ctx]);

  async function notInterested(id: string, type: "career_path" | "certification" | "side_hustle" | "quest") {
    if (!me?.id) return;
    await writeFeedback(String(me.id), { entityId: id, entityType: type, kind: "not_interested" });
    setDismissed((prev) => new Set(Array.from(prev).concat(id)));
  }

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Compass className="w-6 h-6 text-primary" /> Explore
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ranked for your goals — reasons shown under each pick.
        </p>
      </div>

      {!prefs.personalizationCompleted && (
        <Link href="/personalize" className="block surface rounded-xl p-4 border border-primary/30 hover-elevate">
          <div className="font-semibold">Personalize recommendations</div>
          <div className="text-sm text-muted-foreground mt-0.5">
            Tell us what you&apos;re working toward for better ranking.
          </div>
        </Link>
      )}

      <Section
        icon={Map}
        title="Recommended for you"
        items={paths.map((r) => ({
          id: r.item.id,
          title: r.item.title,
          href: `/career-paths/${r.item.id}`,
          reason: r.reasons[0],
          type: "career_path" as const,
        }))}
        onDismiss={notInterested}
      />

      <Section
        icon={GraduationCap}
        title="Career growth · Certifications"
        items={certs.map((r) => ({
          id: r.item.id,
          title: r.item.name,
          href: "/certifications",
          reason: r.reasons[0],
          type: "certification" as const,
        }))}
        onDismiss={notInterested}
      />

      <Section
        icon={Briefcase}
        title="Earn extra income"
        items={hustles.map((r) => ({
          id: r.item.id,
          title: r.item.name,
          href: "/side-hustles",
          reason: r.reasons[0],
          type: "side_hustle" as const,
        }))}
        onDismiss={notInterested}
      />

      <Section
        icon={Swords}
        title="Build a skill"
        items={quests.map((r) => ({
          id: r.item.id,
          title: r.item.title,
          href: "/quests",
          reason: r.reasons[0],
          type: "quest" as const,
        }))}
        onDismiss={notInterested}
      />

      {character && (
        <p className="text-xs text-muted-foreground">
          Guides are educational. No income or job guarantees.
        </p>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  items,
  onDismiss,
}: {
  icon: typeof Map;
  title: string;
  items: {
    id: string;
    title: string;
    href: string;
    reason?: string;
    type: "career_path" | "certification" | "side_hustle" | "quest";
  }[];
  onDismiss: (id: string, type: "career_path" | "certification" | "side_hustle" | "quest") => void;
}) {
  if (!items.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold flex items-center gap-1.5">
        <Icon className="w-4 h-4 text-primary" /> {title}
      </h2>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="surface rounded-xl px-3 py-3 flex items-start justify-between gap-2">
            <Link href={it.href} className="min-w-0 flex-1 hover:opacity-90">
              <div className="font-semibold text-sm">{it.title}</div>
              {it.reason && <div className="text-xs text-muted-foreground mt-0.5">{it.reason}</div>}
            </Link>
            <button
              type="button"
              className="text-[10px] text-muted-foreground shrink-0"
              onClick={() => onDismiss(it.id, it.type)}
            >
              Not interested
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
