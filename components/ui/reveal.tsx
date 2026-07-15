"use client";

import type { ReactNode } from "react";
import { Fragment, useMemo } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

/**
 * Motion primitives for the marketing surfaces. One easing curve everywhere
 * (a long-tail ease-out) so every entrance feels like part of the same system.
 * Every primitive honors prefers-reduced-motion (fades only, no movement) and
 * animates exactly once per viewport entry.
 */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const VIEWPORT = { once: true, margin: "0px 0px -12% 0px" } as const;

/**
 * Reveal, a scroll-into-view entrance (fade + gentle rise + focus-pull blur).
 *
 * Note: do NOT wrap content that contains a position:fixed overlay, the lingering
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
      initial={reduce ? { opacity: 0 } : { opacity: 0, y, filter: "blur(6px)" }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={VIEWPORT}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger / StaggerItem, a container that cascades its children in one after
 * another as it scrolls into view. Wrap each animated child in <StaggerItem>.
 *
 *   <Stagger className="grid ...">
 *     {cells.map((c) => <StaggerItem key={c.id}>…</StaggerItem>)}
 *   </Stagger>
 */
export function Stagger({
  children,
  className,
  delay = 0,
  gap = 0.08,
}: {
  children: ReactNode;
  className?: string;
  /** Delay before the first child starts. */
  delay?: number;
  /** Seconds between each child. */
  gap?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: gap, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const variants: Variants = reduce
    ? {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
      }
    : {
        hidden: { opacity: 0, y: 20, filter: "blur(5px)" },
        show: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.65, ease: EASE },
        },
      };
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}

/**
 * SplitWords, the cinematic headline treatment: each word rises out of its own
 * clip mask with a slight settle, cascading left to right.
 *
 * `*asterisk*` spans render in accent italic (Fraunces italic carries the
 * editorial voice): `text="Everyone can *trust*."`
 *
 * Rendered as spans inside whatever element wraps it, so use it inside an
 * <h1>/<h2> to keep semantics + SEO intact.
 */
export function SplitWords({
  text,
  delay = 0,
  gap = 0.045,
  className,
}: {
  text: string;
  delay?: number;
  /** Seconds between each word. */
  gap?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  // "an *open rubric.*" → [{word: "an"}, {word: "open", em: true}, {word: "rubric.", em: true}]
  // Emphasis can span words: a leading * opens it, a trailing * closes it.
  const words = useMemo(() => {
    let inEm = false;
    return text.split(/\s+/).map((raw) => {
      const opens = raw.startsWith("*");
      const closes = raw.endsWith("*") && raw.length > 1;
      const em = inEm || opens;
      if (opens) inEm = true;
      if (closes) inEm = false;
      return { word: raw.replace(/\*/g, ""), em };
    });
  }, [text]);

  if (reduce) {
    return (
      <motion.span
        className={className}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={VIEWPORT}
        transition={{ duration: 0.6, delay }}
      >
        {words.map((w, i) => (
          <Fragment key={i}>
            {i > 0 && " "}
            <span className={w.em ? "italic text-accent" : undefined}>{w.word}</span>
          </Fragment>
        ))}
      </motion.span>
    );
  }

  return (
    <motion.span
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: gap, delayChildren: delay } },
      }}
      aria-label={words.map((w) => w.word).join(" ")}
    >
      {words.map((w, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          {/* pb/-mb keep descenders (g, y, j) outside the clip without shifting layout */}
          <span aria-hidden className="inline-block overflow-hidden pb-[0.14em] -mb-[0.14em] align-bottom">
            <motion.span
              className={
                "inline-block will-change-transform" + (w.em ? " italic text-accent" : "")
              }
              variants={{
                hidden: { y: "115%", rotate: 2.5 },
                show: {
                  y: "0%",
                  rotate: 0,
                  transition: { duration: 0.85, ease: EASE },
                },
              }}
            >
              {w.word}
            </motion.span>
          </span>
        </Fragment>
      ))}
    </motion.span>
  );
}
