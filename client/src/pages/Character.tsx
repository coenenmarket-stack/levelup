import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useGame } from "@/lib/game";
import type { Category } from "@/lib/types";
import { XPBar } from "@/components/XPBar";
import { Flame, Settings as SettingsIcon, ChevronRight } from "lucide-react";
import { AVATAR_CLASSES } from "@shared/schema";

const AVATAR_EMOJI: Record<string, string> = Object.fromEntries(AVATAR_CLASSES.map(a => [a.key, a.emoji]));

const subSkills: Record<string, string[]> = {
  health: ["Exercise", "Steps", "Water intake", "Sleep"],
  career: ["Work tasks", "Certifications", "Training", "Promotions"],
  finance: ["Budgeting", "Saving", "Debt payoff", "Investing"],
  family: ["Quality time", "Date nights", "Parenting goals"],
  learning: ["Reading", "Courses", "Podcasts", "Tutorials"],
  hustle: ["Product creation", "Sales", "Listings", "Marketing"],
};

export default function CharacterPage() {
  const { character } = useGame();
  const { data: cats } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  if (!character) return null;

  return (
    <div className="space-y-5">
      {/* Compact hero strip with link to full profile */}
      <Link href="/profile" className="surface rounded-2xl p-4 emerald-glow flex items-center gap-4 hover-elevate" data-testid="link-to-profile">
        <div className="w-14 h-14 rounded-xl bg-secondary/60 border border-card-border flex items-center justify-center text-3xl overflow-hidden">
          {character.photoURL
            ? <img src={character.photoURL} alt={character.name} className="w-full h-full object-cover" />
            : <span>{AVATAR_EMOJI[character.avatar] ?? "🛡️"}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent" data-testid="text-title">{character.title}</div>
          <div className="font-extrabold tracking-tight truncate" data-testid="text-name">{character.name}</div>
          <div className="text-xs text-muted-foreground capitalize">Level {character.level} · {character.className}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </Link>

      <section className="surface rounded-2xl p-4 space-y-3" data-testid="section-progress">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Progress to next level</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Flame className={`w-4 h-4 text-accent ${character.currentStreak > 0 ? "animate-flame" : ""}`} />
            <span className="font-num">{character.currentStreak}</span> day streak
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <div className="font-num text-2xl font-bold">{character.xp}<span className="text-muted-foreground text-base font-normal"> / {character.xpToNext ?? 200}</span></div>
          <div className="text-xs text-muted-foreground">XP</div>
        </div>
        <XPBar value={character.xp} max={character.xpToNext ?? 200} showText={false} />
      </section>

      {/* Skill trees */}
      <section className="space-y-3">
        <h2 className="text-base font-bold tracking-tight px-0.5">Skill trees</h2>
        <div className="space-y-2.5">
          {(cats ?? []).map((c) => (
            <div key={c.id} className="surface rounded-xl p-4" data-testid={`card-skill-${c.key}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: `${c.color}22`, border: `1px solid ${c.color}55` }}>
                  {c.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">Lv. <span className="font-num text-foreground">{c.level}</span> · <span style={{ color: c.color }}>{c.rank}</span></div>
                  </div>
                  <div className="mt-1.5"><XPBar value={c.xp} max={c.level * 100} showText={false} height="h-1.5" /></div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(subSkills[c.key] ?? []).map((s) => (
                  <span key={s} className="text-[11px] px-2 py-0.5 rounded-full border border-card-border bg-secondary/40 text-muted-foreground">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Link href="/settings" className="surface rounded-xl p-4 flex items-center gap-3 hover-elevate" data-testid="link-settings">
        <SettingsIcon className="w-4 h-4 text-muted-foreground" />
        <div className="flex-1 text-sm">Edit character, change class, manage account</div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </Link>
    </div>
  );
}
