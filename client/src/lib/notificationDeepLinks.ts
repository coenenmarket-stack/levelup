/**
 * Safe deep-link routing for push + inbox — allowlisted destinations only.
 * Hidden launch surfaces resolve to Home so flags cannot be bypassed.
 *
 * IMPORTANT: never append `#fragment` into the wouter path — hash routing would
 * turn `/#weekly-challenges` into `#/#weekly-challenges` (NotFound).
 * Use `?focus=` instead and scroll after navigation.
 */

import { isLaunchRouteEnabled } from "./featureFlags";

export type DeepLinkDestination =
  | { route: "/friends"; tab?: "requests" }
  | { route: "/social"; tab?: "challenges" | "parties"; id?: string }
  | { route: "/invite" }
  | { route: "/leaderboard" }
  | { route: "/"; focus?: "weekly-challenges" }
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

function gatedRoute<T extends DeepLinkDestination>(dest: T): DeepLinkDestination {
  if (!isLaunchRouteEnabled(dest.route)) return { route: "/" };
  return dest;
}

/** Map notification type (+ optional payload) to a safe in-app destination. */
export function destinationForNotificationType(
  type: string,
  payload: Record<string, string | undefined> = {},
): DeepLinkDestination {
  switch (type) {
    case "friend_request":
    case "friend_accepted":
      return gatedRoute({ route: "/friends", tab: "requests" });
    case "shared_challenge_invite":
    case "shared_challenge_accepted":
    case "shared_challenge_complete":
      return gatedRoute({ route: "/social", tab: "challenges", id: payload.challengeId });
    case "party_invite":
    case "party_joined":
    case "party_challenge_complete":
      return gatedRoute({ route: "/social", tab: "parties", id: payload.partyId });
    case "referral_activated":
      return gatedRoute({ route: "/invite" });
    case "achievement_milestone":
      return { route: "/achievements" };
    case "weekly_reward":
      return { route: "/", focus: "weekly-challenges" };
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

function sanitizeFocus(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (!/^[a-z0-9_-]+$/i.test(value)) return undefined;
  return value;
}

/**
 * Parse server/client deep-link payload into a wouter path (no `#` fragments).
 * Rejects arbitrary URLs / unknown routes / launch-gated routes.
 */
export function resolveDeepLinkPath(
  raw:
    | { route?: string; tab?: string; id?: string; hash?: string; focus?: string }
    | string
    | null
    | undefined,
): string {
  if (!raw) return "/";
  if (typeof raw === "string") {
    if (raw.startsWith("http:") || raw.startsWith("https:") || raw.includes("://")) return "/";
    // Legacy `/#weekly-challenges` → `/?focus=weekly-challenges`
    const hashIdx = raw.indexOf("#");
    const beforeHash = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;
    const legacyHash = hashIdx >= 0 ? raw.slice(hashIdx + 1) : "";
    const [pathPart, queryPart] = beforeHash.split("?");
    const pathOnly = (pathPart || "/").replace(/\/+$/, "") || "/";
    if (!ALLOWED_ROUTES.has(pathOnly)) return "/";
    if (!isLaunchRouteEnabled(pathOnly)) return "/";

    const params = new URLSearchParams(queryPart ?? "");
    const focus = sanitizeFocus(legacyHash) ?? sanitizeFocus(params.get("focus") ?? undefined);
    if (focus) params.set("focus", focus);
    else params.delete("focus");
    // Drop accidental hash remnants from params
    params.delete("hash");
    const qs = params.toString();
    return qs ? `${pathOnly}?${qs}` : pathOnly;
  }

  const routeCandidate = raw.route && ALLOWED_ROUTES.has(raw.route) ? raw.route : "/";
  const route = isLaunchRouteEnabled(routeCandidate) ? routeCandidate : "/";
  if (route === "/" && routeCandidate !== "/") return "/";

  const params = new URLSearchParams();
  if (raw.tab && /^[a-z0-9_-]+$/i.test(raw.tab)) params.set("tab", raw.tab);
  if (raw.id && /^[a-zA-Z0-9_-]{1,64}$/.test(raw.id)) params.set("id", raw.id);
  const focus = sanitizeFocus(raw.focus) ?? sanitizeFocus(raw.hash);
  if (focus) params.set("focus", focus);
  const qs = params.toString();
  return qs ? `${route}?${qs}` : route;
}

export function destinationToPath(dest: DeepLinkDestination): string {
  return resolveDeepLinkPath(dest as any);
}

/** Scroll to a `?focus=` target after navigation (idempotent). */
export function scrollToDeepLinkFocus(location: string): void {
  try {
    const q = location.includes("?") ? location.split("?")[1] ?? "" : "";
    const focus = new URLSearchParams(q).get("focus");
    if (!focus) return;
    const el = document.getElementById(focus);
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  } catch {
    /* ignore */
  }
}
