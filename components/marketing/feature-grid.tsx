import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal, SplitWords, Stagger, StaggerItem } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

export interface FeatureItem {
  num?: string;
  title: string;
  body: string;
}

/**
 * Off-white editorial section: mono eyebrow + serif heading + a bordered grid of
 * cells. Used for "Built for real judging rooms" (3) and "Open-source by design" (4).
 * The heading rises word by word; cells cascade in and lift on hover.
 */
export function FeatureGrid({
  id,
  eyebrow,
  heading,
  items,
  columns = 3,
  headingClassName,
}: {
  id?: string;
  eyebrow: string;
  heading: string;
  items: FeatureItem[];
  columns?: 3 | 4;
  headingClassName?: string;
}) {
  return (
    <section id={id} className="border-b border-line bg-canvas">
      <div className="container-marketing py-24">
        <Reveal y={10}>
          <Eyebrow className="mb-5 tracking-[0.16em]">{eyebrow}</Eyebrow>
        </Reveal>
        <h2
          className={cn(
            "mb-14 max-w-[18ch] font-serif text-[clamp(30px,4vw,50px)] font-normal leading-[1.08] tracking-[-0.015em]",
            headingClassName,
          )}
        >
          <SplitWords text={heading} />
        </h2>
        <Stagger
          delay={0.15}
          className={cn(
            "grid grid-cols-1 divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-raised md:divide-x md:divide-y-0",
            columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4",
          )}
        >
          {items.map((c) => (
            <StaggerItem
              key={c.title}
              className="group p-[30px] transition-colors duration-300 hover:bg-surface"
            >
              {c.num && (
                <div className="mb-9 font-mono text-[12px] text-accent transition-transform duration-300 ease-out group-hover:-translate-y-0.5">
                  {c.num}
                </div>
              )}
              <h3 className="mb-2.5 text-[18px] font-semibold tracking-[-0.01em]">{c.title}</h3>
              <p className="text-[15px] font-semibold leading-[1.6] text-ink">{c.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
