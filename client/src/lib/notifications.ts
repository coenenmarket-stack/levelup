/**
 * Local notification scheduling for Phase 2 retention.
 * Uses @capacitor/local-notifications on native; web is preference-only.
 *
 * IDs (stable, replace on reschedule):
 *   1001 — daily quest reminder (early evening)
 *   1002 — streak at-risk reminder (later evening)
 *   1003 — weekly challenge reminder (near week end)
 *
 * Limitations:
 * - Schedules are calendar-based; they re-evaluate on Settings changes, app
 *   resume, and immediately after a successful quest completion.
 * - If a streak warning was already delivered by the OS before resync, that
 *   delivery cannot be retracted — only future scheduled firings are cancelled.
 */

import { dayKeyLocal, isoWeekIdLocal } from "./dayKey";
import { getStreakStatus } from "./streak";

export type NotificationPermissionState = "granted" | "denied" | "prompt" | "unsupported";

export type NotificationPrefs = {
  /** Master switch */
  notificationsEnabled: boolean;
  notifyDailyQuests: boolean;
  notifyStreakRisk: boolean;
  notifyWeeklyChallenges: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: Omit<NotificationPrefs, "notificationsEnabled"> = {
  notifyDailyQuests: true,
  notifyStreakRisk: true,
  notifyWeeklyChallenges: true,
};

const ID_DAILY = 1001;
const ID_STREAK = 1002;
const ID_WEEKLY = 1003;

async function nativePlugin(): Promise<any | null> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return null;
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    return LocalNotifications;
  } catch {
    return null;
  }
}

export async function getNotificationPermission(): Promise<NotificationPermissionState> {
  const native = await nativePlugin();
  if (native) {
    try {
      const r = await native.checkPermissions();
      if (r.display === "granted") return "granted";
      if (r.display === "denied") return "denied";
      return "prompt";
    } catch {
      return "unsupported";
    }
  }
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return "prompt";
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  const native = await nativePlugin();
  if (native) {
    try {
      const r = await native.requestPermissions();
      return r.display === "granted" ? "granted" : r.display === "denied" ? "denied" : "prompt";
    } catch {
      return "unsupported";
    }
  }
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const p = await Notification.requestPermission();
  if (p === "granted") return "granted";
  if (p === "denied") return "denied";
  return "prompt";
}

function nextLocalDateAt(hour: number, minute: number, from = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate(), hour, minute, 0, 0);
  if (d.getTime() <= from.getTime()) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/** Upcoming Friday 17:00 local (or today if Friday and still before 17:00). */
function nextFridayEvening(from = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 17, 0, 0, 0);
  const day = d.getDay(); // 0 Sun … 5 Fri
  let add = (5 - day + 7) % 7;
  if (add === 0 && d.getTime() <= from.getTime()) add = 7;
  d.setDate(d.getDate() + add);
  return d;
}

export type SyncNotificationContext = {
  prefs: NotificationPrefs;
  currentStreak?: number;
  longestStreak?: number;
  lastCompletionDate?: string | null;
  /** True when any daily pack quest remains incomplete today. */
  hasIncompleteDaily?: boolean;
  /** True when any weekly challenge is incomplete / unclaimed. */
  hasIncompleteWeekly?: boolean;
};

export const NOTIFICATION_IDS = {
  daily: ID_DAILY,
  streak: ID_STREAK,
  weekly: ID_WEEKLY,
} as const;

/** Pure planner used by sync + tests — which notification IDs would be scheduled. */
export function plannedRetentionNotificationIds(ctx: SyncNotificationContext): number[] {
  if (!ctx.prefs.notificationsEnabled) return [];
  const streak = getStreakStatus({
    currentStreak: ctx.currentStreak,
    longestStreak: ctx.longestStreak,
    lastCompletionDate: ctx.lastCompletionDate,
  });
  const ids: number[] = [];
  if (ctx.prefs.notifyDailyQuests && ctx.hasIncompleteDaily !== false) ids.push(ID_DAILY);
  if (ctx.prefs.notifyStreakRisk && streak.atRisk && !streak.protectedToday) ids.push(ID_STREAK);
  if (ctx.prefs.notifyWeeklyChallenges && ctx.hasIncompleteWeekly !== false) ids.push(ID_WEEKLY);
  return ids;
}

export async function cancelAllRetentionNotifications(): Promise<void> {
  const native = await nativePlugin();
  if (!native) return;
  try {
    await native.cancel({
      notifications: [{ id: ID_DAILY }, { id: ID_STREAK }, { id: ID_WEEKLY }],
    });
  } catch (e) {
    console.warn("cancel notifications failed", e);
  }
}

/**
 * Reschedule retention notifications from current prefs + live context.
 */
export async function syncNotificationsForUser(ctx: SyncNotificationContext): Promise<{ ok: boolean; reason?: string }> {
  const native = await nativePlugin();
  if (!native) {
    return { ok: true, reason: "web-preference-only" };
  }

  await cancelAllRetentionNotifications();

  if (!ctx.prefs.notificationsEnabled) {
    return { ok: true, reason: "master-off" };
  }

  const perm = await native.checkPermissions();
  if (perm.display !== "granted") {
    return { ok: false, reason: "permission-denied" };
  }

  const streak = getStreakStatus({
    currentStreak: ctx.currentStreak,
    longestStreak: ctx.longestStreak,
    lastCompletionDate: ctx.lastCompletionDate,
  });

  const notifications: any[] = [];
  const planned = plannedRetentionNotificationIds(ctx);

  if (planned.includes(ID_DAILY)) {
    notifications.push({
      id: ID_DAILY,
      title: "Daily missions waiting",
      body: "Three focused quests — keep your streak and skills moving.",
      schedule: { at: nextLocalDateAt(18, 0), repeats: true, every: "day" },
      extra: { type: "daily" },
    });
  }

  if (planned.includes(ID_STREAK)) {
    notifications.push({
      id: ID_STREAK,
      title: "Streak at risk",
      body: `Complete one quest today to keep your ${streak.currentStreak}-day streak.`,
      schedule: { at: nextLocalDateAt(20, 30), repeats: true, every: "day" },
      extra: { type: "streak" },
    });
  }

  if (planned.includes(ID_WEEKLY)) {
    notifications.push({
      id: ID_WEEKLY,
      title: "Weekly challenges",
      body: `Week ${isoWeekIdLocal()} — finish and claim before it rolls over.`,
      schedule: { at: nextFridayEvening(), allowWhileIdle: true },
      extra: { type: "weekly", weekId: isoWeekIdLocal(), day: dayKeyLocal() },
    });
  }

  // Space: if daily and streak would both fire same evening, streak is later (20:30 vs 18:00).
  if (notifications.length) {
    try {
      await native.schedule({ notifications });
    } catch (e: any) {
      console.warn("schedule notifications failed", e);
      return { ok: false, reason: String(e?.message || e) };
    }
  }

  return { ok: true, reason: `scheduled:${notifications.length}` };
}
