import { Link } from "wouter";
import { ArrowRight, Sparkles } from "lucide-react";
import type { RecommendedNextAction } from "@/lib/personalization/nextAction";

export function RecommendedNextActionCard({ action }: { action: RecommendedNextAction }) {
  return (
    <section className="surface rounded-2xl p-4 border border-primary/25" data-testid="card-next-action">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        Recommended next
      </div>
      <div className="mt-1.5 font-bold text-base leading-snug">{action.title}</div>
      <p className="text-sm text-muted-foreground mt-1">{action.subtitle}</p>
      <p className="text-xs text-primary mt-2">{action.reason}</p>
      <Link
        href={action.href.replace("/#", "/").startsWith("/") ? action.href.split("#")[0]! : action.href}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover-elevate rounded-lg px-2 py-1 -ml-2"
        data-testid="button-next-action"
      >
        Go <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  );
}
