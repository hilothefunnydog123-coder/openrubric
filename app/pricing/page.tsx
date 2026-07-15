import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { FinalCta } from "@/components/marketing/final-cta";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ROUTES, SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "OpenRubric is free and open-source to self-host. Or have us run your event end-to-end for a flat fee.",
};

const FREE = [
  "Unlimited hackathons, judges, and submissions",
  "Devpost import + GitHub timeline review",
  "Shared rubric scoring with live autosave",
  "Per-track winners, overall rankings, CSV export",
  "Bring your own AI key (GitHub Models is free)",
  "Self-host on your own Supabase, your data, your control",
];

const MANAGED = [
  "We add the AI credits and run the model for you",
  "We import your submissions and wire up your rubric",
  "We invite your judges and configure tracks",
  "Live GitHub review + AI summaries fully enabled",
  "You watch results roll in, no setup, no infra",
  "Email support throughout your event",
];

export default function PricingPage() {
  return (
    <>
      <MarketingNav />
      <main className="bg-canvas">
        <div className="container-marketing max-w-[980px] py-20">
          <div className="mb-12 text-center">
            <Eyebrow className="mb-3">Pricing</Eyebrow>
            <h1 className="mx-auto mb-4 max-w-[20ch] font-serif text-[clamp(32px,5vw,56px)] font-normal leading-[1.04] tracking-[-0.015em]">
              Free to run yourself. Or let us run it.
            </h1>
            <p className="mx-auto max-w-[56ch] text-[15px] leading-[1.65] text-dim">
              OpenRubric is MIT-licensed and free forever to self-host. If you&apos;d rather not touch
              the setup, we&apos;ll run your event with our own AI model, you just watch the results.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Free / self-host */}
            <div className="flex flex-col rounded-[16px] border border-line bg-surface p-7">
              <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
                Open source
              </div>
              <div className="mb-1 flex items-baseline gap-2">
                <span className="text-[34px] font-bold tracking-[-0.02em]">$0</span>
                <span className="text-[14px] text-dim">forever</span>
              </div>
              <p className="mb-5 text-[13.5px] leading-[1.55] text-dim">
                Clone it, deploy it, own it. Everything the platform does, on your own infrastructure.
              </p>
              <ul className="mb-6 flex flex-col gap-2.5">
                {FREE.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] leading-[1.5] text-ink">
                    <span className="mt-[3px] text-accent">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex gap-3">
                <Button asChild className="flex-1">
                  <Link href={ROUTES.signUp}>Get started</Link>
                </Button>
                <Button asChild variant="outline">
                  <a href={SITE.githubUrl} target="_blank" rel="noreferrer">
                    GitHub ↗
                  </a>
                </Button>
              </div>
            </div>

            {/* Managed */}
            <div className="relative flex flex-col rounded-[16px] border border-accent bg-accent-soft p-7">
              <div className="absolute right-5 top-5 rounded-full border border-accent px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-accent">
                We run it
              </div>
              <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-accent">
                Managed event
              </div>
              <div className="mb-1 flex items-baseline gap-2">
                <span className="text-[34px] font-bold tracking-[-0.02em]">$50–100</span>
                <span className="text-[14px] text-dim">per event</span>
              </div>
              <p className="mb-5 text-[13.5px] leading-[1.55] text-dim">
                A flat fee per hackathon. We manually add the API credits and run the AI model for
                you, all you do is sit back and watch the results happen.
              </p>
              <ul className="mb-6 flex flex-col gap-2.5">
                {MANAGED.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] leading-[1.5] text-ink">
                    <span className="mt-[3px] text-accent">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                <Button asChild className="w-full">
                  <Link href={ROUTES.contact}>Request a managed run →</Link>
                </Button>
                <p className="mt-3 text-center text-[12px] text-dim">
                  Or email{" "}
                  <a className="text-accent hover:underline" href={`mailto:${SITE.supportEmail}`}>
                    {SITE.supportEmail}
                  </a>
                </p>
              </div>
            </div>
          </div>

          <p className="mx-auto mt-10 max-w-[60ch] text-center text-[12.5px] leading-[1.6] text-faint">
            The managed option is a convenience service, the software itself is, and always will be,
            free and open-source under the MIT license.
          </p>
        </div>
        <FinalCta />
      </main>
    </>
  );
}
