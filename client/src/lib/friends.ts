import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";
import { isNativeApp } from "./ios";
import type { Character, Category } from "./types";

export type PublicProfile = {
  uid: string;
  name: string;
  photoURL?: string | null;
  avatar?: string | null;
  level: number;
  title?: string | null;
  currentStreak: number;
  legacyScore: number;
  categoryLevels: Record<string, number>;
  lifeGoal?: string | null;
  showLifeGoal?: boolean;
  inviteCode?: string | null;
  updatedAt?: string;
};

export type Friendship = {
  id: string;
  uids: string[];
  status: "pending" | "accepted";
  requestedBy: string;
};

export type ActivityItem = {
  id: string;
  actorUid: string;
  type: "quest" | "levelUp" | "goal" | "cheer";
  message: string;
  meta?: Record<string, unknown>;
  cheerCount?: number;
  cheeredBy?: string[];
  createdAtMs?: number;
  visibleTo: string[];
};

export const INVITE_WEB_BASE = "https://level-up-life-73702.web.app";
export const INVITE_SCHEME_PREFIX = "com.coenenmarket.leveluplife://invite";

export function inviteLinkForCode(code: string): string {
  return `${INVITE_WEB_BASE}/#/friends?code=${encodeURIComponent(code)}`;
}

export async function syncPublicProfileLocal(
  uid: string,
  character: Character,
  categories: Category[],
  opts?: { showLifeGoal?: boolean; inviteCode?: string | null },
) {
  const categoryLevels: Record<string, number> = {};
  for (const c of categories) categoryLevels[c.key] = c.level ?? 1;
  const showLifeGoal = opts?.showLifeGoal !== false;
  const existing = await getDoc(doc(db, "publicProfiles", uid));
  const prev = existing.exists() ? (existing.data() as any) : {};
  const payload = {
    name: character.name,
    photoURL: character.photoURL ?? null,
    avatar: character.avatar ?? null,
    level: character.level ?? 1,
    title: character.title ?? null,
    currentStreak: character.currentStreak ?? 0,
    legacyScore: character.legacyScore ?? 0,
    categoryLevels,
    lifeGoal: showLifeGoal ? (character.lifeGoal ?? null) : null,
    showLifeGoal,
    inviteCode: opts?.inviteCode ?? prev.inviteCode ?? null,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "publicProfiles", uid), payload, { merge: true });
  return { uid, ...payload } as PublicProfile;
}

export async function ensureInviteCode(): Promise<{ inviteCode: string; profile: PublicProfile }> {
  const fn = httpsCallable<Record<string, never>, { inviteCode: string; profile: Omit<PublicProfile, "uid"> }>(
    functions,
    "ensureInviteCode",
  );
  const res = await fn({});
  return {
    inviteCode: res.data.inviteCode,
    profile: { uid: "", ...res.data.profile, inviteCode: res.data.inviteCode },
  };
}

export async function redeemInviteCode(code: string) {
  const fn = httpsCallable<{ code: string }, { status: string; friendshipId: string }>(
    functions,
    "redeemInviteCode",
  );
  return (await fn({ code })).data;
}

export async function respondToFriendRequest(friendshipId: string, action: "accept" | "decline") {
  const fn = httpsCallable<{ friendshipId: string; action: string }, { status: string }>(
    functions,
    "respondToFriendRequest",
  );
  return (await fn({ friendshipId, action })).data;
}

export async function removeFriend(friendUid: string) {
  const fn = httpsCallable<{ friendUid: string }, { ok: boolean }>(functions, "removeFriend");
  return (await fn({ friendUid })).data;
}

export async function cheerActivity(activityId: string) {
  const fn = httpsCallable<{ activityId: string }, { cheerCount: number; already?: boolean }>(
    functions,
    "cheerActivity",
  );
  return (await fn({ activityId })).data;
}

export async function shareGoalToFriends(goal: string) {
  const fn = httpsCallable<{ goal: string }, { id: string }>(functions, "shareGoalToFriends");
  return (await fn({ goal })).data;
}

export async function postProgressActivity(payload: {
  type: "quest" | "levelUp";
  category?: string;
  level?: number;
}) {
  try {
    const fn = httpsCallable<typeof payload, { id?: string; skipped?: boolean }>(
      functions,
      "postProgressActivity",
    );
    await fn(payload);
  } catch (e) {
    console.warn("postProgressActivity failed", e);
  }
}

export async function loadFriendships(uid: string): Promise<Friendship[]> {
  const snap = await getDocs(query(collection(db, "friendships"), where("uids", "array-contains", uid)));
  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      uids: data.uids ?? [],
      status: data.status,
      requestedBy: data.requestedBy,
    };
  });
}

export async function loadPublicProfile(uid: string): Promise<PublicProfile | null> {
  const snap = await getDoc(doc(db, "publicProfiles", uid));
  if (!snap.exists()) return null;
  return { uid, ...(snap.data() as any) };
}

export async function loadPublicProfiles(uids: string[]): Promise<PublicProfile[]> {
  const unique = Array.from(new Set(uids.filter(Boolean)));
  const profiles = await Promise.all(unique.map((id) => loadPublicProfile(id)));
  return profiles.filter((p): p is PublicProfile => !!p);
}

export async function loadActivityFeed(uid: string): Promise<ActivityItem[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, "activity"),
        where("visibleTo", "array-contains", uid),
        orderBy("createdAtMs", "desc"),
        limit(40),
      ),
    );
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  } catch (e) {
    // Fallback without orderBy if index missing
    console.warn("activity ordered query failed, falling back", e);
    const snap = await getDocs(
      query(collection(db, "activity"), where("visibleTo", "array-contains", uid), limit(40)),
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
  }
}

export async function shareText(title: string, text: string, url?: string) {
  try {
    if (isNativeApp()) {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title, text, url, dialogTitle: title });
      return;
    }
  } catch (e) {
    console.warn("Capacitor Share unavailable", e);
  }
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ title, text, url });
    return;
  }
  const full = url ? `${text}\n${url}` : text;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(full);
  }
}
