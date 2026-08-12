/**
 * High-level notify helpers used by social/game callables.
 * Never throws to callers — notification failures must not break primary writes.
 */

import {
  sendPushToUser,
  type NotifyCategory,
  type NotificationDeps,
} from "./service";

const HREF: Record<string, string> = {
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
  weekly_reward: "/?focus=weekly-challenges",
};

export async function notifyUserSafe(
  uid: string,
  category: NotifyCategory,
  title: string,
  body: string,
  data: Record<string, string> = {},
  deps?: NotificationDeps,
): Promise<void> {
  try {
    await sendPushToUser(
      uid,
      {
        title,
        body,
        data: {
          type: category,
          href: data.href ?? HREF[category] ?? "/",
          ...data,
        },
      },
      { category, inbox: true },
      deps,
    );
  } catch (e) {
    console.warn("notifyUserSafe failed", category, e);
  }
}
