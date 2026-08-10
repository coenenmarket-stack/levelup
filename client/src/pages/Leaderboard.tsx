/**
 * Phase 4 weekly leaderboard — opt-in friends / party scopes.
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { doc, setDoc } from "firebase/firestore";
import { Loader2, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useGame } from "@/lib/game";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { loadFriendships, loadPublicProfiles, type PublicProfile } from "@/lib/friends";
import { isoWeekIdLocal } from "@/lib/dayKey";
import {
  loadMyParties,
  loadOwnWeeklyQuestStats,
  readSocialUserPrefs,
  writeSocialUserPrefs,
} from "@/lib/social/api";
import {
  rankLeaderboard,
  type LeaderboardMetric,
} from "@/lib/social/leaderboards";

type Scope = "friends" | "party";

type ProfileWithOptIn = PublicProfile & { leaderboardOptIn?: boolean };

export default function LeaderboardPage() {
  const { me } = useAuth();
  const { character } = useGame();
  const { toast } = useToast();
  const qc = useQueryClient();
  const uid = me?.id ? String(me.id) : "";
  const [scope, setScope] = useState<Scope>("friends");
  const [metric, setMetric] = useState<LeaderboardMetric>("weeklyXp");
  const weekId = isoWeekIdLocal();

  const prefsQuery = useQuery({
    queryKey: ["social-prefs", uid],
    enabled: !!uid,
    queryFn: () => readSocialUserPrefs(uid),
  });

  const optedIn = prefsQuery.data?.leaderboardOptIn === true;

  const friendshipsQuery = useQuery({
    queryKey: ["friendships", uid],
    enabled: !!uid && optedIn,
    queryFn: () => loadFriendships(uid),
  });

  const friendUids = useMemo(() => {
    const ids: string[] = [];
    for (const f of friendshipsQuery.data ?? []) {
      if (f.status !== "accepted") continue;
      for (const other of f.uids) if (other !== uid) ids.push(other);
    }
    return ids;
  }, [friendshipsQuery.data, uid]);

  const partiesQuery = useQuery({
    queryKey: ["my-parties", uid],
    enabled: !!uid && optedIn && scope === "party",
    queryFn: () => loadMyParties(uid),
  });

  const partyMemberUids = useMemo(() => {
    const party = partiesQuery.data?.[0];
    if (!party) return [] as string[];
    return party.memberUids.filter((id) => id !== uid);
  }, [partiesQuery.data, uid]);

  const peerUids = scope === "friends" ? friendUids : partyMemberUids;

  const profilesQuery = useQuery({
    queryKey: ["leaderboard-profiles", peerUids.join(",")],
    enabled: peerUids.length > 0 && optedIn,
    queryFn: () => loadPublicProfiles(peerUids),
  });

  const ownStatsQuery = useQuery({
    queryKey: ["own-weekly-stats", uid, weekId],
    enabled: !!uid && optedIn,
    queryFn: () => loadOwnWeeklyQuestStats(uid),
  });

  const enableMut = useMutation({
    mutationFn: async () => {
      await writeSocialUserPrefs(uid, { leaderboardOptIn: true });
      await setDoc(
        doc(db, "publicProfiles", uid),
        { leaderboardOptIn: true, updatedAt: new Date().toISOString() },
        { merge: true },
      );
    },
    onSuccess: () => {
      toast({ title: "Leaderboard enabled" });
      qc.invalidateQueries({ queryKey: ["social-prefs", uid] });
    },
    onError: (e: any) =>
      toast({
        title: "Couldn't enable",
        description: e?.message ?? String(e),
        variant: "destructive",
      }),
  });

  const entries = useMemo(() => {
    if (!optedIn || !ownStatsQuery.data) return [];
    const ownValue =
      metric === "weeklyQuests" ? ownStatsQuery.data.quests : ownStatsQuery.data.xp;
    const rows: Array<{ uid: string; name: string; value: number; optIn: boolean }> = [
      {
        uid,
        name: character?.name ?? "You",
        value: ownValue,
        optIn: true,
      },
    ];

    const profiles = (profilesQuery.data ?? []) as ProfileWithOptIn[];
    for (const p of profiles) {
      if (!p.leaderboardOptIn) continue;
      rows.push({
        uid: p.uid,
        name: p.name,
        value: 0,
        optIn: true,
      });
    }

    return rankLeaderboard(rows);
  }, [optedIn, ownStatsQuery.data, profilesQuery.data, metric, uid, character?.name]);

  const optedInPeers = ((profilesQuery.data ?? []) as ProfileWithOptIn[]).filter(
    (p) => p.leaderboardOptIn,
  ).length;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" strokeWidth={2.4} />
          <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-leaderboard-title">
            Leaderboard
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Opt-in weekly ranks among friends or your party. Privacy stays on by default — enable
          in{" "}
          <Link href="/settings" className="underline text-primary">
            Settings
          </Link>{" "}
          or below.
        </p>
      </div>

      {!uid ? (
        <div className="surface rounded-2xl p-5 text-sm text-muted-foreground text-center">
          Sign in to view leaderboards.
        </div>
      ) : prefsQuery.isLoading ? (
        <div className="surface rounded-2xl p-5 text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : !optedIn ? (
        <section className="surface rounded-2xl p-5 space-y-3" data-testid="section-leaderboard-opt-in">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Opt-in required
          </div>
          <p className="text-sm text-muted-foreground">
            Weekly leaderboards only include people who explicitly opt in. Friend totals appear when
            they opt in and share progress on their public profile.
          </p>
          <button
            type="button"
            disabled={enableMut.isPending}
            onClick={() => enableMut.mutate()}
            data-testid="button-enable-leaderboard"
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover-elevate disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {enableMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Enable in Settings
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Or open{" "}
            <Link href="/settings" className="underline text-primary">
              Settings
            </Link>{" "}
            to manage privacy.
          </p>
        </section>
      ) : (
        <>
          <section className="surface rounded-2xl p-4 space-y-3" data-testid="section-leaderboard-controls">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Week {weekId}
            </div>
            <div className="flex gap-2">
              <ScopeButton active={scope === "friends"} onClick={() => setScope("friends")} testId="scope-friends">
                Friends
              </ScopeButton>
              <ScopeButton active={scope === "party"} onClick={() => setScope("party")} testId="scope-party">
                Party
              </ScopeButton>
            </div>
            <div className="flex gap-2">
              <ScopeButton
                active={metric === "weeklyXp"}
                onClick={() => setMetric("weeklyXp")}
                testId="metric-weekly-xp"
              >
                Weekly XP
              </ScopeButton>
              <ScopeButton
                active={metric === "weeklyQuests"}
                onClick={() => setMetric("weeklyQuests")}
                testId="metric-weekly-quests"
              >
                Quests this week
              </ScopeButton>
            </div>
          </section>

          <section className="space-y-2" data-testid="section-leaderboard-ranks">
            <h2 className="text-sm font-bold px-0.5">
              {scope === "friends" ? "Friends" : "Party"} ·{" "}
              {metric === "weeklyXp" ? "XP" : "Quests"}
            </h2>
            {ownStatsQuery.isLoading || profilesQuery.isLoading || (scope === "party" && partiesQuery.isLoading) ? (
              <div className="surface rounded-xl p-5 text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading ranks…
              </div>
            ) : entries.length === 0 ? (
              <div className="surface rounded-xl p-5 text-center text-sm text-muted-foreground">
                No opted-in members yet.
              </div>
            ) : (
              entries.map((e) => (
                <div
                  key={e.uid}
                  className="surface rounded-xl p-3 flex items-center gap-3"
                  data-testid={`leaderboard-row-${e.uid}`}
                >
                  <div className="font-num text-lg font-extrabold w-8 text-muted-foreground">
                    {e.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {e.uid === uid ? `${e.name} (you)` : e.name}
                    </div>
                    {e.uid !== uid && e.value === 0 && (
                      <div className="text-[11px] text-muted-foreground">
                        Weekly total pending
                      </div>
                    )}
                  </div>
                  <div className="font-num text-sm font-bold shrink-0">
                    {e.value}
                    <span className="text-[10px] text-muted-foreground font-normal ml-1">
                      {metric === "weeklyXp" ? "XP" : "q"}
                    </span>
                  </div>
                </div>
              ))
            )}
            {peerUids.length > 0 && optedInPeers === 0 && (
              <p className="text-xs text-muted-foreground px-0.5">
                Friend weekly totals appear when they opt in and share progress.
              </p>
            )}
            {scope === "party" && (partiesQuery.data?.length ?? 0) === 0 && (
              <p className="text-xs text-muted-foreground px-0.5">
                Join or create a party on{" "}
                <Link href="/social" className="underline text-primary">
                  Social
                </Link>
                .
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function ScopeButton({
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
      className={`flex-1 py-2 rounded-xl text-sm font-semibold hover-elevate ${
        active ? "bg-primary text-primary-foreground" : "bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}
