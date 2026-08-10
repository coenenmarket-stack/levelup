/**
 * In-app notification inbox — predefined types only (no arbitrary HTML).
 */

import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { NotificationType } from "./notificationDeepLinks";
import { destinationForNotificationType, destinationToPath } from "./notificationDeepLinks";

export const INBOX_FEED_LIMIT = 50;

export type InboxNotification = {
  id: string;
  type: NotificationType | string;
  title: string;
  body: string;
  createdAtMs: number;
  read: boolean;
  /** Safe relative path */
  href: string;
  payload?: Record<string, string>;
};

export function inboxHrefFor(type: string, payload: Record<string, string> = {}): string {
  return destinationToPath(destinationForNotificationType(type, payload));
}

export async function loadInbox(uid: string): Promise<InboxNotification[]> {
  const snap = await getDocs(
    query(
      collection(db, "characters", uid, "notifications"),
      orderBy("createdAtMs", "desc"),
      limit(INBOX_FEED_LIMIT),
    ),
  );
  return snap.docs.map((d) => {
    const data = d.data() as any;
    const payload = (data.payload ?? {}) as Record<string, string>;
    return {
      id: d.id,
      type: String(data.type ?? "generic"),
      title: String(data.title ?? "Update"),
      body: String(data.body ?? ""),
      createdAtMs: Number(data.createdAtMs) || 0,
      read: data.read === true,
      href: typeof data.href === "string" ? data.href : inboxHrefFor(String(data.type), payload),
      payload,
    };
  });
}

export async function countUnreadInbox(uid: string): Promise<number> {
  try {
    const snap = await getDocs(
      query(
        collection(db, "characters", uid, "notifications"),
        where("read", "==", false),
        limit(99),
      ),
    );
    return snap.size;
  } catch {
    // Fallback if composite index missing — filter client-side
    const all = await loadInbox(uid);
    return all.filter((n) => !n.read).length;
  }
}

export async function markInboxRead(uid: string, notificationId: string): Promise<void> {
  await updateDoc(doc(db, "characters", uid, "notifications", notificationId), {
    read: true,
    readAtMs: Date.now(),
  });
}

export async function markAllInboxRead(uid: string): Promise<void> {
  const unread = await getDocs(
    query(
      collection(db, "characters", uid, "notifications"),
      where("read", "==", false),
      limit(50),
    ),
  );
  if (unread.empty) return;
  const batch = writeBatch(db);
  for (const d of unread.docs) {
    batch.update(d.ref, { read: true, readAtMs: Date.now() });
  }
  await batch.commit();
}
