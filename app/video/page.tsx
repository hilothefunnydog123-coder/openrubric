import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { FinalCta } from "@/components/marketing/final-cta";
import { DemoVideo } from "@/components/marketing/demo-video";

export const metadata: Metadata = {
  title: "Demo",
  description: "Watch the OpenRubric product demo, import, score, and publish winners.",
};

export default function VideoPage() {
  return (
    <>
      <MarketingNav />
      <main className="bg-canvas">
        <DemoVideo
          eyebrow="Watch"
          heading="The OpenRubric demo."
          sub="See the full flow, from importing submissions to rubric scoring, GitHub timeline review, and publishing winners."
        />
        <FinalCta />
      </main>
    </>
  );
}
