"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DemoJudgeRow } from "@/lib/demo-data";

const COLS = "grid-cols-[1.2fr_1.6fr_1.4fr_1fr]";

/** Custom track dropdown, styled to match the wizard inputs (no native <select>). */
function TrackSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const items = ["", ...options];
  const label = value || "All tracks";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-[8px] border border-line bg-surface px-3 py-2 text-left text-[13px] text-ink outline-none transition-colors focus:border-accent"
      >
        <span className={value ? "" : "text-faint"}>{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 flex-shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2.25}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+5px)] z-20 overflow-hidden rounded-[10px] border border-line bg-surface py-1 shadow-[0_8px_28px_rgba(20,18,14,0.12)]">
          {items.map((opt) => {
            const selected = opt === value;
            return (
              <button
                key={opt || "all"}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-ink transition-colors hover:bg-sunken"
              >
                <Check
                  className={`h-3.5 w-3.5 flex-shrink-0 text-accent ${selected ? "opacity-100" : "opacity-0"}`}
                  strokeWidth={3}
                />
                <span className={opt ? "" : "text-dim"}>{opt || "All tracks"}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function JudgeInviteForm({
  judges,
  onChange,
  availableTracks = [],
}: {
  judges: DemoJudgeRow[];
  onChange: (next: DemoJudgeRow[]) => void;
  availableTracks?: string[];
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
    onChange([
      ...judges,
      { ...draft, scope: draft.tracks ? `${draft.tracks} track` : "All submissions" },
    ]);
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
            className={`group grid ${COLS} items-center gap-2.5 border-b border-line-softer px-4 py-3 last:border-b-0`}
          >
            <span className="text-[13.5px] font-semibold">{j.name}</span>
            <span className="truncate font-mono text-[11.5px] text-dim">{j.email}</span>
            <span className="text-[12.5px] text-dim">{j.tracks || "-"}</span>
            <span className="flex items-center justify-between gap-2 text-[11.5px] text-dim">
              {j.scope}
              <button
                type="button"
                onClick={() => onChange(judges.filter((x) => x.email !== j.email))}
                title="Remove judge"
                aria-label={`Remove ${j.name}`}
                className="flex-shrink-0 rounded-md p-1.5 text-faint opacity-0 transition-all hover:bg-[rgba(199,58,58,0.1)] hover:text-[#c73a3a] group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </span>
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
          {availableTracks.length > 0 ? (
            <TrackSelect
              value={draft.tracks}
              options={availableTracks}
              onChange={(next) => setDraft({ ...draft, tracks: next })}
            />
          ) : (
            <input
              value={draft.tracks}
              onChange={(e) => setDraft({ ...draft, tracks: e.target.value })}
              placeholder="Tracks (optional)"
              className="rounded-[8px] border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
          )}
          <Button size="sm" onClick={invite} disabled={sending}>
            {sending ? "Sending…" : "Add"}
          </Button>
          {sending && (
            <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-sunken sm:col-span-4">
              <span className="absolute top-0 h-full animate-indeterminate rounded-full bg-accent" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 w-full rounded-[11px] border border-dashed border-line px-4 py-3 text-left text-[13.5px] font-semibold transition-colors hover:border-ink"
        >
          + Invite a judge
        </button>
      )}

      {note && <p className="mt-2.5 font-mono text-[11.5px] text-signal-clean">{note}</p>}
    </div>
  );
}
