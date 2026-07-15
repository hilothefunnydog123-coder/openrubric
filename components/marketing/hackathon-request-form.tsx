"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toast } from "@/components/ui/toast";
import { ROUTES } from "@/lib/constants";
import {
  hackathonRequestSchema,
  type HackathonRequestValues,
} from "@/lib/validators";

const TEAM_EMAILS = "dlake003@gmail.com,aaditmehta1@gmail.com";

/** The pre-drafted email organizers start from, everything stays editable. */
function presetMessage(hackathon: string) {
  const event = hackathon || "our hackathon";
  return `Hi OpenRubric team,

We're running ${event} and we'd love to use OpenRubric for judging.

A bit about the event:
• When: [dates]
• Where: [city or online]
• Teams expected: [rough number]
• Tracks / judges: [how judging is set up today]

Could you help us get set up?

Thanks!`;
}

export function HackathonRequestForm({ initialHackathon }: { initialHackathon: string }) {
  const [sent, setSent] = useState<null | { email: string }>(null);
  const [demoFallback, setDemoFallback] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const form = useForm<HackathonRequestValues>({
    resolver: zodResolver(hackathonRequestSchema),
    defaultValues: {
      hackathonName: initialHackathon,
      name: "",
      email: "",
      message: presetMessage(initialHackathon),
    },
  });
  const pending = form.formState.isSubmitting;

  async function onSubmit(values: HackathonRequestValues) {
    try {
      const res = await fetch("/api/hackathon-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setToast("Couldn't send your request. Please try again in a minute.");
        return;
      }
      // demo = this deployment has no mailer configured; offer a mailto instead
      // of pretending the email went out.
      setDemoFallback(Boolean(data.demo && !data.emailed));
      setSent({ email: values.email });
    } catch {
      setToast("Network error. Check your connection and try again.");
    }
  }

  if (sent) {
    const values = form.getValues();
    const mailto = `mailto:${TEAM_EMAILS}?subject=${encodeURIComponent(
      `Hackathon request · ${values.hackathonName}`,
    )}&body=${encodeURIComponent(`${values.message}\n\n${values.name} (${values.email})`)}`;
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-[18px] border border-line bg-surface p-10 text-center shadow-card"
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(46,138,94,0.12)] text-[#2e8a5e]"
        >
          <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
            <motion.path
              d="M11 20.5L17 26.5L29 13.5"
              stroke="currentColor"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
            />
          </svg>
        </motion.div>
        {demoFallback ? (
          <>
            <h2 className="mb-2 font-serif text-[28px] font-normal leading-[1.12] tracking-[-0.015em]">
              Almost there
            </h2>
            <p className="mx-auto mb-6 max-w-[42ch] text-[15px] font-semibold leading-[1.6] text-ink">
              This preview deployment can&apos;t send email directly. Tap below and your mail
              app will open with everything filled in.
            </p>
            <Button asChild variant="accent" className="rounded-full px-7">
              <a href={mailto}>Open in your mail app →</a>
            </Button>
          </>
        ) : (
          <>
            <h2 className="mb-2 font-serif text-[28px] font-normal leading-[1.12] tracking-[-0.015em]">
              Request sent
            </h2>
            <p className="mx-auto mb-6 max-w-[42ch] text-[15px] font-semibold leading-[1.6] text-ink">
              We got it. The team will reply at{" "}
              <span className="font-medium text-ink">{sent.email}</span>, usually within a day
              or two.
            </p>
            <Button asChild variant="outline" className="rounded-full px-7">
              <Link href={ROUTES.home}>Back to the site</Link>
            </Button>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <>
      <Toast message={toast} onDismiss={() => setToast(null)} />
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="rounded-[18px] border border-line bg-surface p-7 shadow-card sm:p-9"
      >
        <div className="grid gap-x-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="hackathonName">Hackathon</Label>
            <Input
              id="hackathonName"
              placeholder="HackTheNorth 2026"
              className="mb-4"
              {...form.register("hackathonName")}
            />
            {form.formState.errors.hackathonName && (
              <p className="-mt-2.5 mb-3 text-[12px] text-signal-high">
                {form.formState.errors.hackathonName.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="req-name">Your name</Label>
            <Input id="req-name" placeholder="Priya Shah" className="mb-4" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="-mt-2.5 mb-3 text-[12px] text-signal-high">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
        </div>

        <Label htmlFor="req-email">Your email</Label>
        <Input
          id="req-email"
          type="email"
          placeholder="you@hackathon.org"
          className="mb-4"
          {...form.register("email")}
        />
        {form.formState.errors.email && (
          <p className="-mt-2.5 mb-3 text-[12px] text-signal-high">
            {form.formState.errors.email.message}
          </p>
        )}

        <Label htmlFor="req-message">Message</Label>
        <Textarea
          id="req-message"
          rows={12}
          className="mb-1.5 font-sans text-[14.5px] leading-[1.65]"
          {...form.register("message")}
        />
        {form.formState.errors.message && (
          <p className="mb-2 text-[12px] text-signal-high">
            {form.formState.errors.message.message}
          </p>
        )}
        <p className="mb-5 text-[13px] font-semibold text-ink">
          We drafted this for you. Edit anything before sending.
        </p>

        <Button type="submit" variant="accent" className="w-full rounded-full" disabled={pending}>
          {pending ? "Sending…" : "Send request"}
        </Button>
      </form>
    </>
  );
}
