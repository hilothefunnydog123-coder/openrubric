import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { FinalCta } from "@/components/marketing/final-cta";
import { FeedbackForm } from "@/components/marketing/feedback-form";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the OpenRubric team, or send a feature request.",
};

export default function ContactPage() {
  return (
    <>
      <MarketingNav />
      <main className="bg-canvas">
        <div className="container-marketing max-w-[760px] py-20">
          <Eyebrow className="mb-3">Contact</Eyebrow>
          <h1 className="mb-4 font-serif text-[clamp(30px,4vw,48px)] font-normal leading-[1.05] tracking-[-0.015em]">
            Talk to us.
          </h1>
          <p className="mb-10 max-w-[60ch] text-[15px] leading-[1.65] text-dim">
            Questions, a hackathon that isn&apos;t on Devpost, or you want us to run an event for you -
            reach out any time. We read everything.
          </p>

          <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <a
              href={`mailto:${SITE.supportEmail}`}
              className="rounded-[14px] border border-line bg-surface p-5 transition-colors hover:border-ink"
            >
              <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
                Email us
              </div>
              <div className="text-[15px] font-semibold tracking-[-0.01em]">{SITE.supportEmail}</div>
              <div className="mt-1 text-[13px] text-dim">For support, partnerships, or managed events.</div>
            </a>
            <a
              href={SITE.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-[14px] border border-line bg-surface p-5 transition-colors hover:border-ink"
            >
              <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
                Open source
              </div>
              <div className="text-[15px] font-semibold tracking-[-0.01em]">GitHub ↗</div>
              <div className="mt-1 text-[13px] text-dim">File an issue, open a PR, or star the repo.</div>
            </a>
          </div>

          <div id="feedback" className="scroll-mt-28">
            <Eyebrow className="mb-3">Feedback</Eyebrow>
            <h2 className="mb-2 text-[22px] font-semibold tracking-[-0.015em]">
              Suggest a feature
            </h2>
            <p className="mb-6 max-w-[58ch] text-[14px] leading-[1.6] text-dim">
              OpenRubric is built in the open. Tell us what would make it better for your judging room -
              feature ideas, bugs, or anything else.
            </p>
            <FeedbackForm />
          </div>
        </div>
        <FinalCta />
      </main>
    </>
  );
}
