"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/ui/reveal";
import { useActiveStep } from "@/components/ui/motion-fx";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * DESIGN.md act: "How it works" — three moves from Devpost to final rankings.
 *
 * Rebuilt as a pinned narrative instead of three static cards: the left column
 * scrolls through the steps while a sticky dark panel on the right swaps to the
 * matching product view. The active step is whichever one is nearest the middle of
 * the viewport (IntersectionObserver, not scroll math, so it stays correct through
 * fast scrolls and resizes).
 *
 * Below `lg` the sticky column can't work, so each step renders its own visual
 * inline underneath it and the layout degrades to a plain vertical read.
 */
const STEPS = [
  {
    num: "01",
    title: "Import submissions",
    body: "Pull projects from a Devpost URL, upload a CSV, or add them by hand. Nothing to install for participants.",
    caption: "Devpost · CSV · manual",
  },
  {
    num: "02",
    title: "Score on one rubric",
    body: "Paste your rubric once. Every judge grades the same weighted criteria, with comments tied to each line.",
    caption: "One rubric, every judge",
  },
  {
    num: "03",
    title: "Publish winners",
    body: "Judge scores aggregate into per-track leaderboards. Review cases get resolved before anything goes public.",
    caption: "Per-track leaderboards",
  },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function ActMechanism({ id }: { id?: string }) {
  const { setRef, active } = useActiveStep(STEPS.length);
  const reduce = useReducedMotion();

  return (
    <section id={id} className="border-b border-line bg-surface">
      <div className="mx-auto w-full max-w-[1180px] px-[clamp(18px,4vw,34px)] py-[clamp(56px,8vw,110px)]">
        <Reveal y={10}>
          <p className="kicker mb-5 text-accent">03 · The mechanism</p>
        </Reveal>
        <h2 className="mb-4 max-w-[18ch] font-display text-[clamp(1.8rem,4vw,3rem)] font-bold leading-[1.05] tracking-[-0.04em]">
          From Devpost to final rankings in three moves.
        </h2>
        <Reveal delay={0.15} y={12}>
          <p className="mb-[clamp(32px,5vw,64px)] max-w-[52ch] text-[17px] font-medium leading-[1.65] text-ink">
            No spreadsheets, no averaging by hand.{" "}
            <b className="font-bold">The rubric is the source of truth</b> from the first import to
            the final export.
          </p>
        </Reveal>

        <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          {/* ---- left: the steps, on a progress rail ---- */}
          <div className="relative">
            <span
              aria-hidden
              className="absolute bottom-2 left-0 top-2 hidden w-px bg-line lg:block"
            />
            <motion.span
              aria-hidden
              className="absolute bottom-2 left-0 top-2 hidden w-px origin-top bg-accent lg:block"
              initial={false}
              animate={{ scaleY: (active + 1) / STEPS.length }}
              transition={{ duration: 0.6, ease: EASE }}
            />

            <ol className="flex flex-col">
              {STEPS.map((s, i) => {
                const isActive = i === active;
                return (
                  <li
                    key={s.num}
                    ref={setRef(i)}
                    className="relative lg:min-h-[46vh] lg:pl-8 lg:last:min-h-[32vh]"
                  >
                    {/* rail node */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute -left-[5px] top-[0.45rem] hidden h-[11px] w-[11px] rounded-full border-2 transition-colors duration-500 lg:block",
                        isActive ? "border-accent bg-accent" : "border-line bg-surface",
                      )}
                    />
                    <div
                      className={cn(
                        "py-8 lg:border-t-0 lg:py-0",
                        // `first:` would always match (this div is its <li>'s only
                        // child), so the divider is driven by the index instead.
                        i > 0 && "border-t border-line",
                        "lg:transition-opacity lg:duration-700",
                        isActive ? "lg:opacity-100" : "lg:opacity-40",
                      )}
                    >
                      <p
                        className={cn(
                          "kicker mb-4 transition-colors duration-500",
                          isActive ? "text-accent" : "text-ink/45",
                        )}
                      >
                        {s.num} · {s.caption}
                      </p>
                      <h3 className="mb-3 font-display text-[clamp(1.3rem,2.4vw,1.85rem)] font-bold tracking-[-0.03em]">
                        {s.title}
                      </h3>
                      <p className="max-w-[42ch] text-[15.5px] font-medium leading-[1.65] text-ink">
                        {s.body}
                      </p>

                      {/* inline visual, small screens only */}
                      <div className="mt-6 rounded-[16px] border border-line-dark bg-panel-900 p-5 lg:hidden">
                        <StepVisual step={i} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* ---- right: sticky panel that follows the active step ---- */}
          <div className="hidden lg:block">
            <div className="sticky top-[clamp(88px,12vh,132px)]">
              <div className="relative overflow-hidden rounded-[18px] border border-line-dark bg-panel-900 p-6 shadow-panel">
                <div
                  aria-hidden
                  className="bg-rubric-grid pointer-events-none absolute inset-0 opacity-60"
                />
                <div className="relative mb-5 flex items-center justify-between border-b border-line-darker pb-4">
                  <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7A7A7A]">
                    {STEPS[active].caption}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-[#7A7A7A]">
                    <span className="text-white">{STEPS[active].num}</span> / 03
                  </span>
                </div>

                <div className="relative min-h-[268px]">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={active}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, filter: "blur(6px)" }}
                      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, filter: "blur(6px)" }}
                      transition={{ duration: 0.45, ease: EASE }}
                    >
                      <StepVisual step={active} />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Reveal delay={0.2} y={10}>
          <p className="mt-[clamp(32px,5vw,56px)] text-[14.5px] font-semibold">
            <Link
              href={ROUTES.docs}
              className="group inline-flex items-center gap-1.5 text-accent transition-opacity hover:opacity-75"
            >
              Read exactly how judging works
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Per-step product views                                              */
/* ------------------------------------------------------------------ */

function StepVisual({ step }: { step: number }) {
  if (step === 0) return <ImportView />;
  if (step === 1) return <ScoreView />;
  return <PublishView />;
}

const IMPORTS = [
  { name: "Lighthouse", team: "Team Beacon", source: "Devpost" },
  { name: "MediScan", team: "Team Vital", source: "Devpost" },
  { name: "CampusLoop", team: "Team Quad", source: "CSV" },
  { name: "StudyForge", team: "Team Anvil", source: "Manual" },
];

function ImportView() {
  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1 flex items-center gap-2 overflow-hidden rounded-[9px] border border-line-dark bg-panel px-3 py-2 font-mono text-[12px] text-[#8A8A8A]">
        <span className="live-blink h-1.5 w-1.5 flex-shrink-0 rounded-full bg-signal-clean-dot" />
        <span className="truncate">devpost.com/hackathons/your-event</span>
      </div>
      {IMPORTS.map((p, i) => (
        <motion.div
          key={p.name}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.08 + i * 0.09 }}
          className="flex items-center gap-3 rounded-[11px] border border-line-dark bg-panel-800 px-3.5 py-2.5"
        >
          <span className="font-mono text-[11px] tabular-nums text-[#6A6A6A]">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="flex-1 truncate text-[13.5px] font-medium text-white">{p.name}</span>
          <span className="hidden font-mono text-[11px] text-[#7A7A7A] sm:inline">{p.team}</span>
          <span className="rounded-md border border-line-dark px-2 py-[2px] font-mono text-[10px] uppercase tracking-[0.1em] text-[#9A9A9A]">
            {p.source}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

const CRITERIA = [
  { name: "Innovation", value: 22, max: 25 },
  { name: "Technical", value: 26, max: 30 },
  { name: "Functionality", value: 21, max: 25 },
  { name: "Design / UX", value: 18, max: 20 },
];

function ScoreView() {
  return (
    <div className="flex flex-col gap-4">
      {CRITERIA.map((c, i) => (
        <div key={c.name}>
          <div className="mb-[7px] flex items-center justify-between">
            <span className="text-[13.5px] font-medium text-white">{c.name}</span>
            <span className="font-mono text-[12px] tabular-nums text-[#E4E4E4]">
              {c.value}
              <span className="text-[#7A7A7A]"> / {c.max}</span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-[3px] bg-[#181818]">
            <motion.div
              className="h-full rounded-[3px] bg-accent"
              initial={{ width: "0%" }}
              animate={{ width: `${Math.round((c.value / c.max) * 100)}%` }}
              transition={{ duration: 0.85, ease: EASE, delay: 0.12 + i * 0.09 }}
            />
          </div>
        </div>
      ))}
      <div className="mt-1 flex items-center justify-between border-t border-line-darker pt-4">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#7A7A7A]">
          Judge · A. Reyes
        </span>
        <span className="font-display text-[24px] font-bold leading-none tabular-nums text-white">
          87<span className="text-[15px] text-[#7A7A7A]"> / 100</span>
        </span>
      </div>
    </div>
  );
}

const RANKS = [
  { rank: "01", name: "Lighthouse", score: 87 },
  { rank: "02", name: "MediScan", score: 83 },
  { rank: "03", name: "CampusLoop", score: 79 },
  { rank: "04", name: "StudyForge", score: 76 },
];

function PublishView() {
  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#7A7A7A]">
        <span>Track · Health AI</span>
        <span>3 judges · aggregated</span>
      </div>
      {RANKS.map((r, i) => (
        <motion.div
          key={r.name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.08 + i * 0.09 }}
          className={cn(
            "flex items-center gap-3 rounded-[11px] border px-3.5 py-3",
            i === 0 ? "border-accent/45 bg-[rgba(93,95,239,0.13)]" : "border-line-dark bg-panel-800",
          )}
        >
          <span
            className={cn(
              "w-[20px] font-mono text-[12px] tabular-nums",
              i === 0 ? "text-[#9aa4ff]" : "text-[#6A6A6A]",
            )}
          >
            {r.rank}
          </span>
          <span
            className={cn(
              "flex-1 truncate text-[13.5px]",
              i === 0 ? "font-semibold text-white" : "text-[#C4C4C4]",
            )}
          >
            {r.name}
          </span>
          {i === 0 && (
            <span className="rounded-full border border-[rgba(79,178,134,0.24)] bg-[rgba(79,178,134,0.09)] px-2.5 py-[3px] font-mono text-[10px] uppercase tracking-[0.1em] text-signal-clean-dot">
              Winner
            </span>
          )}
          <span className="w-[26px] text-right font-mono text-[12.5px] tabular-nums text-[#E4E4E4]">
            {r.score}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
