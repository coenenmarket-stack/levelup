import { HelpCircle, Mail, MessageCircle, BookOpen, Shield } from "lucide-react";
import { Link } from "wouter";

const FAQS = [
  {
    q: "Quest completion didn't save",
    a: "Check your connection, then reopen Quests. Completions sync to your account when you're signed in. If a daily quest already shows complete for today, you can't earn XP for it again until tomorrow.",
  },
  {
    q: "How do daily quests reset?",
    a: "Daily quests reset at midnight in your local timezone. Side quests stay on your list until you complete them (once per day max for XP).",
  },
  {
    q: "Where did my progress go?",
    a: "Progress is tied to the account you signed in with. Confirm you're on the same email/provider. Signing in as a guest or different account starts a separate character.",
  },
  {
    q: "How do I change my goals or class?",
    a: "Open Settings from the menu (»»). Profile edits and preferences live there. Character stats update as you complete quests in each skill.",
  },
];

export default function SupportPage() {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary" strokeWidth={2.4} />
          <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-page-title">
            Help & Support
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Troubleshooting, how the game works, and ways to get unstuck.
        </p>
      </div>

      <section className="surface rounded-2xl p-4 space-y-3" data-testid="section-quick-links">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Quick links</div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/quests"
            className="rounded-xl bg-secondary/50 border border-card-border px-3 py-3 text-sm font-semibold hover-elevate flex items-center gap-2"
            data-testid="link-help-quests"
          >
            <BookOpen className="w-4 h-4 text-primary" />
            Quests
          </Link>
          <Link
            href="/settings"
            className="rounded-xl bg-secondary/50 border border-card-border px-3 py-3 text-sm font-semibold hover-elevate flex items-center gap-2"
            data-testid="link-help-settings"
          >
            <Shield className="w-4 h-4 text-primary" />
            Settings
          </Link>
          <Link
            href="/coach"
            className="rounded-xl bg-secondary/50 border border-card-border px-3 py-3 text-sm font-semibold hover-elevate flex items-center gap-2"
            data-testid="link-help-coach"
          >
            <MessageCircle className="w-4 h-4 text-primary" />
            AI Coach
          </Link>
          <Link
            href="/mindset"
            className="rounded-xl bg-secondary/50 border border-card-border px-3 py-3 text-sm font-semibold hover-elevate flex items-center gap-2"
            data-testid="link-help-mindset"
          >
            <BookOpen className="w-4 h-4 text-accent" />
            Mindset
          </Link>
        </div>
      </section>

      <section className="space-y-2.5" data-testid="section-faq">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground px-0.5">Common issues</div>
        {FAQS.map((item) => (
          <details
            key={item.q}
            className="surface rounded-2xl group"
            data-testid={`faq-${item.q.slice(0, 24).replace(/\s+/g, "-").toLowerCase()}`}
          >
            <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-semibold flex items-center justify-between gap-3">
              <span>{item.q}</span>
              <span className="text-muted-foreground text-lg leading-none group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
          </details>
        ))}
      </section>

      <section className="surface rounded-2xl p-5 space-y-3" data-testid="section-contact">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 text-primary">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm font-bold">Still stuck?</div>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Email support with what you tried and your account email (no passwords). We use it only to help you recover progress.
          </p>
        </div>
        <a
          href="mailto:hello@leveluplife.app?subject=Level%20Up%20Life%20Help"
          data-testid="link-support-email"
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover-elevate"
        >
          <Mail className="w-4 h-4" />
          Email help
        </a>
      </section>
    </div>
  );
}
