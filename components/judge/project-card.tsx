"use client";

import Link from "next/link";
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
  finalized: "Finalized",
};

export function ProjectCard({
  project,
  status,
  myScore,
}: {
  project: ProjectView;
  status: SubmissionStatus;
  myScore: number;
}) {
  const done = status === "finalized";
  const started = status === "in_progress";
  const btnLabel = done ? "Review score" : started ? "Continue grading" : "Grade";

  return (
    <div className="flex flex-col rounded-[14px] border border-line bg-surface p-[18px] transition-all duration-150 hover:-translate-y-0.5 hover:border-ink">
      <div className="mb-1 flex items-start justify-between gap-2.5">
        <div className="text-[17px] font-semibold tracking-[-0.01em]">{project.project_name}</div>
      </div>
      <div className="mb-4 font-mono text-[11.5px] text-dim">
        {project.team_name} · {project.track}
      </div>

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
