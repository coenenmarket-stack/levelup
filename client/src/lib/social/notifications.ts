/**
 * Social notification preference categories (local scheduling architecture).
 * Delivery for social events is remote push via Cloud Functions — not Capacitor local schedules.
 */

export type SocialNotificationPrefs = {
  notifySocialMaster: boolean;
  notifyFriendRequests: boolean;
  notifyChallengeInvites: boolean;
  notifyChallengeUpdates: boolean;
  notifyPartyInvites: boolean;
  notifyPartyUpdates: boolean;
  notifyReferralMilestones: boolean;
};

export const DEFAULT_SOCIAL_NOTIFICATION_PREFS: SocialNotificationPrefs = {
  notifySocialMaster: true,
  notifyFriendRequests: true,
  notifyChallengeInvites: true,
  notifyChallengeUpdates: true,
  notifyPartyInvites: true,
  notifyPartyUpdates: true,
  notifyReferralMilestones: true,
};

export function mergeSocialNotificationPrefs(
  raw: Partial<SocialNotificationPrefs> | null | undefined,
): SocialNotificationPrefs {
  return { ...DEFAULT_SOCIAL_NOTIFICATION_PREFS, ...(raw ?? {}) };
}

export function shouldNotifySocial(
  prefs: SocialNotificationPrefs,
  category: keyof Omit<SocialNotificationPrefs, "notifySocialMaster">,
): boolean {
  if (!prefs.notifySocialMaster) return false;
  return !!prefs[category];
}

/** Event → preference category mapping (for future local schedule hooks). */
export const SOCIAL_NOTIFY_EVENT_CATEGORY: Record<string, keyof SocialNotificationPrefs> = {
  friend_request: "notifyFriendRequests",
  friend_accepted: "notifyFriendRequests",
  shared_challenge_invite: "notifyChallengeInvites",
  shared_challenge_accepted: "notifyChallengeUpdates",
  shared_challenge_complete: "notifyChallengeUpdates",
  party_invite: "notifyPartyInvites",
  party_joined: "notifyPartyUpdates",
  party_challenge_complete: "notifyPartyUpdates",
  referral_activated: "notifyReferralMilestones",
};
