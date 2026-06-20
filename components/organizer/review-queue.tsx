import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import type { ProjectView, ReviewCase } from "@/lib/types";

export function ReviewQueue({
  reviewCases,
  projects,
}: {
  reviewCases: ReviewCase[];
  projects: ProjectView[];
}) {
  const open = reviewCases.filter((rc) => rc.status === "open");
  const nameById = new Map(projects.map((p) => [p.id, p.project_name]));

  return (
    <div className="rounded-[14px] border border-line bg-surface p-[18px]">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim">Review queue</span>
        <span className="rounded-full bg-[rgba(180,69,60,0.08)] px-2 py-0.5 font-mono text-[10.5px] text-signal-high">
          {open.length} open
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {open.map((rc) => {
          const projectName = nameById.get(rc.submission_id);
          return (
            <Link
              key={rc.id}
              href={ROUTES.project(rc.submission_id)}
              className="flex items-center justify-between gap-2.5 rounded-[10px] border border-line-soft bg-raised px-3 py-2.5 transition-colors hover:border-ink"
            >
              <div className="min-w-0">
                <div className="text-[13px] font-semibold">{projectName ?? rc.submission_id}</div>
                <div className="font-mono text-[10.5px] text-faint">{rc.reason}</div>
              </div>
              <span
                className={`whitespace-nowrap font-mono text-[10px] ${
                  rc.priority === "high" ? "text-signal-high" : "text-signal-review"
                }`}
              >
                {rc.priority === "high" ? "High" : "Needs review"}
              </span>
            </Link>
          );
        })}
        {open.length === 0 && (
          <div className="rounded-[10px] border border-line-soft bg-raised px-3 py-4 text-center font-mono text-[11px] text-faint">
            No open review cases
          </div>
        )}
      </div>
    </div>
  );
}
