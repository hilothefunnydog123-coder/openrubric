"use client";

import { motion } from "framer-motion";

/**
 * Per-route mount transition. A Next.js template re-mounts on every navigation, so
 * this gives the whole app a soft cross-fade between pages.
 *
 * Opacity-only on purpose: a transform here would establish a containing block for
 * position:fixed / sticky descendants (the hero preview's maximize overlay, the
 * sticky marketing nav), so we never animate transform at this level.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
