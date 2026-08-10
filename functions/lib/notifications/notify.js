"use strict";
/**
 * High-level notify helpers used by social/game callables.
 * Never throws to callers — notification failures must not break primary writes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyUserSafe = notifyUserSafe;
const service_1 = require("./service");
const HREF = {
    friend_request: "/friends?tab=requests",
    friend_accepted: "/friends",
    shared_challenge_invite: "/social?tab=challenges",
    shared_challenge_accepted: "/social?tab=challenges",
    shared_challenge_complete: "/social?tab=challenges",
    party_invite: "/social?tab=parties",
    party_joined: "/social?tab=parties",
    party_challenge_complete: "/social?tab=parties",
    referral_activated: "/invite",
    achievement_milestone: "/achievements",
    weekly_reward: "/#weekly-challenges",
};
async function notifyUserSafe(uid, category, title, body, data = {}, deps) {
    try {
        await (0, service_1.sendPushToUser)(uid, {
            title,
            body,
            data: {
                type: category,
                href: data.href ?? HREF[category] ?? "/",
                ...data,
            },
        }, { category, inbox: true }, deps);
    }
    catch (e) {
        console.warn("notifyUserSafe failed", category, e);
    }
}
//# sourceMappingURL=notify.js.map