import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { FinalCta } from "@/components/marketing/final-cta";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ROUTES, SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of OpenRubric.",
};

const H = "mb-3 mt-10 text-[18px] font-semibold tracking-[-0.01em]";
const P = "mb-4 max-w-[64ch] text-[14.5px] leading-[1.7] text-dim";

export default function TermsPage() {
  return (
    <>
      <MarketingNav />
      <main className="bg-canvas">
        <div className="container-marketing max-w-[760px] py-20">
          <Eyebrow className="mb-3">Legal</Eyebrow>
          <h1 className="mb-2 font-serif text-[clamp(30px,4vw,48px)] font-normal leading-[1.05] tracking-[-0.015em]">
            Terms of Service
          </h1>
          <p className="mb-8 font-mono text-[12px] text-faint">Last updated: June 20, 2026</p>

          <p className={P}>
            These terms govern your use of {SITE.name} (&ldquo;the Service&rdquo;), an open-source
            hackathon judging platform. By using the hosted Service or deploying the software
            yourself, you agree to these terms. If you don&apos;t agree, please don&apos;t use the
            Service.
          </p>

          <h2 className={H}>1. The software is open-source</h2>
          <p className={P}>
            {SITE.name} is released under the MIT License. You are free to use, copy, modify, and
            self-host the code, subject to that license. Nothing in these terms restricts the rights
            the MIT License grants you over the source code.
          </p>

          <h2 className={H}>2. Acceptable use</h2>
          <p className={P}>
            You agree to use the Service for legitimate hackathon and project-judging purposes. You
            will not use it to harass others, upload unlawful content, attempt to breach security or
            access data that isn&apos;t yours, or disrupt the Service for other users. Judging
            decisions and any awards are made by organizers, {SITE.name} surfaces evidence and
            scores but does not make final decisions on your behalf.
          </p>

          <h2 className={H}>3. Accounts &amp; your content</h2>
          <p className={P}>
            You are responsible for activity under your account and for keeping your credentials
            secure. You retain ownership of the content you submit (submissions, rubrics, scores,
            comments). You grant {SITE.name} a limited license to store and process that content
            solely to operate the Service for you.
          </p>

          <h2 className={H}>4. Managed events</h2>
          <p className={P}>
            We optionally offer a paid managed service where we run an event for you, including
            adding AI credits and operating the model on your behalf, for a flat per-event fee. That
            service is a convenience and is separate from the free, open-source software. Specific
            scope and fees are agreed in writing before any event. See{" "}
            <Link className="text-accent hover:underline" href={ROUTES.pricing}>
              Pricing
            </Link>
            .
          </p>

          <h2 className={H}>5. Third-party services</h2>
          <p className={P}>
            The Service integrates with third parties such as Supabase, GitHub, and AI model
            providers. Your use of those integrations is also subject to their respective terms.
          </p>

          <h2 className={H}>6. Disclaimer &amp; limitation of liability</h2>
          <p className={P}>
            The Service is provided &ldquo;as is&rdquo;, without warranties of any kind. To the
            maximum extent permitted by law, {SITE.name} and its contributors are not liable for any
            indirect, incidental, or consequential damages, or for any judging outcome, arising from
            your use of the Service.
          </p>

          <h2 className={H}>7. Changes</h2>
          <p className={P}>
            We may update these terms as the project evolves. Material changes will be reflected by
            the &ldquo;last updated&rdquo; date above. Continued use after a change means you accept
            the revised terms.
          </p>

          <h2 className={H}>8. Contact</h2>
          <p className={P}>
            Questions about these terms? Email{" "}
            <a className="text-accent hover:underline" href={`mailto:${SITE.supportEmail}`}>
              {SITE.supportEmail}
            </a>
            .
          </p>
        </div>
        <FinalCta />
      </main>
    </>
  );
}
