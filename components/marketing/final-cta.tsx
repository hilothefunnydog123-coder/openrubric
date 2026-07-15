import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Reveal, SplitWords } from "@/components/ui/reveal";
import { ROUTES, SITE } from "@/lib/constants";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-line bg-canvas text-ink">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[420px]"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 100%, rgba(37,99,235,0.07), transparent 70%)",
        }}
        aria-hidden
      />
      <div className="container-marketing relative py-[120px] text-center">
        <h2 className="mx-auto mb-8 max-w-[18ch] font-serif text-[clamp(34px,5vw,62px)] font-normal leading-[1.06] tracking-[-0.015em]">
          <SplitWords text="Run your next hackathon with an *open rubric.*" />
        </h2>
        <Reveal delay={0.4} y={14}>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href={ROUTES.signUp}>Get started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
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
