/**
 * Launch feature flags — simple typed config (no remote config).
 * Flip to true after infrastructure is verified on a real device / deploy.
 */

export type LaunchFeatureFlags = {
  /** AI Coach page remains reachable; CF soft-fails if undeployed */
  aiCoachEnabled: boolean;
  /** Remote FCM push registration + PushOptInCard */
  remotePushEnabled: boolean;
  /** Email preference UI + weekly email marketing of feature */
  emailNotificationsEnabled: boolean;
  /** Friends, invite/referral screens in nav */
  friendsEnabled: boolean;
  /** Shared challenges + parties hub */
  socialChallengesEnabled: boolean;
  /** Party system (also requires socialChallengesEnabled for hub) */
  partiesEnabled: boolean;
  /** Friend/party leaderboards */
  leaderboardsEnabled: boolean;
  /** Notification inbox in nav (remote writes need CF deploy) */
  notificationInboxEnabled: boolean;
  /** Social card on Home */
  socialHomeCardEnabled: boolean;
  /** XP rewards shop (/shop) — orphaned; keep off for launch */
  rewardsShopEnabled: boolean;
};

/**
 * Conservative launch defaults: solo RPG core ON; social/push/email OFF
 * until APNs + Resend + social Cloud Functions are deployed and verified.
 */
export const LAUNCH_FLAGS: LaunchFeatureFlags = {
  aiCoachEnabled: true,
  remotePushEnabled: false,
  emailNotificationsEnabled: false,
  friendsEnabled: false,
  socialChallengesEnabled: false,
  partiesEnabled: false,
  leaderboardsEnabled: false,
  notificationInboxEnabled: false,
  socialHomeCardEnabled: false,
  rewardsShopEnabled: false,
};

export function isFeatureEnabled(flag: keyof LaunchFeatureFlags): boolean {
  return LAUNCH_FLAGS[flag] === true;
}

/** Any social surface that depends on CF-mediated friendships / parties / challenges */
export function isSocialSurfaceEnabled(): boolean {
  return (
    LAUNCH_FLAGS.friendsEnabled ||
    LAUNCH_FLAGS.socialChallengesEnabled ||
    LAUNCH_FLAGS.partiesEnabled ||
    LAUNCH_FLAGS.leaderboardsEnabled
  );
}

/**
 * Whether an in-app route is launch-enabled.
 * Used by deep links so stale push/inbox payloads cannot bypass flags.
 */
export function isLaunchRouteEnabled(pathname: string): boolean {
  const path = (pathname.split("?")[0]?.split("#")[0] || "/").replace(/\/$/, "") || "/";
  switch (path) {
    case "/friends":
    case "/invite":
      return LAUNCH_FLAGS.friendsEnabled;
    case "/social":
      return LAUNCH_FLAGS.socialChallengesEnabled || LAUNCH_FLAGS.partiesEnabled;
    case "/leaderboard":
      return LAUNCH_FLAGS.leaderboardsEnabled;
    case "/notifications":
      return LAUNCH_FLAGS.notificationInboxEnabled;
    case "/shop":
      return LAUNCH_FLAGS.rewardsShopEnabled;
    case "/coach":
      return LAUNCH_FLAGS.aiCoachEnabled;
    default:
      return true;
  }
}
