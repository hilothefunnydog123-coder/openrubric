import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal, SplitWords, Stagger, StaggerItem } from "@/components/ui/reveal";

const STEPS = [
  { step: "01", label: "Paste Devpost URL" },
  { step: "02", label: "Import projects" },
  { step: "03", label: "Assign judges" },
  { step: "04", label: "Score live" },
  { step: "05", label: "Review timelines" },
  { step: "06", label: "Export winners" },
];

export function WorkflowStrip() {
  return (
    <section className="border-b border-line bg-canvas">
      <div className="container-marketing py-24">
        <Reveal y={10}>
          <Eyebrow className="mb-5 tracking-[0.16em]">Devpost Import</Eyebrow>
        </Reveal>
        <h2 className="mb-12 font-serif text-[clamp(30px,4vw,50px)] font-normal leading-[1.08] tracking-[-0.015em]">
          <SplitWords text="From Devpost to final rankings." />
        </h2>
        <Stagger
          delay={0.1}
          gap={0.06}
          className="grid grid-cols-2 divide-line overflow-hidden rounded-[18px] border border-line bg-raised md:grid-cols-3 lg:grid-cols-6 [&>*]:border-b [&>*]:border-r [&>*]:border-line"
        >
          {STEPS.map((w) => (
            <StaggerItem
              key={w.step}
              className="group px-5 py-6 transition-colors duration-300 hover:bg-surface"
            >
              <div className="mb-3.5 font-mono text-[11px] text-faint transition-colors duration-300 group-hover:text-accent">
                {w.step}
              </div>
              <div className="text-[14.5px] font-semibold leading-tight tracking-[-0.01em]">
                {w.label}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
