"use client";

import Link from "next/link";
import { useSession } from "@/lib/session";
import { ROUTES } from "@/lib/constants";

/**
 * Right-side nav cluster (DESIGN.md 4.2): sign-in text link + solid ink pill CTA.
 * Signed in → a single "Dashboard" pill (routed by role).
 */
const PILL =
  "inline-flex items-center justify-center rounded-full bg-ink px-[22px] py-[11px] text-[14px] font-bold text-canvas transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-10px_rgba(10,10,12,0.5)] active:translate-y-0";

export function MarketingAuthButtons() {
  const { user, loading } = useSession();

  if (!loading && user) {
    const dashboard = user.role === "judge" ? ROUTES.judgeDashboard : ROUTES.organizerDashboard;
    return (
      <Link href={dashboard} className={PILL}>
        Dashboard
      </Link>
    );
  }

  return (
    <>
      <Link
        href={ROUTES.signIn}
        className="hidden whitespace-nowrap text-[14px] font-semibold text-ink transition-opacity hover:opacity-70 sm:inline"
      >
        Sign in
      </Link>
      <Link href={ROUTES.signUp} className={PILL}>
        Get started
      </Link>
    </>
  );
}
