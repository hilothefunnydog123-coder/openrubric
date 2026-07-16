import Link from "next/link";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { ROUTES } from "@/lib/constants";

/**
 * DESIGN.md act: "How it works", 3 numbered cards + a methodology link.
 * Cards: radius 14, hairline border, kicker + display title + body.
 */
const STEPS = [
  {
    num: "01",
    title: "Import submissions",
    body: "Pull projects from a Devpost URL, upload a CSV, or add them by hand. Nothing to install for participants.",
  },
  {
    num: "02",
    title: "Score on one rubric",
    body: "Paste your rubric once. Every judge grades the same weighted criteria, with comments tied to each line.",
  },
  {
    num: "03",
    title: "Publish winners",
    body: "Judge scores aggregate into per-track leaderboards. Review cases get resolved before anything goes public.",
  },
];

export function ActMechanism({ id }: { id?: string }) {
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
          <p className="mb-12 max-w-[52ch] text-[17px] font-medium leading-[1.65] text-ink">
            No spreadsheets, no averaging by hand.{" "}
            <b className="font-bold">The rubric is the source of truth</b> from the first import to
            the final export.
          </p>
        </Reveal>
        <Stagger gap={0.09} className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <StaggerItem
              key={s.num}
              className="group rounded-[14px] border border-line bg-canvas p-[26px_24px] transition-all duration-200 hover:-translate-y-[3px] hover:border-accent/40"
            >
              <p className="kicker mb-7 text-accent">{s.num}</p>
              <h3 className="mb-2.5 font-display text-[20px] font-bold tracking-[-0.02em]">
                {s.title}
              </h3>
              <p className="text-[15px] font-medium leading-[1.65] text-ink">{s.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
        <Reveal delay={0.2} y={10}>
          <p className="mt-9 text-[14.5px] font-semibold">
            <Link href={ROUTES.docs} className="text-accent transition-opacity hover:opacity-75">
              Read exactly how judging works →
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
