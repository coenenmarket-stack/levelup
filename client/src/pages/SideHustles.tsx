import { Briefcase, Package, FileText, Camera, Lock } from "lucide-react";

const TRACKS = [
  {
    id: "reseller",
    name: "Reseller",
    icon: Package,
    tagline: "Flip thrift, clearance, and online finds for profit.",
    color: "text-primary",
  },
  {
    id: "digital-products",
    name: "Digital Products",
    icon: FileText,
    tagline: "Build once, sell forever. Templates, PDFs, printables.",
    color: "text-accent",
  },
  {
    id: "content-creator",
    name: "Content Creator",
    icon: Camera,
    tagline: "Turn your phone and a niche into an audience and income.",
    color: "text-primary",
  },
];

export default function SideHustlesPage() {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-primary" strokeWidth={2.4} />
          <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-page-title">Side Hustles</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Three full tracks coming soon. Pick your path — each has 3 tiers from beginner to pro.
        </p>
      </div>

      <div className="space-y-3">
        {TRACKS.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.id}
              data-testid={`track-${t.id}`}
              className="surface rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden"
            >
              <div className="w-11 h-11 rounded-xl bg-card border border-card-border flex items-center justify-center shrink-0">
                <Icon className={`w-5 h-5 ${t.color}`} strokeWidth={2.4} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold">{t.name}</div>
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground bg-secondary/60 rounded-full px-2 py-0.5">
                    <Lock className="w-3 h-3" />
                    Coming soon
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{t.tagline}</div>
                <div className="mt-2 flex gap-1.5">
                  {["Tier 1", "Tier 2", "Tier 3"].map((tier) => (
                    <span
                      key={tier}
                      className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground border border-card-border rounded-md px-2 py-0.5"
                    >
                      {tier}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-center text-muted-foreground px-4 pt-2">
        The Side Hustle Academy launches in the next update. Want first access? Support the app to help unlock it faster.
      </p>
    </div>
  );
}
