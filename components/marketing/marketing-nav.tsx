import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { MarketingAuthButtons } from "./marketing-auth-buttons";
import { ROUTES, SITE } from "@/lib/constants";

const NAV_LINKS = [
  { label: "Product", href: "/#product" },
  { label: "Pricing", href: ROUTES.pricing },
  { label: "Docs", href: ROUTES.docs },
  { label: "GitHub", href: SITE.githubUrl, external: true },
  { label: "Demo", href: ROUTES.judgeDashboard },
];

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/85 backdrop-blur-[14px]">
      {/* Alpha notice — the first thing every visitor sees. */}
      <Link
        href={ROUTES.feedback}
        className="flex items-center justify-center gap-2 border-b border-line-soft bg-accent-soft px-5 py-2.5 text-center font-mono text-[12px] tracking-[0.02em] text-dim transition-colors hover:text-ink"
      >
        <span className="rounded-full border border-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
          Alpha
        </span>
        <span>
          OpenRubric is in early alpha — expect bugs. Report an issue{" "}
          <span className="text-accent">→</span>
        </span>
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
          <MarketingAuthButtons />
        </div>
      </nav>
    </header>
  );
}
