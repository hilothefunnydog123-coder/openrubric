"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Kind = "feature" | "bug" | "other";
type Status = "idle" | "sending" | "sent" | "error";

const KINDS: { value: Kind; label: string }[] = [
  { value: "feature", label: "Feature idea" },
  { value: "bug", label: "Something's broken" },
  { value: "other", label: "Just saying hi" },
];

/**
 * Public feedback / feature-request form. POSTs to /api/feedback, which stores the
 * note and emails the support inbox. Works for signed-in and anonymous visitors.
 */
export function FeedbackForm() {
  const [kind, setKind] = useState<Kind>("feature");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 5 || status === "sending") return;
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, message: message.trim(), name: name.trim(), email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus("sent");
        setMessage("");
      } else {
        setStatus("error");
        setError("Couldn't send that. Please try again, or email us directly.");
      }
    } catch {
      setStatus("error");
      setError("Network error. Please try again, or email us directly.");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-[14px] border border-accent bg-accent-soft p-6">
        <div className="mb-1.5 text-[16px] font-semibold tracking-[-0.01em]">Thank you, got it. 🙌</div>
        <p className="text-[14px] leading-[1.6] text-dim">
          Your note is on its way to the team. If you left an email, we&apos;ll follow up there.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-4 font-mono text-[12px] text-accent transition-opacity hover:opacity-80"
        >
          Send another →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[14px] border border-line bg-surface p-6">
      <div className="mb-4">
        <Label className="mb-2 block">What&apos;s this about?</Label>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={`rounded-control border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                kind === k.value
                  ? "border-accent bg-accent-soft text-ink"
                  : "border-line bg-raised text-dim hover:border-ink"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <Label htmlFor="fb-message" className="mb-2 block">
          Your message
        </Label>
        <Textarea
          id="fb-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            kind === "feature"
              ? "What would make OpenRubric better for your event?"
              : kind === "bug"
                ? "What happened, and what did you expect instead?"
                : "Tell us anything…"
          }
          className="min-h-[130px]"
          required
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="fb-name" className="mb-2 block">
            Name <span className="text-faint">(optional)</span>
          </Label>
          <Input id="fb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <Label htmlFor="fb-email" className="mb-2 block">
            Email <span className="text-faint">(optional)</span>
          </Label>
          <Input
            id="fb-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
      </div>

      {error && <p className="mb-3 text-[13px] text-signal-high">{error}</p>}

      <Button type="submit" disabled={message.trim().length < 5 || status === "sending"}>
        {status === "sending" ? "Sending…" : "Send feedback"}
      </Button>
    </form>
  );
}
