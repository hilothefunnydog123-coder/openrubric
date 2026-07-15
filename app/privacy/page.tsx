import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { FinalCta } from "@/components/marketing/final-cta";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How OpenRubric handles your data.",
};

const H = "mb-3 mt-10 text-[18px] font-semibold tracking-[-0.01em]";
const P = "mb-4 max-w-[64ch] text-[14.5px] leading-[1.7] text-dim";
const LI = "flex items-start gap-2.5 text-[14.5px] leading-[1.6] text-dim";

export default function PrivacyPage() {
  return (
    <>
      <MarketingNav />
      <main className="bg-canvas">
        <div className="container-marketing max-w-[760px] py-20">
          <Eyebrow className="mb-3">Legal</Eyebrow>
          <h1 className="mb-2 font-serif text-[clamp(30px,4vw,48px)] font-normal leading-[1.05] tracking-[-0.015em]">
            Privacy Policy
          </h1>
          <p className="mb-8 font-mono text-[12px] text-faint">Last updated: June 20, 2026</p>

          <p className={P}>
            This policy explains what {SITE.name} collects and why. {SITE.name} is open-source and
            self-hostable: if you run your own instance, <em>you</em> are the data controller and your
            data lives in <em>your</em> Supabase project. This policy describes the hosted Service we
            operate.
          </p>

          <h2 className={H}>What we collect</h2>
          <ul className="mb-4 flex flex-col gap-2.5">
            <li className={LI}>
              <span className="mt-[3px] text-accent">•</span>
              <span>
                <strong className="text-ink">Account data</strong>, your name, email, and role
                (organizer or judge), used to sign you in and keep roles separate.
              </span>
            </li>
            <li className={LI}>
              <span className="mt-[3px] text-accent">•</span>
              <span>
                <strong className="text-ink">Event data</strong>, hackathons, submissions, rubrics,
                scores, and comments you create or import, used to operate judging.
              </span>
            </li>
            <li className={LI}>
              <span className="mt-[3px] text-accent">•</span>
              <span>
                <strong className="text-ink">Imported public data</strong>, when you import from
                Devpost or scan a public GitHub repo, we process that public information to build
                submissions and review timelines.
              </span>
            </li>
            <li className={LI}>
              <span className="mt-[3px] text-accent">•</span>
              <span>
                <strong className="text-ink">Feedback you send</strong>, messages submitted through
                our feedback or contact forms, including any name/email you choose to provide.
              </span>
            </li>
          </ul>

          <h2 className={H}>How we use it</h2>
          <p className={P}>
            We use your data only to operate the Service, authenticating you, running judging,
            generating AI summaries and GitHub reviews, and responding to your feedback. We do not
            sell your data, and we do not use it for advertising.
          </p>

          <h2 className={H}>Subprocessors</h2>
          <p className={P}>
            The hosted Service relies on Supabase (database, authentication, realtime), GitHub
            (repository review), and an AI model provider (project summaries). Email is delivered via
            an SMTP/Gmail provider. These process data on our behalf to deliver the features above.
          </p>

          <h2 className={H}>Data retention &amp; control</h2>
          <p className={P}>
            Event data is retained for as long as your account or event is active. You can export
            submissions, scores, and rankings at any time, and you can request deletion of your
            account and associated data by emailing us. Individual judge scores stay private until an
            organizer publishes results.
          </p>

          <h2 className={H}>Self-hosting</h2>
          <p className={P}>
            If you self-host {SITE.name}, this policy does not apply to your instance, you control
            your own keys, database, and integrations, and are responsible for your own privacy
            practices toward your users.
          </p>

          <h2 className={H}>Contact</h2>
          <p className={P}>
            Privacy questions or deletion requests? Email{" "}
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
