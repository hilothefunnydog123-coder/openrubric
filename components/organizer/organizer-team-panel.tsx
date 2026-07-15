"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrganizerRow {
  email: string;
  status: "pending" | "approved";
  created_at: string;
}

/**
 * Co-organizer admin panel. Invite people by email; each shows as Pending until they
 * accept and sign up, then Approved. The host gets a notification email at both steps.
 */
export function OrganizerTeamPanel({
  hackathonId,
  initial,
}: {
  hackathonId: string | null;
  initial: OrganizerRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<OrganizerRow[]>(initial);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function invite() {
    const value = email.trim().toLowerCase();
    if (!value || !hackathonId) return;
    setSending(true);
    setNote(null);
    try {
      const res = await fetch("/api/organizers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, hackathon_id: hackathonId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setNote(typeof data.error === "string" ? data.error : "Couldn't send the invite.");
        return;
      }
      setRows((r) =>
        r.some((x) => x.email === value)
          ? r
          : [...r, { email: value, status: "pending", created_at: new Date().toISOString() }],
      );
      setEmail("");
      setNote(`Invited ${value}, they'll show as Pending until they accept.`);
      router.refresh();
    } catch {
      setNote("Network error sending the invite.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-line bg-surface">
      <div className="border-b border-line-soft px-5 py-[15px]">
        <div className="text-[14px] font-semibold">Co-organizers</div>
        <div className="mt-0.5 text-[12.5px] text-dim">
          Invite people to help run this event. They become Approved once they accept.
        </div>
      </div>

      {/* invite row */}
      <div className="border-b border-line-soft p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void invite();
            }}
            placeholder="organizer@email.org"
            disabled={!hackathonId || sending}
            className="flex-1 rounded-[9px] border border-line bg-canvas px-3 py-2 text-[13.5px] outline-none focus:border-accent disabled:opacity-50"
          />
          <Button size="sm" onClick={() => void invite()} disabled={!hackathonId || sending || !email.trim()}>
            {sending ? "Sending…" : "Invite"}
          </Button>
        </div>
        {sending && (
          <div className="relative mt-2 h-1 w-full overflow-hidden rounded-full bg-sunken">
            <span className="absolute top-0 h-full animate-indeterminate rounded-full bg-accent" />
          </div>
        )}
        {!hackathonId && (
          <p className="mt-2 text-[12px] text-faint">Create your hackathon first to invite co-organizers.</p>
        )}
        {note && <p className="mt-2 font-mono text-[11.5px] text-dim">{note}</p>}
      </div>

      {/* list */}
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-[13px] text-faint">
          No co-organizers yet, invite someone above.
        </div>
      ) : (
        rows.map((o) => (
          <div
            key={o.email}
            className="flex items-center justify-between gap-3 border-b border-line-softer px-5 py-3.5 last:border-b-0"
          >
            <span className="truncate text-[13.5px] font-medium">{o.email}</span>
            {o.status === "approved" ? (
              <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-[rgba(46,138,94,0.3)] bg-[rgba(46,138,94,0.08)] px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-signal-clean">
                <Check className="h-3 w-3" strokeWidth={3} />
                Approved
              </span>
            ) : (
              <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-[rgba(168,121,31,0.3)] bg-[rgba(168,121,31,0.08)] px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-signal-review">
                <Clock className="h-3 w-3" strokeWidth={2.5} />
                Pending
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
}
