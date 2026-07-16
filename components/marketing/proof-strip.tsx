import { CountUp } from "@/components/ui/animated-number";
import { Stagger, StaggerItem } from "@/components/ui/reveal";

/**
 * DESIGN.md 4.7: one mono micro line, then real numbers with count-up.
 * Every stat here is a product truth, not a usage metric we don't have.
 */
const STATS: { value: number | null; render: string; label: string }[] = [
  { value: null, render: "$0", label: "To run · MIT licensed forever" },
  { value: 100, render: "100%", label: "Of scores trace to a judge" },
  { value: 6, render: "6", label: "Steps from import to winners" },
  { value: 3, render: "3", label: "Import paths · Devpost, CSV, manual" },
];

export function ProofStrip() {
  return (
    <section className="border-b border-line bg-canvas">
      <div className="mx-auto w-full max-w-[1180px] px-[clamp(18px,4vw,34px)] pb-[clamp(48px,6vw,72px)] pt-[clamp(64px,8vw,96px)]">
        <p className="kicker mb-9 text-center text-ink">
          Open by design · Every number below is a guarantee
        </p>
        <Stagger gap={0.09} className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {STATS.map((s) => (
            <StaggerItem key={s.label} className="text-center">
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
              <div className="kicker mt-2.5 text-ink/80">{s.label}</div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
