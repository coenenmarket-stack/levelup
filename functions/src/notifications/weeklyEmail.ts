/**
 * Scheduled weekly progress email — Resend + preference gated.
 * Deploy later: firebase deploy --only functions:weeklyProgressEmailJob
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  isEmailEligible,
  isWeeklyEmailSendWindow,
  renderWeeklyProgressEmail,
  sendTransactionalEmail,
} from "./email";
import { mergeServerPrefs } from "./service";

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const OPEN_URL = "https://level-up-life-73702.web.app/";

/**
 * Runs hourly; sends only when user's local time is Sunday 18:00.
 * Processes in batches to stay within time limits.
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

    // Scan users who opted into weekly email (field emailWeeklyProgress == true)
    const snap = await db
      .collection("users")
      .where("emailWeeklyProgress", "==", true)
      .limit(200)
      .get();

    for (const docSnap of snap.docs) {
      const uid = docSnap.id;
      const prefs = mergeServerPrefs(docSnap.data());
      if (!isWeeklyEmailSendWindow({ now, timezone: prefs.timezone })) continue;

      // Idempotency: one send per ISO week
      const weekId = isoWeekIdUTC(now);
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

      // Broad weekly stats — no private coach/goal text
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
    }
  },
);

function isoWeekIdUTC(d: Date): string {
  // Simple YYYY-Www using ISO week
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
