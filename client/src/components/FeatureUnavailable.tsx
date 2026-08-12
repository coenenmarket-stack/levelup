/**
 * Safe empty / unavailable state for launch-gated surfaces.
 */

import { Link } from "wouter";

export function FeatureUnavailable({
  title,
  body,
  backHref = "/",
  backLabel = "Back to Home",
  testId = "feature-unavailable",
}: {
  title: string;
  body: string;
  backHref?: string;
  backLabel?: string;
  testId?: string;
}) {
  return (
    <div className="space-y-4 px-1" data-testid={testId}>
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
      <Link
        href={backHref}
        className="inline-flex text-sm font-semibold text-primary underline"
        data-testid="link-feature-unavailable-home"
      >
        {backLabel}
      </Link>
    </div>
  );
}
