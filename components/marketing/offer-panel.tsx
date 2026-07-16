import Link from "next/link";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { ROUTES, SITE } from "@/lib/constants";

/**
 * DESIGN.md 4.9: the closer. Identical inset-panel treatment as the hero with
 * the glow at the opposite corners, three term cards, a white pill CTA + ghost
 * pill, and one honest footnote.
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
        <div className="mx-auto w-full max-w-[1180px] px-[clamp(18px,4vw,34px)] text-center">
          <Reveal y={10}>
            <p className="kicker mb-5 text-[#9aa4ff]">04 · The offer</p>
          </Reveal>
          <Reveal delay={0.08} y={16}>
            <h2 className="mx-auto max-w-[20ch] font-display text-[clamp(1.8rem,4vw,3rem)] font-bold leading-[1.05] tracking-[-0.04em] text-white">
              Every feature is <span className="text-[#7fbf9a]">free</span>. For every hackathon.
            </h2>
          </Reveal>
          <Reveal delay={0.18} y={12}>
            <p className="mx-auto mt-5 max-w-[560px] text-[17px] font-medium leading-[1.65] text-white/85">
              OpenRubric is a nonprofit, open-source project. Run it on our hosted instance or on
              your own infrastructure.
            </p>
          </Reveal>

          <Stagger delay={0.2} gap={0.09} className="mx-auto mt-11 grid max-w-[920px] grid-cols-1 gap-4 sm:grid-cols-3">
            {TERMS.map((t) => (
              <StaggerItem
                key={t.label}
                className="rounded-[16px] border border-white/[0.14] bg-white/[0.05] p-6 text-left"
              >
                <div className="font-display text-[clamp(2rem,3vw,2.6rem)] font-bold tracking-[-0.03em] text-white [font-variant-numeric:tabular-nums]">
                  {t.big}
                </div>
                <div className="kicker mt-1.5 text-white/60">{t.label}</div>
                <p className="mt-3 text-[14px] font-medium leading-[1.6] text-white/85">{t.body}</p>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal delay={0.3} y={12}>
            <div className="mt-11 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href={ROUTES.signUp}
                className="inline-flex items-center rounded-full bg-white px-7 py-3.5 text-[15px] font-bold text-ink transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                Start judging free
              </Link>
              <a
                href={SITE.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border-[1.5px] border-white/35 px-7 py-3.5 text-[15px] font-bold text-white transition-colors duration-200 hover:border-white/70"
              >
                View on GitHub ↗
              </a>
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
