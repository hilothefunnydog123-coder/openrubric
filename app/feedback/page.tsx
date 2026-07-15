import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { FinalCta } from "@/components/marketing/final-cta";
import { FeedbackForm } from "@/components/marketing/feedback-form";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Feedback",
  description: "Suggest a feature or report a bug for OpenRubric.",
};

export default function FeedbackPage() {
  return (
    <>
      <MarketingNav />
      <main className="bg-canvas">
        <div className="container-marketing max-w-[680px] py-20">
          <Eyebrow className="mb-3">Feedback</Eyebrow>
          <h1 className="mb-4 font-serif text-[clamp(30px,4vw,48px)] font-normal leading-[1.05] tracking-[-0.015em]">
            Help shape OpenRubric.
          </h1>
          <p className="mb-10 max-w-[58ch] text-[15px] leading-[1.65] text-dim">
            Got an idea for a feature, or hit something that doesn&apos;t work? Send it over, it goes
            straight to the team. Prefer email? Reach us at{" "}
            <a className="text-accent hover:underline" href={`mailto:${SITE.supportEmail}`}>
              {SITE.supportEmail}
            </a>
            .
          </p>
          <FeedbackForm />
        </div>
        <FinalCta />
      </main>
    </>
  );
}
