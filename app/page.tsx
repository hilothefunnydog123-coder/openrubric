import { MarketingNav } from "@/components/marketing/marketing-nav";
import { LandingHero } from "@/components/marketing/landing-hero";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { WorkflowStrip } from "@/components/marketing/workflow-strip";
import { DarkProductSection } from "@/components/marketing/dark-product-section";
import { HackathonRequestBar } from "@/components/marketing/hackathon-request-bar";
import { ReviewSignals } from "@/components/marketing/review-signals";
import { FinalCta } from "@/components/marketing/final-cta";
import { DemoVideo } from "@/components/marketing/demo-video";
import { Reveal } from "@/components/ui/reveal";

const JUDGING_ROOMS = [
  {
    num: "01",
    title: "Import submissions",
    body: "Pull projects from a Devpost URL, paste project links, or upload a CSV. Manual entry always works as a fallback.",
  },
  {
    num: "02",
    title: "Score with a shared rubric",
    body: "Paste your rubric once. Every judge scores against the same weighted criteria, with comments tied to each line.",
  },
  {
    num: "03",
    title: "Publish winners by track",
    body: "Aggregate judge scores into per-track leaderboards and an overall winner, with review cases resolved first.",
  },
];

const OPEN_SOURCE = [
  {
    title: "Transparent scoring",
    body: "Every number traces back to a criterion and a judge. Nothing is a black box.",
  },
  {
    title: "Self-hostable",
    body: "Run it on your own Supabase project. Your data never leaves your control.",
  },
  {
    title: "Exportable data",
    body: "Export submissions, scores, and rankings as CSV or JSON at any time.",
  },
  {
    title: "Human final decisions",
    body: "OpenRubric surfaces evidence. Organizers make every award decision.",
  },
];

export default function HomePage() {
  return (
    <>
      <MarketingNav />
      <main>
        {/* Hero is intentionally not wrapped in Reveal, its preview panel uses a
            position:fixed maximize overlay that a lingering transform would break.
            The sections below choreograph their own entrances (word-by-word
            headlines, staggered cells, animated meters), so no outer wrappers. */}
        <LandingHero />

        <Reveal>
          <DemoVideo eyebrow="Product demo" heading="See OpenRubric in action." />
        </Reveal>

        <FeatureGrid
          id="product"
          eyebrow="Built for real judging rooms"
          heading="Everything a judging room needs, and nothing it doesn't."
          items={JUDGING_ROOMS}
          columns={3}
        />

        <WorkflowStrip />

        <HackathonRequestBar />

        <DarkProductSection id="docs" />

        <ReviewSignals />

        <FeatureGrid
          id="opensource"
          eyebrow="Open Source By Design"
          heading="Transparent, self-hostable, and yours to keep."
          items={OPEN_SOURCE}
          columns={4}
          headingClassName="max-w-[20ch]"
        />

        <FinalCta />
      </main>
    </>
  );
}
