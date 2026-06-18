"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { DemoJudgeRow } from "@/lib/demo-data";

const COLS = "grid-cols-[1.2fr_1.6fr_1.4fr_1fr]";

export function JudgeInviteForm({
  judges,
  onChange,
}: {
  judges: DemoJudgeRow[];
  onChange: (next: DemoJudgeRow[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", tracks: "" });
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function invite() {
    if (!draft.name.trim() || !draft.email.trim()) return;
    setSending(true);
    setNote(null);
    try {
      const res = await fetch("/api/judges/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: draft.email.trim(),
          name: draft.name.trim(),
          tracks: draft.tracks ? draft.tracks.split(",").map((t) => t.trim()).filter(Boolean) : [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      setNote(data.ok ? `Invite emailed to ${draft.email.trim()}.` : data.error || "Couldn't send the invite.");
    } catch {
      setNote("Network error sending the invite.");
    }
    setSending(false);
    onChange([...judges, { ...draft, scope: "All submissions" }]);
    setDraft({ name: "", email: "", tracks: "" });
    setOpen(false);
  }

  return (
    <div>
      <div className="overflow-hidden rounded-[12px] border border-line">
        <div
          className={`grid ${COLS} gap-2.5 border-b border-line-soft px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-faint`}
        >
          <span>Name</span>
          <span>Email</span>
          <span>Tracks</span>
          <span>Scope</span>
        </div>
        {judges.map((j) => (
          <div
            key={j.email}
            className={`grid ${COLS} items-center gap-2.5 border-b border-line-softer px-4 py-3 last:border-b-0`}
          >
            <span className="text-[13.5px] font-semibold">{j.name}</span>
            <span className="truncate font-mono text-[11.5px] text-dim">{j.email}</span>
            <span className="text-[12.5px] text-dim">{j.tracks || "—"}</span>
            <span className="text-[11.5px] text-dim">{j.scope}</span>
          </div>
        ))}
      </div>

      {open ? (
        <div className="mt-3 grid grid-cols-1 gap-2 rounded-[11px] border border-line bg-raised p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Judge name"
            className="rounded-[8px] border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
          <input
            value={draft.email}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            placeholder="judge@email.org"
            className="rounded-[8px] border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
          <input
            value={draft.tracks}
            onChange={(e) => setDraft({ ...draft, tracks: e.target.value })}
            placeholder="Tracks (optional)"
            className="rounded-[8px] border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
          <Button size="sm" onClick={invite} disabled={sending}>
            {sending ? "Sending…" : "Add"}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 w-full rounded-[11px] border border-dashed border-[#D6D1C6] px-4 py-3 text-left text-[13.5px] font-semibold transition-colors hover:border-ink"
        >
          + Invite a judge
        </button>
      )}

      {note && <p className="mt-2.5 font-mono text-[11.5px] text-signal-clean">{note}</p>}
    </div>
  );
}
