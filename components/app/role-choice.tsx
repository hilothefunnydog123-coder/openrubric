"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarRange, Trophy } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useSession } from "@/lib/session";
import { ROUTES } from "@/lib/constants";

/** Time-of-day greeting, computed on the client to avoid SSR/timezone mismatch. */
function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Post-login landing for organizers. The only self-serve path is organizing a
 * hackathon, judges never come through here; they arrive via an invite link and are
 * routed straight to judging (see JudgeWelcome).
 */
export function RoleChoice() {
  const { user } = useSession();
  const [greeting, setGreeting] = useState("");
  useEffect(() => setGreeting(timeGreeting()), []);
  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-16">
      <Link href={ROUTES.home} className="mb-8 text-ink">
        <Logo />
      </Link>

      {greeting && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-2.5 text-center font-mono text-[15px] uppercase tracking-[0.14em] text-accent"
        >
          {greeting}
          {firstName ? `, ${firstName}` : ""}
        </motion.p>
      )}

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        className="mb-2 text-center text-[26px] font-semibold tracking-[-0.02em]"
      >
        Let&apos;s set up your hackathon
      </motion.h1>
      <p className="mb-9 text-center text-[15px] text-dim">
        Organize an event, or check the score for a project you submitted.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="grid w-full max-w-[760px] gap-4 sm:grid-cols-2"
      >
        <Link
          href={ROUTES.organize}
          className="group flex h-full flex-col rounded-[18px] border border-line bg-surface p-7 shadow-card transition-all hover:-translate-y-0.5 hover:border-ink"
        >
          <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-[13px] bg-sunken text-ink transition-colors group-hover:bg-ink group-hover:text-canvas">
            <CalendarRange className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <h2 className="mb-1.5 text-[19px] font-semibold tracking-[-0.01em]">Organize a hackathon</h2>
          <p className="mb-6 flex-1 text-[14px] leading-[1.55] text-dim">
            Set up tracks and a rubric, import projects from Devpost, and invite your judges.
          </p>
          <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent">
            Start organizing
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </Link>

        <Link
          href={ROUTES.teamScores}
          className="group flex h-full flex-col rounded-[18px] border border-line bg-surface p-7 shadow-card transition-all hover:-translate-y-0.5 hover:border-ink"
        >
          <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-[13px] bg-sunken text-ink transition-colors group-hover:bg-ink group-hover:text-canvas">
            <Trophy className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <h2 className="mb-1.5 text-[19px] font-semibold tracking-[-0.01em]">See your score</h2>
          <p className="mb-6 flex-1 text-[14px] leading-[1.55] text-dim">
            Submitted a project? Find your hackathon, pick your project, and request your score
            from the organizers.
          </p>
          <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent">
            Find your score
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </Link>
      </motion.div>
    </main>
  );
}
