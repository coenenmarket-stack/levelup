import { Link } from "wouter";
import { writePersonalization } from "@/lib/personalization/store";
import type { PersonalizationPrefs } from "@/lib/personalization/types";

export function SoftPersonalizePrompt({
  uid,
  prefs,
  onDismissed,
}: {
  uid: string;
  prefs: PersonalizationPrefs;
  onDismissed: (next: PersonalizationPrefs) => void;
}) {
  if (prefs.personalizationCompleted || prefs.softPromptDismissedAt) return null;

  return (
    <section className="surface rounded-2xl p-4 border border-accent/30" data-testid="soft-personalize-prompt">
      <div className="font-bold">Personalize Level Up Life</div>
      <p className="text-sm text-muted-foreground mt-1">
        Tell us what you&apos;re working toward and we&apos;ll tailor quests and recommendations.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/personalize"
          className="rounded-xl bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold hover-elevate"
          data-testid="button-personalize-now"
        >
          Personalize My Plan
        </Link>
        <button
          type="button"
          className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover-elevate"
          data-testid="button-personalize-later"
          onClick={() => {
            void (async () => {
              const next = await writePersonalization(uid, {
                softPromptDismissedAt: new Date().toISOString(),
              });
              onDismissed(next);
            })();
          }}
        >
          Maybe Later
        </button>
      </div>
    </section>
  );
}
