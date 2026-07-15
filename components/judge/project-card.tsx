"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import type { ProjectView, SubmissionStatus } from "@/lib/types";

const STATUS_DOT: Record<SubmissionStatus, string> = {
  imported: "bg-[#C9C4BA]",
  not_scored: "bg-[#C9C4BA]",
  in_progress: "bg-signal-review-dot",
  finalized: "bg-signal-clean-dot",
};

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  imported: "Imported",
  not_scored: "Not scored",
  in_progress: "In progress",
  finalized: "Completed",
};

/**
 * Per-project track picker. Each judge decides which track they're scoring a project
 * under; the choice persists to the judge's own assignment via /api/judges/track.
 */
function TrackSelect({
  submissionId,
  tracks,
  selectedTrackId,
}: {
  submissionId: string;
  tracks: { id: string; name: string }[];
  selectedTrackId: string | null;
}) {
  const [value, setValue] = useState(selectedTrackId ?? "");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close the custom menu on any outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function onChange(next: string) {
    setValue(next);
    setOpen(false);
    setSaving(true);
    try {
      await fetch("/api/judges/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: submissionId, track_id: next || null }),
      });
    } catch {
      /* keep the optimistic value, it retries on the next change */
    } finally {
      setSaving(false);
    }
  }

  if (tracks.length === 0) return null;
  const current = tracks.find((t) => t.id === value);
  const options = [{ id: "", name: "Unassigned" }, ...tracks];

  return (
    <div className="mb-4">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
        Judging track{saving ? " · saving…" : ""}
      </span>
      {/* Custom dropdown (no native <select>) so it looks identical on Mac, Windows,
          and Linux, and themes with the rest of OpenRubric. */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Judging track"
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-[9px] border bg-raised px-2.5 py-2 text-left text-[12.5px] font-medium transition-colors",
            open ? "border-accent" : "border-line hover:border-ink",
            current ? "text-ink" : "text-dim",
          )}
        >
          <span className="truncate">{current?.name ?? "Unassigned"}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 flex-shrink-0 text-faint transition-transform",
              open && "rotate-180",
            )}
            strokeWidth={2}
          />
        </button>
        {open && (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+5px)] z-30 max-h-56 overflow-y-auto rounded-[10px] border border-line bg-surface p-1.5 shadow-[0_12px_34px_rgba(20,18,14,0.16)]"
          >
            {options.map((o) => {
              const selected = o.id === value;
              return (
                <button
                  key={o.id || "unassigned"}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => onChange(o.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-left text-[12.5px] transition-colors hover:bg-sunken",
                    selected ? "font-semibold text-ink" : "text-dim",
                  )}
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 flex-shrink-0 text-accent",
                      selected ? "opacity-100" : "opacity-0",
                    )}
                    strokeWidth={3}
                  />
                  <span className="truncate">{o.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectCard({
  project,
  status,
  myScore,
  tracks = [],
  selectedTrackId = null,
}: {
  project: ProjectView;
  status: SubmissionStatus;
  myScore: number;
  tracks?: { id: string; name: string }[];
  selectedTrackId?: string | null;
}) {
  const done = status === "finalized";
  const started = status === "in_progress";
  const btnLabel = done ? "Review score" : started ? "Continue grading" : "Grade";

  return (
    <div className="flex flex-col rounded-[14px] border border-line bg-surface p-[18px] transition-all duration-150 hover:-translate-y-0.5 hover:border-ink">
      <div className="mb-1 flex items-start justify-between gap-2.5">
        <div className="text-[17px] font-semibold tracking-[-0.01em]">{project.project_name}</div>
      </div>
      <div className="mb-4 font-mono text-[11.5px] text-dim">{project.team_name}</div>

      {tracks.length > 0 ? (
        <TrackSelect submissionId={project.id} tracks={tracks} selectedTrackId={selectedTrackId} />
      ) : (
        <div className="mb-4 font-mono text-[11.5px] text-dim">{project.track}</div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <span className={cn("h-[7px] w-[7px] rounded-full", STATUS_DOT[status])} />
        <span className="text-[13px] text-dim">{STATUS_LABEL[status]}</span>
        {done && (
          <>
            <span className="flex-1" />
            <span className="font-mono text-[12px] font-semibold text-ink">{myScore} / 100</span>
          </>
        )}
      </div>

      <Link
        href={ROUTES.project(project.id)}
        className={cn(
          "mt-auto w-full rounded-[9px] border py-2.5 text-center text-[13.5px] font-semibold transition-transform hover:-translate-y-px",
          done ? "border-line bg-surface text-ink" : "border-ink bg-ink text-canvas",
        )}
      >
        {btnLabel}
      </Link>
    </div>
  );
}
