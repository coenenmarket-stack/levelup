/**
 * Compact dashboard card for Phase 4 social signals.
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, Loader2, PartyPopper, Swords, Users } from "lucide-react";
import {
  loadMyParties,
  loadPartyChallenges,
  loadSharedChallengesForUser,
  loadSocialActivity,
  type PartyChallengeDoc,
} from "@/lib/social/api";
import { getSharedChallengeDef } from "@/lib/social/sharedChallenges";
import {
  renderSocialActivity,
  type SocialActivityType,
} from "@/lib/social/activity";

const ACTIVITY_PRIORITY: SocialActivityType[] = [
  "streak_milestone",
  "level_milestone",
  "achievement_unlocked",
  "referral_milestone",
];

type CardContent = {
  label: string;
  headline: string;
  progress: string;
  href: string;
  cta: string;
  icon: "challenge" | "party" | "activity";
  testId: string;
};

export function SocialHomeCard({ uid }: { uid: string }) {
  const sharedQuery = useQuery({
    queryKey: ["shared-challenges", uid],
    enabled: !!uid,
    queryFn: () => loadSharedChallengesForUser(uid),
  });

  const partiesQuery = useQuery({
    queryKey: ["my-parties", uid],
    enabled: !!uid,
    queryFn: () => loadMyParties(uid),
  });

  const partyIds = (partiesQuery.data ?? []).map((p) => p.id).join(",");

  const partyChallengesQuery = useQuery({
    queryKey: ["home-party-challenges", uid, partyIds],
    enabled: !!uid && (partiesQuery.data?.length ?? 0) > 0,
    queryFn: async () => {
      const parties = partiesQuery.data ?? [];
      const all: PartyChallengeDoc[] = [];
      for (const p of parties) {
        const list = await loadPartyChallenges(p.id);
        all.push(...list);
      }
      return all;
    },
  });

  const activityQuery = useQuery({
    queryKey: ["social-activity-home", uid],
    enabled: !!uid,
    queryFn: () => loadSocialActivity(uid),
  });

  const content = pickContent({
    shared: sharedQuery.data,
    partyChallenges: partyChallengesQuery.data,
    activity: activityQuery.data,
  });

  const loading =
    sharedQuery.isLoading ||
    partiesQuery.isLoading ||
    (partiesQuery.data && partiesQuery.data.length > 0 && partyChallengesQuery.isLoading) ||
    activityQuery.isLoading;

  if (!uid) return null;

  if (loading && !content) {
    return (
      <section className="surface rounded-2xl p-4" data-testid="card-social-loading">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Social…
        </div>
      </section>
    );
  }

  if (!content) return null;

  const Icon =
    content.icon === "challenge" ? Swords : content.icon === "party" ? PartyPopper : Users;

  return (
    <section className="surface rounded-2xl p-4 space-y-2" data-testid={content.testId}>
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-accent" />
        {content.label}
      </div>
      <div className="font-bold text-base leading-snug">{content.headline}</div>
      <p className="text-sm text-muted-foreground">{content.progress}</p>
      <Link
        href={content.href}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover-elevate rounded-lg px-1 py-0.5 -ml-1"
        data-testid="link-social-home-cta"
      >
        {content.cta} <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  );
}

function pickContent(opts: {
  shared?: Awaited<ReturnType<typeof loadSharedChallengesForUser>>;
  partyChallenges?: PartyChallengeDoc[];
  activity?: Array<{ id: string; type?: string; payload?: Record<string, string | number | boolean | null>; actorUid?: string }>;
}): CardContent | null {
  const activeShared = (opts.shared ?? []).find((c) => c.status === "active");
  if (activeShared) {
    const def = getSharedChallengeDef(activeShared.defId);
    return {
      label: "Shared challenge",
      headline: def?.title ?? "Active challenge",
      progress: `${activeShared.progress}/${activeShared.target}${
        activeShared.endsAt ? ` · ends ${activeShared.endsAt}` : ""
      }`,
      href: "/social",
      cta: "Open social",
      icon: "challenge",
      testId: "card-social-shared-challenge",
    };
  }

  const activeParty = (opts.partyChallenges ?? []).find((c) => c.status === "active");
  if (activeParty) {
    return {
      label: "Party challenge",
      headline: activeParty.title ?? "Active party challenge",
      progress: `${activeParty.progress}/${activeParty.target}${
        activeParty.endsAt ? ` · ends ${activeParty.endsAt}` : ""
      }`,
      href: "/social",
      cta: "View party",
      icon: "party",
      testId: "card-social-party-challenge",
    };
  }

  const activity = opts.activity ?? [];
  const meaningful = activity.find((a) =>
    ACTIVITY_PRIORITY.includes(a.type as SocialActivityType),
  );
  if (meaningful && meaningful.type) {
    const type = meaningful.type as SocialActivityType;
    const message = renderSocialActivity(type, meaningful.payload ?? {});
    return {
      label: "Social",
      headline: message,
      progress: "Recent activity from your circle",
      href: type === "referral_milestone" ? "/invite" : "/friends",
      cta: "See friends",
      icon: "activity",
      testId: "card-social-activity",
    };
  }

  return null;
}

export default SocialHomeCard;
