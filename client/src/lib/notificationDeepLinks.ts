/**
 * Safe deep-link routing for push + inbox — allowlisted destinations only.
 */

export type DeepLinkDestination =
  | { route: "/friends"; tab?: "requests" }
  | { route: "/social"; tab?: "challenges" | "parties"; id?: string }
  | { route: "/invite" }
  | { route: "/leaderboard" }
  | { route: "/"; hash?: "weekly-challenges" }
  | { route: "/achievements" }
  | { route: "/certifications"; id?: string }
  | { route: "/career-paths"; id?: string }
  | { route: "/goals" }
  | { route: "/settings" }
  | { route: "/quests" };

const ALLOWED_ROUTES = new Set([
  "/friends",
  "/social",
  "/invite",
  "/leaderboard",
  "/",
  "/achievements",
  "/certifications",
  "/career-paths",
  "/goals",
  "/settings",
  "/quests",
]);

export type NotificationType =
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
  | "career_milestone"
  | "streak_risk"
  | "daily_reminder"
  | "generic";

/** Map notification type (+ optional payload) to a safe in-app destination. */
export function destinationForNotificationType(
  type: string,
  payload: Record<string, string | undefined> = {},
): DeepLinkDestination {
  switch (type) {
    case "friend_request":
    case "friend_accepted":
      return { route: "/friends", tab: "requests" };
    case "shared_challenge_invite":
    case "shared_challenge_accepted":
    case "shared_challenge_complete":
      return { route: "/social", tab: "challenges", id: payload.challengeId };
    case "party_invite":
    case "party_joined":
    case "party_challenge_complete":
      return { route: "/social", tab: "parties", id: payload.partyId };
    case "referral_activated":
      return { route: "/invite" };
    case "achievement_milestone":
      return { route: "/achievements" };
    case "weekly_reward":
      return { route: "/", hash: "weekly-challenges" };
    case "goal_milestone":
      return { route: "/goals" };
    case "career_milestone":
      return payload.pathId
        ? { route: "/career-paths", id: payload.pathId }
        : { route: "/career-paths" };
    case "streak_risk":
    case "daily_reminder":
      return { route: "/quests" };
    default:
      return { route: "/" };
  }
}

/**
 * Parse server/client deep-link payload into a wouter path.
 * Rejects arbitrary URLs / unknown routes.
 */
export function resolveDeepLinkPath(
  raw: { route?: string; tab?: string; id?: string; hash?: string } | string | null | undefined,
): string {
  if (!raw) return "/";
  if (typeof raw === "string") {
    // Only allow relative hash routes like /friends or /social?tab=parties
    if (raw.startsWith("http:") || raw.startsWith("https:") || raw.includes("://")) return "/";
    const pathOnly = raw.split("?")[0]?.split("#")[0] ?? "/";
    if (!ALLOWED_ROUTES.has(pathOnly)) return "/";
    return raw.startsWith("/") ? raw : "/";
  }
  const route = raw.route && ALLOWED_ROUTES.has(raw.route) ? raw.route : "/";
  const params = new URLSearchParams();
  if (raw.tab && /^[a-z0-9_-]+$/i.test(raw.tab)) params.set("tab", raw.tab);
  if (raw.id && /^[a-zA-Z0-9_-]{1,64}$/.test(raw.id)) params.set("id", raw.id);
  const qs = params.toString();
  let out = qs ? `${route}?${qs}` : route;
  if (raw.hash && /^[a-z0-9_-]+$/i.test(raw.hash)) out += `#${raw.hash}`;
  return out;
}

export function destinationToPath(dest: DeepLinkDestination): string {
  return resolveDeepLinkPath(dest as any);
}
