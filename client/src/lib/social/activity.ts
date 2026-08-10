/**
 * Bounded social activity — predefined event types only (no free-text posts).
 */

export const SOCIAL_ACTIVITY_TYPES = [
  "level_milestone",
  "streak_milestone",
  "achievement_unlocked",
  "shared_challenge_completed",
  "party_joined",
  "party_challenge_completed",
  "referral_milestone",
  "friend_accepted",
] as const;

export type SocialActivityType = (typeof SOCIAL_ACTIVITY_TYPES)[number];

export type SocialActivityEvent = {
  id: string;
  actorUid: string;
  type: SocialActivityType;
  /** Machine keys for rendering — never arbitrary user text */
  payload: Record<string, string | number | boolean | null>;
  createdAtMs: number;
  visibleTo: string[];
};

export const ACTIVITY_FEED_LIMIT = 40;

export function isSocialActivityType(t: string): t is SocialActivityType {
  return (SOCIAL_ACTIVITY_TYPES as readonly string[]).includes(t);
}

/** Render safe copy from type + payload (no user-authored message). */
export function renderSocialActivity(
  type: SocialActivityType,
  payload: Record<string, string | number | boolean | null>,
  actorName = "A friend",
): string {
  switch (type) {
    case "level_milestone":
      return `${actorName} reached level ${payload.level ?? "?"}.`;
    case "streak_milestone":
      return `${actorName} hit a ${payload.days ?? "?"}-day streak.`;
    case "achievement_unlocked":
      return `${actorName} unlocked ${payload.achievementName ?? "an achievement"}.`;
    case "shared_challenge_completed":
      return `${actorName} completed shared challenge ${payload.title ?? ""}.`.trim();
    case "party_joined":
      return `${actorName} joined party ${payload.partyName ?? ""}.`.trim();
    case "party_challenge_completed":
      return `Party challenge complete: ${payload.title ?? "challenge"}.`;
    case "referral_milestone":
      return `${actorName} reached ${payload.count ?? "?"} successful referrals.`;
    case "friend_accepted":
      return `${actorName} is now friends with someone in your circle.`;
    default:
      return `${actorName} made progress.`;
  }
}

export function filterActivityFeed<T extends { createdAtMs?: number }>(
  items: T[],
  limit = ACTIVITY_FEED_LIMIT,
): T[] {
  return [...items]
    .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0))
    .slice(0, limit);
}
