import { Crosshair } from "lucide-react";

type Props = {
  title: string;
  body: string;
};

export function TodaysFocusCard({ title, body }: Props) {
  return (
    <section className="surface rounded-2xl p-4 border border-primary/20" data-testid="card-todays-focus">
      <div className="flex items-center gap-2 mb-2">
        <Crosshair className="w-4 h-4 text-accent" />
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          Today&apos;s Focus
        </h2>
      </div>
      <div className="font-semibold text-sm" data-testid="text-focus-title">{title}</div>
      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed" data-testid="text-focus-body">
        {body}
      </p>
    </section>
  );
}
