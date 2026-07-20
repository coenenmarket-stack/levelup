import { AnimatePresence, motion } from "framer-motion";

export type XPFloat = { id: number; amount: number };

export function XPFloats({ floats }: { floats: XPFloat[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-[90] flex justify-center">
      <AnimatePresence>
        {floats.map((f) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: -40, scale: 1 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            className="absolute font-num text-2xl font-extrabold gold-text"
            style={{ textShadow: "0 4px 24px hsl(43 88% 58% / 0.6)" }}
          >
            +{f.amount} XP
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
