/**
 * Scheduled weekly progress email — Resend + preference gated.
 * Deploy later: firebase deploy --only functions:weeklyProgressEmailJob
 *
 * Batching: processes up to BATCH_SIZE users per hourly run, advancing a
 * cursor so users beyond the first page are eventually covered within the
 * Sunday send window (18:00–18:59 local). Idempotent via lastWeekId.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import {
  isEmailEligible,
  isWeeklyEmailSendWindow,
  renderWeeklyProgressEmail,
  sendTransactionalEmail,
} from "./email";
import { mergeServerPrefs } from "./service";

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const OPEN_URL = "https://level-up-life-73702.web.app/";
export const WEEKLY_EMAIL_BATCH_SIZE = 200;

/** Pure pagination helper — testable without Firestore. */
export function nextBatchCursor(
  docs: Array<{ id: string }>,
  batchSize: number,
): { processedIds: string[]; nextCursorId: string | null; exhausted: boolean } {
  const slice = docs.slice(0, batchSize);
  const exhausted = docs.length < batchSize;
  const nextCursorId = slice.length ? slice[slice.length - 1]!.id : null;
  return {
    processedIds: slice.map((d) => d.id),
    nextCursorId: exhausted ? null : nextCursorId,
    exhausted,
  };
}

/**
 * Runs hourly; sends only when user's local time is Sunday 18:00–18:59.
 * Uses a rotating cursor so >200 opted-in users are covered across hours.
 */
export const weeklyProgressEmailJob = onSchedule(
  {
    schedule: "every 60 minutes",
    region: "us-central1",
    secrets: [RESEND_API_KEY],
    timeoutSeconds: 300,
  },
  async () => {
    const db = getFirestore();
    const now = new Date();
    const apiKey = RESEND_API_KEY.value();
    const weekId = isoWeekIdUTC(now);

    const cursorRef = db.doc("system/weeklyEmailCursor");
    const cursorSnap = await cursorRef.get();
    const cursorData = cursorSnap.exists ? (cursorSnap.data() as any) : {};
    const startAfterId =
      cursorData.weekId === weekId && typeof cursorData.lastUid === "string"
        ? (cursorData.lastUid as string)
        : null;

    let query = db
      .collection("users")
      .where("emailWeeklyProgress", "==", true)
      .orderBy("__name__")
      .limit(WEEKLY_EMAIL_BATCH_SIZE);

    if (startAfterId) {
      const startDoc = await db.doc(`users/${startAfterId}`).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }

    const snap = await query.get();
    const page = nextBatchCursor(
      snap.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id })),
      WEEKLY_EMAIL_BATCH_SIZE,
    );

    for (const docSnap of snap.docs) {
      const uid = docSnap.id;
      const prefs = mergeServerPrefs(docSnap.data());
      // Wider window: entire 18:00 hour so retries within the hour can succeed
      if (
        !isWeeklyEmailSendWindow({
          now,
          timezone: prefs.timezone,
          targetWeekday: 0,
          hourLocal: 18,
        })
      ) {
        continue;
      }

      const metaRef = db.doc(`characters/${uid}/notificationMeta/weeklyEmail`);
      const meta = await metaRef.get();
      if (meta.exists && (meta.data() as any).lastWeekId === weekId) continue;

      let email = "";
      let emailVerified = false;
      try {
        const user = await getAuth().getUser(uid);
        email = user.email ?? "";
        emailVerified = !!user.emailVerified;
      } catch {
        continue;
      }

      const eligible = isEmailEligible({
        email,
        emailVerified,
        emailEnabled: prefs.emailEnabled,
        categoryEnabled: prefs.emailWeeklyProgress,
      });
      if (!eligible.ok) continue;

      const character = await db.doc(`characters/${uid}`).get();
      const c = character.exists ? (character.data() as any) : {};
      const name = c.name || "Adventurer";

      const weekBounds = isoWeekBoundsApprox(now);
      const comps = await db
        .collection(`characters/${uid}/completions`)
        .where("completionDate", ">=", weekBounds.start)
        .where("completionDate", "<=", weekBounds.end)
        .limit(200)
        .get();
      let xpGained = 0;
      let quests = 0;
      for (const d of comps.docs) {
        const data = d.data() as any;
        if (data.kind === "weeklyChallenge") continue;
        quests += 1;
        xpGained += Number(data.xpReward) || 0;
      }

      const rendered = renderWeeklyProgressEmail({
        name,
        level: Number(c.level) || 1,
        xpGained,
        questsCompleted: quests,
        streak: Number(c.currentStreak) || 0,
        weeklyCompleted: 0,
        weeklyTotal: 3,
        achievementName: null,
        nextAction: "Continue your daily missions and career path.",
        openUrl: OPEN_URL,
        unsubscribeHint:
          "Manage email preferences in Level Up Life → Settings. Transactional account emails are separate.",
      });

      const result = await sendTransactionalEmail({
        apiKey,
        to: email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });

      if (result.ok) {
        await metaRef.set({
          lastWeekId: weekId,
          lastSentAt: new Date().toISOString(),
          providerId: result.id ?? null,
        });
      }
      // On provider failure: do not set lastWeekId — retry later in the same hour window
    }

    // Advance or reset cursor for next hourly run
    if (page.exhausted) {
      await cursorRef.set({ weekId, lastUid: null, resetAt: new Date().toISOString() }, { merge: true });
    } else if (page.nextCursorId) {
      await cursorRef.set(
        { weekId, lastUid: page.nextCursorId, updatedAt: new Date().toISOString() },
        { merge: true },
      );
    }
  },
);

function isoWeekIdUTC(d: Date): string {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function isoWeekBoundsApprox(d: Date): { start: string; end: string } {
  const day = d.getUTCDay() || 7;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 1));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return { start: fmt(monday), end: fmt(sunday) };
}
