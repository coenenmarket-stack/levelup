"use strict";
/**
 * Phase 4 social Cloud Functions — server-authoritative transitions.
 * Deploy later with: firebase deploy --only functions:redeemReferralCode,functions:activateReferral,...
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshPartyChallengeProgress = exports.startPartyChallenge = exports.renameParty = exports.kickPartyMember = exports.leaveParty = exports.respondPartyInvite = exports.inviteToParty = exports.createParty = exports.refreshSharedChallengeProgress = exports.respondSharedChallenge = exports.inviteSharedChallenge = exports.unblockUser = exports.blockUser = exports.activateReferral = exports.redeemReferralCode = void 0;
const crypto_1 = require("crypto");
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
if ((0, app_1.getApps)().length === 0)
    (0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
function requireAuth(req) {
    if (!req.auth?.uid)
        throw new https_1.HttpsError("unauthenticated", "Sign in required");
    return req.auth.uid;
}
function nowISO() {
    return new Date().toISOString();
}
function dayKeyLocal(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
function addDays(dayKey, days) {
    const [y, m, d] = dayKey.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    return dayKeyLocal(dt);
}
function friendshipId(a, b) {
    return [a, b].sort().join("_");
}
function blockId(a, b) {
    return `${a}__${b}`;
}
function referralId(referrer, referred) {
    return `${referrer}__${referred}`;
}
async function isBlockedEitherWay(a, b) {
    const [x, y] = await Promise.all([
        db.doc(`blocks/${blockId(a, b)}`).get(),
        db.doc(`blocks/${blockId(b, a)}`).get(),
    ]);
    return x.exists || y.exists;
}
async function areFriends(a, b) {
    const snap = await db.doc(`friendships/${friendshipId(a, b)}`).get();
    return snap.exists && snap.data().status === "accepted";
}
async function writeSocialActivity(params) {
    const visibleTo = Array.from(new Set(params.visibleTo.filter(Boolean)));
    if (!visibleTo.length)
        return null;
    const ref = await db.collection("socialActivity").add({
        actorUid: params.actorUid,
        type: params.type,
        payload: params.payload,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        createdAtMs: Date.now(),
        visibleTo,
    });
    return ref.id;
}
async function notifySafe(uid, category, title, body, data = {}) {
    try {
        const { notifyUserSafe } = await Promise.resolve().then(() => __importStar(require("./notifications/notify")));
        await notifyUserSafe(uid, category, title, body, data);
    }
    catch (e) {
        console.warn("social notify skipped", e);
    }
}
// --- Referrals ---
exports.redeemReferralCode = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    const uid = requireAuth(req);
    const raw = typeof req.data?.code === "string" ? req.data.code.trim().toUpperCase() : "";
    if (!raw || raw.length < 4)
        throw new https_1.HttpsError("invalid-argument", "Enter a valid invite code");
    const inviteSnap = await db.doc(`inviteCodes/${raw}`).get();
    if (!inviteSnap.exists)
        throw new https_1.HttpsError("not-found", "Invite code not found");
    const referrerUid = inviteSnap.data().uid;
    if (!referrerUid)
        throw new https_1.HttpsError("not-found", "Invite code not found");
    if (referrerUid === uid)
        throw new https_1.HttpsError("invalid-argument", "You can't refer yourself");
    if (await isBlockedEitherWay(uid, referrerUid)) {
        throw new https_1.HttpsError("permission-denied", "Unable to connect with this user");
    }
    // One referrer per referred user — immutable once set
    const existingAttr = await db.collection("referrals").where("referredUid", "==", uid).limit(1).get();
    let referralDocId;
    if (existingAttr.empty) {
        referralDocId = referralId(referrerUid, uid);
        await db.doc(`referrals/${referralDocId}`).set({
            referrerUid,
            referredUid: uid,
            inviteCode: raw,
            status: "joined",
            createdAt: nowISO(),
            joinedAt: nowISO(),
            activatedAt: null,
            activationQuestId: null,
        });
    }
    // Also create/accept friendship (existing growth path)
    const fid = friendshipId(uid, referrerUid);
    const fref = db.doc(`friendships/${fid}`);
    const fsnap = await fref.get();
    if (!fsnap.exists) {
        await fref.set({
            uids: [uid, referrerUid].sort(),
            status: "pending",
            requestedBy: uid,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        await notifySafe(referrerUid, "friend_request", "New friend request", "Someone used your invite code.");
        return { status: "pending", friendshipId: fid, referralId: referralDocId };
    }
    const fdata = fsnap.data();
    if (fdata.status === "accepted") {
        return { status: "accepted", friendshipId: fid, referralId: referralDocId };
    }
    if (fdata.status === "pending" && fdata.requestedBy === referrerUid) {
        await fref.update({ status: "accepted", acceptedAt: firestore_1.FieldValue.serverTimestamp() });
        await notifySafe(referrerUid, "friend_accepted", "Friend request accepted", "You're connected on Level Up Life.");
        return { status: "accepted", friendshipId: fid, referralId: referralDocId };
    }
    return { status: "pending", friendshipId: fid, referralId: referralDocId };
});
exports.activateReferral = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    const uid = requireAuth(req);
    const questId = typeof req.data?.questId === "string" ? req.data.questId.trim() : "";
    if (!questId)
        throw new https_1.HttpsError("invalid-argument", "questId required");
    // Confirm a real quest completion exists for this user
    const comps = await db
        .collection(`characters/${uid}/completions`)
        .where("questId", "==", questId)
        .limit(1)
        .get();
    if (comps.empty) {
        // Also accept doc id pattern questId_day
        const loose = await db.collection(`characters/${uid}/completions`).limit(30).get();
        const hit = loose.docs.some((d) => String(d.data().questId) === questId);
        if (!hit)
            throw new https_1.HttpsError("failed-precondition", "Complete a quest first");
    }
    const attr = await db.collection("referrals").where("referredUid", "==", uid).limit(1).get();
    if (attr.empty)
        return { activated: false };
    const docSnap = attr.docs[0];
    const data = docSnap.data();
    if (data.status === "activated")
        return { activated: false, referralId: docSnap.id };
    await docSnap.ref.update({
        status: "activated",
        activatedAt: nowISO(),
        activationQuestId: questId,
    });
    // Count activated for referrer milestones (activity only — achievements evaluated client-side)
    const activatedSnap = await db
        .collection("referrals")
        .where("referrerUid", "==", data.referrerUid)
        .where("status", "==", "activated")
        .get();
    const count = activatedSnap.size;
    const friends = await listFriendUids(data.referrerUid);
    await writeSocialActivity({
        actorUid: data.referrerUid,
        type: "referral_milestone",
        payload: { count },
        visibleTo: [data.referrerUid, ...friends].slice(0, 40),
    });
    await notifySafe(data.referrerUid, "referral_activated", "Referral activated", "Someone you invited completed their first quest.");
    return { activated: true, referralId: docSnap.id, activatedCount: count };
});
async function listFriendUids(uid) {
    const snap = await db.collection("friendships").where("uids", "array-contains", uid).get();
    const out = [];
    for (const d of snap.docs) {
        const data = d.data();
        if (data.status !== "accepted")
            continue;
        for (const other of data.uids ?? [])
            if (other !== uid)
                out.push(other);
    }
    return out;
}
// --- Blocks ---
exports.blockUser = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    const uid = requireAuth(req);
    const blockedUid = typeof req.data?.blockedUid === "string" ? req.data.blockedUid.trim() : "";
    if (!blockedUid)
        throw new https_1.HttpsError("invalid-argument", "blockedUid required");
    if (blockedUid === uid)
        throw new https_1.HttpsError("invalid-argument", "Cannot block yourself");
    await db.doc(`blocks/${blockId(uid, blockedUid)}`).set({
        blockerUid: uid,
        blockedUid,
        createdAt: nowISO(),
    });
    // Remove friendship if present
    const fid = friendshipId(uid, blockedUid);
    const fref = db.doc(`friendships/${fid}`);
    if ((await fref.get()).exists)
        await fref.delete();
    return { ok: true };
});
exports.unblockUser = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    const uid = requireAuth(req);
    const blockedUid = typeof req.data?.blockedUid === "string" ? req.data.blockedUid.trim() : "";
    if (!blockedUid)
        throw new https_1.HttpsError("invalid-argument", "blockedUid required");
    await db.doc(`blocks/${blockId(uid, blockedUid)}`).delete();
    return { ok: true };
});
// --- Shared challenges ---
const SHARED_DEFS = {
    "momentum-duo": { title: "Momentum Duo", target: 20, durationDays: 7, metric: "combinedQuestCount" },
    "consistency-partners": { title: "Consistency Partners", target: 5, durationDays: 7, metric: "participantActiveDays" },
    "balanced-duo": { title: "Balanced Duo", target: 5, durationDays: 10, metric: "skillQuestCount" },
    "career-sprint": { title: "Career Sprint", target: 10, durationDays: 7, metric: "skillQuestCount", skill: "career" },
    "wealth-week": { title: "Wealth Week", target: 10, durationDays: 7, metric: "skillQuestCount", skill: "wealth" },
    "mindset-momentum": { title: "Mindset Momentum", target: 10, durationDays: 7, metric: "skillQuestCount", skill: "mindset" },
    "health-habit": { title: "Health Habit", target: 10, durationDays: 7, metric: "skillQuestCount", skill: "health" },
    "family-focus": { title: "Family Focus", target: 8, durationDays: 7, metric: "skillQuestCount", skill: "family" },
    "xp-push": { title: "XP Push", target: 500, durationDays: 7, metric: "combinedXP" },
    "xp-surge": { title: "XP Surge", target: 1000, durationDays: 10, metric: "combinedXP" },
    "double-duty": { title: "Double Duty", target: 8, durationDays: 7, metric: "eachParticipantMinQuests", perParticipantMin: 8 },
    "weekend-warriors": { title: "Weekend Warriors", target: 12, durationDays: 3, metric: "combinedQuestCount" },
    "steady-pair": { title: "Steady Pair", target: 30, durationDays: 14, metric: "combinedQuestCount" },
    "daily-duo": { title: "Daily Duo", target: 7, durationDays: 10, metric: "participantActiveDays" },
    "skill-sampler": { title: "Skill Sampler", target: 10, durationDays: 14, metric: "skillQuestCount" },
    "light-start": { title: "Light Start", target: 8, durationDays: 5, metric: "combinedQuestCount" },
    "focus-fifteen": { title: "Focus Fifteen", target: 15, durationDays: 7, metric: "combinedQuestCount" },
    "even-split": { title: "Even Split", target: 5, durationDays: 7, metric: "eachParticipantMinQuests", perParticipantMin: 5 },
};
exports.inviteSharedChallenge = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    const uid = requireAuth(req);
    const defId = typeof req.data?.defId === "string" ? req.data.defId : "";
    const friendUid = typeof req.data?.friendUid === "string" ? req.data.friendUid.trim() : "";
    const def = SHARED_DEFS[defId];
    if (!def)
        throw new https_1.HttpsError("invalid-argument", "Unknown challenge");
    if (!friendUid)
        throw new https_1.HttpsError("invalid-argument", "friendUid required");
    if (friendUid === uid)
        throw new https_1.HttpsError("invalid-argument", "Cannot challenge yourself");
    if (!(await areFriends(uid, friendUid)))
        throw new https_1.HttpsError("failed-precondition", "Friends only");
    if (await isBlockedEitherWay(uid, friendUid))
        throw new https_1.HttpsError("permission-denied", "Blocked");
    const today = dayKeyLocal();
    const id = `sc_${uid.slice(0, 6)}_${friendUid.slice(0, 6)}_${Date.now().toString(36)}`;
    await db.doc(`sharedChallenges/${id}`).set({
        defId,
        hostUid: uid,
        guestUid: friendUid,
        participantUids: [uid, friendUid],
        status: "pending",
        createdAt: nowISO(),
        startsAt: null,
        endsAt: addDays(today, 3), // invite expiry
        acceptedAt: null,
        completedAt: null,
        progress: 0,
        target: def.target,
        rewardClaimedBy: [],
        title: def.title,
    });
    await notifySafe(friendUid, "shared_challenge_invite", "Shared challenge invite", def.title, { challengeId: id });
    return { id, status: "pending" };
});
exports.respondSharedChallenge = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    const uid = requireAuth(req);
    const challengeId = typeof req.data?.challengeId === "string" ? req.data.challengeId : "";
    const action = req.data?.action === "decline" ? "decline" : "accept";
    const ref = db.doc(`sharedChallenges/${challengeId}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "Challenge not found");
    const data = snap.data();
    if (data.guestUid !== uid)
        throw new https_1.HttpsError("permission-denied", "Not your invite");
    if (data.status !== "pending")
        throw new https_1.HttpsError("failed-precondition", "Not pending");
    const today = dayKeyLocal();
    if (data.endsAt && today > data.endsAt) {
        await ref.update({ status: "expired" });
        throw new https_1.HttpsError("failed-precondition", "Invite expired");
    }
    if (action === "decline") {
        await ref.update({ status: "declined" });
        return { status: "declined" };
    }
    const def = SHARED_DEFS[data.defId];
    const endsAt = addDays(today, def?.durationDays ?? 7);
    await ref.update({
        status: "active",
        acceptedAt: nowISO(),
        startsAt: today,
        endsAt,
        progress: 0,
    });
    await notifySafe(data.hostUid, "shared_challenge_accepted", "Challenge accepted", def?.title ?? "Shared challenge is active", { challengeId });
    return { status: "active" };
});
async function loadParticipantComps(uids, start, end) {
    const out = [];
    for (const uid of uids) {
        const snap = await db
            .collection(`characters/${uid}/completions`)
            .where("completionDate", ">=", start)
            .where("completionDate", "<=", end)
            .get();
        snap.forEach((d) => {
            const c = d.data();
            out.push({
                uid,
                category: String(c.category ?? ""),
                xpReward: Number(c.xpReward) || 0,
                completionDate: String(c.completionDate ?? ""),
                kind: c.kind,
            });
        });
    }
    return out;
}
function computeSharedMetric(def, defId, comps, uids) {
    const inWindow = comps.filter((c) => c.kind !== "weeklyChallenge" && uids.includes(c.uid));
    if (def.metric === "combinedQuestCount")
        return inWindow.length;
    if (def.metric === "combinedXP")
        return inWindow.reduce((s, c) => s + c.xpReward, 0);
    if (def.metric === "skillQuestCount") {
        if (def.skill)
            return inWindow.filter((c) => c.category === def.skill).length;
        if (defId === "skill-sampler") {
            const bySkill = {};
            for (const c of inWindow)
                bySkill[c.category] = (bySkill[c.category] ?? 0) + 1;
            return ["health", "wealth", "career", "family", "mindset"].reduce((s, k) => s + Math.min(2, bySkill[k] ?? 0), 0);
        }
        return new Set(inWindow.map((c) => c.category).filter((k) => ["health", "wealth", "career", "family", "mindset"].includes(k))).size;
    }
    if (def.metric === "participantActiveDays") {
        let minDays = Infinity;
        for (const uid of uids) {
            const days = new Set(inWindow.filter((c) => c.uid === uid).map((c) => c.completionDate));
            minDays = Math.min(minDays, days.size);
        }
        return Number.isFinite(minDays) ? minDays : 0;
    }
    if (def.metric === "eachParticipantMinQuests") {
        const need = def.perParticipantMin ?? def.target;
        let minCount = Infinity;
        for (const uid of uids) {
            minCount = Math.min(minCount, inWindow.filter((c) => c.uid === uid).length);
        }
        return Number.isFinite(minCount) ? Math.min(minCount, need) : 0;
    }
    return 0;
}
exports.refreshSharedChallengeProgress = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    const uid = requireAuth(req);
    const challengeId = typeof req.data?.challengeId === "string" ? req.data.challengeId : "";
    const ref = db.doc(`sharedChallenges/${challengeId}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "Challenge not found");
    const data = snap.data();
    if (!Array.isArray(data.participantUids) || !data.participantUids.includes(uid)) {
        throw new https_1.HttpsError("permission-denied", "Not a participant");
    }
    const today = dayKeyLocal();
    if (data.status === "pending" && data.endsAt && today > data.endsAt) {
        await ref.update({ status: "expired" });
        return { progress: 0, status: "expired" };
    }
    if (data.status !== "active")
        return { progress: data.progress ?? 0, status: data.status };
    if (data.endsAt && today > data.endsAt) {
        await ref.update({ status: "expired" });
        return { progress: data.progress ?? 0, status: "expired" };
    }
    const def = SHARED_DEFS[data.defId];
    if (!def)
        return { progress: data.progress ?? 0, status: data.status };
    const comps = await loadParticipantComps(data.participantUids, data.startsAt, data.endsAt);
    const progress = computeSharedMetric(def, data.defId, comps, data.participantUids);
    const patch = { progress };
    if (progress >= def.target) {
        patch.status = "completed";
        patch.completedAt = nowISO();
        await writeSocialActivity({
            actorUid: uid,
            type: "shared_challenge_completed",
            payload: { title: def.title },
            visibleTo: data.participantUids,
        });
        for (const member of data.participantUids) {
            await notifySafe(member, "shared_challenge_complete", "Shared challenge complete", def.title, { challengeId });
        }
    }
    await ref.update(patch);
    return { progress, status: patch.status ?? "active" };
});
// --- Parties ---
const PARTY_MAX = 8;
function sanitizePartyName(raw) {
    return String(raw || "").replace(/\s+/g, " ").trim().slice(0, 40);
}
exports.createParty = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    const uid = requireAuth(req);
    const name = sanitizePartyName(req.data?.name ?? "Party");
    if (!name)
        throw new https_1.HttpsError("invalid-argument", "Name required");
    const id = `party_${uid.slice(0, 8)}_${Date.now().toString(36)}`;
    await db.doc(`parties/${id}`).set({
        name,
        ownerUid: uid,
        memberUids: [uid],
        createdAt: nowISO(),
        updatedAt: nowISO(),
        dissolved: false,
    });
    return { partyId: id };
});
exports.inviteToParty = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    const uid = requireAuth(req);
    const partyId = typeof req.data?.partyId === "string" ? req.data.partyId : "";
    const friendUid = typeof req.data?.friendUid === "string" ? req.data.friendUid.trim() : "";
    const partySnap = await db.doc(`parties/${partyId}`).get();
    if (!partySnap.exists)
        throw new https_1.HttpsError("not-found", "Party not found");
    const party = partySnap.data();
    if (party.dissolved)
        throw new https_1.HttpsError("failed-precondition", "Party dissolved");
    if (party.ownerUid !== uid)
        throw new https_1.HttpsError("permission-denied", "Owner only");
    if (!friendUid || friendUid === uid)
        throw new https_1.HttpsError("invalid-argument", "Invalid friend");
    if ((party.memberUids ?? []).includes(friendUid))
        throw new https_1.HttpsError("already-exists", "Already a member");
    if ((party.memberUids ?? []).length >= PARTY_MAX)
        throw new https_1.HttpsError("resource-exhausted", "Party full");
    if (!(await areFriends(uid, friendUid)))
        throw new https_1.HttpsError("failed-precondition", "Friends only");
    if (await isBlockedEitherWay(uid, friendUid))
        throw new https_1.HttpsError("permission-denied", "Blocked");
    const inviteId = `pinv_${partyId}_${friendUid}`;
    await db.doc(`partyInvites/${inviteId}`).set({
        partyId,
        fromUid: uid,
        toUid: friendUid,
        status: "pending",
        createdAt: nowISO(),
        expiresAt: addDays(dayKeyLocal(), 7),
    });
    await notifySafe(friendUid, "party_invite", "Party invite", "You've been invited to a party.", {
        partyId,
    });
    return { inviteId };
});
exports.respondPartyInvite = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    const uid = requireAuth(req);
    const inviteId = typeof req.data?.inviteId === "string" ? req.data.inviteId : "";
    const action = req.data?.action === "decline" ? "decline" : "accept";
    const invRef = db.doc(`partyInvites/${inviteId}`);
    const invSnap = await invRef.get();
    if (!invSnap.exists)
        throw new https_1.HttpsError("not-found", "Invite not found");
    const inv = invSnap.data();
    if (inv.toUid !== uid)
        throw new https_1.HttpsError("permission-denied", "Not your invite");
    if (inv.status !== "pending")
        throw new https_1.HttpsError("failed-precondition", "Not pending");
    const today = dayKeyLocal();
    if (inv.expiresAt && today > inv.expiresAt) {
        await invRef.update({ status: "expired" });
        throw new https_1.HttpsError("failed-precondition", "Invite expired");
    }
    if (action === "decline") {
        await invRef.update({ status: "declined" });
        return { status: "declined" };
    }
    const partyRef = db.doc(`parties/${inv.partyId}`);
    await db.runTransaction(async (tx) => {
        const partySnap = await tx.get(partyRef);
        if (!partySnap.exists)
            throw new https_1.HttpsError("not-found", "Party not found");
        const party = partySnap.data();
        if (party.dissolved)
            throw new https_1.HttpsError("failed-precondition", "Dissolved");
        const members = party.memberUids ?? [];
        if (members.length >= PARTY_MAX)
            throw new https_1.HttpsError("resource-exhausted", "Party full");
        if (!members.includes(uid))
            members.push(uid);
        tx.update(partyRef, { memberUids: members, updatedAt: nowISO() });
        tx.update(invRef, { status: "accepted" });
    });
    const party = (await partyRef.get()).data();
    await writeSocialActivity({
        actorUid: uid,
        type: "party_joined",
        payload: { partyName: party?.name ?? "Party" },
        visibleTo: party?.memberUids ?? [uid],
    });
    if (party?.ownerUid && party.ownerUid !== uid) {
        await notifySafe(party.ownerUid, "party_joined", "Party member joined", `${party?.name ?? "Party"} has a new member.`, { partyId: inv.partyId });
    }
    return { status: "accepted" };
});
exports.leaveParty = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    const uid = requireAuth(req);
    const partyId = typeof req.data?.partyId === "string" ? req.data.partyId : "";
    const ref = db.doc(`parties/${partyId}`);
    const snap = await ref.get();
    if (!snap.exists)
        return { ok: true };
    const party = snap.data();
    if (!(party.memberUids ?? []).includes(uid))
        return { ok: true };
    const remaining = (party.memberUids ?? []).filter((u) => u !== uid);
    if (!remaining.length) {
        await ref.update({ memberUids: [], dissolved: true, updatedAt: nowISO() });
        return { ok: true, dissolved: true };
    }
    let ownerUid = party.ownerUid;
    if (ownerUid === uid)
        ownerUid = remaining[0];
    await ref.update({ memberUids: remaining, ownerUid, updatedAt: nowISO() });
    return { ok: true, dissolved: false };
});
exports.kickPartyMember = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    const uid = requireAuth(req);
    const partyId = typeof req.data?.partyId === "string" ? req.data.partyId : "";
    const memberUid = typeof req.data?.memberUid === "string" ? req.data.memberUid : "";
    const ref = db.doc(`parties/${partyId}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "Party not found");
    const party = snap.data();
    if (party.ownerUid !== uid)
        throw new https_1.HttpsError("permission-denied", "Owner only");
    if (memberUid === uid)
        throw new https_1.HttpsError("invalid-argument", "Use leaveParty");
    await ref.update({
        memberUids: (party.memberUids ?? []).filter((u) => u !== memberUid),
        updatedAt: nowISO(),
    });
    return { ok: true };
});
exports.renameParty = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    const uid = requireAuth(req);
    const partyId = typeof req.data?.partyId === "string" ? req.data.partyId : "";
    const name = sanitizePartyName(req.data?.name ?? "");
    if (!name)
        throw new https_1.HttpsError("invalid-argument", "Name required");
    const ref = db.doc(`parties/${partyId}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "Party not found");
    if (snap.data().ownerUid !== uid)
        throw new https_1.HttpsError("permission-denied", "Owner only");
    await ref.update({ name, updatedAt: nowISO() });
    return { ok: true };
});
const PARTY_CHALLENGE_DEFS = {
    "team-momentum": { title: "Team Momentum", target: 50, durationDays: 14, metric: "combinedQuestCount" },
    "full-spectrum": { title: "Full Spectrum", target: 50, durationDays: 14, metric: "perSkillCollective" },
    "active-week": { title: "Active Week", target: 7, durationDays: 7, metric: "activeMemberDays" },
    "team-xp": { title: "Team XP", target: 2000, durationDays: 14, metric: "combinedXP" },
    "career-crew": { title: "Career Crew", target: 25, durationDays: 14, metric: "skillQuestCount", skill: "career" },
    "wealth-crew": { title: "Wealth Crew", target: 25, durationDays: 14, metric: "skillQuestCount", skill: "wealth" },
    "health-crew": { title: "Health Crew", target: 25, durationDays: 14, metric: "skillQuestCount", skill: "health" },
    "mindset-crew": { title: "Mindset Crew", target: 25, durationDays: 14, metric: "skillQuestCount", skill: "mindset" },
    "family-crew": { title: "Family Crew", target: 20, durationDays: 14, metric: "skillQuestCount", skill: "family" },
    "sprint-30": { title: "Sprint 30", target: 30, durationDays: 7, metric: "combinedQuestCount" },
    "party-push": { title: "Party Push", target: 1200, durationDays: 7, metric: "combinedXP" },
    "ten-day-grind": { title: "Ten-Day Grind", target: 10, durationDays: 14, metric: "activeMemberDays" },
};
exports.startPartyChallenge = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    const uid = requireAuth(req);
    const partyId = typeof req.data?.partyId === "string" ? req.data.partyId : "";
    const defId = typeof req.data?.defId === "string" ? req.data.defId : "";
    const def = PARTY_CHALLENGE_DEFS[defId];
    if (!def)
        throw new https_1.HttpsError("invalid-argument", "Unknown challenge");
    const partySnap = await db.doc(`parties/${partyId}`).get();
    if (!partySnap.exists)
        throw new https_1.HttpsError("not-found", "Party not found");
    const party = partySnap.data();
    if (party.ownerUid !== uid)
        throw new https_1.HttpsError("permission-denied", "Owner only");
    if (party.dissolved)
        throw new https_1.HttpsError("failed-precondition", "Dissolved");
    if ((party.memberUids ?? []).length < 2)
        throw new https_1.HttpsError("failed-precondition", "Need 2+ members");
    const today = dayKeyLocal();
    const challengeId = `pc_${partyId}_${Date.now().toString(36)}`;
    await db.doc(`partyChallenges/${challengeId}`).set({
        partyId,
        defId,
        title: def.title,
        status: "active",
        memberUids: party.memberUids,
        createdBy: uid,
        createdAt: nowISO(),
        startsAt: today,
        endsAt: addDays(today, def.durationDays),
        progress: 0,
        target: def.target,
        completedAt: null,
    });
    return { challengeId };
});
function computePartyMetric(def, comps, members) {
    const inWindow = comps.filter((c) => c.kind !== "weeklyChallenge" && members.includes(c.uid));
    if (def.metric === "combinedQuestCount")
        return inWindow.length;
    if (def.metric === "combinedXP")
        return inWindow.reduce((s, c) => s + c.xpReward, 0);
    if (def.metric === "skillQuestCount" && def.skill) {
        return inWindow.filter((c) => c.category === def.skill).length;
    }
    if (def.metric === "activeMemberDays") {
        return new Set(inWindow.map((c) => c.completionDate)).size;
    }
    if (def.metric === "perSkillCollective") {
        const bySkill = {};
        for (const c of inWindow)
            bySkill[c.category] = (bySkill[c.category] ?? 0) + 1;
        return ["health", "wealth", "career", "family", "mindset"].reduce((s, k) => s + Math.min(10, bySkill[k] ?? 0), 0);
    }
    return 0;
}
exports.refreshPartyChallengeProgress = (0, https_1.onCall)({ region: "us-central1" }, async (req) => {
    const uid = requireAuth(req);
    const challengeId = typeof req.data?.challengeId === "string" ? req.data.challengeId : "";
    const ref = db.doc(`partyChallenges/${challengeId}`);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError("not-found", "Challenge not found");
    const data = snap.data();
    if (!Array.isArray(data.memberUids) || !data.memberUids.includes(uid)) {
        throw new https_1.HttpsError("permission-denied", "Not a member");
    }
    if (data.status !== "active")
        return { progress: data.progress ?? 0, status: data.status };
    const today = dayKeyLocal();
    if (data.endsAt && today > data.endsAt) {
        await ref.update({ status: "expired" });
        return { progress: data.progress ?? 0, status: "expired" };
    }
    const def = PARTY_CHALLENGE_DEFS[data.defId];
    if (!def)
        return { progress: data.progress ?? 0, status: data.status };
    const comps = await loadParticipantComps(data.memberUids, data.startsAt, data.endsAt);
    const progress = computePartyMetric(def, comps, data.memberUids);
    const patch = { progress };
    if (progress >= def.target) {
        patch.status = "completed";
        patch.completedAt = nowISO();
        await writeSocialActivity({
            actorUid: uid,
            type: "party_challenge_completed",
            payload: { title: def.title },
            visibleTo: data.memberUids,
        });
        for (const member of data.memberUids) {
            await notifySafe(member, "party_challenge_complete", "Party challenge complete", def.title, { partyId: data.partyId });
        }
    }
    await ref.update(patch);
    return { progress, status: patch.status ?? "active" };
});
// silence unused import in some builds
void crypto_1.randomBytes;
//# sourceMappingURL=social.js.map