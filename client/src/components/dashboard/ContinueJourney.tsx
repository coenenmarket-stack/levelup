import { Link } from "wouter";
import { Sparkles, Swords, User, Trophy, BarChart3, GraduationCap, Users, Briefcase, Compass, Map, Target } from "lucide-react";

const LINKS = [
  { href: "/explore", label: "Explore", icon: Compass, testId: "journey-explore" },
  { href: "/career-paths", label: "Paths", icon: Map, testId: "journey-paths" },
  { href: "/goals", label: "Goals", icon: Target, testId: "journey-goals" },
  { href: "/coach", label: "AI Coach", icon: Sparkles, testId: "journey-coach" },
  { href: "/quests", label: "Quests", icon: Swords, testId: "journey-quests" },
  { href: "/side-hustles", label: "Hustles", icon: Briefcase, testId: "journey-hustles" },
  { href: "/friends", label: "Friends", icon: Users, testId: "journey-friends" },
  { href: "/social", label: "Social", icon: Users, testId: "journey-social" },
  { href: "/invite", label: "Invite", icon: Users, testId: "journey-invite" },
  { href: "/character", label: "Hero", icon: User, testId: "journey-hero" },
  { href: "/achievements", label: "Badges", icon: Trophy, testId: "journey-achievements" },
  { href: "/stats", label: "Progress", icon: BarChart3, testId: "journey-stats" },
  { href: "/certifications", label: "Certs", icon: GraduationCap, testId: "journey-certs" },
] as const;

export function ContinueJourney() {
  return (
    <section className="space-y-2.5" data-testid="section-continue-journey">
      <h2 className="text-sm font-bold tracking-tight px-0.5">Continue Journey</h2>
      <div className="grid grid-cols-3 gap-2">
        {LINKS.map(({ href, label, icon: Icon, testId }) => (
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
    </section>
  );
}
