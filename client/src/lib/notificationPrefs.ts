/**
 * Phase 4.5 — expanded notification preferences, quiet hours, rate limits.
 * Safe defaults: push master OFF until opt-in; email master OFF.
 */

export type QuietHours = {
  enabled: boolean;
  /** Local hour 0–23 inclusive start (default 22 = 10pm) */
  startHour: number;
  /** Local hour 0–23 exclusive end (default 8 = 8am) */
  endHour: number;
};

export type NotificationPrefsV2 = {
  /** Master push — OFF until user opts in / grants permission */
  pushEnabled: boolean;
  /** Legacy alias used by local retention — kept in sync when possible */
  notificationsEnabled: boolean;

  // Progress (local retention + remote weekly)
  notifyDailyQuests: boolean;
  notifyStreakRisk: boolean;
  notifyWeeklyChallenges: boolean;

  // Social (remote)
  notifySocialMaster: boolean;
  notifyFriendRequests: boolean;
  notifyChallengeInvites: boolean;
  notifyChallengeUpdates: boolean;
  notifyPartyInvites: boolean;
  notifyPartyUpdates: boolean;
  notifyReferralMilestones: boolean;

  // Growth (remote)
  notifyAchievements: boolean;
  notifyGoalsProgress: boolean;

  // Email (all OFF by default)
  emailEnabled: boolean;
  emailWeeklyProgress: boolean;
  emailGoalReminders: boolean;
  emailSocialDigest: boolean;

  quietHours: QuietHours;

  /** IANA timezone e.g. America/Chicago — optional */
  timezone?: string | null;

  /** Last time user dismissed push opt-in prompt (ms) */
  pushPromptDismissedAtMs?: number | null;
  /** OS permission last known: granted | denied | prompt */
  pushPermission?: string | null;
};

export const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: true,
  startHour: 22,
  endHour: 8,
};

export const DEFAULT_NOTIFICATION_PREFS_V2: NotificationPrefsV2 = {
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
  quietHours: { ...DEFAULT_QUIET_HOURS },
  timezone: null,
  pushPromptDismissedAtMs: null,
  pushPermission: null,
};

/** Max remote pushes per user per local calendar day (anti-spam). */
export const MAX_PUSH_PER_DAY = 8;

export function mergeNotificationPrefsV2(
  raw: Partial<NotificationPrefsV2> & Record<string, unknown> | null | undefined,
): NotificationPrefsV2 {
  const base = { ...DEFAULT_NOTIFICATION_PREFS_V2 };
  if (!raw) return base;
  const quiet = {
    ...DEFAULT_QUIET_HOURS,
    ...(typeof raw.quietHours === "object" && raw.quietHours ? (raw.quietHours as QuietHours) : {}),
  };
  return {
    ...base,
    ...raw,
    quietHours: quiet,
    // Preserve legacy master if pushEnabled unset
    pushEnabled:
      raw.pushEnabled === true
        ? true
        : raw.pushEnabled === false
          ? false
          : raw.notificationsEnabled === true,
    notificationsEnabled:
      raw.notificationsEnabled === true || raw.pushEnabled === true
        ? true
        : raw.notificationsEnabled === false
          ? false
          : base.notificationsEnabled,
  } as NotificationPrefsV2;
}

/**
 * Quiet hours: if start > end, window wraps midnight (e.g. 22→8).
 * Returns true when routine notifications should be suppressed.
 */
export function isInQuietHours(
  localHour: number,
  quiet: QuietHours = DEFAULT_QUIET_HOURS,
): boolean {
  if (!quiet.enabled) return false;
  const start = ((quiet.startHour % 24) + 24) % 24;
  const end = ((quiet.endHour % 24) + 24) % 24;
  const h = ((localHour % 24) + 24) % 24;
  if (start === end) return true; // full-day quiet if misconfigured equal
  if (start < end) return h >= start && h < end;
  // wraps midnight
  return h >= start || h < end;
}

export type NotifyCategory =
  | "daily"
  | "streak"
  | "weekly"
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
  | "goal_milestone"
  | "career_milestone";

export function categoryEnabled(prefs: NotificationPrefsV2, category: NotifyCategory): boolean {
  if (!prefs.pushEnabled && !prefs.notificationsEnabled) {
    // Local retention can still use notificationsEnabled alone
    if (category === "daily" || category === "streak" || category === "weekly") {
      return !!prefs.notificationsEnabled;
    }
    return false;
  }
  switch (category) {
    case "daily":
      return prefs.notifyDailyQuests;
    case "streak":
      return prefs.notifyStreakRisk;
    case "weekly":
      return prefs.notifyWeeklyChallenges;
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
    case "goal_milestone":
    case "career_milestone":
      return prefs.notifyGoalsProgress;
    default:
      return false;
  }
}

export function emailCategoryEnabled(
  prefs: NotificationPrefsV2,
  kind: "weekly" | "goal" | "social",
): boolean {
  if (!prefs.emailEnabled) return false;
  if (kind === "weekly") return prefs.emailWeeklyProgress;
  if (kind === "goal") return prefs.emailGoalReminders;
  return prefs.emailSocialDigest;
}

/** Simple rate-limit: allow send if count today < max. */
export function canSendPushToday(sentToday: number, max = MAX_PUSH_PER_DAY): boolean {
  return sentToday < max;
}

/** Aggregate multiple social events into one digest title/body. */
export function aggregateSocialPush(
  events: Array<{ title: string }>,
): { title: string; body: string } | null {
  if (!events.length) return null;
  if (events.length === 1) {
    return { title: events[0]!.title, body: "Open Level Up Life to catch up." };
  }
  return {
    title: `${events.length} new updates`,
    body: events
      .slice(0, 3)
      .map((e) => e.title)
      .join(" · "),
  };
}
