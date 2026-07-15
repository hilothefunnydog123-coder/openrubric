import type { Metadata } from "next";
import { SimpleHeader } from "@/components/app/simple-header";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ScoreRequestFlow } from "@/components/participant/score-request-flow";

export const metadata: Metadata = { title: "See your score" };
export const dynamic = "force-dynamic";

/**
 * Participant-facing "see your score" flow. Find your hackathon, pick your project, and
 * request your score, the organizers approve or deny and decide how much to share.
 */
export default function TeamScoresPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <SimpleHeader />
      <div className="mx-auto w-full max-w-[640px] px-8 pb-20 pt-10">
        <Eyebrow className="mb-2">Participant</Eyebrow>
        <h1 className="mb-2 text-[28px] font-semibold tracking-[-0.025em]">See your score</h1>
        <p className="mb-8 max-w-[58ch] text-[14px] leading-[1.6] text-dim">
          Request your project&apos;s score from the organizers. They review every request and
          choose how much detail to share, the score, the rubric breakdown, or judge feedback.
        </p>
        <ScoreRequestFlow />
      </div>
    </div>
  );
}
