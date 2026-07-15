"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * CountUp — a number that ticks up from 0 when it scrolls into view.
 * Renders the final value on the server so SEO / no-JS still sees it.
 */
export function CountUp({
  value,
  duration = 1.4,
  delay = 0,
  className,
}: {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!inView || reduce || !ref.current) return;
    const node = ref.current;
    const controls = animate(0, value, {
      duration,
      delay,
      ease: EASE,
      onUpdate: (v) => {
        node.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [inView, reduce, value, duration, delay]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}

/**
 * MeterFill — a progress-bar fill that sweeps from 0 to its width when the bar
 * scrolls into view. Server-renders at full width for no-JS visitors.
 */
export function MeterFill({
  pct,
  delay = 0,
  className,
}: {
  /** Target width, e.g. "88%". */
  pct: string;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      style={{ width: pct }}
      initial={reduce ? false : { width: "0%" }}
      whileInView={{ width: pct }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 1.1, ease: EASE, delay }}
    />
  );
}
