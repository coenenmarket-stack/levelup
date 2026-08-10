import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { writePersonalization, readPersonalization } from "@/lib/personalization/store";
import {
  CAREER_INTEREST_OPTIONS,
  PRIMARY_GOAL_OPTIONS,
  type CareerInterest,
  type CertificationInterest,
  type ChallengeIntensity,
  type DailyTimeCommitment,
  type EmploymentStatus,
  type IncomeInterest,
  type PersonalizationPrefs,
  type SkillGoalKey,
} from "@/lib/personalization/types";
import {
  primaryGoalLabel,
  rankAll,
  scoreCareerPath,
  scoreCertification,
  scoreSideHustle,
} from "@/lib/personalization/engine";
import { CAREER_PATHS } from "@/lib/careerPaths";
import { CERTIFICATIONS } from "@/lib/certifications";
import { SIDE_HUSTLES } from "@/lib/sideHustles";
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const EMPLOYMENT: { key: EmploymentStatus; label: string }[] = [
  { key: "employed", label: "Employed" },
  { key: "student", label: "Student" },
  { key: "between_jobs", label: "Between jobs" },
  { key: "self_employed", label: "Self-employed" },
  { key: "building_business", label: "Building a business" },
  { key: "prefer_not", label: "Prefer not to say" },
];

const TIME: { key: DailyTimeCommitment; label: string }[] = [
  { key: "5", label: "5 minutes" },
  { key: "15", label: "15 minutes" },
  { key: "30", label: "30 minutes" },
  { key: "45", label: "45+ minutes" },
];

const INTENSITY: { key: ChallengeIntensity; label: string; blurb: string }[] = [
  { key: "easy", label: "Easy start", blurb: "Small wins, lower friction" },
  { key: "balanced", label: "Balanced", blurb: "Steady challenge" },
  { key: "push", label: "Push me", blurb: "Harder quests more often" },
];

const INCOME: { key: IncomeInterest; label: string }[] = [
  { key: "side_hustles", label: "Yes — side hustles" },
  { key: "career_advancement", label: "Yes — career advancement" },
  { key: "both", label: "Both" },
  { key: "not_now", label: "Not right now" },
];

const CERT: { key: CertificationInterest; label: string }[] = [
  { key: "yes", label: "Yes" },
  { key: "maybe", label: "Maybe later" },
  { key: "no", label: "No" },
];

