"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
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

/**
 * DESIGN.md 4.1 + 4.2: a thin ink announcement strip (one line, chip, one link,
 * dismissible) above a 64px sticky header that blurs once the page scrolls.
 */
export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Announcement bar */}
      {!dismissed && (
        <div className="relative bg-ink px-10 py-[11px] text-center text-[13.5px] font-semibold text-canvas">
          <span className="mr-2.5 inline-block rounded-full border border-accent px-2 py-[1px] align-middle font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#9aa4ff]">
            Alpha
          </span>
          <span className="align-middle">
            OpenRubric is in early alpha, expect rough edges.{" "}
            <Link href={ROUTES.feedback} className="text-[#9aa4ff] underline underline-offset-2">
              Report an issue
            </Link>
          </span>
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={() => setDismissed(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-canvas/60 transition-colors hover:text-canvas"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Header */}
      <header
        className={cn(
          "sticky top-0 z-50 h-16 border-b bg-surface/90 backdrop-blur-[12px] transition-[border-color,box-shadow] duration-300",
          scrolled
            ? "border-line shadow-[0_12px_32px_-18px_rgba(10,10,12,0.18)]"
            : "border-transparent",
        )}
      >
        <nav className="mx-auto flex h-full w-full max-w-[1180px] items-center justify-between px-[clamp(18px,4vw,34px)]">
          <Link href={ROUTES.home} className="text-ink transition-opacity hover:opacity-80">
            <Logo />
          </Link>

          <div className="hidden items-center gap-7 text-[14px] font-semibold text-ink md:flex">
            {NAV_LINKS.map((l) =>
              l.external ? (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="link-underline">
                  {l.label}
                </a>
              ) : (
                <Link key={l.label} href={l.href} className="link-underline">
                  {l.label}
                </Link>
              ),
            )}
          </div>

          <div className="flex items-center gap-5">
            <MarketingAuthButtons />
          </div>
        </nav>
      </header>
    </>
  );
}
