"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Gavel, ClipboardCheck, GitBranch, ShieldCheck, ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ROUTES } from "@/lib/constants";

/**
 * Shown when someone arrives from a judge invite link after signing up. Confirms the
 * hackathon they were invited to, finalizes the invitation (idempotent), and walks them
 * straight into judging, no role choice.
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

  const perks = [
    { icon: ClipboardCheck, text: "Score each project against the event's rubric." },
    { icon: GitBranch, text: "See real GitHub timelines and AI quick-summaries." },
    { icon: ShieldCheck, text: "You'll only see this hackathon, nothing else to set up." },
  ];

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-canvas px-6 py-14">
      {/* soft ambient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]"
      />

      <Link href={ROUTES.home} className="z-10 mb-9 text-ink">
        <Logo />
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="z-10 w-full max-w-[480px] overflow-hidden rounded-[22px] border border-line bg-surface shadow-card"
      >
        {/* hero band */}
        <div className="relative border-b border-line-soft bg-gradient-to-b from-accent-soft/60 to-transparent px-8 pb-7 pt-9 text-center">
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-[18px] border border-line bg-surface text-accent shadow-[0_6px_20px_rgba(20,18,14,0.08)]"
          >
            <Gavel className="h-8 w-8" strokeWidth={1.7} />
          </motion.span>

          <h1 className="text-balance text-[27px] font-semibold leading-[1.12] tracking-[-0.025em] text-ink">
            You&apos;re judging
            <br />
            <span className="text-accent">{hackathonName}</span>
          </h1>

          <p className="mx-auto mt-3 max-w-[36ch] text-balance text-[14px] leading-[1.55] text-dim">
            {inviterName ? (
              <>
                <span className="font-medium text-ink">{inviterName}</span> invited you to help score
                submissions.
              </>
            ) : (
              "You've been invited to help score submissions."
            )}{" "}
            We&apos;ve set up your judging space, open it to start.
          </p>
        </div>

        {/* what you'll do */}
        <div className="px-8 py-6">
          <ul className="flex flex-col gap-3.5">
            {perks.map(({ icon: Icon, text }, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18 + i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-start gap-3"
              >
                <span className="mt-px flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[9px] border border-line bg-raised text-ink">
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <span className="text-[13.5px] leading-[1.5] text-dim">{text}</span>
              </motion.li>
            ))}
          </ul>

          <button
            type="button"
            onClick={follow}
            disabled={pending}
            className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-control bg-ink px-4 py-3.5 text-[14.5px] font-semibold text-canvas transition-all hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Setting you up…" : "Start judging"}
            {!pending && (
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                strokeWidth={2.25}
              />
            )}
          </button>
          <p className="mt-3 text-center font-mono text-[10.5px] text-faint">
            Takes a second, we&apos;ll line up your projects.
          </p>
        </div>
      </motion.div>
    </main>
  );
}
