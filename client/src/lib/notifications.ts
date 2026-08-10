/**
 * Notification foundation — preference + permission helpers.
 * Keeps Settings wired without adding Capacitor plugins or touching iOS signing.
 * Native local-notification scheduling can plug in later behind the same API.
 */

export type NotificationPermissionState = "granted" | "denied" | "prompt" | "unsupported";

export async function getNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return "prompt";
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const p = await Notification.requestPermission();
  if (p === "granted") return "granted";
  if (p === "denied") return "denied";
  return "prompt";
}

/**
 * Placeholder schedule hook. Preference is persisted by Settings; actual device
 * scheduling lands when Local Notifications are added in a later pass.
 */
export async function syncDailyReminderSchedule(enabled: boolean): Promise<{ ok: boolean; reason?: string }> {
  return { ok: true, reason: enabled ? "preference-saved" : "preference-cleared" };
}
