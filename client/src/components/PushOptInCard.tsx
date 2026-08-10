/**
 * Contextual push opt-in — not shown on cold launch.
 */

import { useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { registerPushForUser, shouldShowPushOptIn } from "@/lib/pushNotifications";
import { requestNotificationPermission, syncNotificationsForUser } from "@/lib/notifications";
import { useGame } from "@/lib/game";
import { useLocation } from "wouter";
import { resolveDeepLinkPath, destinationForNotificationType, destinationToPath } from "@/lib/notificationDeepLinks";
import { trackNotificationEvent } from "@/lib/notificationAnalytics";

const DISMISS_KEY = "lul_push_prompt_dismissed_ms";

export { shouldShowPushOptIn };

export function PushOptInCard() {
  const { me, updateSettings, refresh } = useAuth();
  const { character } = useGame();
  const [, setLoc] = useLocation();
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (!me || hidden) return null;

  let dismissedLocal: number | null = null;
  try {
    dismissedLocal = Number(localStorage.getItem(DISMISS_KEY) || 0) || null;
  } catch {
    /* ignore */
  }

  if (
    !shouldShowPushOptIn({
      notificationsEnabled: !!me.notificationsEnabled,
      pushPermission: null,
      dismissedAtMs: dismissedLocal,
    })
  ) {
    return null;
  }

  const uid = String(me.id);

  return (
    <section className="surface rounded-2xl p-4 space-y-3" data-testid="card-push-opt-in">
      <div className="flex items-start gap-3">
        <Bell className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-bold tracking-tight">Stay in the loop</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Get reminders when your streak is at risk, a friend challenges you, or you have progress
            waiting.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          data-testid="button-enable-notifications"
          className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover-elevate disabled:opacity-60"
          onClick={async () => {
            setBusy(true);
            try {
              const localPerm = await requestNotificationPermission();
              const push = await registerPushForUser(uid, {
                onNotificationOpen: (data) => {
                  trackNotificationEvent("push_opened");
                  if (typeof data.href === "string" && data.href.startsWith("/")) {
                    setLoc(resolveDeepLinkPath(data.href));
                    return;
                  }
                  if (data.type) {
                    setLoc(destinationToPath(destinationForNotificationType(data.type, data)));
                    return;
                  }
                  setLoc("/");
                },
              });
              await updateSettings({ notificationsEnabled: true });
              await setDoc(
                doc(db, "users", uid),
                {
                  pushEnabled: true,
                  notificationsEnabled: true,
                  pushPermission: push.ok ? "granted" : localPerm,
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
                  updatedAt: new Date().toISOString(),
                },
                { merge: true },
              );
              await refresh();
              await syncNotificationsForUser({
                prefs: {
                  notificationsEnabled: true,
                  notifyDailyQuests: me.notifyDailyQuests !== false,
                  notifyStreakRisk: me.notifyStreakRisk !== false,
                  notifyWeeklyChallenges: me.notifyWeeklyChallenges !== false,
                },
                currentStreak: character?.currentStreak,
                longestStreak: character?.longestStreak,
                lastCompletionDate: character?.lastCompletionDate,
              });
              trackNotificationEvent("push_permission_granted");
              setHidden(true);
            } catch {
              trackNotificationEvent("push_permission_denied");
            } finally {
              setBusy(false);
            }
          }}
        >
          Enable Notifications
        </button>
        <button
          type="button"
          disabled={busy}
          data-testid="button-push-not-now"
          className="px-3 py-2 rounded-xl bg-secondary text-sm font-semibold hover-elevate"
          onClick={async () => {
            const now = Date.now();
            try {
              localStorage.setItem(DISMISS_KEY, String(now));
            } catch {
              /* ignore */
            }
            await setDoc(
              doc(db, "users", uid),
              { pushPromptDismissedAtMs: now, updatedAt: new Date().toISOString() },
              { merge: true },
            ).catch(() => {});
            trackNotificationEvent("push_permission_denied");
            setHidden(true);
          }}
        >
          Not Now
        </button>
      </div>
    </section>
  );
}
