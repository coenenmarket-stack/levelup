import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Sparkles, Loader2, Check, Upload, X } from "lucide-react";
import { compressAvatar } from "@/lib/imageUpload";

// Mirror schema constants (kept here so client doesn't import from server/shared dynamically)
const AVATAR_CLASSES = [
  { key: "warrior", name: "Warrior", emoji: "⚔️", blurb: "Strength and discipline forged daily." },
  { key: "mage", name: "Mage", emoji: "🧙", blurb: "Knowledge is your true power." },
  { key: "ranger", name: "Ranger", emoji: "🏹", blurb: "Patient, precise, in tune with the path." },
  { key: "rogue", name: "Rogue", emoji: "🗡️", blurb: "Clever, agile, finds the angle others miss." },
  { key: "creator", name: "Creator", emoji: "🎨", blurb: "Builds new worlds from nothing." },
  { key: "entrepreneur", name: "Entrepreneur", emoji: "💼", blurb: "Bold ideas, bias to action." },
  { key: "tradesman", name: "Tradesman", emoji: "🛠️", blurb: "Craft mastery through quiet repetition." },
  { key: "parent", name: "Parent", emoji: "👨‍👩‍👧", blurb: "The strongest quest — raising a legacy." },
];

const STARTING_CLASSES = [
  { key: "entrepreneur", name: "Entrepreneur", emoji: "💼", blurb: "Build something of your own. Side hustle and finance quests prioritized." },
  { key: "tradesman", name: "Tradesman", emoji: "🛠️", blurb: "Master your craft. Career and discipline quests prioritized." },
  { key: "parent", name: "Parent", emoji: "👨‍👩‍👧", blurb: "Family-first hero. Family and health quests prioritized." },
  { key: "athlete", name: "Athlete", emoji: "🏃", blurb: "Body is the base. Health and discipline quests prioritized." },
  { key: "student", name: "Student", emoji: "📚", blurb: "Curiosity is power. Learning quests prioritized." },
  { key: "creator", name: "Creator", emoji: "🎨", blurb: "Make things. Side hustle and learning quests prioritized." },
  { key: "professional", name: "Professional", emoji: "🧠", blurb: "Climb your field. Career and finance quests prioritized." },
];

const LIFE_GOALS = [
  { label: "Lose Weight", emoji: "🏃" },
  { label: "Build Wealth", emoji: "💰" },
  { label: "Get Organized", emoji: "🗂️" },
  { label: "Improve Relationships", emoji: "❤️" },
  { label: "Start a Business", emoji: "🚀" },
  { label: "Advance My Career", emoji: "📈" },
  { label: "Become Debt Free", emoji: "🧾" },
  { label: "Learn New Skills", emoji: "🧠" },
  { label: "Improve Mental Health", emoji: "🧘" },
];

