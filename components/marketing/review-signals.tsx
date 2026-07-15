import { Eyebrow } from "@/components/ui/eyebrow";
import { TimelineBadge } from "@/components/ui/badge";
import { Reveal, SplitWords, Stagger, StaggerItem } from "@/components/ui/reveal";
import type { ReviewPriority } from "@/lib/types";

const SIGNALS: { label: string; priority: ReviewPriority }[] = [
  { label: "All commits inside the event window", priority: "clean" },
  { label: "A few commits before the event start", priority: "light" },
  { label: "Activity after the submission deadline", priority: "needs" },
  { label: "Older repo with fresh code added during event", priority: "light" },
  { label: "No useful commit history found", priority: "high" },
];

const DOT: Record<ReviewPriority, string> = {
  clean: "bg-signal-clean-dot",
  light: "bg-signal-review-dot",
  needs: "bg-signal-review-dot",
  high: "bg-signal-high-dot",
};

export function ReviewSignals() {
  return (
    <section className="border-b border-line bg-canvas">
      <div className="container-marketing py-[104px]">
        <Reveal y={10}>
          <Eyebrow className="mb-5 tracking-[0.16em]">Timeline Review</Eyebrow>
        </Reveal>
        <div className="grid items-start gap-16 lg:grid-cols-2">
          <div>
            <h2 className="mb-[22px] max-w-[16ch] font-serif text-[clamp(30px,4vw,50px)] font-normal leading-[1.08] tracking-[-0.015em]">
              <SplitWords text="Review signals, not *accusations.*" />
            </h2>
            <Reveal delay={0.2} y={14}>
              <p className="mb-[18px] max-w-[44ch] text-[17px] font-semibold leading-[1.6] text-ink">
                OpenRubric scans each repo&apos;s GitHub timeline and surfaces what an organizer
                might want to ask about. Always framed as a question, never a verdict.
              </p>
            </Reveal>
            <Reveal delay={0.32} y={14}>
              <div className="rounded-r-[10px] border-l-2 border-accent bg-raised px-5 py-3.5">
                <p className="text-[15px] font-medium leading-[1.5] text-ink">
                  OpenRubric never makes the final call. It gives organizers evidence to review.
                </p>
              </div>
            </Reveal>
          </div>

          <Stagger
            delay={0.2}
            gap={0.07}
            className="flex flex-col divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-raised"
          >
            {SIGNALS.map((s) => (
              <StaggerItem
                key={s.label}
                className="flex items-center gap-3.5 px-5 py-4 transition-colors duration-300 hover:bg-surface"
              >
                <span className={`h-2 w-2 flex-shrink-0 rounded-full ${DOT[s.priority]}`} />
                <span className="flex-1 text-[14.5px] text-ink">{s.label}</span>
                <TimelineBadge priority={s.priority} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
