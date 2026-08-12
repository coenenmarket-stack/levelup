import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { XPBar } from "@/components/XPBar";
import type { CoreStatInfo } from "@/lib/statInfo";
import { Sparkles, TrendingUp, Swords } from "lucide-react";

type Props = {
  stat: CoreStatInfo | null;
  value: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StatDetailDialog({ stat, value, open, onOpenChange }: Props) {
  if (!stat) return null;

  const capped = Math.max(0, Math.min(100, value));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md sm:rounded-2xl p-0 overflow-hidden border-card-border"
        data-testid={`dialog-stat-${stat.key}`}
      >
        <div
          className="px-6 pt-6 pb-5"
          style={{
            background: `linear-gradient(135deg, ${stat.color}22 0%, transparent 60%)`,
          }}
        >
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                style={{
                  background: `${stat.color}22`,
                  border: `1px solid ${stat.color}55`,
                }}
              >
                {stat.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-xl font-extrabold tracking-tight">
                  {stat.label}
                </DialogTitle>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-num text-2xl font-bold" style={{ color: stat.color }}>
                    {capped}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary/50 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${capped}%`,
                  background: `linear-gradient(90deg, ${stat.color}, ${stat.color}aa)`,
                }}
              />
            </div>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed sr-only">
              {stat.summary}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <InfoBlock
            icon={<Sparkles className="w-4 h-4" style={{ color: stat.color }} />}
            title="What it is"
            body={stat.summary}
          />
          <InfoBlock
            icon={<TrendingUp className="w-4 h-4" style={{ color: stat.color }} />}
            title="How it improves your life"
            body={stat.improvesLife}
          />
          <InfoBlock
            icon={<Swords className="w-4 h-4" style={{ color: stat.color }} />}
            title="How to level it up"
            body={stat.howToLevel}
          />

          <div className="pt-1">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
              Progress
            </div>
            <XPBar value={capped} max={100} showText={false} height="h-2" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoBlock({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed pl-6">{body}</p>
    </div>
  );
}
