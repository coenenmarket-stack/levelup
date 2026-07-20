import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Flame, Trophy, Sparkles, Cog, Coins, Crown, Award } from "lucide-react";
import { useGame } from "@/lib/game";
import type { Achievement, Stats } from "@/lib/types";
import { XPBar } from "@/components/XPBar";
import { Skeleton } from "@/components/ui/skeleton";

const AVATAR_EMOJI: Record<string, string> = {
  warrior: "⚔️", mage: "🧙", ranger: "🏹", rogue: "🗡️",
  creator: "🎨", entrepreneur: "💼", tradesman: "🛠️", parent: "👨‍👩‍👧",
};
const CLASS_EMOJI: Record<string, string> = {
  entrepreneur: "💼", tradesman: "🛠️", parent: "👨‍👩‍👧", athlete: "🏃",
  student: "📚", creator: "🎨", professional: "🧠",
};

const STATS = [
  { key: "strength", label: "Strength", emoji: "💪", color: "#ef4444" },
  { key: "intelligence", label: "Intelligence", emoji: "🧠", color: "#8b5cf6" },
  { key: "discipline", label: "Discipline", emoji: "🎯", color: "#f59e0b" },
  { key: "wealth", label: "Wealth", emoji: "💰", color: "#10b981" },
  { key: "health", label: "Health", emoji: "❤️", color: "#ec4899" },
  { key: "relationships", label: "Relationships", emoji: "🤝", color: "#3b82f6" },
] as const;

const RARITY_ORDER = ["legendary", "epic", "rare", "common"] as const;

