import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Users,
  Copy,
  Share2,
  UserPlus,
  Check,
  X,
  Flame,
  Loader2,
  ChevronLeft,
  HandMetal,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useGame } from "@/lib/game";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  ensureInviteCode,
  redeemInviteCode,
  respondToFriendRequest,
  removeFriend,
  cheerActivity,
  shareGoalToFriends,
  loadFriendships,
  loadPublicProfiles,
  loadActivityFeed,
  shareText,
  inviteLinkForCode,
  type PublicProfile,
  type ActivityItem,
} from "@/lib/friends";
import { AVATAR_CLASSES } from "@shared/schema";
import type { Category } from "@/lib/types";

const AVATAR_EMOJI: Record<string, string> = Object.fromEntries(AVATAR_CLASSES.map((a) => [a.key, a.emoji]));
const SKILL_ORDER = ["health", "wealth", "career", "family", "mindset"] as const;

function AvatarBubble({ profile, size = "md" }: { profile: PublicProfile; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-10 h-10 text-lg" : "w-12 h-12 text-xl";
  return (
    <div className={`${dim} rounded-xl bg-secondary/60 border border-card-border flex items-center justify-center overflow-hidden shrink-0`}>
      {profile.photoURL
        ? <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
        : <span>{AVATAR_EMOJI[profile.avatar ?? ""] ?? "🛡️"}</span>}
    </div>
  );
}

export default function FriendsPage() {
  const { me } = useAuth();
  const { character } = useGame();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [loc] = useLocation();
  const [codeInput, setCodeInput] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [goalDraft, setGoalDraft] = useState("");

  const uid = me?.id ? String(me.id) : "";

  // Prefill from deep link / hash query
  useEffect(() => {
    try {
      const hash = window.location.hash || "";
      const q = hash.includes("?") ? hash.split("?")[1] : "";
      const params = new URLSearchParams(q || window.location.search);
      const code = params.get("code");
      if (code) setCodeInput(code.toUpperCase());
    } catch { /* ignore */ }
  }, [loc]);

  const inviteQuery = useQuery({
    queryKey: ["friends-invite", uid],
    enabled: !!uid,
    queryFn: async () => {
      const res = await ensureInviteCode();
      return res;
    },
  });

  const friendshipsQuery = useQuery({
    queryKey: ["friendships", uid],
    enabled: !!uid,
    queryFn: () => loadFriendships(uid),
  });

  const friendships = friendshipsQuery.data ?? [];
  const accepted = friendships.filter((f) => f.status === "accepted");
  const pendingIncoming = friendships.filter((f) => f.status === "pending" && f.requestedBy !== uid);
  const pendingOutgoing = friendships.filter((f) => f.status === "pending" && f.requestedBy === uid);

  const friendUids = useMemo(() => {
    const ids: string[] = [];
    for (const f of accepted) {
      for (const other of f.uids) if (other !== uid) ids.push(other);
    }
    for (const f of [...pendingIncoming, ...pendingOutgoing]) {
      for (const other of f.uids) if (other !== uid) ids.push(other);
    }
    return ids;
  }, [accepted, pendingIncoming, pendingOutgoing, uid]);

  const profilesQuery = useQuery({
    queryKey: ["friend-profiles", friendUids.join(",")],
    enabled: friendUids.length > 0,
    queryFn: () => loadPublicProfiles(friendUids),
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, PublicProfile>();
    for (const p of profilesQuery.data ?? []) m.set(p.uid, p);
    return m;
  }, [profilesQuery.data]);

  const activityQuery = useQuery({
    queryKey: ["friend-activity", uid],
    enabled: !!uid,
    queryFn: () => loadActivityFeed(uid),
  });

  const { data: myCats } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const redeemMut = useMutation({
    mutationFn: (code: string) => redeemInviteCode(code),
    onSuccess: (data) => {
      toast({
        title: data.status === "accepted" ? "You're friends!" : "Request sent",
        description: data.status === "accepted" ? "You can compare progress now." : "They'll need to accept your request.",
      });
      setCodeInput("");
      qc.invalidateQueries({ queryKey: ["friendships", uid] });
    },
    onError: (e: any) => toast({ title: "Couldn't add friend", description: e?.message ?? String(e), variant: "destructive" }),
  });

  const respondMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "accept" | "decline" }) => respondToFriendRequest(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friendships", uid] });
      qc.invalidateQueries({ queryKey: ["friend-activity", uid] });
    },
    onError: (e: any) => toast({ title: "Couldn't update request", description: e?.message, variant: "destructive" }),
  });

  const removeMut = useMutation({
    mutationFn: (friendUid: string) => removeFriend(friendUid),
    onSuccess: () => {
      setSelectedFriend(null);
      qc.invalidateQueries({ queryKey: ["friendships", uid] });
      toast({ title: "Friend removed" });
    },
  });

  const cheerMut = useMutation({
    mutationFn: (id: string) => cheerActivity(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friend-activity", uid] });
    },
  });

  const shareGoalMut = useMutation({
    mutationFn: (goal: string) => shareGoalToFriends(goal),
    onSuccess: async (_, goal) => {
      toast({ title: "Goal shared with friends" });
      setGoalDraft("");
      qc.invalidateQueries({ queryKey: ["friend-activity", uid] });
      const code = inviteQuery.data?.inviteCode;
      if (code) {
        try {
          await shareText("My Level Up Life goal", `I'm working on: ${goal}`, inviteLinkForCode(code));
        } catch { /* user cancelled */ }
      }
    },
    onError: (e: any) => toast({ title: "Couldn't share goal", description: e?.message, variant: "destructive" }),
  });

  const inviteCode = inviteQuery.data?.inviteCode ?? "";
  const selected = selectedFriend ? profileMap.get(selectedFriend) : null;

  if (selected) {
    return (
      <FriendCompare
        me={character}
        myCats={myCats ?? []}
        friend={selected}
        onBack={() => setSelectedFriend(null)}
        onRemove={() => removeMut.mutate(selected.uid)}
        removing={removeMut.isPending}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" strokeWidth={2.4} />
          <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-page-title">Friends</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Share invite codes, cheer each other on, and compare skill progress.
        </p>
      </div>

      {/* Invite */}
      <section className="surface rounded-2xl p-4 space-y-3" data-testid="section-invite">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Your invite code</div>
        <div className="flex items-center gap-2">
          <div className="font-num text-2xl font-extrabold tracking-[0.2em] flex-1" data-testid="text-invite-code">
            {inviteQuery.isLoading ? "······" : inviteCode || "—"}
          </div>
          <button
            type="button"
            className="p-2 rounded-lg hover-elevate"
            disabled={!inviteCode}
            data-testid="button-copy-invite"
            onClick={async () => {
              if (!inviteCode) return;
              await navigator.clipboard?.writeText(inviteCode);
              toast({ title: "Code copied" });
            }}
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-2 rounded-lg hover-elevate"
            disabled={!inviteCode}
            data-testid="button-share-invite"
            onClick={async () => {
              if (!inviteCode || !character) return;
              try {
                await shareText(
                  "Join me on Level Up Life",
                  `${character.name} invited you to Level Up Life. Use code ${inviteCode} or open this link:`,
                  inviteLinkForCode(inviteCode),
                );
              } catch { /* cancelled */ }
            }}
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Friends enter your code below. Facebook friend-find comes later — codes work everywhere.
        </p>
      </section>

      {/* Redeem */}
      <section className="surface rounded-2xl p-4 space-y-3" data-testid="section-redeem">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Add a friend</div>
        <div className="flex gap-2">
          <Input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            placeholder="ENTER CODE"
            className="font-num tracking-widest uppercase"
            data-testid="input-friend-code"
          />
          <button
            type="button"
            disabled={!codeInput.trim() || redeemMut.isPending}
            data-testid="button-redeem-code"
            onClick={() => redeemMut.mutate(codeInput.trim())}
            className="px-3 rounded-xl bg-primary text-primary-foreground font-semibold hover-elevate disabled:opacity-60 flex items-center gap-1.5"
          >
            {redeemMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Add
          </button>
        </div>
      </section>

      {/* Share goal */}
      <section className="surface rounded-2xl p-4 space-y-3" data-testid="section-share-goal">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Share a goal</div>
        <Input
          value={goalDraft}
          onChange={(e) => setGoalDraft(e.target.value.slice(0, 200))}
          placeholder={character?.lifeGoal || "What are you working toward?"}
          data-testid="input-share-goal"
        />
        <button
          type="button"
          disabled={!goalDraft.trim() || shareGoalMut.isPending}
          data-testid="button-share-goal"
          onClick={() => shareGoalMut.mutate(goalDraft.trim())}
          className="w-full py-2.5 rounded-xl bg-secondary font-semibold hover-elevate disabled:opacity-60"
        >
          {shareGoalMut.isPending ? "Sharing…" : "Share with friends"}
        </button>
      </section>

      {/* Pending */}
      {pendingIncoming.length > 0 && (
        <section className="space-y-2" data-testid="section-pending">
          <h2 className="text-sm font-bold px-0.5">Requests</h2>
          {pendingIncoming.map((f) => {
            const other = f.uids.find((x) => x !== uid)!;
            const p = profileMap.get(other);
            return (
              <div key={f.id} className="surface rounded-xl p-3 flex items-center gap-3">
                {p ? <AvatarBubble profile={p} size="sm" /> : <div className="w-10 h-10 rounded-xl bg-secondary" />}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{p?.name ?? "Player"}</div>
                  <div className="text-xs text-muted-foreground">Wants to be friends</div>
                </div>
                <button
                  type="button"
                  className="p-2 rounded-lg bg-primary/15 text-primary"
                  onClick={() => respondMut.mutate({ id: f.id, action: "accept" })}
                  data-testid={`button-accept-${f.id}`}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-lg hover-elevate"
                  onClick={() => respondMut.mutate({ id: f.id, action: "decline" })}
                  data-testid={`button-decline-${f.id}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </section>
      )}

      {/* Friends list */}
      <section className="space-y-2" data-testid="section-friends-list">
        <h2 className="text-sm font-bold px-0.5">Your friends ({accepted.length})</h2>
        {accepted.length === 0 ? (
          <div className="surface rounded-xl p-5 text-center text-sm text-muted-foreground">
            No friends yet — share your code or add theirs.
          </div>
        ) : (
          accepted.map((f) => {
            const other = f.uids.find((x) => x !== uid)!;
            const p = profileMap.get(other);
            if (!p) return null;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFriend(other)}
                className="w-full surface rounded-xl p-3 flex items-center gap-3 hover-elevate text-left"
                data-testid={`friend-card-${other}`}
              >
                <AvatarBubble profile={p} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    Lv {p.level} · {p.title || "Adventurer"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end text-accent">
                    <Flame className="w-3.5 h-3.5" />
                    <span className="font-num text-sm font-bold">{p.currentStreak}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">Legacy {p.legacyScore}</div>
                </div>
              </button>
            );
          })
        )}
        {pendingOutgoing.length > 0 && (
          <p className="text-xs text-muted-foreground px-0.5">
            {pendingOutgoing.length} pending outgoing request{pendingOutgoing.length > 1 ? "s" : ""}
          </p>
        )}
      </section>

      {/* Activity */}
      <section className="space-y-2" data-testid="section-activity">
        <h2 className="text-sm font-bold px-0.5">Activity</h2>
        {(activityQuery.data ?? []).length === 0 ? (
          <div className="surface rounded-xl p-5 text-center text-sm text-muted-foreground">
            Friend quests, level-ups, and goals will show up here.
          </div>
        ) : (
          (activityQuery.data as ActivityItem[]).map((item) => {
            const mine = item.actorUid === uid;
            const already = (item.cheeredBy ?? []).includes(uid);
            return (
              <div key={item.id} className="surface rounded-xl p-3.5 space-y-2">
                <p className="text-sm leading-snug">{item.message}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.type}</span>
                  {!mine && item.type !== "cheer" && (
                    <button
                      type="button"
                      disabled={already || cheerMut.isPending}
                      onClick={() => cheerMut.mutate(item.id)}
                      className="text-xs font-semibold flex items-center gap-1 text-primary disabled:opacity-50"
                      data-testid={`button-cheer-${item.id}`}
                    >
                      <HandMetal className="w-3.5 h-3.5" />
                      {already ? "Cheered" : `Cheer${item.cheerCount ? ` · ${item.cheerCount}` : ""}`}
                    </button>
                  )}
                  {mine && (item.cheerCount ?? 0) > 0 && (
                    <span className="text-xs text-muted-foreground">{item.cheerCount} cheer{(item.cheerCount ?? 0) === 1 ? "" : "s"}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      <p className="text-[11px] text-muted-foreground text-center pb-2">
        Control life-goal visibility in{" "}
        <Link href="/settings" className="underline text-primary">Settings</Link>.
        Facebook friend-find is planned for a later update.
      </p>
    </div>
  );
}

function FriendCompare({
  me,
  myCats,
  friend,
  onBack,
  onRemove,
  removing,
}: {
  me: ReturnType<typeof useGame>["character"];
  myCats: Category[];
  friend: PublicProfile;
  onBack: () => void;
  onRemove: () => void;
  removing: boolean;
}) {
  const myLevels = Object.fromEntries(myCats.map((c) => [c.key, c.level ?? 1]));

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-primary" data-testid="button-friend-back">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="surface rounded-2xl p-5 flex items-center gap-4">
        <AvatarBubble profile={friend} />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-lg truncate">{friend.name}</div>
          <div className="text-sm text-muted-foreground">
            Level {friend.level} · {friend.title || "Adventurer"}
          </div>
          {friend.lifeGoal && (
            <div className="text-xs text-accent mt-1 truncate">Goal: {friend.lifeGoal}</div>
          )}
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end text-accent">
            <Flame className="w-4 h-4" />
            <span className="font-num text-xl font-bold">{friend.currentStreak}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">Legacy {friend.legacyScore}</div>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-bold px-0.5">Skill compare</h2>
        {SKILL_ORDER.map((key) => {
          const mine = myLevels[key] ?? 1;
          const theirs = friend.categoryLevels?.[key] ?? 1;
          const max = Math.max(mine, theirs, 5);
          return (
            <div key={key} className="surface rounded-xl p-3 space-y-2">
              <div className="flex justify-between text-xs font-semibold capitalize">
                <span>{key}</span>
                <span className="font-num text-muted-foreground">You {mine} · Them {theirs}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(mine / max) * 100}%` }} />
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${(theirs / max) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <div className="flex gap-2">
        {me && (
          <button
            type="button"
            className="flex-1 py-2.5 rounded-xl bg-secondary font-semibold hover-elevate flex items-center justify-center gap-2"
            onClick={async () => {
              try {
                await shareText(
                  "Level Up Life progress",
                  `I'm level ${me.level} (${me.title}) with a ${me.currentStreak}-day streak on Level Up Life!`,
                );
              } catch { /* cancelled */ }
            }}
          >
            <Share2 className="w-4 h-4" /> Share my progress
          </button>
        )}
        <button
          type="button"
          disabled={removing}
          onClick={onRemove}
          className="px-4 py-2.5 rounded-xl text-destructive font-semibold hover-elevate"
          data-testid="button-remove-friend"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
