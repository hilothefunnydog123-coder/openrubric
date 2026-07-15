"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { MarketingAuthButtons } from "./marketing-auth-buttons";
import { ROUTES, SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Product", href: "/#product" },
  { label: "Pricing", href: ROUTES.pricing },
  { label: "Docs", href: ROUTES.docs },
  { label: "GitHub", href: SITE.githubUrl, external: true },
  { label: "Demo", href: ROUTES.video },
];

export function MarketingNav() {
  // Past the top of the page the bar tightens: stronger blur, hairline shadow.
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-line bg-background/85 backdrop-blur-[14px] transition-shadow duration-300",
        scrolled && "shadow-[0_1px_0_rgb(var(--border)),0_12px_32px_-18px_rgba(0,0,0,0.18)]",
      )}
    >
      {/* Alpha notice — the first thing every visitor sees. */}
      <Link
        href={ROUTES.feedback}
        className="group flex items-center justify-center gap-2 border-b border-line-soft bg-accent-soft px-5 py-2.5 text-center font-mono text-[12px] tracking-[0.02em] text-dim transition-colors hover:text-ink"
      >
        <span className="rounded-full border border-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
          Alpha
        </span>
        <span>
          OpenRubric is in early alpha — expect bugs. Report an issue{" "}
          <span className="inline-block text-accent transition-transform duration-300 ease-out group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </Link>

      {/* Nav */}
      <nav className="container-marketing flex items-center justify-between py-4">
        <Link href={ROUTES.home} className="text-ink transition-opacity hover:opacity-80">
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
                className="link-underline"
              >
                {l.label}
              </a>
            ) : (
              <Link key={l.label} href={l.href} className="link-underline">
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
