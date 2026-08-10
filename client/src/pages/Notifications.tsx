/**
 * In-app notification inbox.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  countUnreadInbox,
  loadInbox,
  markAllInboxRead,
  markInboxRead,
} from "@/lib/notificationInbox";
import { resolveDeepLinkPath } from "@/lib/notificationDeepLinks";

export default function NotificationsPage() {
  const { me } = useAuth();
  const uid = me?.id ? String(me.id) : "";
  const [, setLoc] = useLocation();
  const qc = useQueryClient();

  const inboxQuery = useQuery({
    queryKey: ["notification-inbox", uid],
    enabled: !!uid,
    queryFn: () => loadInbox(uid),
  });

  const unreadQuery = useQuery({
    queryKey: ["notification-unread", uid],
    enabled: !!uid,
    queryFn: () => countUnreadInbox(uid),
  });

  const markMut = useMutation({
    mutationFn: (id: string) => markInboxRead(uid, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-inbox", uid] });
      qc.invalidateQueries({ queryKey: ["notification-unread", uid] });
    },
  });

  const markAllMut = useMutation({
    mutationFn: () => markAllInboxRead(uid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-inbox", uid] });
      qc.invalidateQueries({ queryKey: ["notification-unread", uid] });
    },
  });

  const items = inboxQuery.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" strokeWidth={2.4} />
            <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-inbox-title">
              Inbox
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Recent updates — friend requests, challenges, parties, and milestones.
          </p>
        </div>
        <button
          type="button"
          disabled={!items.some((i) => !i.read) || markAllMut.isPending}
          onClick={() => markAllMut.mutate()}
          className="text-xs font-semibold px-2 py-1.5 rounded-lg hover-elevate flex items-center gap-1 disabled:opacity-50"
          data-testid="button-mark-all-read"
        >
          {markAllMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
          Mark all read
        </button>
      </div>

      {(unreadQuery.data ?? 0) > 0 && (
        <p className="text-xs text-muted-foreground" data-testid="text-unread-count">
          {unreadQuery.data} unread
        </p>
      )}

      {inboxQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="surface rounded-2xl p-5 text-sm text-muted-foreground" data-testid="inbox-empty">
          No notifications yet. Enable push in Settings to get alerts when friends invite you.
        </div>
      ) : (
        <ul className="space-y-2" data-testid="inbox-list">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className={`w-full text-left surface rounded-xl p-3.5 hover-elevate ${
                  n.read ? "opacity-80" : "border border-primary/30"
                }`}
                data-testid={`inbox-item-${n.id}`}
                onClick={() => {
                  if (!n.read) markMut.mutate(n.id);
                  const path = resolveDeepLinkPath(n.href) || n.href || "/";
                  setLoc(path.startsWith("/") ? path.split("#")[0]! : "/");
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{n.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</div>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                </div>
                <div className="text-[10px] text-muted-foreground mt-2">
                  {n.createdAtMs ? new Date(n.createdAtMs).toLocaleString() : ""}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-muted-foreground text-center">
        Manage alerts in{" "}
        <Link href="/settings" className="underline text-primary">
          Settings
        </Link>
        .
      </p>
    </div>
  );
}
