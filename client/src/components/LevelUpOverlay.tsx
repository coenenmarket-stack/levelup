import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function LevelUpOverlay({ open, level, onClose }: { open: boolean; level: number; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.7, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="surface-raised rounded-3xl px-8 py-10 text-center mx-6 emerald-glow"
            data-testid="overlay-level-up"
          >
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 1.2 }}
              className="flex justify-center mb-3"
            >
              <Sparkles className="w-10 h-10 text-accent" />
            </motion.div>
            <div className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Level Up</div>
            <div className="mt-2 text-6xl font-extrabold gold-text font-num">{level}</div>
            <div className="mt-3 text-foreground/90 max-w-xs">
              You've reached level <span className="text-primary font-semibold">{level}</span>. The grind pays off.
            </div>
            <button
              onClick={onClose}
              data-testid="button-close-level-up"
              className="mt-6 px-5 py-2 rounded-full bg-primary text-primary-foreground font-semibold hover-elevate active-elevate"
            >
              Continue the journey
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
