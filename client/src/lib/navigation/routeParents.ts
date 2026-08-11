/** Parent route when there is no in-app history to pop. */
export function parentRouteFor(location: string): string | null {
  const path = (location.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  if (path === "/") return null;

  if (path.startsWith("/career-paths/")) return "/career-paths";
  if (path === "/invite") return "/friends";

  // Secondary / deep screens fall back to Home.
  return "/";
}

export function normalizeLocation(location: string): string {
  return location || "/";
}
