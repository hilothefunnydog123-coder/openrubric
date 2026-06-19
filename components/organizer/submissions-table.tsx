import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/constants";
import { isBlockedByReview } from "@/lib/scoring";
import type { ProjectView, ReviewCase, SubmissionStatus } from "@/lib/types";

const COLS = "grid-cols-[1.8fr_1fr_0.7fr_0.6fr_0.9fr_1fr]";

function aggregateStatus(p: ProjectView): SubmissionStatus {
  if (p.judgesDone >= p.judgesTotal) return "finalized";
  if (p.judgesDone > 0) return "in_progress";
  return "not_scored";
}

function reviewCell(p: ProjectView, reviewCases: ReviewCase[]) {
  const open = reviewCases.find((rc) => rc.submission_id === p.id && rc.status === "open");
  if (!open) return { label: "None", className: "text-faint" };
  if (isBlockedByReview(p.id, reviewCases)) return { label: "High priority", className: "text-signal-high" };
  return { label: "Open", className: "text-signal-review" };
}

export function SubmissionsTable({
  projects,
  reviewCases,
}: {
  projects: ProjectView[];
  reviewCases: ReviewCase[];
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <div className="border-b border-line-soft px-5 py-[15px] text-[14px] font-semibold">Submissions</div>
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div
            className={`grid ${COLS} gap-2.5 border-b border-line-soft px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-faint`}
          >
            <span>Project</span>
            <span>Track</span>
            <span>Judges</span>
            <span>Avg</span>
            <span>Review</span>
            <span>Status</span>
          </div>
          {projects.map((p) => {
            const review = reviewCell(p, reviewCases);
            return (
              <Link
                key={p.id}
                href={ROUTES.project(p.id)}
                className={`grid ${COLS} items-center gap-2.5 border-b border-line-softer px-5 py-3.5 transition-colors last:border-b-0 hover:bg-raised`}
              >
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold">{p.project_name}</div>
                  <div className="truncate font-mono text-[10.5px] text-faint">{p.team_name}</div>
                </div>
                <span className="truncate text-[12.5px] text-dim">{p.track}</span>
                <span className="font-mono text-[12px] text-dim">
                  {p.judgesDone} / {p.judgesTotal}
                </span>
                <span className="font-mono text-[13px] font-semibold">{p.othersAvg}</span>
                <span className={`font-mono text-[11px] ${review.className}`}>{review.label}</span>
                <span className="justify-self-start">
                  <StatusBadge status={aggregateStatus(p)} />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
