import { CountUp } from "@/components/ui/animated-number";
import { Stagger, StaggerItem } from "@/components/ui/reveal";

/**
 * DESIGN.md 4.7: one mono micro line, then real numbers with count-up.
 * Every stat here is a product truth, not a usage metric we don't have.
 *
 * Each cell carries a one-line footnote that fades in on hover — the number makes
 * the claim, the footnote says why it holds. Fading hairlines separate the cells
 * instead of a boxed grid.
 */
const STATS: { value: number | null; render: string; label: string; note: string }[] = [
  {
    value: null,
    render: "$0",
    label: "To run · MIT licensed forever",
    note: "No tiers, no seats, no card. The licence is in the repo.",
  },
  {
    value: 100,
    render: "100%",
    label: "Of scores trace to a judge",
    note: "Every published number carries a criterion and a name.",
  },
  {
    value: 6,
    render: "6",
    label: "Steps from import to winners",
    note: "Import, rubric, invite, score, review, publish.",
  },
  {
    value: 3,
    render: "3",
    label: "Import paths · Devpost, CSV, manual",
    note: "Participants install nothing, whichever path you use.",
  },
];

export function ProofStrip() {
  return (
    <section className="border-b border-line bg-canvas">
      <div className="mx-auto w-full max-w-[1180px] px-[clamp(18px,4vw,34px)] pb-[clamp(48px,6vw,72px)] pt-[clamp(64px,8vw,96px)]">
        <p className="kicker mb-9 text-center text-ink">
          Open by design · Every number below is a guarantee
        </p>
        <Stagger gap={0.09} className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <StaggerItem
              key={s.label}
              className="group relative px-2 text-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              {/* Fading hairline before every cell except the first of its row.
                  2-up on small screens, 4-up from lg. */}
              {i > 0 && (
                <span
                  aria-hidden
                  className={
                    "rule-fade pointer-events-none absolute -left-3 bottom-1 top-1 w-px lg:block " +
                    (i % 2 === 0 ? "hidden" : "block")
                  }
                />
              )}
              <div className="font-display text-[clamp(1.9rem,3.4vw,2.8rem)] font-bold tracking-[-0.04em] text-ink [font-variant-numeric:tabular-nums]">
                {s.value === null ? (
                  s.render
                ) : (
                  <>
                    <CountUp value={s.value} duration={1.1} />
                    {s.render.endsWith("%") ? "%" : ""}
                  </>
                )}
              </div>
              {/* accent rule that draws itself under the number on hover */}
              <span
                aria-hidden
                className="mx-auto mt-2 block h-px w-8 origin-center scale-x-0 bg-accent transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100 motion-reduce:transition-none"
              />
              <div className="kicker mt-2 text-ink/80">{s.label}</div>
              <p className="mx-auto mt-2 max-w-[26ch] text-[12.5px] font-medium leading-[1.5] text-ink/55 opacity-0 transition-opacity duration-500 group-hover:opacity-100 motion-reduce:opacity-100">
                {s.note}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
