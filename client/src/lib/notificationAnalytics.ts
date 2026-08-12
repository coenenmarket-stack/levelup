/**
 * Privacy-safe notification analytics stubs.
 * Wired to console in dev; ready for Firebase Analytics when initialized.
 */

export type NotificationAnalyticsEvent =
  | "push_permission_granted"
  | "push_permission_denied"
  | "push_sent"
  | "push_opened"
  | "email_sent"
  | "email_opened"
  | "notification_preference_changed";

export function trackNotificationEvent(
  event: NotificationAnalyticsEvent,
  params?: Record<string, string | number | boolean>,
): void {
  try {
    if (typeof window !== "undefined" && (window as any).__LUL_ANALYTICS__) {
      (window as any).__LUL_ANALYTICS__(event, params);
      return;
    }
    if (import.meta.env?.DEV) {
      console.info("[notify-analytics]", event, params ?? {});
    }
  } catch {
    /* never throw */
  }
}
