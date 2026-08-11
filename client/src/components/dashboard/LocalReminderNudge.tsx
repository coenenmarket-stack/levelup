import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Bell } from "lucide-react";
import { useAuth } from "@/lib/auth";

const DISMISS_KEY = (uid: string) => `levelup_local_reminder_nudge_v1__${uid}`;

type Props = {
  /** Show after the user clears daily missions at least once this session / pack. */
  dailyCleared: boolean;
};

/**
 * Soft nudge toward local (non-remote) reminders after a successful daily clear.
 * Does not require remotePushEnabled.
 */
export function LocalReminderNudge({ dailyCleared }: Props) {
  const { me } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!me?.id || !dailyCleared) {
      setVisible(false);
      return;
    }
    if (me.notificationsEnabled) {
      setVisible(false);
      return;
    }
    try {
      if (localStorage.getItem(DISMISS_KEY(String(me.id)))) {
        setVisible(false);
        return;
      }
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, [me?.id, me?.notificationsEnabled, dailyCleared]);

  if (!visible || !me?.id) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY(String(me!.id)), String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <section
      className="surface rounded-xl p-4 flex items-start gap-3 border border-primary/20"
      data-testid="card-local-reminder-nudge"
    >
      <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
        <Bell className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm">Want a streak reminder?</div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Turn on local reminders so Level Up Life can nudge you about daily missions and streaks.
        </p>
        <div className="flex flex-wrap gap-2 mt-2.5">
          <Link
            href="/settings"
            data-testid="button-reminder-nudge-settings"
            className="rounded-lg bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 hover-elevate"
          >
            Open Settings
          </Link>
          <button
            type="button"
            onClick={dismiss}
            data-testid="button-reminder-nudge-dismiss"
            className="rounded-lg text-xs text-muted-foreground px-3 py-1.5 hover-elevate"
          >
            Not now
          </button>
        </div>
      </div>
    </section>
  );
}
