/**
 * Phase 4 social hub — shared challenges + parties.
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Check,
  Crown,
  Loader2,
  PartyPopper,
  RefreshCw,
  Swords,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { loadFriendships, loadPublicProfiles, type PublicProfile } from "@/lib/friends";
import {
  SHARED_CHALLENGE_DEFS,
  getSharedChallengeDef,
  type SharedChallengeDoc,
} from "@/lib/social/sharedChallenges";
import {
  PARTY_CHALLENGE_DEFS,
  type PartyDoc,
  type PartyInviteDoc,
} from "@/lib/social/parties";
import {
  createParty,
  inviteSharedChallenge,
  inviteToParty,
  kickPartyMember,
  leaveParty,
  loadMyParties,
  loadPartyChallenges,
  loadPartyInvites,
  loadSharedChallengesForUser,
  refreshPartyChallengeProgress,
  refreshSharedChallengeProgress,
  renameParty,
  respondPartyInvite,
  respondSharedChallenge,
  startPartyChallenge,
  type PartyChallengeDoc,
} from "@/lib/social/api";
import { FeatureUnavailable } from "@/components/FeatureUnavailable";
import { LAUNCH_FLAGS } from "@/lib/featureFlags";

type Tab = "challenges" | "parties";

export default function SocialHubPage() {
  const { me } = useAuth();
  const uid = me?.id ? String(me.id) : "";
  const [tab, setTab] = useState<Tab>("challenges");

  if (!LAUNCH_FLAGS.socialChallengesEnabled && !LAUNCH_FLAGS.partiesEnabled) {
    return (
      <FeatureUnavailable
        title="Challenges & Parties"
        body="Shared challenges and parties stay hidden until social Cloud Functions are deployed and verified."
        testId="social-unavailable"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Swords className="w-6 h-6 text-primary" strokeWidth={2.4} />
          <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-social-title">
            Social
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Shared challenges with friends, and small parties for team goals.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {LAUNCH_FLAGS.friendsEnabled && (
            <>
              Manage friends on{" "}
              <Link href="/friends" className="underline text-primary">
                Friends
              </Link>
              .
            </>
          )}
          {LAUNCH_FLAGS.friendsEnabled && LAUNCH_FLAGS.leaderboardsEnabled ? " " : null}
          {LAUNCH_FLAGS.leaderboardsEnabled && (
            <>
              Weekly ranks on{" "}
              <Link href="/leaderboard" className="underline text-primary">
                Leaderboard
              </Link>
              .
            </>
          )}
        </p>
      </div>

      <div className="flex gap-2" data-testid="social-tabs">
        <TabButton active={tab === "challenges"} onClick={() => setTab("challenges")} testId="tab-challenges">
          <Swords className="w-3.5 h-3.5" /> Shared Challenges
        </TabButton>
        <TabButton active={tab === "parties"} onClick={() => setTab("parties")} testId="tab-parties">
          <PartyPopper className="w-3.5 h-3.5" /> Parties
        </TabButton>
      </div>

      {!uid ? (
        <div className="surface rounded-2xl p-5 text-sm text-muted-foreground text-center">
          Sign in to use social features.
        </div>
      ) : tab === "challenges" ? (
        <SharedChallengesPanel uid={uid} />
      ) : (
        <PartiesPanel uid={uid} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 hover-elevate ${
        active ? "bg-primary text-primary-foreground" : "bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}

function SharedChallengesPanel({ uid }: { uid: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [friendUid, setFriendUid] = useState("");
  const [defId, setDefId] = useState(SHARED_CHALLENGE_DEFS[0]?.id ?? "");

  const friendshipsQuery = useQuery({
    queryKey: ["friendships", uid],
    queryFn: () => loadFriendships(uid),
  });

  const accepted = (friendshipsQuery.data ?? []).filter((f) => f.status === "accepted");
  const friendUids = useMemo(() => {
    const ids: string[] = [];
    for (const f of accepted) {
      for (const other of f.uids) if (other !== uid) ids.push(other);
    }
    return ids;
  }, [accepted, uid]);

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

  const challengesQuery = useQuery({
    queryKey: ["shared-challenges", uid],
    queryFn: () => loadSharedChallengesForUser(uid),
  });

  const inviteMut = useMutation({
    mutationFn: () => inviteSharedChallenge(defId, friendUid),
    onSuccess: () => {
      toast({ title: "Challenge invite sent" });
      qc.invalidateQueries({ queryKey: ["shared-challenges", uid] });
    },
    onError: (e: any) =>
      toast({
        title: "Couldn't send invite",
        description: e?.message ?? String(e),
        variant: "destructive",
      }),
  });

  const respondMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "accept" | "decline" }) =>
      respondSharedChallenge(id, action),
    onSuccess: (_, vars) => {
      toast({ title: vars.action === "accept" ? "Challenge accepted" : "Invite declined" });
      qc.invalidateQueries({ queryKey: ["shared-challenges", uid] });
    },
    onError: (e: any) =>
      toast({ title: "Couldn't update challenge", description: e?.message, variant: "destructive" }),
  });

  const refreshMut = useMutation({
    mutationFn: (id: string) => refreshSharedChallengeProgress(id),
    onSuccess: (data) => {
      toast({ title: "Progress updated", description: `${data.progress} · ${data.status}` });
      qc.invalidateQueries({ queryKey: ["shared-challenges", uid] });
    },
    onError: (e: any) =>
      toast({ title: "Couldn't refresh", description: e?.message, variant: "destructive" }),
  });

  const challenges = challengesQuery.data ?? [];

  return (
    <div className="space-y-5">
      <section className="surface rounded-2xl p-4 space-y-3" data-testid="section-challenge-catalog">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Challenge catalog
        </div>
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {SHARED_CHALLENGE_DEFS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDefId(d.id)}
              data-testid={`challenge-def-${d.id}`}
              className={`w-full text-left rounded-xl p-3 hover-elevate ${
                defId === d.id ? "bg-primary/15 border border-primary/30" : "bg-secondary/40"
              }`}
            >
              <div className="font-semibold text-sm">{d.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{d.description}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="surface rounded-2xl p-4 space-y-3" data-testid="section-invite-challenge">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Invite a friend
        </div>
        {friendUids.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {LAUNCH_FLAGS.friendsEnabled ? (
              <>
                Add friends first on{" "}
                <Link href="/friends" className="underline text-primary">
                  Friends
                </Link>
                .
              </>
            ) : (
              <>Add friends before inviting them to a challenge.</>
            )}
          </p>
        ) : (
          <>
            <select
              value={friendUid}
              onChange={(e) => setFriendUid(e.target.value)}
              className="w-full rounded-xl bg-secondary/60 border border-card-border px-3 py-2.5 text-sm"
              data-testid="select-challenge-friend"
            >
              <option value="">Select friend…</option>
              {friendUids.map((id) => (
                <option key={id} value={id}>
                  {profileMap.get(id)?.name ?? "Friend"}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!friendUid || !defId || inviteMut.isPending}
              onClick={() => inviteMut.mutate()}
              data-testid="button-invite-shared-challenge"
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover-elevate disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {inviteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Send invite
            </button>
          </>
        )}
      </section>

      <section className="space-y-2" data-testid="section-my-challenges">
        <h2 className="text-sm font-bold px-0.5">Your challenges</h2>
        {challengesQuery.isLoading ? (
          <div className="surface rounded-xl p-5 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : challenges.length === 0 ? (
          <div className="surface rounded-xl p-5 text-center text-sm text-muted-foreground">
            No shared challenges yet.
          </div>
        ) : (
          challenges.map((c) => (
            <SharedChallengeRow
              key={c.id}
              challenge={c}
              uid={uid}
              profileMap={profileMap}
              onRespond={(action) => respondMut.mutate({ id: c.id, action })}
              onRefresh={() => refreshMut.mutate(c.id)}
              responding={respondMut.isPending}
              refreshing={refreshMut.isPending && refreshMut.variables === c.id}
            />
          ))
        )}
      </section>
    </div>
  );
}

function SharedChallengeRow({
  challenge,
  uid,
  profileMap,
  onRespond,
  onRefresh,
  responding,
  refreshing,
}: {
  challenge: SharedChallengeDoc;
  uid: string;
  profileMap: Map<string, PublicProfile>;
  onRespond: (action: "accept" | "decline") => void;
  onRefresh: () => void;
  responding: boolean;
  refreshing: boolean;
}) {
  const def = getSharedChallengeDef(challenge.defId);
  const otherUid = challenge.hostUid === uid ? challenge.guestUid : challenge.hostUid;
  const otherName = profileMap.get(otherUid)?.name ?? "Friend";
  const isGuestPending = challenge.status === "pending" && challenge.guestUid === uid;

  return (
    <div className="surface rounded-xl p-3.5 space-y-2" data-testid={`shared-challenge-${challenge.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm">{def?.title ?? challenge.defId}</div>
          <div className="text-xs text-muted-foreground">with {otherName}</div>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
          {challenge.status}
        </span>
      </div>
      <div className="text-xs text-muted-foreground font-num">
        {challenge.progress}/{challenge.target}
        {challenge.endsAt ? ` · ends ${challenge.endsAt}` : ""}
      </div>
      {isGuestPending && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={responding}
            onClick={() => onRespond("accept")}
            data-testid={`button-accept-challenge-${challenge.id}`}
            className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1"
          >
            <Check className="w-3.5 h-3.5" /> Accept
          </button>
          <button
            type="button"
            disabled={responding}
            onClick={() => onRespond("decline")}
            data-testid={`button-decline-challenge-${challenge.id}`}
            className="flex-1 py-2 rounded-lg bg-secondary text-xs font-semibold flex items-center justify-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Decline
          </button>
        </div>
      )}
      {challenge.status === "active" && (
        <button
          type="button"
          disabled={refreshing}
          onClick={onRefresh}
          data-testid={`button-refresh-challenge-${challenge.id}`}
          className="text-xs font-semibold text-primary flex items-center gap-1"
        >
          {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh progress
        </button>
      )}
    </div>
  );
}

function PartiesPanel({ uid }: { uid: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [partyName, setPartyName] = useState("");
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [inviteFriendUid, setInviteFriendUid] = useState("");
  const [renameDraft, setRenameDraft] = useState("");

  const partiesQuery = useQuery({
    queryKey: ["my-parties", uid],
    queryFn: () => loadMyParties(uid),
  });

  const invitesQuery = useQuery({
    queryKey: ["party-invites", uid],
    queryFn: () => loadPartyInvites(uid),
  });

  const friendshipsQuery = useQuery({
    queryKey: ["friendships", uid],
    queryFn: () => loadFriendships(uid),
  });

  const accepted = (friendshipsQuery.data ?? []).filter((f) => f.status === "accepted");
  const friendUids = useMemo(() => {
    const ids: string[] = [];
    for (const f of accepted) {
      for (const other of f.uids) if (other !== uid) ids.push(other);
    }
    return ids;
  }, [accepted, uid]);

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

  const parties = partiesQuery.data ?? [];
  const selected = parties.find((p) => p.id === selectedPartyId) ?? null;

  const partyChallengesQuery = useQuery({
    queryKey: ["party-challenges", selectedPartyId],
    enabled: !!selectedPartyId,
    queryFn: () => loadPartyChallenges(selectedPartyId!),
  });

  const createMut = useMutation({
    mutationFn: () => createParty(partyName.trim()),
    onSuccess: (data) => {
      toast({ title: "Party created" });
      setPartyName("");
      setSelectedPartyId(data.partyId);
      qc.invalidateQueries({ queryKey: ["my-parties", uid] });
    },
    onError: (e: any) =>
      toast({ title: "Couldn't create party", description: e?.message, variant: "destructive" }),
  });

  const respondInviteMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "accept" | "decline" }) =>
      respondPartyInvite(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["party-invites", uid] });
      qc.invalidateQueries({ queryKey: ["my-parties", uid] });
      toast({ title: "Invite updated" });
    },
    onError: (e: any) =>
      toast({ title: "Couldn't update invite", description: e?.message, variant: "destructive" }),
  });

  const inviteMut = useMutation({
    mutationFn: () => inviteToParty(selectedPartyId!, inviteFriendUid),
    onSuccess: () => {
      toast({ title: "Party invite sent" });
      setInviteFriendUid("");
    },
    onError: (e: any) =>
      toast({ title: "Couldn't invite", description: e?.message, variant: "destructive" }),
  });

  const leaveMut = useMutation({
    mutationFn: () => leaveParty(selectedPartyId!),
    onSuccess: () => {
      toast({ title: "Left party" });
      setSelectedPartyId(null);
      qc.invalidateQueries({ queryKey: ["my-parties", uid] });
    },
    onError: (e: any) =>
      toast({ title: "Couldn't leave", description: e?.message, variant: "destructive" }),
  });

  const renameMut = useMutation({
    mutationFn: () => renameParty(selectedPartyId!, renameDraft.trim()),
    onSuccess: () => {
      toast({ title: "Party renamed" });
      setRenameDraft("");
      qc.invalidateQueries({ queryKey: ["my-parties", uid] });
    },
    onError: (e: any) =>
      toast({ title: "Couldn't rename", description: e?.message, variant: "destructive" }),
  });

  const kickMut = useMutation({
    mutationFn: (memberUid: string) => kickPartyMember(selectedPartyId!, memberUid),
    onSuccess: () => {
      toast({ title: "Member removed" });
      qc.invalidateQueries({ queryKey: ["my-parties", uid] });
    },
    onError: (e: any) =>
      toast({ title: "Couldn't kick", description: e?.message, variant: "destructive" }),
  });

  const startChallengeMut = useMutation({
    mutationFn: (defId: string) => startPartyChallenge(selectedPartyId!, defId),
    onSuccess: () => {
      toast({ title: "Party challenge started" });
      qc.invalidateQueries({ queryKey: ["party-challenges", selectedPartyId] });
    },
    onError: (e: any) =>
      toast({ title: "Couldn't start challenge", description: e?.message, variant: "destructive" }),
  });

  const refreshPartyMut = useMutation({
    mutationFn: (id: string) => refreshPartyChallengeProgress(id),
    onSuccess: () => {
      toast({ title: "Progress updated" });
      qc.invalidateQueries({ queryKey: ["party-challenges", selectedPartyId] });
    },
    onError: (e: any) =>
      toast({ title: "Couldn't refresh", description: e?.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      <section className="surface rounded-2xl p-4 space-y-3" data-testid="section-create-party">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Create party</div>
        <div className="flex gap-2">
          <Input
            value={partyName}
            onChange={(e) => setPartyName(e.target.value.slice(0, 40))}
            placeholder="Party name"
            data-testid="input-party-name"
          />
          <button
            type="button"
            disabled={!partyName.trim() || createMut.isPending}
            onClick={() => createMut.mutate()}
            data-testid="button-create-party"
            className="px-3 rounded-xl bg-primary text-primary-foreground font-semibold hover-elevate disabled:opacity-60"
          >
            {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
          </button>
        </div>
      </section>

      {(invitesQuery.data ?? []).length > 0 && (
        <section className="space-y-2" data-testid="section-party-invites">
          <h2 className="text-sm font-bold px-0.5">Party invites</h2>
          {(invitesQuery.data as PartyInviteDoc[]).map((inv) => (
            <div key={inv.id} className="surface rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">Party invite</div>
                <div className="text-xs text-muted-foreground truncate">
                  from {profileMap.get(inv.fromUid)?.name ?? "a friend"}
                </div>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg bg-primary/15 text-primary"
                onClick={() => respondInviteMut.mutate({ id: inv.id, action: "accept" })}
                data-testid={`button-accept-party-${inv.id}`}
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-2 rounded-lg hover-elevate"
                onClick={() => respondInviteMut.mutate({ id: inv.id, action: "decline" })}
                data-testid={`button-decline-party-${inv.id}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2" data-testid="section-my-parties">
        <h2 className="text-sm font-bold px-0.5">Your parties</h2>
        {parties.length === 0 ? (
          <div className="surface rounded-xl p-5 text-center text-sm text-muted-foreground">
            No parties yet — create one above.
          </div>
        ) : (
          parties.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPartyId(p.id);
                setRenameDraft(p.name);
              }}
              data-testid={`party-card-${p.id}`}
              className={`w-full surface rounded-xl p-3 flex items-center gap-3 hover-elevate text-left ${
                selectedPartyId === p.id ? "border border-primary/40" : ""
              }`}
            >
              <Users className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate flex items-center gap-1.5">
                  {p.name}
                  {p.ownerUid === uid && (
                    <Crown className="w-3.5 h-3.5 text-accent" aria-label="Owner" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.memberUids.length} member{p.memberUids.length === 1 ? "" : "s"}
                </div>
              </div>
            </button>
          ))
        )}
      </section>

      {selected && (
        <PartyDetail
          uid={uid}
          party={selected}
          profileMap={profileMap}
          friendUids={friendUids}
          inviteFriendUid={inviteFriendUid}
          setInviteFriendUid={setInviteFriendUid}
          renameDraft={renameDraft}
          setRenameDraft={setRenameDraft}
          challenges={partyChallengesQuery.data ?? []}
          challengesLoading={partyChallengesQuery.isLoading}
          onInvite={() => inviteMut.mutate()}
          inviting={inviteMut.isPending}
          onLeave={() => leaveMut.mutate()}
          leaving={leaveMut.isPending}
          onRename={() => renameMut.mutate()}
          renaming={renameMut.isPending}
          onKick={(memberUid) => kickMut.mutate(memberUid)}
          kicking={kickMut.isPending}
          onStartChallenge={(defId) => startChallengeMut.mutate(defId)}
          starting={startChallengeMut.isPending}
          onRefreshChallenge={(id) => refreshPartyMut.mutate(id)}
          refreshingId={refreshPartyMut.isPending ? refreshPartyMut.variables : null}
        />
      )}
    </div>
  );
}

function PartyDetail({
  uid,
  party,
  profileMap,
  friendUids,
  inviteFriendUid,
  setInviteFriendUid,
  renameDraft,
  setRenameDraft,
  challenges,
  challengesLoading,
  onInvite,
  inviting,
  onLeave,
  leaving,
  onRename,
  renaming,
  onKick,
  kicking,
  onStartChallenge,
  starting,
  onRefreshChallenge,
  refreshingId,
}: {
  uid: string;
  party: PartyDoc;
  profileMap: Map<string, PublicProfile>;
  friendUids: string[];
  inviteFriendUid: string;
  setInviteFriendUid: (v: string) => void;
  renameDraft: string;
  setRenameDraft: (v: string) => void;
  challenges: PartyChallengeDoc[];
  challengesLoading: boolean;
  onInvite: () => void;
  inviting: boolean;
  onLeave: () => void;
  leaving: boolean;
  onRename: () => void;
  renaming: boolean;
  onKick: (memberUid: string) => void;
  kicking: boolean;
  onStartChallenge: (defId: string) => void;
  starting: boolean;
  onRefreshChallenge: (id: string) => void;
  refreshingId: string | null | undefined;
}) {
  const isOwner = party.ownerUid === uid;
  const inviteCandidates = friendUids.filter((id) => !party.memberUids.includes(id));

  return (
    <div className="space-y-4" data-testid="section-party-detail">
      <section className="surface rounded-2xl p-4 space-y-3">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {party.name}
        </div>
        <div className="space-y-1.5">
          {party.memberUids.map((mid) => (
            <div key={mid} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate">
                {mid === uid ? "You" : profileMap.get(mid)?.name ?? mid.slice(0, 8)}
                {mid === party.ownerUid ? " · owner" : ""}
              </span>
              {isOwner && mid !== uid && (
                <button
                  type="button"
                  disabled={kicking}
                  onClick={() => onKick(mid)}
                  data-testid={`button-kick-${mid}`}
                  className="text-xs text-destructive font-semibold"
                >
                  Kick
                </button>
              )}
            </div>
          ))}
        </div>

        {inviteCandidates.length > 0 && (
          <div className="flex gap-2 pt-1">
            <select
              value={inviteFriendUid}
              onChange={(e) => setInviteFriendUid(e.target.value)}
              className="flex-1 rounded-xl bg-secondary/60 border border-card-border px-3 py-2 text-sm"
              data-testid="select-party-invite-friend"
            >
              <option value="">Invite friend…</option>
              {inviteCandidates.map((id) => (
                <option key={id} value={id}>
                  {profileMap.get(id)?.name ?? "Friend"}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!inviteFriendUid || inviting}
              onClick={onInvite}
              data-testid="button-invite-to-party"
              className="px-3 rounded-xl bg-secondary font-semibold text-sm hover-elevate disabled:opacity-60"
            >
              Invite
            </button>
          </div>
        )}

        {isOwner && (
          <div className="flex gap-2">
            <Input
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value.slice(0, 40))}
              data-testid="input-rename-party"
            />
            <button
              type="button"
              disabled={!renameDraft.trim() || renaming}
              onClick={onRename}
              data-testid="button-rename-party"
              className="px-3 rounded-xl bg-secondary font-semibold text-sm hover-elevate disabled:opacity-60"
            >
              Rename
            </button>
          </div>
        )}

        <button
          type="button"
          disabled={leaving}
          onClick={onLeave}
          data-testid="button-leave-party"
          className="w-full py-2 rounded-xl text-sm font-semibold text-destructive hover-elevate"
        >
          Leave party
        </button>
      </section>

      {isOwner && (
        <section className="space-y-2" data-testid="section-party-challenge-defs">
          <h2 className="text-sm font-bold px-0.5">Start a party challenge</h2>
          {PARTY_CHALLENGE_DEFS.map((d) => (
            <div key={d.id} className="surface rounded-xl p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{d.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{d.description}</div>
              </div>
              <button
                type="button"
                disabled={starting || party.memberUids.length < 2}
                onClick={() => onStartChallenge(d.id)}
                data-testid={`button-start-party-challenge-${d.id}`}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50 shrink-0"
              >
                Start
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2" data-testid="section-party-challenges">
        <h2 className="text-sm font-bold px-0.5">Party challenges</h2>
        {challengesLoading ? (
          <div className="surface rounded-xl p-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : challenges.length === 0 ? (
          <div className="surface rounded-xl p-4 text-sm text-muted-foreground text-center">
            No challenges for this party yet.
          </div>
        ) : (
          challenges.map((c) => (
            <div key={c.id} className="surface rounded-xl p-3.5 space-y-2" data-testid={`party-challenge-${c.id}`}>
              <div className="flex justify-between gap-2">
                <div className="font-semibold text-sm">{c.title ?? c.defId}</div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {c.status}
                </span>
              </div>
              <div className="text-xs text-muted-foreground font-num">
                {c.progress}/{c.target}
                {c.endsAt ? ` · ends ${c.endsAt}` : ""}
              </div>
              {c.status === "active" && (
                <button
                  type="button"
                  disabled={refreshingId === c.id}
                  onClick={() => onRefreshChallenge(c.id)}
                  data-testid={`button-refresh-party-challenge-${c.id}`}
                  className="text-xs font-semibold text-primary flex items-center gap-1"
                >
                  {refreshingId === c.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Refresh progress
                </button>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
