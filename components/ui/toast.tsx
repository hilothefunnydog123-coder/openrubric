"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, X } from "lucide-react";

/**
 * A single, self-dismissing toast. Rendered fixed at the bottom-center; the parent
 * owns the message state and clears it (auto-timeout + manual dismiss).
 */
export function Toast({
  message,
  tone = "error",
  onDismiss,
}: {
  message: string | null;
  tone?: "error" | "success";
  onDismiss: () => void;
}) {
  const toneClass =
    tone === "error"
      ? "border-[rgba(180,69,60,0.35)] text-signal-high"
      : "border-[rgba(46,138,94,0.35)] text-signal-clean";

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.97 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className={`fixed inset-x-0 bottom-6 z-[60] mx-auto flex w-fit max-w-[90vw] items-center gap-2.5 rounded-control border bg-surface px-4 py-3 text-[13.5px] shadow-card ${toneClass}`}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" strokeWidth={2} />
          <span className="text-ink">{message}</span>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="ml-1 text-faint transition-colors hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
