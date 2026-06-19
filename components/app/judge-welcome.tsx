"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Gavel } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ROUTES } from "@/lib/constants";

/**
 * Shown when someone arrives from a judge invite link after signing up. Confirms the
 * hackathon they were invited to, finalizes the invitation (idempotent), and walks
 * them straight into judging — no role choice.
 */
export function JudgeWelcome({
  token,
  hackathonName,
  inviterName,
}: {
  token: string;
  hackathonName: string;
  inviterName: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function follow() {
    setPending(true);
    // Make sure the invitation is accepted + assignments exist, then go judge.
    await fetch("/api/judges/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => {});
    router.push(ROUTES.judgeDashboard);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-16">
      <Link href={ROUTES.home} className="mb-8 text-ink">
        <Logo />
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[460px] rounded-[18px] border border-line bg-surface p-8 text-center shadow-card"
      >
        <span className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-[15px] bg-sunken text-ink">
          <Gavel className="h-7 w-7" strokeWidth={1.8} />
        </span>

        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[rgba(46,138,94,0.3)] bg-[rgba(46,138,94,0.06)] px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-signal-clean">
          You&apos;re a judge
        </div>

        <h1 className="mb-2 text-[26px] font-semibold tracking-[-0.02em]">
          We saw you were invited to judge
        </h1>
        <p className="mb-7 text-[15px] leading-[1.55] text-dim">
          {inviterName ? (
            <>
              <span className="font-medium text-ink">{inviterName}</span> invited you to judge{" "}
            </>
          ) : (
            "You've been invited to judge "
          )}
          <span className="font-medium text-ink">{hackathonName}</span>. Follow through and we&apos;ll
          set you up under this hackathon with the projects you need to score.
        </p>

        <button
          type="button"
          onClick={follow}
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-control bg-accent px-4 py-3 text-[14px] font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
        >
          {pending ? "Setting you up…" : `Continue to judging ${hackathonName} →`}
        </button>
        <p className="mt-3 font-mono text-[11px] text-faint">
          You&apos;ll only see {hackathonName} — nothing else to set up.
        </p>
      </motion.div>
    </main>
  );
}