export default function PersonalizePage() {
  const { me } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>(0);
  const [busy, setBusy] = useState(false);
  const [primaryGoal, setPrimaryGoal] = useState<SkillGoalKey | null>(null);
  const [secondaryGoals, setSecondaryGoals] = useState<SkillGoalKey[]>([]);
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus | null>(null);
  const [dailyTimeCommitment, setDailyTime] = useState<DailyTimeCommitment>("15");
  const [challengeIntensity, setIntensity] = useState<ChallengeIntensity>("balanced");
  const [careerInterests, setCareerInterests] = useState<CareerInterest[]>([]);
  const [incomeInterest, setIncome] = useState<IncomeInterest>("not_now");
  const [certificationInterest, setCertInterest] = useState<CertificationInterest>("maybe");
  const [currentRole, setCurrentRole] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [existingPathId, setExistingPathId] = useState<string | null>(null);

  useEffect(() => {
    if (!me?.id) return;
    void readPersonalization(String(me.id)).then((p) => {
      if (p.primaryGoal) setPrimaryGoal(p.primaryGoal);
      if (p.secondaryGoals?.length) setSecondaryGoals(p.secondaryGoals);
      if (p.employmentStatus) setEmploymentStatus(p.employmentStatus);
      if (p.dailyTimeCommitment) setDailyTime(p.dailyTimeCommitment);
      if (p.challengeIntensity) setIntensity(p.challengeIntensity);
      if (p.careerInterests?.length) setCareerInterests(p.careerInterests);
      if (p.incomeInterest) setIncome(p.incomeInterest);
      if (p.certificationInterest) setCertInterest(p.certificationInterest);
      if (p.currentRole) setCurrentRole(p.currentRole);
      if (p.targetRole) setTargetRole(p.targetRole);
      if (p.activeCareerPathId) setExistingPathId(p.activeCareerPathId);
    });
  }, [me?.id]);

  const draftPrefs: PersonalizationPrefs = useMemo(
    () => ({
      primaryGoal,
      secondaryGoals,
      employmentStatus,
      dailyTimeCommitment,
      challengeIntensity,
      careerInterests,
      incomeInterest,
      certificationInterest,
      currentRole: currentRole.trim() || null,
      targetRole: targetRole.trim() || null,
      activeCareerPathId: existingPathId,
      personalizationCompleted: true,
      softPromptDismissedAt: null,
      updatedAt: null,
    }),
    [
      primaryGoal,
      secondaryGoals,
      employmentStatus,
      dailyTimeCommitment,
      challengeIntensity,
      careerInterests,
      incomeInterest,
      certificationInterest,
      currentRole,
      targetRole,
      existingPathId,
    ],
  );

  const planPreview = useMemo(() => {
    const ctx = { prefs: draftPrefs, categoryLevels: { health: 2, wealth: 2, career: 2, family: 2, mindset: 2 } };
    const path = rankAll(CAREER_PATHS, scoreCareerPath, ctx, 1)[0];
    const cert = rankAll(CERTIFICATIONS, scoreCertification, ctx, 1)[0];
    const hustle = rankAll(SIDE_HUSTLES, scoreSideHustle, ctx, 1)[0];
    return { path, cert, hustle };
  }, [draftPrefs]);

  function toggleSecondary(key: SkillGoalKey) {
    if (key === primaryGoal) return;
    setSecondaryGoals((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  }

  function toggleCareer(key: CareerInterest) {
    setCareerInterests((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function finish() {
    if (!me?.id || !primaryGoal) return;
    setBusy(true);
    try {
      const topPath = planPreview.path?.item.id ?? existingPathId;
      await writePersonalization(String(me.id), {
        ...draftPrefs,
        primaryGoal,
        personalizationCompleted: true,
        softPromptDismissedAt: null,
        activeCareerPathId: topPath,
      });
      navigate("/");
    } finally {
      setBusy(false);
    }
  }

  const canNext =
    (step === 0 && !!primaryGoal) ||
    step === 1 ||
    step === 2 ||
    step === 3 ||
    step === 4 ||
    step === 5 ||
    step === 6;

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-8">
      <div className="space-y-1">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Step {Math.min(step + 1, 7)} of 7
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Personalize Level Up Life</h1>
        <p className="text-sm text-muted-foreground">
          Fast setup so quests and paths match what you&apos;re building.
        </p>
      </div>

      {step === 0 && (
        <StepBlock title="What do you want to improve most right now?">
          <OptionGrid
            options={PRIMARY_GOAL_OPTIONS.map((o) => ({
              key: o.key,
              label: o.label,
              blurb: o.blurb,
            }))}
            selected={primaryGoal ? [primaryGoal] : []}
            onPick={(k) => setPrimaryGoal(k as SkillGoalKey)}
          />
        </StepBlock>
      )}

      {step === 1 && (
        <StepBlock title="Anything else you want to work on?" sub="Optional — pick up to 3.">
          <OptionGrid
            options={PRIMARY_GOAL_OPTIONS.filter((o) => o.key !== primaryGoal).map((o) => ({
              key: o.key,
              label: o.label,
              blurb: o.blurb,
            }))}
            selected={secondaryGoals}
            onPick={(k) => toggleSecondary(k as SkillGoalKey)}
            multi
          />
        </StepBlock>
      )}

      {step === 2 && (
        <StepBlock title="Where are you right now?">
          <OptionGrid
            options={EMPLOYMENT.map((o) => ({ key: o.key, label: o.label }))}
            selected={employmentStatus ? [employmentStatus] : []}
            onPick={(k) => setEmploymentStatus(k as EmploymentStatus)}
          />
          <div className="mt-4 space-y-2">
            <div className="text-sm font-semibold">Daily time on Level Up Life</div>
            <OptionGrid
              options={TIME.map((o) => ({ key: o.key, label: o.label }))}
              selected={[dailyTimeCommitment]}
              onPick={(k) => setDailyTime(k as DailyTimeCommitment)}
            />
          </div>
          <div className="mt-4 space-y-2">
            <div className="text-sm font-semibold">How challenging should your plan feel?</div>
            <OptionGrid
              options={INTENSITY.map((o) => ({ key: o.key, label: o.label, blurb: o.blurb }))}
              selected={[challengeIntensity]}
              onPick={(k) => setIntensity(k as ChallengeIntensity)}
            />
          </div>
        </StepBlock>
      )}

      {step === 3 && (
        <StepBlock title="Career growth interests" sub="Optional — select any that fit.">
          <OptionGrid
            options={CAREER_INTEREST_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
            selected={careerInterests}
            onPick={(k) => toggleCareer(k as CareerInterest)}
            multi
          />
          <div className="mt-4 space-y-2">
            <label className="text-sm font-semibold block">
              Current role <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              placeholder="e.g. Maintenance technician"
              className="w-full rounded-xl border border-card-border bg-transparent px-3 py-2 text-sm"
            />
            <label className="text-sm font-semibold block">
              Role you&apos;re working toward <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Facilities supervisor"
              className="w-full rounded-xl border border-card-border bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            className="text-sm text-muted-foreground underline mt-2"
            onClick={() => setStep(4)}
          >
            Skip for now
          </button>
        </StepBlock>
      )}

      {step === 4 && (
        <StepBlock title="Are you interested in earning additional income?">
          <OptionGrid
            options={INCOME.map((o) => ({ key: o.key, label: o.label }))}
            selected={[incomeInterest]}
            onPick={(k) => setIncome(k as IncomeInterest)}
          />
        </StepBlock>
      )}

      {step === 5 && (
        <StepBlock title="Want professional certification recommendations?">
          <OptionGrid
            options={CERT.map((o) => ({ key: o.key, label: o.label }))}
            selected={[certificationInterest]}
            onPick={(k) => setCertInterest(k as CertificationInterest)}
          />
        </StepBlock>
      )}

      {step === 6 && (
        <section className="surface rounded-2xl p-5 space-y-4" data-testid="personalize-plan">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-bold">Your starting plan</h2>
          </div>
          <PlanRow label="Primary focus" value={primaryGoalLabel(primaryGoal)} />
          <PlanRow
            label="Secondary focus"
            value={
              secondaryGoals.length
                ? secondaryGoals.map(primaryGoalLabel).join(" + ")
                : "None selected"
            }
          />
          <PlanRow label="Daily commitment" value={`${dailyTimeCommitment} minutes`} />
          <PlanRow
            label="Recommended path"
            value={planPreview.path?.item.title ?? "Explore career paths"}
          />
          <PlanRow label="Today" value="3 personalized quests" />
          {planPreview.cert && certificationInterest !== "no" && (
            <PlanRow label="Suggested certification" value={planPreview.cert.item.name} />
          )}
          {planPreview.hustle && incomeInterest !== "not_now" && (
            <PlanRow label="Potential side hustle" value={planPreview.hustle.item.name} />
          )}
          <p className="text-xs text-muted-foreground">
            Career and income outcomes vary. Guides are educational — not guarantees.
          </p>
          <button
            type="button"
            disabled={busy || !primaryGoal}
            onClick={() => void finish()}
            data-testid="button-start-plan"
            className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold hover-elevate disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Start My Plan"}
          </button>
        </section>
      )}

      {step < 6 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="rounded-xl px-3 py-2 text-sm flex items-center gap-1 disabled:opacity-40 hover-elevate"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setStep((s) => (s + 1) as Step)}
            data-testid="button-personalize-next"
            className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold flex items-center gap-1 disabled:opacity-50 hover-elevate"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function StepBlock({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        {sub && <p className="text-sm text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function OptionGrid({
  options,
  selected,
  onPick,
  multi,
}: {
  options: { key: string; label: string; blurb?: string }[];
  selected: string[];
  onPick: (key: string) => void;
  multi?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {options.map((o) => {
        const on = selected.includes(o.key);
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onPick(o.key)}
            className={`text-left rounded-xl px-3 py-3 border transition-colors ${
              on ? "border-primary bg-primary/10" : "border-card-border surface"
            }`}
          >
            <div className="font-semibold text-sm">{o.label}</div>
            {o.blurb && <div className="text-xs text-muted-foreground mt-0.5">{o.blurb}</div>}
            {multi && on && <div className="text-[10px] text-primary mt-1">Selected</div>}
          </button>
        );
      })}
    </div>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}
