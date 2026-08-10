/**
 * Invite / referral screen — measurable referrals with restrained rewards.
 */

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronLeft, Copy, Loader2, Share2, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useGame } from "@/lib/game";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  ensureInviteCode,
  inviteLinkForCode,
  shareText,
} from "@/lib/friends";
import {
  activateReferralAfterQuest,
  loadMyReferrals,
  redeemReferralCode,
} from "@/lib/social/api";
import { REFERRAL_MILESTONES } from "@/lib/social/referrals";

export default function InvitePage() {
  const { me } = useAuth();
  const { character } = useGame();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [codeInput, setCodeInput] = useState("");
  const uid = me?.id ? String(me.id) : "";

  useEffect(() => {
    try {
      const hash = window.location.hash || "";
      const q = hash.includes("?") ? hash.split("?")[1] : "";
      const params = new URLSearchParams(q || window.location.search);
      const code = params.get("code");
      if (code) setCodeInput(code.toUpperCase());
    } catch {
      /* ignore */
    }
  }, []);

  const inviteQuery = useQuery({
    queryKey: ["invite-code", uid],
    enabled: !!uid,
    queryFn: () => ensureInviteCode(),
  });

  const referralQuery = useQuery({
    queryKey: ["my-referrals", uid],
    enabled: !!uid,
    queryFn: () => loadMyReferrals(uid),
  });

  const inviteCode = inviteQuery.data?.inviteCode ?? "";
  const stats = referralQuery.data?.stats;

  const redeemMut = useMutation({
    mutationFn: (code: string) => redeemReferralCode(code),
    onSuccess: (data) => {
      toast({
        title: data.status === "accepted" ? "You're connected" : "Referral recorded",
        description:
          data.status === "accepted"
            ? "You're friends. Complete a quest to activate the referral for them."
            : "They'll need to accept your friend request. Your first quest activates the referral.",
      });
      setCodeInput("");
      qc.invalidateQueries({ queryKey: ["friendships", uid] });
      qc.invalidateQueries({ queryKey: ["my-referrals", uid] });
    },
    onError: (e: any) =>
      toast({
        title: "Couldn't redeem code",
        description: e?.message ?? String(e),
        variant: "destructive",
      }),
  });

  return (
    <div className="space-y-5 px-1">
      <div>
        <Link
          href="/friends"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover-elevate rounded-lg px-1 py-0.5 -ml-1 mb-2"
        >
          <ChevronLeft className="w-4 h-4" /> Friends
        </Link>
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" strokeWidth={2.4} />
          <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-invite-title">
            Invite
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Invite someone to Level Up Life. A referral becomes successful after they join and complete
          their first quest.
        </p>
      </div>

      <section className="surface rounded-2xl p-4 space-y-3" data-testid="section-referral-code">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Your referral code
        </div>
        <div className="flex items-center gap-2">
          <div
            className="font-num text-2xl font-extrabold tracking-[0.2em] flex-1"
            data-testid="text-referral-code"
          >
            {inviteQuery.isLoading ? "······" : inviteCode || "—"}
          </div>
          <button
            type="button"
            className="p-2 rounded-lg hover-elevate"
            disabled={!inviteCode}
            data-testid="button-copy-referral"
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
            data-testid="button-share-referral"
            onClick={async () => {
              if (!inviteCode || !character) return;
              try {
                await shareText(
                  "Join me on Level Up Life",
                  `${character.name} invited you to Level Up Life. Use code ${inviteCode}:`,
                  inviteLinkForCode(inviteCode),
                );
              } catch {
                /* cancelled */
              }
            }}
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Successful referrals:{" "}
          <span className="font-semibold text-foreground" data-testid="text-referral-activated">
            {stats?.activated ?? 0}
          </span>
          {stats != null && (
            <span className="text-muted-foreground">
              {" "}
              · joined {stats.joined} · invited {stats.invited + stats.joined}
            </span>
          )}
        </p>
      </section>

      <section className="surface rounded-2xl p-4 space-y-3" data-testid="section-redeem-referral">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Enter a friend's code
        </div>
        <div className="flex gap-2">
          <Input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            placeholder="ENTER CODE"
            className="font-num tracking-widest uppercase"
            data-testid="input-referral-code"
          />
          <button
            type="button"
            disabled={!codeInput.trim() || redeemMut.isPending}
            data-testid="button-redeem-referral"
            onClick={() => redeemMut.mutate(codeInput.trim())}
            className="px-3 rounded-xl bg-primary text-primary-foreground font-semibold hover-elevate disabled:opacity-60 flex items-center gap-1.5"
          >
            {redeemMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
          </button>
        </div>
      </section>

      <section className="space-y-2" data-testid="section-referral-milestones">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground px-1">
          Referral recognition
        </div>
        <ul className="space-y-2">
          {REFERRAL_MILESTONES.map((m) => {
            const done = (stats?.activated ?? 0) >= m.activated;
            return (
              <li
                key={m.achievementKey}
                className="surface rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="text-sm font-semibold">{m.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.activated} successful referral{m.activated === 1 ? "" : "s"}
                  </div>
                </div>
                <span className={`text-xs font-medium ${done ? "text-primary" : "text-muted-foreground"}`}>
                  {done ? "Earned" : "Locked"}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-[11px] text-muted-foreground px-1">
          Recognition is cosmetic — referrals are not an XP farm.
        </p>
      </section>

      {/* Dev/helper: no-op unless called — keeps activate path discoverable for QA */}
      {process.env.NODE_ENV === "development" && (
        <button
          type="button"
          className="hidden"
          data-testid="button-activate-referral-dev"
          onClick={() => void activateReferralAfterQuest("dev")}
        />
      )}
    </div>
  );
}