// 10-question life assessment — 2 questions per area. Each option scores 1–10;
// the area's score is the average of its two questions, used to seed starting stats.
const ASSESSMENT_QUESTIONS: Array<{ area: "health" | "wealth" | "career" | "family" | "mindset"; emoji: string; question: string; options: { label: string; score: number }[] }> = [
  // HEALTH
  { area: "health", emoji: "💪", question: "How often do you exercise?",
    options: [
      { label: "Rarely or never", score: 2 },
      { label: "1–2 times a week", score: 5 },
      { label: "3–4 times a week", score: 7 },
      { label: "Almost every day", score: 10 },
    ] },
  { area: "health", emoji: "🛌", question: "How would you rate your sleep?",
    options: [
      { label: "Wreck — always tired", score: 2 },
      { label: "Hit or miss", score: 5 },
      { label: "Mostly solid", score: 7 },
      { label: "Sleep like a rock", score: 10 },
    ] },
  // WEALTH
  { area: "wealth", emoji: "💰", question: "Where are you with savings?",
    options: [
      { label: "Living paycheck to paycheck", score: 2 },
      { label: "A little set aside", score: 5 },
      { label: "Solid emergency fund", score: 7 },
      { label: "Investing and growing", score: 10 },
    ] },
  { area: "wealth", emoji: "🧾", question: "How well do you track spending?",
    options: [
      { label: "Not at all", score: 2 },
      { label: "I check in once in a while", score: 5 },
      { label: "I have a loose budget", score: 7 },
      { label: "Every dollar has a job", score: 10 },
    ] },
  // CAREER
  { area: "career", emoji: "💼", question: "How satisfied are you with your work?",
    options: [
      { label: "Burned out / stuck", score: 2 },
      { label: "It pays the bills", score: 5 },
      { label: "Good gig, room to grow", score: 7 },
      { label: "Love what I do", score: 10 },
    ] },
  { area: "career", emoji: "🎓", question: "Are you actively building new skills?",
    options: [
      { label: "Not right now", score: 2 },
      { label: "Here and there", score: 5 },
      { label: "Regular learning", score: 7 },
      { label: "Constantly leveling up", score: 10 },
    ] },
  // FAMILY
  { area: "family", emoji: "❤️", question: "How are your closest relationships?",
    options: [
      { label: "Distant or strained", score: 2 },
      { label: "Okay, could be closer", score: 5 },
      { label: "Strong and supportive", score: 7 },
      { label: "Deeply connected", score: 10 },
    ] },
  { area: "family", emoji: "👪", question: "How much quality time with people you love?",
    options: [
      { label: "Almost none", score: 2 },
      { label: "A bit, when life allows", score: 5 },
      { label: "Consistent, weekly", score: 7 },
      { label: "Daily presence", score: 10 },
    ] },
  // MINDSET
  { area: "mindset", emoji: "🧠", question: "How would you rate your stress level?",
    options: [
      { label: "Overwhelmed most days", score: 2 },
      { label: "Often stressed", score: 5 },
      { label: "Mostly steady", score: 7 },
      { label: "Calm and centered", score: 10 },
    ] },
  { area: "mindset", emoji: "✨", question: "How motivated do you feel right now?",
    options: [
      { label: "Running on empty", score: 2 },
      { label: "Some days yes, some no", score: 5 },
      { label: "Generally driven", score: 7 },
      { label: "Fired up daily", score: 10 },
    ] },
];

// Legacy slider config kept only as a fallback shape — unused now.
const ASSESSMENT_FIELDS = [
  { key: "health", label: "Health", emoji: "💪" },
  { key: "career", label: "Career", emoji: "💼" },
  { key: "finance", label: "Finance", emoji: "💰" },
  { key: "relationships", label: "Relationships", emoji: "❤️" },
  { key: "learning", label: "Learning", emoji: "📚" },
  { key: "discipline", label: "Discipline", emoji: "🎯" },
] as const;

