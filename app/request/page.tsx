import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { HackathonRequestForm } from "@/components/marketing/hackathon-request-form";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal, SplitWords } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "Bring OpenRubric to your hackathon",
  description:
    "Tell us about your event and we'll help you set up fair, rubric-based judging with OpenRubric.",
};

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<{ hackathon?: string }>;
}) {
  const { hackathon } = await searchParams;
  const eventName = (hackathon ?? "").slice(0, 140).trim();

  return (
    <>
      <MarketingNav />
      <main className="relative overflow-hidden bg-canvas text-ink">
        {/* same pastel field as the hero, dialed down */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden>
          <div
            className="aurora-a absolute -top-44 left-1/2 h-[480px] w-[760px] -translate-x-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(124,108,255,0.13), transparent 70%)",
            }}
          />
          <div
            className="aurora-b absolute -top-24 right-[10%] h-[340px] w-[440px] rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(96,165,250,0.11), transparent 70%)",
            }}
          />
        </div>

        <div className="container-marketing relative max-w-[780px] pb-24 pt-16">
          <Reveal y={10}>
            <Eyebrow tone="accent" className="mb-5 tracking-[0.16em]">
              Bring OpenRubric to your event
            </Eyebrow>
          </Reveal>
          <h1 className="mb-4 max-w-[18ch] font-serif text-[clamp(34px,4.4vw,54px)] font-normal leading-[1.08] tracking-[-0.015em]">
            <SplitWords
              text={eventName ? `Let's judge *${eventName}.*` : "Let's judge *your hackathon.*"}
            />
          </h1>
          <Reveal delay={0.3} y={14}>
            <p className="mb-10 max-w-[52ch] text-[17px] font-semibold leading-[1.6] text-ink">
              We drafted the email below. Fill in the brackets, tweak whatever you like, and
              hit send. It goes straight to the people who run OpenRubric.
            </p>
          </Reveal>
          <Reveal delay={0.4} y={18}>
            <HackathonRequestForm initialHackathon={eventName} />
          </Reveal>
        </div>
      </main>
    </>
  );
}
