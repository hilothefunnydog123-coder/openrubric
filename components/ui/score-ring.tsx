"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * A circular progress dial. Two uses across the app:
 *   • a judge's own score on a project card (`value` / `max`, label = the number)
 *   • how far through the queue a judge is (`value` = done, `max` = total)
 *
 * The arc sweeps on mount and animates between values, so a score changing is
 * visible rather than a silent text swap. Colour follows the app's ink/accent
 * tokens, so it themes with everything else.
 */
export function ScoreRing({
  value,
  max,
  size = 44,
  stroke = 4,
  label,
  sublabel,
  tone = "accent",
  className,
}: {
  value: number;
  max: number;
  /** Outer diameter in px. */
  size?: number;
  /** Arc thickness in px. */
  stroke?: number;
  /** Centred text. Defaults to `value`. */
  label?: string;
  /** Tiny second line under the label — only legible at size ≥ 64. */
  sublabel?: string;
  tone?: "accent" | "ink" | "clean";
  className?: string;
}) {
  const reduce = useReducedMotion();
  const safeMax = max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(1, value / safeMax));

  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  const arcColor =
    tone === "ink" ? "rgb(var(--foreground))" : tone === "clean" ? "#4FB286" : "rgb(var(--accent))";

  return (
    <div
      className={cn("relative inline-flex flex-shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${value} of ${max}`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--sunken))"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={arcColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduce ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ duration: reduce ? 0 : 0.9, ease: EASE }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span
          className="font-mono font-semibold tabular-nums text-ink"
          style={{ fontSize: Math.max(10, Math.round(size * 0.3)) }}
        >
          {label ?? value}
        </span>
        {sublabel && size >= 64 && (
          <span className="mt-[3px] font-mono text-[9px] uppercase tracking-[0.1em] text-faint">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