type Step = 0 | 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { refresh } = useAuth();
  const [step, setStep] = useState<Step>(0);
  const [characterName, setCharacterName] = useState("");
  const [avatar, setAvatar] = useState<string>("");
  const [photoURL, setPhotoURL] = useState<string>("");
  const [pronouns, setPronouns] = useState("");
  const [className, setClassName] = useState<string>("");
  const [goals, setGoals] = useState<string[]>([]);
  // answers[i] = picked option index for question i (-1 = unanswered)
  const [answers, setAnswers] = useState<number[]>(Array(ASSESSMENT_QUESTIONS.length).fill(-1));
  // Derive the assessment scores from answers, in the shape finalize expects.
  const assessment = useMemo(() => {
    const sums: Record<string, { total: number; count: number }> = {};
    ASSESSMENT_QUESTIONS.forEach((q, i) => {
      const a = answers[i];
      const score = a >= 0 ? q.options[a].score : 5; // fallback midpoint if unanswered
      sums[q.area] = sums[q.area] ?? { total: 0, count: 0 };
      sums[q.area].total += score;
      sums[q.area].count += 1;
    });
    const avg = (k: string) => Math.round(((sums[k]?.total ?? 5) / Math.max(1, sums[k]?.count ?? 1)) * 10) / 10;
    return {
      health: avg("health"),
      wealth: avg("wealth"),
      career: avg("career"),
      family: avg("family"),
      mindset: avg("mindset"),
    };
  }, [answers]);
  // Kept for type-compat with the legacy fallback path — not used by the new step.
  const [_legacyAssessment, _setLegacyAssessment] = useState<Record<string, number>>({
    health: 5, career: 5, finance: 5, relationships: 5, learning: 5, discipline: 5,
  });

  const finalize = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/onboarding/finalize", {
        characterName: characterName.trim(),
        avatar,
        photoURL: photoURL || null,
        pronouns: pronouns.trim() || null,
        className,
        goals,
        assessment,
      });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries();
      await refresh();
      toast({ title: "Character created", description: "Your adventure begins now." });
      navigate("/");
    },
    onError: (err: any) => {
      toast({ title: "Couldn't finish", description: parseError(err), variant: "destructive" });
    },
  });

  const canAdvance = () => {
    if (step === 0) return true;
    if (step === 1) return characterName.trim().length > 0 && (avatar !== "" || photoURL !== "");
    if (step === 2) return className !== "";
    if (step === 3) return goals.length > 0;
    if (step === 4) return answers.every(a => a >= 0);
    return false;
  };

  const next = () => {
    if (step < 4) setStep((s) => (s + 1) as Step);
    else finalize.mutate();
  };
  const back = () => { if (step > 0) setStep((s) => (s - 1) as Step); };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header with progress dots */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/70 border-b border-card-border">
        <div className="mx-auto max-w-md md:max-w-2xl px-5 py-3.5 pt-safe flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="w-6 h-6" />
            <span className="text-sm font-bold tracking-tight">Level Up Life</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/60" : "w-3 bg-secondary"}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 mx-auto w-full max-w-md md:max-w-2xl px-5 py-6 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col"
          >
            {step === 0 && <StepWelcome />}
            {step === 1 && (
              <StepCharacter
                characterName={characterName} setCharacterName={setCharacterName}
                avatar={avatar} setAvatar={setAvatar}
                photoURL={photoURL} setPhotoURL={setPhotoURL}
                pronouns={pronouns} setPronouns={setPronouns}
              />
            )}
            {step === 2 && <StepClass className={className} setClassName={setClassName} />}
            {step === 3 && <StepGoals goals={goals} setGoals={setGoals} />}
            {step === 4 && <StepAssessment answers={answers} setAnswers={setAnswers} />}
          </motion.div>
        </AnimatePresence>

        {/* Footer nav */}
        <div className="pt-4 pb-safe flex items-center gap-3">
          {step > 0 ? (
            <button onClick={back} disabled={finalize.isPending} data-testid="button-back" className="surface rounded-xl py-3 px-4 hover-elevate flex items-center gap-1.5 font-medium text-sm">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : <div className="flex-1" />}
          <div className="flex-1" />
          <button
            onClick={next}
            disabled={!canAdvance() || finalize.isPending}
            data-testid="button-next"
            className="flex-1 max-w-[15rem] whitespace-nowrap rounded-xl py-3 px-4 bg-primary text-primary-foreground font-semibold hover-elevate active-elevate flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {finalize.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {step === 0 ? "Begin Journey" : step === 4 ? "Create Character" : "Continue"}
            {!finalize.isPending && step !== 4 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepWelcome() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 border border-primary/30 flex items-center justify-center emerald-glow"
      >
        <Logo className="w-14 h-14" />
      </motion.div>
      <div className="space-y-2 max-w-xs">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Welcome to <span className="gold-text">Level Up Life</span>
        </h1>
        <p className="text-muted-foreground">Turn your real life into an adventure.</p>
      </div>
      <div className="space-y-2.5 max-w-xs text-left text-sm w-full">
        <FeatureLine emoji="🎯" text="Daily quests for the life you want" />
        <FeatureLine emoji="📈" text="Level up six core stats" />
        <FeatureLine emoji="🏆" text="Unlock achievements and rewards" />
        <FeatureLine emoji="🤖" text="An AI coach that knows your stats" />
      </div>
    </div>
  );
}

function FeatureLine({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="surface rounded-xl px-4 py-3 flex items-center gap-3">
      <span className="text-xl">{emoji}</span>
      <span className="text-foreground/90">{text}</span>
    </div>
  );
}

