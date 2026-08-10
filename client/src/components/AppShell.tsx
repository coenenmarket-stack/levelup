import { Link, useLocation } from "wouter";
import {
  Home,
  Swords,
  User,
  Sparkles,
  Trophy,
  BarChart3,
  GraduationCap,
  Briefcase,
  BookOpen,
  HelpCircle,
  Settings as SettingsIcon,
  Users,
  ChevronUp,
  X,
  Compass,
  Map,
  Target,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "./Logo";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { LAUNCH_FLAGS } from "@/lib/featureFlags";

const bottomNav = [
  { href: "/", label: "Home", icon: Home, testId: "nav-home" },
  { href: "/quests", label: "Quests", icon: Swords, testId: "nav-quests" },
  { href: "/coach", label: "Coach", icon: Sparkles, testId: "nav-coach", flag: "aiCoachEnabled" as const },
];

type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  testId: string;
  flag?: keyof typeof LAUNCH_FLAGS;
};

type MenuSection = { title: string; items: MenuItem[] };

const menuSections: MenuSection[] = [
  {
    title: "Play",
    items: [
      { href: "/", label: "Home", icon: Home, testId: "menu-home" },
      { href: "/quests", label: "Quests", icon: Swords, testId: "menu-quests" },
      { href: "/coach", label: "AI Coach", icon: Sparkles, testId: "menu-coach", flag: "aiCoachEnabled" },
    ],
  },
  {
    title: "Grow",
    items: [
      { href: "/explore", label: "Explore", icon: Compass, testId: "menu-explore" },
      { href: "/career-paths", label: "Career Paths", icon: Map, testId: "menu-career-paths" },
      { href: "/goals", label: "Goals", icon: Target, testId: "menu-goals" },
      { href: "/personalize", label: "Personalize Plan", icon: Sparkles, testId: "menu-personalize" },
      { href: "/certifications", label: "Certifications", icon: GraduationCap, testId: "menu-certifications" },
      { href: "/side-hustles", label: "Side Hustles", icon: Briefcase, testId: "menu-side-hustles" },
      { href: "/mindset", label: "Mindset", icon: BookOpen, testId: "menu-mindset" },
    ],
  },
  {
    title: "Progress",
    items: [
      { href: "/profile", label: "Hero / Profile", icon: User, testId: "menu-profile" },
      { href: "/achievements", label: "Achievements", icon: Trophy, testId: "menu-achievements" },
      { href: "/stats", label: "Progress", icon: BarChart3, testId: "menu-progress" },
    ],
  },
  {
    title: "Social",
    items: [
      { href: "/friends", label: "Friends", icon: Users, testId: "menu-friends", flag: "friendsEnabled" },
      { href: "/invite", label: "Invite", icon: Users, testId: "menu-invite", flag: "friendsEnabled" },
      {
        href: "/social",
        label: "Challenges & Parties",
        icon: Users,
        testId: "menu-social",
        flag: "socialChallengesEnabled",
      },
      {
        href: "/leaderboard",
        label: "Leaderboard",
        icon: BarChart3,
        testId: "menu-leaderboard",
        flag: "leaderboardsEnabled",
      },
      {
        href: "/notifications",
        label: "Inbox",
        icon: Bell,
        testId: "menu-notifications",
        flag: "notificationInboxEnabled",
      },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/support", label: "Help & Support", icon: HelpCircle, testId: "menu-support" },
      { href: "/settings", label: "Settings", icon: SettingsIcon, testId: "menu-settings" },
    ],
  },
];

function itemVisible(item: MenuItem): boolean {
  if (!item.flag) return true;
  return LAUNCH_FLAGS[item.flag] === true;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [loc]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const visibleBottom = useMemo(
    () =>
      bottomNav.filter((item) => {
        if (!("flag" in item) || !item.flag) return true;
        return LAUNCH_FLAGS[item.flag] === true;
      }),
    [],
  );

  const visibleSections = useMemo(
    () =>
      menuSections
        .map((section) => ({
          ...section,
          items: section.items.filter(itemVisible),
        }))
        .filter((section) => section.items.length > 0),
    [],
  );

  return (
    <div className="min-h-screen mx-auto w-full max-w-md md:max-w-2xl">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-card-border">
        <div className="flex items-center justify-between px-5 py-3.5 pt-safe">
          <Link href="/" className="flex items-center gap-2.5 hover-elevate rounded-lg px-1.5 py-1 -mx-1.5">
            <Logo className="w-7 h-7" />
            <div className="leading-tight">
              <div className="text-[0.95rem] font-bold tracking-tight">Level Up Life</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Real life RPG</div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            data-testid="button-open-menu"
            className="w-9 h-9 rounded-lg flex items-center justify-center hover-elevate text-primary"
          >
            <div className="flex flex-col items-center justify-center leading-none">
              <ChevronUp className="w-3.5 h-3.5 -mb-[5px]" strokeWidth={3} />
              <ChevronUp className="w-3.5 h-3.5 -mb-[5px]" strokeWidth={3} />
              <ChevronUp className="w-3.5 h-3.5" strokeWidth={3} />
            </div>
          </button>
        </div>
      </header>

      <main className="px-5 pb-safe pt-4 space-y-5" data-testid="page-main">
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-card-border bg-background/95 backdrop-blur-xl">
        <div
          className="mx-auto max-w-md md:max-w-2xl px-2 py-2 grid gap-1"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)",
            gridTemplateColumns: `repeat(${visibleBottom.length}, minmax(0, 1fr))`,
          }}
        >
          {visibleBottom.map((item) => {
            const Icon = item.icon;
            const active = loc === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={item.testId}
                className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl hover-elevate ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-6 h-6 ${active ? "text-primary" : ""}`} strokeWidth={active ? 2.4 : 2} />
                <span className={`text-[11px] font-medium ${active ? "text-primary" : ""}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            data-testid="menu-backdrop"
          />
          <aside
            className="fixed top-0 right-0 z-[61] h-full w-[88%] max-w-sm bg-background border-l border-card-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
            data-testid="menu-drawer"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-card-border pt-safe">
              <div className="flex items-center gap-2.5">
                <Logo className="w-6 h-6" />
                <div className="text-[0.95rem] font-bold tracking-tight">Menu</div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                data-testid="button-close-menu"
                className="w-9 h-9 rounded-xl flex items-center justify-center hover-elevate text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
              {visibleSections.map((section) => (
                <div key={section.title} className="space-y-1">
                  <div className="px-3 pt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {section.title}
                  </div>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = loc === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        data-testid={item.testId}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl hover-elevate transition-colors ${
                          active ? "bg-primary/10 text-primary" : "text-foreground"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`}
                          strokeWidth={active ? 2.4 : 2}
                        />
                        <span className="text-sm font-semibold">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-card-border text-[10px] uppercase tracking-[0.18em] text-muted-foreground pb-safe">
              Level Up Life · v1.0.1
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
