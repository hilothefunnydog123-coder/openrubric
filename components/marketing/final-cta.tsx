import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
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
        <h2 className="mx-auto mb-8 max-w-[18ch] font-serif text-[clamp(34px,5vw,62px)] font-normal leading-[1.04] tracking-[-0.015em]">
          Run your next hackathon with an open rubric.
        </h2>
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
      </div>

      <footer className="relative border-t border-line">
        <div className="container-marketing flex flex-wrap items-center justify-between gap-5 py-10">
          <Link href={ROUTES.home} className="text-ink">
            <Logo />
          </Link>
          <div className="font-mono text-[12px] text-faint">
            MIT licensed · Self-hostable · Nonprofit
          </div>
          <div className="flex gap-6 text-[13.5px] text-dim">
            <Link href="/#product" className="transition-colors hover:text-ink">
              Product
            </Link>
            <Link href={ROUTES.docs} className="transition-colors hover:text-ink">
              Docs
            </Link>
            <a
              href={SITE.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-ink"
            >
              GitHub
            </a>
            <Link href={ROUTES.judgeDashboard} className="transition-colors hover:text-ink">
              Demo
            </Link>
          </div>
        </div>
      </footer>
    </section>
  );
}
