import Link from "next/link";
import { Reveal, SplitWords, Stagger, StaggerItem } from "@/components/ui/reveal";
import { Magnetic, ShineBorder, Spotlight } from "@/components/ui/motion-fx";
import { ROUTES, SITE } from "@/lib/constants";

/**
 * DESIGN.md 4.9: the closer. Identical inset-panel treatment as the hero with
 * the glow at the opposite corners, three term cards, a white pill CTA + ghost
 * pill, and one honest footnote.
 *
 * Mirrors the hero's layer stack (grid, aurora, spotlight, grain) so opening and
 * closing the page rhyme — the glow just sits at the opposite corners.
 */
const TERMS = [
  {
    big: "$0",
    label: "Forever",
    body: "MIT licensed and nonprofit. No tiers, no seats, no credit card.",
  },
  {
    big: "100%",
    label: "Your data",
    body: "Self-host on your own Supabase. Export scores as CSV or JSON anytime.",
  },
  {
    big: "0",
    label: "Black boxes",
    body: "Every published score traces to a criterion and a named judge.",
  },
];

export function OfferPanel() {
  return (
    <section className="bg-canvas p-[clamp(10px,1.4vw,18px)]">
      <div
        className="relative mx-auto max-w-[1560px] overflow-hidden rounded-[clamp(18px,2.4vw,30px)] bg-ink py-[clamp(58px,7vw,92px)] text-canvas"
        style={{
          background:
            "radial-gradient(52% 42% at 88% 4%, rgba(93,95,239,0.35), transparent 70%)," +
            "radial-gradient(46% 38% at 10% 8%, rgba(10,157,99,0.24), transparent 70%)," +
            "radial-gradient(60% 34% at 50% 100%, rgba(255,255,255,0.05), transparent 70%)," +
            "#0a0a0c",
        }}
      >
        <div aria-hidden className="bg-rubric-grid mask-radial pointer-events-none absolute inset-0" />
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="aurora-b absolute -top-[16%] right-[6%] h-[520px] w-[660px] rounded-full opacity-50 blur-[100px]"
            style={{ background: "radial-gradient(circle, rgba(93,95,239,0.42), transparent 68%)" }}
          />
          <div
            className="aurora-a absolute -bottom-[20%] left-[4%] h-[460px] w-[560px] rounded-full opacity-[0.45] blur-[100px]"
            style={{ background: "radial-gradient(circle, rgba(10,157,99,0.36), transparent 68%)" }}
          />
        </div>
        <Spotlight size={560} color="rgba(154,164,255,0.12)" />
        <div
          aria-hidden
          className="bg-grain pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-overlay"
        />

        <div className="relative z-10 mx-auto w-full max-w-[1180px] px-[clamp(18px,4vw,34px)] text-center">
          <Reveal y={10}>
            <p className="kicker mb-5 text-[#9aa4ff]">04 · The offer</p>
          </Reveal>
          <h2 className="mx-auto max-w-[20ch] font-display text-[clamp(1.8rem,4vw,3rem)] font-bold leading-[1.05] tracking-[-0.04em] text-white">
            <SplitWords
              text="Every feature is *free*. For every hackathon."
              delay={0.06}
              gap={0.05}
              emClassName="text-[#7fbf9a]"
            />
          </h2>
          <Reveal delay={0.28} y={12}>
            <p className="mx-auto mt-5 max-w-[560px] text-[17px] font-medium leading-[1.65] text-white/85">
              OpenRubric is a nonprofit, open-source project. Run it on our hosted instance or on
              your own infrastructure.
            </p>
          </Reveal>

          <Stagger
            delay={0.2}
            gap={0.09}
            className="mx-auto mt-11 grid max-w-[920px] grid-cols-1 gap-4 sm:grid-cols-3"
          >
            {TERMS.map((t) => (
              <StaggerItem
                key={t.label}
                className="group relative overflow-hidden rounded-[16px] border border-white/[0.14] bg-white/[0.05] p-6 text-left backdrop-blur-sm transition-[transform,border-color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:border-white/30 hover:bg-white/[0.08] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                {/* light sweeps across the card on hover */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent,rgba(255,255,255,0.12),transparent)] transition-transform duration-[900ms] ease-out group-hover:translate-x-full motion-reduce:hidden"
                />
                <div className="relative font-display text-[clamp(2.4rem,4.4vw,3.4rem)] font-bold leading-none tracking-[-0.04em] text-white [font-variant-numeric:tabular-nums]">
                  {t.big}
                </div>
                <div className="kicker relative mt-3 text-white/60">{t.label}</div>
                <p className="relative mt-3 text-[14px] font-medium leading-[1.6] text-white/85">
                  {t.body}
                </p>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal delay={0.3} y={12}>
            <div className="mt-11 flex flex-wrap items-center justify-center gap-3.5">
              <Magnetic strength={0.3}>
                <ShineBorder innerClassName="bg-white">
                  <Link
                    href={ROUTES.signUp}
                    className="inline-flex items-center rounded-full bg-white px-7 py-3.5 text-[15px] font-bold text-ink transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Start judging free
                  </Link>
                </ShineBorder>
              </Magnetic>
              <Magnetic strength={0.22}>
                <a
                  href={SITE.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border-[1.5px] border-white/35 px-7 py-3.5 text-[15px] font-bold text-white transition-colors duration-200 hover:border-white/70"
                >
                  View on GitHub ↗
                </a>
              </Magnetic>
            </div>
            <p className="mx-auto mt-7 max-w-[62ch] text-[13.5px] font-medium text-white/60">
              OpenRubric is in early alpha. The software is free and MIT licensed; the only paid
              thing we offer is an optional managed-event service. Organizers always make the
              final award decisions.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
