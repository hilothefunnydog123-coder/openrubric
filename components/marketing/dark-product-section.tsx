import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal, SplitWords, Stagger, StaggerItem } from "@/components/ui/reveal";
import { CountUp, MeterFill } from "@/components/ui/animated-number";

const RUBRIC = [
  { name: "Innovation", score: 18, max: 20, pct: "90%" },
  { name: "Technical Complexity", score: 22, max: 25, pct: "88%" },
  { name: "Functionality", score: 17, max: 20, pct: "85%" },
  { name: "Design / UX", score: 13, max: 15, pct: "87%" },
  { name: "Impact", score: 9, max: 10, pct: "90%" },
  { name: "Presentation", score: 8, max: 10, pct: "80%" },
];

const POINTS = [
  "Weighted criteria with per-criterion comments",
  "Autosave every few seconds, no lost scores",
  "Organizer aggregates, so judges never overwrite each other",
];

export function DarkProductSection({ id }: { id?: string }) {
  return (
    <section id={id} className="border-b border-line bg-canvas text-ink">
      <div className="container-marketing py-[104px]">
        <Reveal y={10}>
          <Eyebrow tone="accent" className="mb-5 tracking-[0.16em]">
            Live Scoring
          </Eyebrow>
        </Reveal>
        <div className="grid items-center gap-16 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="mb-[22px] font-serif text-[clamp(30px,4vw,50px)] font-normal leading-[1.08] tracking-[-0.015em]">
              <SplitWords text="A rubric-first judging workspace." />
            </h2>
            <Reveal delay={0.2} y={14}>
              <p className="mb-[18px] max-w-[46ch] text-[17px] font-semibold leading-[1.6] text-ink">
                Every score is tied to a criterion. Judges grade against the rubric you define,
                never a vague gut feeling, and each judge keeps their own record.
              </p>
            </Reveal>
            <Stagger delay={0.35} className="mt-6 flex flex-col gap-3.5">
              {POINTS.map((p) => (
                <StaggerItem key={p} className="flex items-center gap-[11px]">
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                  <span className="text-[14.5px] font-semibold text-ink">{p}</span>
                </StaggerItem>
              ))}
            </Stagger>
          </div>

          {/* dark rubric card, a product preview, fixed dark in both themes.
              Bars sweep to their score and the total ticks up on scroll-in. */}
          <Reveal delay={0.15}>
            <div className="rounded-[18px] border border-line-dark bg-panel-900 p-6 text-white shadow-lift">
              <div className="mb-5 flex items-center justify-between border-b border-line-darker pb-4">
                <div>
                  <div className="text-[16px] font-semibold">Lighthouse</div>
                  <div className="mt-[3px] font-mono text-[11px] font-bold text-[#D6D6D2]">
                    Rubric · 6 criteria
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-serif text-[34px] leading-none">
                    <CountUp value={87} delay={0.3} />
                    <span className="text-[20px] text-[#9A9A96]"> / 100</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                {RUBRIC.map((r, i) => (
                  <div key={r.name}>
                    <div className="mb-[7px] flex items-center justify-between">
                      <span className="text-[14px] font-semibold text-white">{r.name}</span>
                      <span className="font-mono text-[13px] font-bold text-[#E4E4E4]">
                        {r.score}
                        <span className="text-[#8A8A86]"> / {r.max}</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-[3px] bg-[#181818]">
                      <MeterFill
                        pct={r.pct}
                        delay={0.25 + i * 0.08}
                        className="h-full rounded-[3px] bg-accent"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
