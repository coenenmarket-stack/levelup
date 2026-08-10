"use strict";
/**
 * Centralized notification service for Cloud Functions.
 * Mock-friendly: messaging/email injectors for tests.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_PUSH_PER_DAY = exports.DEFAULT_SERVER_PREFS = void 0;
exports.mergeServerPrefs = mergeServerPrefs;
exports.isInQuietHours = isInQuietHours;
exports.localHourInTimezone = localHourInTimezone;
exports.respectPreferences = respectPreferences;
exports.canSendPushToday = canSendPushToday;
exports.shouldRemoveInvalidToken = shouldRemoveInvalidToken;
exports.loadUserPrefs = loadUserPrefs;
exports.createNotificationRecord = createNotificationRecord;
exports.removeInvalidTokens = removeInvalidTokens;
exports.sendPushToUser = sendPushToUser;
exports.sendPushToUsers = sendPushToUsers;
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
exports.DEFAULT_SERVER_PREFS = {
    pushEnabled: false,
    notificationsEnabled: false,
    notifyDailyQuests: true,
    notifyStreakRisk: true,
    notifyWeeklyChallenges: true,
    notifySocialMaster: true,
    notifyFriendRequests: true,
    notifyChallengeInvites: true,
    notifyChallengeUpdates: true,
    notifyPartyInvites: true,
    notifyPartyUpdates: true,
    notifyReferralMilestones: true,
    notifyAchievements: true,
    notifyGoalsProgress: true,
    emailEnabled: false,
    emailWeeklyProgress: false,
    emailGoalReminders: false,
    emailSocialDigest: false,
    quietHours: { enabled: true, startHour: 22, endHour: 8 },
    timezone: null,
};
exports.MAX_PUSH_PER_DAY = 8;
function mergeServerPrefs(raw) {
    const quiet = {
        ...exports.DEFAULT_SERVER_PREFS.quietHours,
        ...(raw?.quietHours && typeof raw.quietHours === "object" ? raw.quietHours : {}),
    };
    return {
        ...exports.DEFAULT_SERVER_PREFS,
        ...raw,
        quietHours: quiet,
        pushEnabled: raw?.pushEnabled === true || (raw?.pushEnabled !== false && raw?.notificationsEnabled === true),
    };
}
function isInQuietHours(localHour, quiet) {
    if (!quiet.enabled)
        return false;
    const start = ((quiet.startHour % 24) + 24) % 24;
    const end = ((quiet.endHour % 24) + 24) % 24;
    const h = ((localHour % 24) + 24) % 24;
    if (start === end)
        return true;
    if (start < end)
        return h >= start && h < end;
    return h >= start || h < end;
}
function localHourInTimezone(now, timezone) {
    try {
        if (!timezone)
            return now.getUTCHours();
        const fmt = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            hour: "numeric",
            hour12: false,
        });
        const parts = fmt.formatToParts(now);
        const hour = parts.find((p) => p.type === "hour")?.value;
        return Number(hour) % 24;
    }
    catch {
        return now.getUTCHours();
    }
}
function respectPreferences(prefs, category) {
    if (!prefs.pushEnabled && !prefs.notificationsEnabled)
        return false;
    switch (category) {
        case "friend_request":
        case "friend_accepted":
            return prefs.notifySocialMaster && prefs.notifyFriendRequests;
        case "shared_challenge_invite":
            return prefs.notifySocialMaster && prefs.notifyChallengeInvites;
        case "shared_challenge_accepted":
        case "shared_challenge_complete":
            return prefs.notifySocialMaster && prefs.notifyChallengeUpdates;
        case "party_invite":
            return prefs.notifySocialMaster && prefs.notifyPartyInvites;
        case "party_joined":
        case "party_challenge_complete":
            return prefs.notifySocialMaster && prefs.notifyPartyUpdates;
        case "referral_activated":
            return prefs.notifySocialMaster && prefs.notifyReferralMilestones;
        case "achievement_milestone":
            return prefs.notifyAchievements;
        case "weekly_reward":
            return prefs.notifyWeeklyChallenges;
        case "goal_milestone":
        case "career_milestone":
            return prefs.notifyGoalsProgress;
        default:
            return false;
    }
}
function canSendPushToday(sentToday, max = exports.MAX_PUSH_PER_DAY) {
    return sentToday < max;
}
function shouldRemoveInvalidToken(code) {
    if (!code)
        return false;
    const c = code.toLowerCase();
    return (c.includes("registration-token-not-registered") ||
        c.includes("invalid-registration-token") ||
        c.includes("not-registered"));
}
function getDb(deps) {
    return deps?.db ?? (0, firestore_1.getFirestore)();
}
async function loadUserPrefs(uid, deps) {
    const snap = await getDb(deps).doc(`users/${uid}`).get();
    return mergeServerPrefs(snap.exists ? snap.data() : {});
}
async function createNotificationRecord(uid, item, deps) {
    const ref = getDb(deps).collection(`characters/${uid}/notifications`).doc();
    await ref.set({
        type: item.type,
        title: item.title,
        body: item.body,
        href: item.href ?? "/",
        payload: item.payload ?? {},
        read: false,
        createdAtMs: Date.now(),
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return ref.id;
}
async function bumpPushCount(uid, deps) {
    const dayKey = (deps?.now ?? (() => new Date()))().toISOString().slice(0, 10);
    const ref = getDb(deps).doc(`characters/${uid}/notificationMeta/pushRate`);
    const snap = await ref.get();
    const data = snap.exists ? snap.data() : {};
    const count = data.dayKey === dayKey ? Number(data.count) || 0 : 0;
    await ref.set({ dayKey, count: count + 1, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
    return count + 1;
}
async function readPushCount(uid, deps) {
    const dayKey = (deps?.now ?? (() => new Date()))().toISOString().slice(0, 10);
    const snap = await getDb(deps).doc(`characters/${uid}/notificationMeta/pushRate`).get();
    if (!snap.exists)
        return 0;
    const data = snap.data();
    return data.dayKey === dayKey ? Number(data.count) || 0 : 0;
}
async function removeInvalidTokens(uid, tokenDeviceIds, deps) {
    const db = getDb(deps);
    await Promise.all(tokenDeviceIds.map((id) => db.doc(`characters/${uid}/devices/${id}`).set({ enabled: false, invalid: true, updatedAt: new Date().toISOString() }, { merge: true })));
}
async function sendPushToUser(uid, push, opts, deps) {
    const prefs = await loadUserPrefs(uid, deps);
    if (!respectPreferences(prefs, opts.category)) {
        return { sent: 0, skipped: "prefs" };
    }
    const now = (deps?.now ?? (() => new Date()))();
    const hour = localHourInTimezone(now, prefs.timezone);
    if (!opts.skipQuietHours && isInQuietHours(hour, prefs.quietHours)) {
        // Still write inbox so user sees it later
        let inboxId;
        if (opts.inbox !== false) {
            inboxId = await createNotificationRecord(uid, {
                type: opts.category,
                title: push.title,
                body: push.body,
                href: push.data?.href,
                payload: push.data,
            }, deps);
        }
        return { sent: 0, skipped: "quiet_hours", inboxId };
    }
    const sentToday = await readPushCount(uid, deps);
    if (!canSendPushToday(sentToday)) {
        let inboxId;
        if (opts.inbox !== false) {
            inboxId = await createNotificationRecord(uid, {
                type: opts.category,
                title: push.title,
                body: push.body,
                href: push.data?.href,
                payload: push.data,
            }, deps);
        }
        return { sent: 0, skipped: "rate_limit", inboxId };
    }
    let inboxId;
    if (opts.inbox !== false) {
        inboxId = await createNotificationRecord(uid, {
            type: opts.category,
            title: push.title,
            body: push.body,
            href: push.data?.href,
            payload: push.data,
        }, deps);
    }
    const devicesSnap = await getDb(deps)
        .collection(`characters/${uid}/devices`)
        .where("enabled", "==", true)
        .get();
    const devices = devicesSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((d) => d.pushToken && !d.invalid);
    if (!devices.length) {
        return { sent: 0, skipped: "no_tokens", inboxId };
    }
    const tokens = devices.map((d) => String(d.pushToken));
    let responses;
    if (deps?.sendEachForMulticast) {
        const result = await deps.sendEachForMulticast({
            tokens,
            notification: { title: push.title, body: push.body },
            data: push.data,
        });
        responses = result.responses;
    }
    else {
        try {
            const messaging = deps?.messaging ?? (0, messaging_1.getMessaging)();
            const result = await messaging.sendEachForMulticast({
                tokens,
                notification: { title: push.title, body: push.body },
                data: push.data ?? {},
                apns: {
                    payload: {
                        aps: {
                            sound: "default",
                            badge: 1,
                        },
                    },
                },
            });
            responses = result.responses.map((r) => ({
                success: r.success,
                error: r.error ? { code: r.error.code } : undefined,
            }));
        }
        catch (e) {
            console.warn("FCM send failed", e);
            return { sent: 0, skipped: "fcm_error", inboxId };
        }
    }
    const invalidIds = [];
    let sent = 0;
    responses.forEach((r, i) => {
        if (r.success)
            sent += 1;
        else if (shouldRemoveInvalidToken(r.error?.code)) {
            invalidIds.push(devices[i].id);
        }
    });
    if (invalidIds.length)
        await removeInvalidTokens(uid, invalidIds, deps);
    if (sent > 0)
        await bumpPushCount(uid, deps);
    return { sent, inboxId };
}
async function sendPushToUsers(uids, push, opts, deps) {
    let totalSent = 0;
    const unique = Array.from(new Set(uids.filter(Boolean)));
    for (const uid of unique) {
        const r = await sendPushToUser(uid, push, opts, deps);
        totalSent += r.sent;
    }
    return { totalSent };
}
//# sourceMappingURL=service.js.map