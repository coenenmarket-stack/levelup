"use strict";
/**
 * Transactional email templates + Resend delivery (secret-based).
 * Do not send unless email opted in + verified address.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderWeeklyProgressEmail = renderWeeklyProgressEmail;
exports.renderGoalReminderEmail = renderGoalReminderEmail;
exports.renderSocialDigestEmail = renderSocialDigestEmail;
exports.isEmailEligible = isEmailEligible;
exports.sendTransactionalEmail = sendTransactionalEmail;
exports.isWeeklyEmailSendWindow = isWeeklyEmailSendWindow;
function renderWeeklyProgressEmail(data) {
    const achievementLine = data.achievementName
        ? `Achievement: ${data.achievementName}`
        : "Keep unlocking achievements this week.";
    const next = data.nextAction || "Open Level Up Life and continue your next quest.";
    const subject = `Level Up Life — Your week (Level ${data.level})`;
    const text = [
        "LEVEL UP LIFE — YOUR WEEK",
        "",
        `Hi ${data.name},`,
        "",
        `Level ${data.level}`,
        `+${data.xpGained} XP this week`,
        `${data.questsCompleted} Quests Completed`,
        `${data.streak}-Day Streak`,
        "",
        `Weekly Challenges: ${data.weeklyCompleted} / ${data.weeklyTotal} Completed`,
        achievementLine,
        "",
        `Next Recommended Step: ${next}`,
        "",
        `Open Level Up Life: ${data.openUrl}`,
        "",
        data.unsubscribeHint,
    ].join("\n");
    const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0d1117;color:#e6edf3;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#161b22;border-radius:12px;padding:24px;">
    <p style="letter-spacing:0.2em;font-size:11px;color:#8b949e;text-transform:uppercase;">Level Up Life — Your Week</p>
    <h1 style="font-size:22px;margin:8px 0 16px;">Hi ${escapeHtml(data.name)}</h1>
    <p style="font-size:18px;margin:0;">Level <strong>${data.level}</strong></p>
    <p style="color:#3fb950;margin:4px 0 16px;">+${data.xpGained} XP this week</p>
    <ul style="padding-left:18px;line-height:1.6;">
      <li>${data.questsCompleted} Quests Completed</li>
      <li>${data.streak}-Day Streak</li>
      <li>Weekly Challenges: ${data.weeklyCompleted} / ${data.weeklyTotal} Completed</li>
      <li>${escapeHtml(achievementLine)}</li>
    </ul>
    <p style="margin-top:20px;"><strong>Next:</strong> ${escapeHtml(next)}</p>
    <p style="margin-top:24px;"><a href="${escapeAttr(data.openUrl)}" style="display:inline-block;background:#238636;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Open Level Up Life</a></p>
    <p style="margin-top:28px;font-size:11px;color:#8b949e;">${escapeHtml(data.unsubscribeHint)}</p>
  </div>
</body></html>`;
    return { subject, html, text };
}
function renderGoalReminderEmail(data) {
    const subject = "Level Up Life — Goal reminder";
    const text = [
        `Hi ${data.name},`,
        "",
        `A quick nudge on your active goal: ${data.goalLabel}`,
        "",
        `Continue in the app: ${data.openUrl}`,
        "",
        data.unsubscribeHint,
    ].join("\n");
    const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;">
  <p>Hi ${escapeHtml(data.name)},</p>
  <p>A quick nudge on your active goal progress.</p>
  <p><a href="${escapeAttr(data.openUrl)}">Open Level Up Life</a></p>
  <p style="font-size:11px;color:#666;">${escapeHtml(data.unsubscribeHint)}</p>
  </body></html>`;
    return { subject, html, text };
}
function renderSocialDigestEmail(data) {
    const subject = `Level Up Life — ${data.items.length} social update${data.items.length === 1 ? "" : "s"}`;
    const lines = data.items.map((i) => `• ${i.title}`).join("\n");
    const text = [`Hi ${data.name},`, "", lines, "", data.openUrl, "", data.unsubscribeHint].join("\n");
    const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;">
  <p>Hi ${escapeHtml(data.name)},</p>
  <ul>${data.items.map((i) => `<li>${escapeHtml(i.title)}</li>`).join("")}</ul>
  <p><a href="${escapeAttr(data.openUrl)}">Open Level Up Life</a></p>
  <p style="font-size:11px;color:#666;">${escapeHtml(data.unsubscribeHint)}</p>
  </body></html>`;
    return { subject, html, text };
}
function escapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
}
function isEmailEligible(opts) {
    if (!opts.emailEnabled)
        return { ok: false, reason: "email_master_off" };
    if (!opts.categoryEnabled)
        return { ok: false, reason: "category_off" };
    if (!opts.email || !opts.email.includes("@"))
        return { ok: false, reason: "no_email" };
    if (!opts.emailVerified)
        return { ok: false, reason: "unverified" };
    return { ok: true };
}
/**
 * Send via Resend HTTP API. Pass apiKey from Secret Manager.
 * Tests should inject fetchImpl / skip real network.
 */
async function sendTransactionalEmail(opts) {
    if (!opts.apiKey)
        return { ok: false, skipped: "missing_api_key" };
    const fetchFn = opts.fetchImpl ?? fetch;
    try {
        const res = await fetchFn("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${opts.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: opts.from ?? "Level Up Life <notifications@leveluplife.app>",
                to: [opts.to],
                subject: opts.subject,
                html: opts.html,
                text: opts.text,
            }),
        });
        if (!res.ok) {
            const body = await res.text().catch(() => "");
            return { ok: false, error: `resend_${res.status}:${body.slice(0, 200)}` };
        }
        const json = (await res.json().catch(() => ({})));
        return { ok: true, id: json.id };
    }
    catch (e) {
        return { ok: false, error: String(e?.message || e) };
    }
}
/** Prefer local evening: 18:00 in user timezone ≈ Sunday send window for weekly. */
function isWeeklyEmailSendWindow(opts) {
    const targetWeekday = opts.targetWeekday ?? 0;
    const hourLocal = opts.hourLocal ?? 18;
    try {
        const tz = opts.timezone || "UTC";
        const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" });
        const hourFmt = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            hour: "numeric",
            hour12: false,
        });
        const wd = weekdayFmt.format(opts.now); // Sun, Mon, …
        const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        const day = map[wd] ?? -1;
        const hour = Number(hourFmt.formatToParts(opts.now).find((p) => p.type === "hour")?.value) % 24;
        return day === targetWeekday && hour === hourLocal;
    }
    catch {
        return opts.now.getUTCDay() === targetWeekday && opts.now.getUTCHours() === hourLocal;
    }
}
//# sourceMappingURL=email.js.map