/**
 * Centralized notification service for Cloud Functions.
 * Mock-friendly: messaging/email injectors for tests.
 */

import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

export type QuietHours = {
  enabled: boolean;
  startHour: number;
  endHour: number;
};

export type ServerNotifyPrefs = {
  pushEnabled: boolean;
  notificationsEnabled: boolean;
  notifyDailyQuests: boolean;
  notifyStreakRisk: boolean;
  notifyWeeklyChallenges: boolean;
  notifySocialMaster: boolean;
  notifyFriendRequests: boolean;
  notifyChallengeInvites: boolean;
  notifyChallengeUpdates: boolean;
  notifyPartyInvites: boolean;
  notifyPartyUpdates: boolean;
  notifyReferralMilestones: boolean;
  notifyAchievements: boolean;
  notifyGoalsProgress: boolean;
  emailEnabled: boolean;
  emailWeeklyProgress: boolean;
  emailGoalReminders: boolean;
  emailSocialDigest: boolean;
  quietHours: QuietHours;
  timezone?: string | null;
};

export const DEFAULT_SERVER_PREFS: ServerNotifyPrefs = {
  pushEnabled: false,
  notificationsEnabled: false,
  notifyDailyQuests: true,
  notifyStreakRisk: true,
  notifyWeeklyChallenges: true,
  notifySocialMaster: true,
  notifyFriendRequests: true,
  notifyChallengeInvites: true,
  notifyChallengeUpdates: true,
  notifyPartyInvites: true,
  notifyPartyUpdates: true,
  notifyReferralMilestones: true,
  notifyAchievements: true,
  notifyGoalsProgress: true,
  emailEnabled: false,
  emailWeeklyProgress: false,
  emailGoalReminders: false,
  emailSocialDigest: false,
  quietHours: { enabled: true, startHour: 22, endHour: 8 },
  timezone: null,
};

export const MAX_PUSH_PER_DAY = 8;

export function mergeServerPrefs(raw: any): ServerNotifyPrefs {
  const quiet = {
    ...DEFAULT_SERVER_PREFS.quietHours,
    ...(raw?.quietHours && typeof raw.quietHours === "object" ? raw.quietHours : {}),
  };
  return {
    ...DEFAULT_SERVER_PREFS,
    ...raw,
    quietHours: quiet,
    pushEnabled: raw?.pushEnabled === true || (raw?.pushEnabled !== false && raw?.notificationsEnabled === true),
  };
}

export function isInQuietHours(localHour: number, quiet: QuietHours): boolean {
  if (!quiet.enabled) return false;
  const start = ((quiet.startHour % 24) + 24) % 24;
  const end = ((quiet.endHour % 24) + 24) % 24;
  const h = ((localHour % 24) + 24) % 24;
  if (start === end) return true;
  if (start < end) return h >= start && h < end;
  return h >= start || h < end;
}

export function localHourInTimezone(now: Date, timezone: string | null | undefined): number {
  try {
    if (!timezone) return now.getUTCHours();
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const hour = parts.find((p) => p.type === "hour")?.value;
    return Number(hour) % 24;
  } catch {
    return now.getUTCHours();
  }
}

export type NotifyCategory =
  | "friend_request"
  | "friend_accepted"
  | "shared_challenge_invite"
  | "shared_challenge_accepted"
  | "shared_challenge_complete"
  | "party_invite"
  | "party_joined"
  | "party_challenge_complete"
  | "referral_activated"
  | "achievement_milestone"
  | "weekly_reward"
  | "goal_milestone"
  | "career_milestone";

