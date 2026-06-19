"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { ROUTES } from "@/lib/constants";

/**
 * Right-side nav cluster on the landing page. Signed in → a single "Dashboard" button
 * (routed by role); signed out → "Sign in" + "Get started". The session is remembered
 * across visits via Supabase's persisted auth, so returning users skip sign-in.
 */
export function MarketingAuthButtons() {
  const { user, loading } = useSession();

  if (!loading && user) {
    const dashboard = user.role === "judge" ? ROUTES.judgeDashboard : ROUTES.organizerDashboard;
    return (
      <Button asChild size="sm">
        <Link href={dashboard}>Dashboard</Link>
      </Button>
    );
  }

  return (
    <>
      <Link
        href={ROUTES.signIn}
        className="hidden whitespace-nowrap text-sm text-dim transition-colors hover:text-ink sm:inline"
      >
        Sign in
      </Link>
      <Button asChild size="sm">
        <Link href={ROUTES.signUp}>Get started</Link>
      </Button>
    </>
  );
}
