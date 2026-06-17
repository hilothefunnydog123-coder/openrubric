"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Reveal — a scroll-into-view entrance (fade + gentle rise), used to give the
 * marketing page a cohesive, animated feel. Honors prefers-reduced-motion (fades
 * only, no movement). Animates once.
 *
 * Note: do NOT wrap content that contains a position:fixed overlay — the lingering
 * transform would re-anchor it. (The hero's preview panel is intentionally not wrapped.)
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