export function respectPreferences(prefs: ServerNotifyPrefs, category: NotifyCategory): boolean {
  if (!prefs.pushEnabled && !prefs.notificationsEnabled) return false;
  switch (category) {
    case "friend_request":
    case "friend_accepted":
      return prefs.notifySocialMaster && prefs.notifyFriendRequests;
    case "shared_challenge_invite":
      return prefs.notifySocialMaster && prefs.notifyChallengeInvites;
    case "shared_challenge_accepted":
    case "shared_challenge_complete":
      return prefs.notifySocialMaster && prefs.notifyChallengeUpdates;
    case "party_invite":
      return prefs.notifySocialMaster && prefs.notifyPartyInvites;
    case "party_joined":
    case "party_challenge_complete":
      return prefs.notifySocialMaster && prefs.notifyPartyUpdates;
    case "referral_activated":
      return prefs.notifySocialMaster && prefs.notifyReferralMilestones;
    case "achievement_milestone":
      return prefs.notifyAchievements;
    case "weekly_reward":
      return prefs.notifyWeeklyChallenges;
    case "goal_milestone":
    case "career_milestone":
      return prefs.notifyGoalsProgress;
    default:
      return false;
  }
}

export function canSendPushToday(sentToday: number, max = MAX_PUSH_PER_DAY): boolean {
  return sentToday < max;
}

export function shouldRemoveInvalidToken(code: string | undefined): boolean {
  if (!code) return false;
  const c = code.toLowerCase();
  return (
    c.includes("registration-token-not-registered") ||
    c.includes("invalid-registration-token") ||
    c.includes("not-registered")
  );
}

export type InboxPayload = {
  type: NotifyCategory | string;
  title: string;
  body: string;
  href?: string;
  payload?: Record<string, string>;
};

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export type NotificationDeps = {
  db?: Firestore;
  messaging?: Messaging | null;
  now?: () => Date;
  /** Injected for tests — return mock send results */
  sendEachForMulticast?: (args: {
    tokens: string[];
    notification: { title: string; body: string };
    data?: Record<string, string>;
  }) => Promise<{
    responses: Array<{ success: boolean; error?: { code?: string } }>;
  }>;
};

function getDb(deps?: NotificationDeps) {
  return deps?.db ?? getFirestore();
}

export async function loadUserPrefs(uid: string, deps?: NotificationDeps): Promise<ServerNotifyPrefs> {
  const snap = await getDb(deps).doc(`users/${uid}`).get();
  return mergeServerPrefs(snap.exists ? snap.data() : {});
}

