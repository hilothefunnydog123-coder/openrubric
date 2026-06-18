import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { ROUTES, SITE } from "@/lib/constants";

const NAV_LINKS = [
  { label: "Product", href: "/#product" },
  { label: "Docs", href: ROUTES.docs },
  { label: "GitHub", href: SITE.githubUrl, external: true },
  { label: "Demo", href: ROUTES.judgeDashboard },
];

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/85 backdrop-blur-[14px]">
      {/* Announcement bar */}
      <Link
        href={ROUTES.organize}
        className="block border-b border-line-soft px-5 py-2.5 text-center font-mono text-[12px] tracking-[0.02em] text-dim transition-colors hover:text-ink"
      >
        Open-source judging infrastructure for hackathons <span className="text-accent">→</span>
      </Link>

      {/* Nav */}
      <nav className="container-marketing flex items-center justify-between py-4">
        <Link href={ROUTES.home} className="text-ink">
          <Logo />
        </Link>

        <div className="hidden items-center gap-7 text-sm text-dim md:flex">
          {NAV_LINKS.map((l) =>
            l.external ? (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-ink"
              >
                {l.label}
              </a>
            ) : (
              <Link key={l.label} href={l.href} className="transition-colors hover:text-ink">
                {l.label}
              </Link>
            ),
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.signIn}
            className="hidden whitespace-nowrap text-sm text-dim transition-colors hover:text-ink sm:inline"
          >
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link href={ROUTES.signUp}>Get started</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
