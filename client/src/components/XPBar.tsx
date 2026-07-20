import { motion } from "framer-motion";

export function XPBar({ value, max, showText = true, height = "h-3" }: {
  value: number; max: number; showText?: boolean; height?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="space-y-1.5">
      <div className={`${height} w-full rounded-full bg-secondary/60 overflow-hidden border border-card-border`}>
        <motion.div
          className="h-full xp-bar-fill rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>
      {showText && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-num">{value.toLocaleString()} XP</span>
          <span className="font-num">{max.toLocaleString()} XP</span>
        </div>
      )}
    </div>
  );
}
