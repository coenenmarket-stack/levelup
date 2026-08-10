/**
 * Capacitor Push Notifications + FCM token registration.
 * Tokens stored at characters/{uid}/devices/{deviceId} — never publicProfiles.
 */

import { doc, setDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { isNativeApp } from "./ios";

export type DeviceRecord = {
  pushToken: string;
  platform: "ios" | "android" | "web";
  enabled: boolean;
  updatedAt: string;
  appVersion?: string | null;
  invalid?: boolean;
};

function deviceIdFromToken(token: string): string {
  // Deterministic short id from token (avoid storing raw token as doc id length issues)
  let h = 0;
  for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) >>> 0;
  return `d_${h.toString(16)}`;
}

async function pushPlugin(): Promise<any | null> {
  try {
    if (!isNativeApp()) return null;
    const { PushNotifications } = await import("@capacitor/push-notifications");
    return PushNotifications;
  } catch {
    return null;
  }
}

export async function checkPushPermission(): Promise<"granted" | "denied" | "prompt" | "unsupported"> {
  const plugin = await pushPlugin();
  if (!plugin) return "unsupported";
  try {
    const r = await plugin.checkPermissions();
    if (r.receive === "granted") return "granted";
    if (r.receive === "denied") return "denied";
    return "prompt";
  } catch {
    return "unsupported";
  }
}

export async function requestPushPermission(): Promise<"granted" | "denied" | "prompt" | "unsupported"> {
  const plugin = await pushPlugin();
  if (!plugin) return "unsupported";
  try {
    const r = await plugin.requestPermissions();
    if (r.receive === "granted") return "granted";
    if (r.receive === "denied") return "denied";
    return "prompt";
  } catch {
    return "unsupported";
  }
}

export async function saveDeviceToken(
  uid: string,
  token: string,
  platform: "ios" | "android" | "web" = "ios",
): Promise<string> {
  const deviceId = deviceIdFromToken(token);
  const payload: DeviceRecord = {
    pushToken: token,
    platform,
    enabled: true,
    invalid: false,
    updatedAt: new Date().toISOString(),
    appVersion: null,
  };
  await setDoc(doc(db, "characters", uid, "devices", deviceId), payload, { merge: true });

  // Dedupe: disable other docs with the same token (reinstall / race)
  try {
    const snap = await getDocs(
      query(collection(db, "characters", uid, "devices"), where("pushToken", "==", token)),
    );
    for (const d of snap.docs) {
      if (d.id === deviceId) continue;
      await setDoc(d.ref, { enabled: false, invalid: true, updatedAt: new Date().toISOString() }, { merge: true });
    }
  } catch {
    /* index may be missing — ok */
  }
  return deviceId;
}

export async function disableDeviceToken(uid: string, token: string): Promise<void> {
  const deviceId = deviceIdFromToken(token);
  await setDoc(
    doc(db, "characters", uid, "devices", deviceId),
    { enabled: false, updatedAt: new Date().toISOString() },
    { merge: true },
  );
}

export async function clearAllDeviceTokens(uid: string): Promise<void> {
  const snap = await getDocs(collection(db, "characters", uid, "devices"));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

let listenersAttached = false;

/**
 * Register for remote push, persist token, and attach refresh / open handlers.
 * Call after user grants permission (contextual UX — not on cold launch).
 */
export async function registerPushForUser(
  uid: string,
  opts?: {
    onNotificationOpen?: (data: Record<string, string>) => void;
    appVersion?: string;
  },
): Promise<{ ok: boolean; reason?: string; token?: string }> {
  const plugin = await pushPlugin();
  if (!plugin) return { ok: false, reason: "unsupported" };

  const perm = await requestPushPermission();
  if (perm !== "granted") return { ok: false, reason: perm };

  if (!listenersAttached) {
    listenersAttached = true;
    await plugin.addListener("registration", async (token: { value: string }) => {
      try {
        await saveDeviceToken(uid, token.value, "ios");
      } catch (e) {
        console.warn("saveDeviceToken failed", e);
      }
    });
    await plugin.addListener("registrationError", (err: unknown) => {
      console.warn("push registrationError", err);
    });
    await plugin.addListener("pushNotificationActionPerformed", (event: any) => {
      const data = (event?.notification?.data ?? {}) as Record<string, string>;
      opts?.onNotificationOpen?.(data);
    });
  }

  await plugin.register();
  return { ok: true, reason: "registered" };
}

/** Pure helpers for tests */
export function shouldShowPushOptIn(opts: {
  notificationsEnabled: boolean;
  pushPermission?: string | null;
  dismissedAtMs?: number | null;
  nowMs?: number;
}): boolean {
  if (opts.notificationsEnabled) return false;
  if (opts.pushPermission === "denied") return false;
  const dismissed = opts.dismissedAtMs ?? 0;
  const now = opts.nowMs ?? Date.now();
  // Don't re-prompt within 14 days
  if (dismissed && now - dismissed < 14 * 24 * 60 * 60 * 1000) return false;
  return true;
}

export function dedupeDeviceRecords(
  devices: Array<{ id: string; pushToken: string; updatedAt: string }>,
): Array<{ id: string; pushToken: string; updatedAt: string }> {
  const byToken = new Map<string, { id: string; pushToken: string; updatedAt: string }>();
  for (const d of devices) {
    const prev = byToken.get(d.pushToken);
    if (!prev || d.updatedAt > prev.updatedAt) byToken.set(d.pushToken, d);
  }
  return Array.from(byToken.values());
}

export function shouldRemoveInvalidToken(fcmErrorCode: string | undefined): boolean {
  if (!fcmErrorCode) return false;
  const c = fcmErrorCode.toLowerCase();
  return (
    c.includes("registration-token-not-registered") ||
    c.includes("invalid-registration-token") ||
    c.includes("not-registered") ||
    c === "messaging/registration-token-not-registered" ||
    c === "messaging/invalid-registration-token"
  );
}
