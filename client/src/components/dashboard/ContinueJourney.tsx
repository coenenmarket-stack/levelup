import { Link } from "wouter";
import { Sparkles, Swords, User, GraduationCap, Briefcase, Compass, Map, Target } from "lucide-react";
import { LAUNCH_FLAGS } from "@/lib/featureFlags";

/** Trimmed journey grid — core destinations only (rest live in the menu). */
const LINKS = [
  { href: "/explore", label: "Explore", icon: Compass, testId: "journey-explore" },
  { href: "/career-paths", label: "Paths", icon: Map, testId: "journey-paths" },
  { href: "/goals", label: "Goals", icon: Target, testId: "journey-goals" },
  { href: "/quests", label: "Quests", icon: Swords, testId: "journey-quests" },
  {
    href: "/coach",
    label: "AI Coach",
    icon: Sparkles,
    testId: "journey-coach",
    flag: "aiCoachEnabled" as const,
  },
  { href: "/profile", label: "Hero", icon: User, testId: "journey-hero" },
] as const;

export function ContinueJourney() {
  const links = LINKS.filter((l) => !("flag" in l) || !l.flag || LAUNCH_FLAGS[l.flag]);

  return (
    <section className="space-y-2.5" data-testid="section-continue-journey">
      <div className="flex items-baseline justify-between px-0.5">
        <h2 className="text-sm font-bold tracking-tight">Continue Journey</h2>
        <span className="text-[10px] text-muted-foreground">More in menu</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {links.map(({ href, label, icon: Icon, testId }) => (
          <Link
            key={href}
            href={href}
            data-testid={testId}
            className="surface rounded-xl p-3 flex flex-col items-center gap-1.5 hover-elevate text-center"
          >
            <Icon className="w-5 h-5 text-primary" strokeWidth={2.2} />
            <span className="text-[11px] font-semibold leading-tight">{label}</span>
          </Link>
        ))}
      </div>
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground py-1">
        <Link href="/certifications" data-testid="journey-certs-link" className="inline-flex items-center gap-1 hover:text-foreground">
          <GraduationCap className="w-3.5 h-3.5" />
          Certs
        </Link>
        <span aria-hidden>·</span>
        <Link href="/side-hustles" data-testid="journey-hustles-link" className="inline-flex items-center gap-1 hover:text-foreground">
          <Briefcase className="w-3.5 h-3.5" />
          Hustles
        </Link>
      </div>
    </section>
  );
}
