/**
 * Central calendar day helpers for Level Up Life Phase 2.
 *
 * AUTHORITATIVE day key: local calendar YYYY-MM-DD (`dayKeyLocal`).
 * Used for new daily packs, completions, streaks, weekly metrics, notifications.
 *
 * BACKWARD COMPATIBILITY
 * ----------------------
 * Historical docs may use UTC day keys (`dayKeyUtc`) in:
 *   - completions/{questId}_{utcDay} and completionDate
 *   - characters.lastCompletionDate
 *   - dailyPacks/{utcDay}
 *
 * New writes always use the local day key.
 * Reads that must not double-award or miss "today" use `candidateDayKeys()`
 * which returns unique [localToday, utcToday] so both eras are checked.
 *
 * Deterministic completion IDs:
 *   preferred:  `${questId}_${localDay}`
 *   legacy:     `${questId}_${utcDay}` (still honored for duplicate detection)
 *
 * Daily packs:
 *   preferred cache: dailyPacks/{localDay}
 *   legacy fallback: dailyPacks/{utcDay} when local cache is empty and keys differ
 *
 * No destructive migration is performed.
 */

/** Local calendar day key YYYY-MM-DD. */
export function dayKeyLocal(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** UTC calendar day key YYYY-MM-DD (legacy). */
export function dayKeyUtc(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Alias — new code should prefer dayKeyLocal via this name. */
export function todayKey(d: Date = new Date()): string {
  return dayKeyLocal(d);
}

/**
 * Day keys that may represent "today" for duplicate / cache lookups.
 * Always includes local; includes UTC when it differs (compat window).
 */
export function candidateDayKeys(d: Date = new Date()): string[] {
  const local = dayKeyLocal(d);
  const utc = dayKeyUtc(d);
  return local === utc ? [local] : [local, utc];
}

/** Inclusive day difference between two YYYY-MM-DD keys (calendar, not DST-sensitive). */
export function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const aUtc = Date.UTC(ay, am - 1, ad);
  const bUtc = Date.UTC(by, bm - 1, bd);
  return Math.round((bUtc - aUtc) / 86_400_000);
}

/**
 * Day key for an instant in a named IANA timezone (test / tooling helper).
 * Runtime app logic uses `dayKeyLocal` (device local calendar).
 */
export function dayKeyInTimeZone(d: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA yields YYYY-MM-DD
  return fmt.format(d);
}

/**
 * Whether an existing completionDate (or deterministic doc suffix day) blocks a
 * new award for "today", given local+UTC candidate keys.
 */
export function blocksDuplicateForToday(
  existingDayKeys: Iterable<string>,
  now: Date = new Date(),
): boolean {
  const candidates = new Set(candidateDayKeys(now));
  for (const day of Array.from(existingDayKeys)) {
    if (candidates.has(day)) return true;
  }
  return false;
}

/**
 * Local ISO week id YYYY-Www (week containing local date; Monday-start).
 * Week year follows ISO (week with Thursday).
 */
export function isoWeekIdLocal(d: Date = new Date()): string {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // Convert local calendar date to a UTC noon stand-in so ISO math is stable.
  const utcNoon = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate(), 12));
  const day = utcNoon.getUTCDay() || 7;
  utcNoon.setUTCDate(utcNoon.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcNoon.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utcNoon.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utcNoon.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function isoWeekBoundsLocal(weekId: string): { start: string; end: string } {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekId);
  if (!m) {
    const today = dayKeyLocal();
    return { start: today, end: today };
  }
  const year = Number(m[1]);
  const week = Number(m[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4, 12));
  const day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  // Format as YYYY-MM-DD from the UTC calendar of these Monday/Sunday markers
  // (ISO weeks are defined in UTC calendar terms; local week id chooses which week).
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return { start: fmt(monday), end: fmt(sunday) };
}

/**
 * Whether a stored completionDate should count as "today" for UI / streak protect.
 * True if it matches local today OR (compat) UTC today when keys differ.
 */
export function isCompletionToday(completionDate: string | null | undefined, now: Date = new Date()): boolean {
  if (!completionDate) return false;
  return candidateDayKeys(now).includes(completionDate);
}
