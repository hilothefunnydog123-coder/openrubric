"use client";

import { Marquee } from "@/components/ui/motion-fx";

/**
 * A slow mono ticker under the hero. Deliberately *not* a logo wall — OpenRubric
 * is alpha and doesn't have customer logos to show, so the strip carries product
 * guarantees instead. Every line is checkable against the repo or the docs.
 *
 * Two tracks running opposite directions read as a system in motion rather than
 * one lonely scrolling line. Both pause on hover so the text stays readable.
 */
const TOP = [
  "MIT licensed",
  "Self-hostable on your own Supabase",
  "Devpost import",
  "CSV import",
  "Manual entry",
  "Per-criterion comments",
  "Weighted rubrics",
  "Autosave",
];

const BOTTOM = [
  "GitHub timeline review",
  "Per-track leaderboards",
  "CSV + JSON export",
  "Named judges on every score",
  "Realtime judge presence",
  "No seats, no tiers",
  "Organizers make the final call",
  "$0 forever",
];

function Track({ items, muted }: { items: string[]; muted?: boolean }) {
  return (
    <>
      {items.map((item) => (
        <span key={item} className="flex flex-shrink-0 items-center">
          <span
            className={
              "kicker whitespace-nowrap px-7 " + (muted ? "text-ink/45" : "text-ink/75")
            }
          >
            {item}
          </span>
          <span className="h-1 w-1 flex-shrink-0 rounded-full bg-accent/45" />
        </span>
      ))}
    </>
  );
}

export function TrustTicker() {
  return (
    <section
      aria-label="What OpenRubric guarantees"
      className="relative border-b border-line bg-canvas py-7"
    >
      <div className="mask-fade-x flex flex-col gap-3">
        <Marquee speed={52}>
          <Track items={TOP} />
        </Marquee>
        <Marquee speed={64} reverse>
          <Track items={BOTTOM} muted />
        </Marquee>
      </div>
    </section>
  );
}