export async function createNotificationRecord(
  uid: string,
  item: InboxPayload,
  deps?: NotificationDeps,
): Promise<string> {
  const ref = getDb(deps).collection(`characters/${uid}/notifications`).doc();
  await ref.set({
    type: item.type,
    title: item.title,
    body: item.body,
    href: item.href ?? "/",
    payload: item.payload ?? {},
    read: false,
    createdAtMs: Date.now(),
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

async function bumpPushCount(uid: string, deps?: NotificationDeps): Promise<number> {
  const dayKey = (deps?.now ?? (() => new Date()))().toISOString().slice(0, 10);
  const ref = getDb(deps).doc(`characters/${uid}/notificationMeta/pushRate`);
  const snap = await ref.get();
  const data = snap.exists ? (snap.data() as any) : {};
  const count = data.dayKey === dayKey ? Number(data.count) || 0 : 0;
  await ref.set({ dayKey, count: count + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return count + 1;
}

async function readPushCount(uid: string, deps?: NotificationDeps): Promise<number> {
  const dayKey = (deps?.now ?? (() => new Date()))().toISOString().slice(0, 10);
  const snap = await getDb(deps).doc(`characters/${uid}/notificationMeta/pushRate`).get();
  if (!snap.exists) return 0;
  const data = snap.data() as any;
  return data.dayKey === dayKey ? Number(data.count) || 0 : 0;
}

export async function removeInvalidTokens(
  uid: string,
  tokenDeviceIds: string[],
  deps?: NotificationDeps,
): Promise<void> {
  const db = getDb(deps);
  await Promise.all(
    tokenDeviceIds.map((id) =>
      db.doc(`characters/${uid}/devices/${id}`).set(
        { enabled: false, invalid: true, updatedAt: new Date().toISOString() },
        { merge: true },
      ),
    ),
  );
}

export async function sendPushToUser(
  uid: string,
  push: PushPayload,
  opts: { category: NotifyCategory; skipQuietHours?: boolean; inbox?: boolean } ,
  deps?: NotificationDeps,
): Promise<{ sent: number; skipped?: string; inboxId?: string }> {
  const prefs = await loadUserPrefs(uid, deps);
  if (!respectPreferences(prefs, opts.category)) {
    return { sent: 0, skipped: "prefs" };
  }

  const now = (deps?.now ?? (() => new Date()))();
  const hour = localHourInTimezone(now, prefs.timezone);
  if (!opts.skipQuietHours && isInQuietHours(hour, prefs.quietHours)) {
    // Still write inbox so user sees it later
    let inboxId: string | undefined;
    if (opts.inbox !== false) {
      inboxId = await createNotificationRecord(
        uid,
        {
          type: opts.category,
          title: push.title,
          body: push.body,
          href: push.data?.href,
          payload: push.data,
        },
        deps,
      );
    }
    return { sent: 0, skipped: "quiet_hours", inboxId };
  }

  const sentToday = await readPushCount(uid, deps);
  if (!canSendPushToday(sentToday)) {
    let inboxId: string | undefined;
    if (opts.inbox !== false) {
      inboxId = await createNotificationRecord(
        uid,
        {
          type: opts.category,
          title: push.title,
          body: push.body,
          href: push.data?.href,
          payload: push.data,
        },
        deps,
      );
    }
    return { sent: 0, skipped: "rate_limit", inboxId };
  }

  let inboxId: string | undefined;
  if (opts.inbox !== false) {
    inboxId = await createNotificationRecord(
      uid,
      {
        type: opts.category,
        title: push.title,
        body: push.body,
        href: push.data?.href,
        payload: push.data,
      },
      deps,
    );
  }

  const devicesSnap = await getDb(deps)
    .collection(`characters/${uid}/devices`)
    .where("enabled", "==", true)
    .get();
  const devices = devicesSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((d) => d.pushToken && !d.invalid);
  if (!devices.length) {
    return { sent: 0, skipped: "no_tokens", inboxId };
  }

  const tokens = devices.map((d) => String(d.pushToken));
  let responses: Array<{ success: boolean; error?: { code?: string } }>;

  if (deps?.sendEachForMulticast) {
    const result = await deps.sendEachForMulticast({
      tokens,
      notification: { title: push.title, body: push.body },
      data: push.data,
    });
    responses = result.responses;
  } else {
    try {
      const messaging = deps?.messaging ?? getMessaging();
      const result = await messaging.sendEachForMulticast({
        tokens,
        notification: { title: push.title, body: push.body },
        data: push.data ?? {},
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      });
      responses = result.responses.map((r) => ({
        success: r.success,
        error: r.error ? { code: r.error.code } : undefined,
      }));
    } catch (e) {
      console.warn("FCM send failed", e);
      return { sent: 0, skipped: "fcm_error", inboxId };
    }
  }

  const invalidIds: string[] = [];
  let sent = 0;
  responses.forEach((r, i) => {
    if (r.success) sent += 1;
    else if (shouldRemoveInvalidToken(r.error?.code)) {
      invalidIds.push(devices[i]!.id);
    }
  });
  if (invalidIds.length) await removeInvalidTokens(uid, invalidIds, deps);
  if (sent > 0) await bumpPushCount(uid, deps);

  return { sent, inboxId };
}

export async function sendPushToUsers(
  uids: string[],
  push: PushPayload,
  opts: { category: NotifyCategory; skipQuietHours?: boolean },
  deps?: NotificationDeps,
): Promise<{ totalSent: number }> {
  let totalSent = 0;
  const unique = Array.from(new Set(uids.filter(Boolean)));
  for (const uid of unique) {
    const r = await sendPushToUser(uid, push, opts, deps);
    totalSent += r.sent;
  }
  return { totalSent };
}