function StepCharacter({ characterName, setCharacterName, avatar, setAvatar, photoURL, setPhotoURL, pronouns, setPronouns }: {
  characterName: string; setCharacterName: (v: string) => void;
  avatar: string; setAvatar: (v: string) => void;
  photoURL: string; setPhotoURL: (v: string) => void;
  pronouns: string; setPronouns: (v: string) => void;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setUploading(true);
      const dataUrl = await compressAvatar(file);
      setPhotoURL(dataUrl);
      setAvatar(""); // clear emoji selection when using custom photo
      toast({ title: "Photo ready", description: "Looking sharp." });
    } catch (err: any) {
      toast({ title: "Couldn't load image", description: err?.message ?? "Try a smaller file.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight">Create your hero</h2>
        <p className="text-sm text-muted-foreground">Name them. Pick an avatar — or upload your own.</p>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="char-name" className="text-xs">Character name</Label>
          <Input id="char-name" placeholder="e.g. Aurelia" value={characterName} onChange={(e) => setCharacterName(e.target.value)} className="mt-1.5" data-testid="input-char-name" />
        </div>

        {/* Photo upload */}
        <div>
          <Label className="text-xs">Your photo <span className="text-muted-foreground/70 normal-case">(optional)</span></Label>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-secondary/40 border border-card-border flex items-center justify-center overflow-hidden shrink-0">
              {photoURL
                ? <img src={photoURL} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-2xl text-muted-foreground">📷</span>}
            </div>
            <div className="flex-1 flex flex-wrap gap-2">
              <label className="surface rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer hover-elevate flex items-center gap-1.5" data-testid="button-upload-photo">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {photoURL ? "Change photo" : "Upload photo"}
                <input type="file" accept="image/*" className="hidden" onChange={handleFile} ref={fileRef} disabled={uploading} />
              </label>
              {photoURL && (
                <button type="button" onClick={() => setPhotoURL("")} data-testid="button-remove-photo" className="rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground hover-elevate flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">Stored small (256px, ~60KB). Stays private to your account.</p>
        </div>

        <div>
          <Label className="text-xs">Or pick an avatar</Label>
          <div className="mt-1.5 grid grid-cols-4 gap-2.5">
            {AVATAR_CLASSES.map((a) => {
              const selected = avatar === a.key;
              return (
                <button
                  key={a.key} type="button" onClick={() => setAvatar(a.key)}
                  data-testid={`button-avatar-${a.key}`}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative ${selected ? "bg-primary/15 border-primary border-2 emerald-glow" : "surface hover-elevate"}`}
                >
                  <span className="text-2xl">{a.emoji}</span>
                  <span className={`text-[10px] font-semibold ${selected ? "text-primary" : "text-muted-foreground"}`}>{a.name}</span>
                  {selected && <Check className="absolute top-1 right-1 w-3.5 h-3.5 text-primary" />}
                </button>
              );
            })}
          </div>
          {avatar && (
            <p className="mt-2 text-[11px] text-muted-foreground text-center italic">
              {AVATAR_CLASSES.find(a => a.key === avatar)?.blurb}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="pronouns" className="text-xs">Pronouns <span className="text-muted-foreground/70 normal-case">(optional)</span></Label>
          <Input id="pronouns" placeholder="e.g. she/her, they/them" value={pronouns} onChange={(e) => setPronouns(e.target.value)} className="mt-1.5" data-testid="input-pronouns" />
        </div>
      </div>
    </div>
  );
}

function StepClass({ className, setClassName }: { className: string; setClassName: (v: string) => void }) {
  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight">Choose a starting class</h2>
        <p className="text-sm text-muted-foreground">Determines the quests you'll see first.</p>
      </div>
      <div className="space-y-2.5">
        {STARTING_CLASSES.map((c) => {
          const selected = className === c.key;
          return (
            <button
              key={c.key} type="button" onClick={() => setClassName(c.key)}
              data-testid={`button-class-${c.key}`}
              className={`w-full text-left rounded-xl px-4 py-3.5 flex items-center gap-3 transition-all ${selected ? "bg-primary/15 border-2 border-primary emerald-glow" : "surface hover-elevate border-2 border-transparent"}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${selected ? "bg-primary/20" : "bg-secondary/50"}`}>{c.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold ${selected ? "text-primary" : ""}`}>{c.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{c.blurb}</div>
              </div>
              {selected && <Check className="w-5 h-5 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepGoals({ goals, setGoals }: { goals: string[]; setGoals: (v: string[]) => void }) {
  const toggle = (label: string) => {
    if (goals.includes(label)) setGoals(goals.filter((g) => g !== label));
    else setGoals([...goals, label]);
  };
  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight">Select your life goals</h2>
        <p className="text-sm text-muted-foreground">Pick as many as feel right.</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {LIFE_GOALS.map((g) => {
          const selected = goals.includes(g.label);
          return (
            <button
              key={g.label} type="button" onClick={() => toggle(g.label)}
              data-testid={`button-goal-${g.label.replace(/\s+/g, "-").toLowerCase()}`}
              className={`rounded-xl px-3 py-3 text-sm flex items-center gap-2 transition-all border-2 ${selected ? "bg-primary/15 border-primary text-foreground" : "surface border-transparent hover-elevate text-muted-foreground"}`}
            >
              <span className="text-lg">{g.emoji}</span>
              <span className={`text-[13px] font-medium ${selected ? "text-foreground" : ""}`}>{g.label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground">{goals.length} selected</p>
    </div>
  );
}

function StepAssessment({ answers, setAnswers }: { answers: number[]; setAnswers: (v: number[]) => void }) {
  // One question at a time. Track which question we're on locally so the
  // outer onboarding flow doesn't have to know.
  const total = ASSESSMENT_QUESTIONS.length;

  // Resume on the first unanswered question if user comes back.
  const firstUnanswered = answers.findIndex(a => a < 0);
  const [idx, setIdx] = useState(firstUnanswered === -1 ? total - 1 : firstUnanswered);

  const q = ASSESSMENT_QUESTIONS[idx];
  const answered = answers.filter(a => a >= 0).length;
  const pct = Math.round(((idx) / total) * 100);

  const pick = (j: number) => {
    const next = [...answers];
    next[idx] = j;
    setAnswers(next);
    // Auto-advance after a beat so the user sees their pick highlight.
    if (idx < total - 1) {
      setTimeout(() => setIdx(idx + 1), 180);
    }
  };

  const goBack = () => {
    if (idx > 0) setIdx(idx - 1);
  };

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight">Life Assessment</h2>
        <p className="text-sm text-muted-foreground">Your starting stats are calculated from your answers.</p>
      </div>

      {/* Progress */}
      <div data-testid="assess-progress">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">
          <span>Question <span className="font-num text-foreground">{idx + 1}</span> of {total}</span>
          <span className="text-accent font-semibold">{answered} / {total} answered</span>
        </div>
        <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22 }}
          className="surface rounded-2xl p-5 space-y-4"
          data-testid={`assess-card-${idx}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-2xl shrink-0">
              {q.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{q.area}</div>
              <div className="font-bold text-base leading-tight mt-0.5">{q.question}</div>
            </div>
          </div>

          <div className="space-y-2">
            {q.options.map((opt, j) => {
              const selected = answers[idx] === j;
              return (
                <button
                  key={j}
                  type="button"
                  onClick={() => pick(j)}
                  data-testid={`assess-q${idx}-opt${j}`}
                  className={`w-full text-left rounded-xl px-4 py-3 text-sm font-medium transition-colors border-2 ${
                    selected
                      ? "bg-primary/15 border-primary text-foreground"
                      : "surface border-transparent text-foreground hover-elevate"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{opt.label}</span>
                    {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Nav inside the assessment step */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={idx === 0}
          data-testid="assess-back"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold ${
            idx === 0 ? "text-muted-foreground/40 cursor-not-allowed" : "text-foreground hover-elevate"
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        {idx < total - 1 && answers[idx] >= 0 && (
          <button
            type="button"
            onClick={() => setIdx(idx + 1)}
            data-testid="assess-next"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-primary hover-elevate"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {idx === total - 1 && answered === total && (
        <div className="surface-raised rounded-xl p-3 flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-accent shrink-0" />
          <p className="text-xs text-muted-foreground">All done. Tap Continue below to forge your hero.</p>
        </div>
      )}
    </div>
  );
}

function parseError(err: any): string {
  const msg = err?.message ?? "Something went wrong";
  const m = String(msg).match(/^\d+:\s*(\{.*\})$/);
  if (m) { try { return JSON.parse(m[1]).error ?? msg; } catch { /* ignore */ } }
  return msg;
}
