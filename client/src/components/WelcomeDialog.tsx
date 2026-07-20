import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Sparkles, Target, Trophy, Heart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Logo } from "./Logo";

// Bumping this version forces the popup to show again for everyone.
const SEEN_KEY_PREFIX = "levelup_welcomed_v1__";

/**
 * One-time welcome popup shown the first time a signed-in user lands on the
 * Dashboard. Tracks "seen" per user-id in localStorage so it never re-appears
 * on the same device/account. Switching accounts on the same device still gets
 * the welcome (different uid → different key).
 */
export function WelcomeDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    try {
      const seen = localStorage.getItem(SEEN_KEY_PREFIX + userId);
      if (!seen) {
        // Small delay so the dashboard mounts cleanly behind it.
        const t = setTimeout(() => setOpen(true), 350);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage blocked (private mode etc.) — just skip the popup.
    }
  }, [userId]);

  const dismiss = () => {
    try {
      localStorage.setItem(SEEN_KEY_PREFIX + userId, new Date().toISOString());
    } catch {}
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent
        className="max-w-md sm:rounded-2xl p-0 overflow-hidden border-accent/40 emerald-glow"
        data-testid="dialog-welcome"
      >
        {/* Header band */}
        <div className="relative bg-gradient-to-br from-primary/20 via-card to-accent/15 px-6 pt-6 pb-5 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-card border border-accent/40 flex items-center justify-center gold-glow">
            <Logo className="w-10 h-10" />
          </div>
          <DialogHeader className="mt-3 space-y-1">
            <DialogTitle className="text-2xl font-extrabold tracking-tight">
              Welcome to <span className="gold-text">Level Up Life</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Turn real life into an RPG — and actually finish the side quests.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm leading-relaxed">
            Every habit you build, goal you crush, and skill you sharpen earns XP, levels
            up your character, and grows your Legacy. Five life skill trees — Health, Wealth,
            Career, Family, and Mindset — all stack into one Total Level.
          </p>

          <ul className="space-y-2.5 text-sm">
            <li className="flex items-start gap-2.5">
              <Target className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span><b>Daily quests</b> — small actions that compound into real change.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Trophy className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span><b>Skill trees</b> — train all 5 categories, up to Lv 99 each. Total Mastery up to 495.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span><b>Mindset Hub</b> — daily quotes, podcasts, and practices to keep you sharp.</span>
            </li>
          </ul>

          {/* Thank you / support note */}
          <div className="rounded-xl border border-accent/30 bg-accent/5 px-3.5 py-3 flex items-start gap-2.5">
            <Heart className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              <b className="gold-text">Thanks for being here.</b> This app is built and run by one person.
              If you're feeling generous, the <b>Support</b> tab has a tip jar — no pressure, every bit helps keep it free.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-6 pt-1 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={dismiss}
            data-testid="button-welcome-dismiss"
            className="surface-raised rounded-xl py-2.5 text-sm font-semibold hover-elevate active-elevate-2"
          >
            Start playing
          </button>
          <Link
            href="/support"
            onClick={dismiss}
            data-testid="link-welcome-support"
            className="rounded-xl py-2.5 text-sm font-semibold text-center bg-gradient-to-br from-primary to-accent text-primary-foreground hover-elevate active-elevate-2 flex items-center justify-center gap-1.5"
          >
            <Heart className="w-3.5 h-3.5" /> Show support
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
