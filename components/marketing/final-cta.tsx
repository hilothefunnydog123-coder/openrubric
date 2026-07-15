import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Reveal, SplitWords } from "@/components/ui/reveal";
import { ROUTES, SITE } from "@/lib/constants";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-line bg-canvas text-ink">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[460px]" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 100% at 42% 100%, rgba(124,108,255,0.13), transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(45% 90% at 68% 100%, rgba(96,165,250,0.10), transparent 70%)",
          }}
        />
      </div>
      <div className="container-marketing relative py-[120px] text-center">
        <h2 className="mx-auto mb-8 max-w-[18ch] font-serif text-[clamp(34px,5vw,62px)] font-normal leading-[1.06] tracking-[-0.015em]">
          <SplitWords text="Run your next hackathon with an *open rubric.*" />
        </h2>
        <Reveal delay={0.4} y={14}>
          <div className="flex flex-wrap justify-center gap-3.5">
            <Button asChild variant="accent" size="lg" className="rounded-full px-7">
              <Link href={ROUTES.signUp}>Start judging free</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-7">
              <a href={SITE.githubUrl} target="_blank" rel="noreferrer">
                View on GitHub ↗
              </a>
            </Button>
          </div>
        </Reveal>
      </div>

      <footer className="relative border-t border-line">
        <div className="container-marketing flex flex-wrap items-center justify-between gap-5 py-10">
          <Link href={ROUTES.home} className="text-ink">
            <Logo />
          </Link>
          <div className="font-mono text-[12px] text-faint">
            MIT licensed · Self-hostable · Nonprofit
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-dim">
            <Link href={ROUTES.pricing} className="link-underline">
              Pricing
            </Link>
            <Link href={ROUTES.docs} className="link-underline">
              Docs
            </Link>
            <a
              href={SITE.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="link-underline"
            >
              GitHub
            </a>
            <Link href={ROUTES.contact} className="link-underline">
              Contact
            </Link>
            <Link href={ROUTES.terms} className="link-underline">
              Terms
            </Link>
            <Link href={ROUTES.privacy} className="link-underline">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </section>
  );
}
