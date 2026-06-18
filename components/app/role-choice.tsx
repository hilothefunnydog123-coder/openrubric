"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarRange, Gavel } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ROUTES } from "@/lib/constants";

/**
 * Post-login role choice. Everyone who signs in lands here and picks a path:
 * organize a hackathon (→ setup/import wizard) or judge (→ judge dashboard).
 * Judges who arrive from an invite link skip this and are routed straight to judging.
 */

const CHOICES = [
  {
    href: ROUTES.organize,
    icon: CalendarRange,
    title: "Organize a hackathon",
    body: "Set up tracks and a rubric, import projects from Devpost, and invite your judges.",
    cta: "Start organizing",
  },
  {
    href: ROUTES.judgeDashboard,
    icon: Gavel,
    title: "I'm judging",
    body: "Score the projects you've been assigned against the rubric, with AI summaries and GitHub checks.",
    cta: "Go to judging",
  },
];

export function RoleChoice() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-16">
      <Link href={ROUTES.home} className="mb-8 text-ink">
        <Logo />
      </Link>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-2 text-center text-[26px] font-semibold tracking-[-0.02em]"
      >
        What brings you here?
      </motion.h1>
      <p className="mb-9 text-center text-[15px] text-dim">Pick how you want to use OpenRubric.</p>

      <div className="grid w-full max-w-[760px] grid-cols-1 gap-4 sm:grid-cols-2">
        {CHOICES.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.08 }}
          >
            <Link
              href={c.href}
              className="group flex h-full flex-col rounded-[18px] border border-line bg-surface p-7 shadow-card transition-all hover:-translate-y-0.5 hover:border-ink"
            >
              <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-[13px] bg-sunken text-ink transition-colors group-hover:bg-ink group-hover:text-canvas">
                <c.icon className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <h2 className="mb-1.5 text-[19px] font-semibold tracking-[-0.01em]">{c.title}</h2>
              <p className="mb-6 flex-1 text-[14px] leading-[1.55] text-dim">{c.body}</p>
              <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent">
                {c.cta}
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </main>
  );
}
