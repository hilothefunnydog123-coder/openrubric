"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
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

  async function onChange(next: string) {
    setValue(next);
    setSaving(true);
    try {
      await fetch("/api/judges/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: submissionId, track_id: next || null }),
      });
    } catch {
      /* keep the optimistic value — it retries on the next change */
    } finally {
      setSaving(false);
    }
  }

  if (tracks.length === 0) return null;
  return (
    <div className="mb-4">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
        Judging track{saving ? " · saving…" : ""}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Judging track"
          className="w-full appearance-none rounded-[9px] border border-line bg-raised px-2.5 py-2 pr-8 text-[12.5px] font-medium text-ink outline-none transition-colors hover:border-ink focus:border-accent"
        >
          <option value="">Unassigned</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint"
          strokeWidth={2}
        />
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