export default function ProfilePage() {
  const { character } = useGame();
  const { data: achievements } = useQuery<Achievement[]>({ queryKey: ["/api/achievements"] });
  const { data: stats } = useQuery<Stats>({ queryKey: ["/api/stats"] });

  if (!character) return <ProfileSkeleton />;

  const avatarEmoji = AVATAR_EMOJI[character.avatar] ?? "🛡️";
  const classEmoji = CLASS_EMOJI[character.className] ?? "🛡️";
  const xpToNext = character.xpToNext ?? 0;
  const xpRemaining = Math.max(0, xpToNext - character.xp);

  const unlocked = (achievements ?? []).filter(a => a.unlocked);
  const showcase = [...unlocked].sort((a, b) => {
    const ra = RARITY_ORDER.indexOf(a.rarity);
    const rb = RARITY_ORDER.indexOf(b.rarity);
    if (ra !== rb) return ra - rb;
    return (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? "");
  }).slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Top hero — character sheet card */}
      <motion.section
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="surface rounded-2xl p-5 emerald-glow relative overflow-hidden"
        data-testid="card-profile-hero"
      >
        <Link
          href="/settings"
          aria-label="Open settings"
          data-testid="link-settings"
          className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-secondary/40 border border-card-border flex items-center justify-center hover-elevate text-muted-foreground hover:text-foreground"
        >
          <Cog className="w-4 h-4" />
        </Link>

        <div className="flex items-start gap-4">
          <motion.div
            initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ delay: 0.05, type: "spring", stiffness: 220 }}
            className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/25 via-primary/10 to-accent/20 border border-primary/40 flex items-center justify-center text-5xl shrink-0 overflow-hidden"
          >
            {character.photoURL
              ? <img src={character.photoURL} alt={character.name} className="w-full h-full object-cover" />
              : <span>{avatarEmoji}</span>}
          </motion.div>
          <div className="min-w-0 flex-1 pr-10">
            <div className="text-[10px] uppercase tracking-[0.2em] gold-text font-semibold flex items-center gap-1">
              <Crown className="w-3 h-3" /> {character.title}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight truncate mt-0.5" data-testid="text-character-name">{character.name}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">{classEmoji}<span className="capitalize">{character.className}</span></span>
              {character.pronouns && <span className="text-[11px]">· {character.pronouns}</span>}
            </div>
          </div>
        </div>

        {/* Top row stats */}
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <StatPill label="Level" value={character.level} gold />
          <StatPill label="Total XP" value={character.totalXp.toLocaleString()} icon={<Sparkles className="w-3 h-3 text-accent" />} />
          <StatPill label="Streak" value={character.currentStreak} icon={<Flame className={`w-3 h-3 text-accent ${character.currentStreak > 0 ? "animate-flame" : ""}`} />} />
          <StatPill label="XP Pool" value={character.spendableXp.toLocaleString()} icon={<Coins className="w-3 h-3 text-accent" />} />
        </div>

        {/* XP bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Progress to Level <span className="font-num text-foreground">{character.level + 1}</span></span>
            <span className="font-num">{character.xp} / {xpToNext}</span>
          </div>
          <XPBar value={character.xp} max={xpToNext} showText={false} />
          <div className="mt-1.5 text-right text-[11px] text-muted-foreground">
            <span className="font-num gold-text">{xpRemaining.toLocaleString()}</span> XP to next level
          </div>
        </div>
      </motion.section>

      {/* Legacy Score — Total Level across skills */}
      <LegacyCard score={character.legacyScore ?? 5} />

      {/* Core stats */}
      <section className="space-y-3">
        <h2 className="text-base font-bold tracking-tight px-0.5">Core stats</h2>
        <div className="grid grid-cols-1 gap-2.5">
          {STATS.map(s => {
            const value = (character as any)[s.key] as number;
            return (
              <div key={s.key} className="surface rounded-xl p-3" data-testid={`stat-${s.key}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{s.emoji}</span>
                    <span className="text-sm font-semibold">{s.label}</span>
                  </div>
                  <span className="font-num text-sm font-bold" style={{ color: s.color }}>{value}<span className="text-muted-foreground text-[10px]"> / 100</span></span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary/50 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${s.color}, ${s.color}aa)` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-3 gap-2">
        <QuickStat label="Quests" value={stats?.tasksCompleted ?? 0} />
        <QuickStat label="Longest" value={stats?.longestStreak ?? 0} icon={<Flame className="w-3 h-3 text-accent" />} />
        <QuickStat label="Hours" value={stats?.hoursInvested ?? 0} suffix="hr" />
      </section>

      {/* Life goals */}
      {character.goals && character.goals.length > 0 && (
        <section className="surface rounded-2xl p-4 space-y-2">
          <h2 className="text-sm font-bold tracking-tight flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" /> Life goals
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {character.goals.map((g) => (
              <span key={g} className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/30">{g}</span>
            ))}
          </div>
        </section>
      )}

      {/* Achievements showcase */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between px-0.5">
          <h2 className="text-base font-bold tracking-tight flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-accent" /> Achievements
          </h2>
          <Link href="/achievements" className="text-xs text-primary hover:underline" data-testid="link-all-achievements">See all</Link>
        </div>
        {showcase.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {showcase.map(a => (
              <div key={a.id} className={`surface rounded-xl p-3 flex flex-col items-center text-center rarity-${a.rarity}`} data-testid={`badge-${a.key}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl rarity-bg-${a.rarity} mb-1.5`}>{a.icon}</div>
                <div className="text-[11px] font-semibold leading-tight line-clamp-2">{a.name}</div>
                <div className={`text-[9px] uppercase tracking-wider mt-1 rarity-${a.rarity}`}>{a.rarity}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="surface rounded-xl p-5 text-center">
            <Trophy className="w-7 h-7 text-muted-foreground mx-auto mb-1" />
            <div className="text-sm font-semibold">No achievements yet</div>
            <div className="text-xs text-muted-foreground">Complete your first quest to start unlocking badges.</div>
          </div>
        )}
      </section>

      <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground pt-2 pb-1">
        Joined {new Date(character.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
      </p>
    </div>
  );
}

function LegacyCard({ score }: { score: number }) {
  // Legacy Score = Total Level across all skills. Range: 5 (all level 1) → 495 (all 99).
  const MAX = 495;
  const total = Math.min(MAX, Math.max(5, Math.round(score || 5)));
  const pct = Math.round(((total - 5) / (MAX - 5)) * 100);

  const tier =
    total >= 400 ? { label: "Legendary", color: "text-accent", glow: "from-accent/30 to-primary/20" } :
    total >= 300 ? { label: "Rising",    color: "text-primary", glow: "from-primary/25 to-accent/15" } :
    total >= 200 ? { label: "Building",  color: "text-primary", glow: "from-primary/15 to-accent/10" } :
    total >= 100 ? { label: "Awakening", color: "text-muted-foreground", glow: "from-secondary/30 to-secondary/10" } :
                   { label: "Beginner",  color: "text-muted-foreground", glow: "from-secondary/30 to-secondary/10" };

  return (
    <div
      data-testid="legacy-card"
      className={`surface rounded-2xl p-4 relative overflow-hidden bg-gradient-to-br ${tier.glow}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-card border border-accent/40 flex items-center justify-center shrink-0">
          <Award className="w-6 h-6 text-accent" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Legacy · Total Mastery</div>
            <div className={`text-[10px] uppercase tracking-[0.18em] font-bold ${tier.color}`}>{tier.label}</div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-num font-extrabold text-3xl gold-text">{total}</span>
            <span className="text-xs text-muted-foreground">/ {MAX}</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all"
              style={{ width: `${Math.max(1, pct)}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground mt-1.5">Sum of your 5 skill levels · Mastery score</div>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, icon, gold }: { label: string; value: string | number; icon?: React.ReactNode; gold?: boolean }) {
  return (
    <div className="surface-raised rounded-lg px-2 py-2">
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-num font-bold flex items-center justify-center gap-1 ${gold ? "gold-text text-lg" : "text-sm"}`}>
        {icon}{value}
      </div>
    </div>
  );
}

function QuickStat({ label, value, icon, suffix }: { label: string; value: string | number; icon?: React.ReactNode; suffix?: string }) {
  return (
    <div className="surface rounded-xl p-3 text-center">
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-baseline justify-center gap-1">
        {icon}
        <span className="font-num text-xl font-bold">{value}</span>
        {suffix && <span className="text-[10px] text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}
