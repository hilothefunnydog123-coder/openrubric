"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Cinematic effect primitives, layered on top of components/ui/reveal.tsx.
 *
 * reveal.tsx owns *entrances* (things arriving once, on scroll-in). This file owns
 * *continuous* effects that respond to the pointer or the scroll position. Same
 * rules apply to both: one easing curve, and every effect degrades to "nothing
 * moves" under prefers-reduced-motion.
 */

/* ------------------------------------------------------------------ */
/* ScrollProgress                                                      */
/* ------------------------------------------------------------------ */

/**
 * A hairline accent bar pinned to the very top of the viewport that fills as the
 * page scrolls. Sits above the sticky header (z-60) and is purely decorative.
 */
export function ScrollProgress({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className={cn(
        "fixed inset-x-0 top-0 z-[60] h-[2.5px] origin-left",
        "bg-[linear-gradient(90deg,#5d5fef_0%,#9aa4ff_45%,#0a9d63_100%)]",
        className,
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Spotlight                                                           */
/* ------------------------------------------------------------------ */

/**
 * A soft radial highlight that tracks the pointer across its parent. Renders an
 * absolutely-positioned, pointer-events-none overlay, so drop it inside any
 * `relative` container and it lights that container up on hover.
 *
 * The parent is what gets the listener, so the glow follows the cursor across the
 * whole panel, not just this element.
 */
export function Spotlight({
  size = 520,
  color = "rgba(154,164,255,0.16)",
  className,
}: {
  /** Diameter of the glow in px. */
  size?: number;
  /** Center color of the glow — fades to transparent. */
  color?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const opacity = useMotionValue(0);

  const smoothX = useSpring(x, { stiffness: 220, damping: 32, mass: 0.35 });
  const smoothY = useSpring(y, { stiffness: 220, damping: 32, mass: 0.35 });
  const smoothOpacity = useSpring(opacity, { stiffness: 120, damping: 26 });

  useEffect(() => {
    if (reduce) return;
    const host = ref.current?.parentElement;
    if (!host) return;

    // Only worth wiring up on devices with a real pointer.
    if (!window.matchMedia("(pointer: fine)").matches) return;

    function onMove(e: PointerEvent) {
      const rect = host!.getBoundingClientRect();
      x.set(e.clientX - rect.left);
      y.set(e.clientY - rect.top);
      opacity.set(1);
    }
    function onLeave() {
      opacity.set(0);
    }

    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [reduce, x, y, opacity]);

  const background = useMotionTemplate`radial-gradient(${size}px circle at ${smoothX}px ${smoothY}px, ${color}, transparent 72%)`;

  if (reduce) return null;

  return (
    <motion.div
      ref={ref}
      aria-hidden
      style={{ background, opacity: smoothOpacity }}
      className={cn("pointer-events-none absolute inset-0 z-0", className)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Magnetic                                                            */
/* ------------------------------------------------------------------ */

/**
 * Pulls its child a few pixels toward the cursor while the cursor is nearby, then
 * springs back on leave. Used on the two primary CTAs only — it's a "this is the
 * button" signal, and it stops meaning that if everything does it.
 *
 * Renders an inline-block wrapper, so the child keeps its own sizing.
 */
export function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: ReactNode;
  /** 0 = inert, 1 = the child sits exactly under the cursor. */
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 20, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 260, damping: 20, mass: 0.5 });

  function onMove(e: React.PointerEvent<HTMLSpanElement>) {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={reduce ? undefined : { x: sx, y: sy }}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.span>
  );
}

/* ------------------------------------------------------------------ */
/* ScrollTilt                                                          */
/* ------------------------------------------------------------------ */

/**
 * Stands its child up out of the page as it scrolls into view: starts laid back on
 * the X axis and settles flat, driven by scroll position rather than a one-shot
 * animation, so scrubbing back up re-lays it down.
 *
 * IMPORTANT: this leaves a persistent transform on the wrapper, which creates a
 * containing block for descendant `position: fixed` elements. The wrapper resets
 * to `transform: none` once the child is upright (progress ≥ 0.98) precisely so the
 * hero preview's fullscreen overlay still anchors to the viewport.
 */
export function ScrollTilt({
  children,
  className,
  /** Degrees of lay-back at the start. */
  deg = 9,
  /** Force `transform: none` — set this while a descendant is showing a fullscreen
      overlay, so the overlay anchors to the viewport and not to this wrapper. */
  frozen = false,
}: {
  children: ReactNode;
  className?: string;
  deg?: number;
  frozen?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [flat, setFlat] = useState(false);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 92%", "start 22%"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.5 });

  const rotateX = useTransform(smooth, [0, 1], [deg, 0]);
  const scale = useTransform(smooth, [0, 1], [0.955, 1]);
  const y = useTransform(smooth, [0, 1], [40, 0]);

  // Once upright, drop the transform entirely (see the containing-block note above).
  useEffect(() => smooth.on("change", (v) => setFlat(v >= 0.98)), [smooth]);

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      style={
        flat || frozen
          ? { transform: "none" }
          : { rotateX, scale, y, transformPerspective: 1600, transformOrigin: "50% 100%" }
      }
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Marquee                                                             */
/* ------------------------------------------------------------------ */

/**
 * An endlessly scrolling strip. Children are rendered twice and the track slides
 * exactly -50%, so the seam is invisible. Pure CSS transform — no JS per frame.
 */
export function Marquee({
  children,
  speed = 38,
  reverse = false,
  className,
}: {
  children: ReactNode;
  /** Seconds for one full loop. Larger = slower. */
  speed?: number;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("group relative flex overflow-hidden", className)}>
      {[0, 1].map((i) => (
        <div
          key={i}
          aria-hidden={i === 1}
          className={cn(
            "flex min-w-full flex-shrink-0 items-center",
            reverse ? "animate-marquee-reverse" : "animate-marquee",
            "group-hover:[animation-play-state:paused] motion-reduce:animate-none",
          )}
          style={{ animationDuration: `${speed}s` }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ShineBorder                                                         */
/* ------------------------------------------------------------------ */

/**
 * Wraps a child in a slowly-rotating conic-gradient rim: a spinning square sits
 * behind an opaque inner surface, and the 1.5px of padding is the only place it
 * shows through. The square is sized off the *width* (`aspect-square w-[180%]`) so
 * it stays larger than the wrapper's diagonal and never exposes a corner as it
 * turns — that's what the outer `overflow-hidden` + radius clips.
 */
export function ShineBorder({
  children,
  className,
  innerClassName,
  radius = "999px",
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  radius?: string;
}) {
  return (
    <span
      className={cn("relative inline-flex overflow-hidden p-[1.5px]", className)}
      style={{ borderRadius: radius }}
    >
      <span
        aria-hidden
        className="animate-rim-spin absolute left-1/2 top-1/2 aspect-square w-[180%] -translate-x-1/2 -translate-y-1/2 motion-reduce:animate-none"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, #9aa4ff 55deg, #ffffff 100deg, #7fbf9a 155deg, transparent 220deg, transparent 360deg)",
        }}
      />
      <span
        className={cn("relative inline-flex w-full", innerClassName)}
        style={{ borderRadius: radius }}
      >
        {children}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* useActiveStep                                                       */
/* ------------------------------------------------------------------ */

/**
 * Reports which of N scroll sections is currently closest to the middle of the
 * viewport. Backs the pinned "mechanism" narrative: the left column scrolls, the
 * right column swaps to match.
 *
 * Returns the ref callback to attach to each section and the active index.
 */
export function useActiveStep(count: number) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const nodes = refs.current.filter(Boolean) as HTMLElement[];
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the most-visible section rather than the first to cross the line —
        // fast scrolls can fire several entries in one callback.
        let best: { index: number; ratio: number } | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = nodes.indexOf(entry.target as HTMLElement);
          if (index < 0) continue;
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { index, ratio: entry.intersectionRatio };
          }
        }
        if (best) setActive(best.index);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [count]);

  const setRef = (index: number) => (el: HTMLElement | null) => {
    refs.current[index] = el;
  };

  return { setRef, active };
}
