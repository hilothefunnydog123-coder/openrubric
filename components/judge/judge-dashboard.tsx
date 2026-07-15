"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ProfileMenu } from "@/components/app/profile-menu";
import { ProjectSearchBar, type JudgeFilter } from "./project-search-bar";
import { ProjectCard } from "./project-card";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { ManualSubmissionForm } from "@/components/organizer/manual-submission-form";
import { useDemo } from "@/components/app/demo-store";
import { DEFAULT_CRITERIA } from "@/lib/demo-data";
import { ROUTES } from "@/lib/constants";
import { hasAnyScore, isComplete, judgeStatus, totalScore } from "@/lib/scoring";
import type { ProjectView, RubricCriterion } from "@/lib/types";

export function JudgeDashboard({
  projects,
  criteria = DEFAULT_CRITERIA,
  tracks = [],
  assignmentTracks = {},
  hackathonId = null,
}: {
  projects: ProjectView[];
  /** The hackathon's real rubric criteria, so "Completed" matches what the judge scored. */
  criteria?: RubricCriterion[];
  /** Tracks the judge can assign a project to. */
  tracks?: { id: string; name: string }[];
  /** The judge's saved track pick per submission_id. */
  assignmentTracks?: Record<string, string | null>;
  /** Active hackathon, lets a judge add a missing project (inherits the event rubric). */
  hackathonId?: string | null;
}) {
  const router = useRouter();
  const { scoresFor } = useDemo();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<JudgeFilter>("all");
  const [adding, setAdding] = useState(false);

  const rows = useMemo(() => {
    return projects.map((project) => {
      const scores = scoresFor(project.id);
      return {
        project,
        scores,
        status: judgeStatus(scores, criteria),
        myScore: totalScore(scores, criteria),
      };
    });
  }, [scoresFor, projects, criteria]);

  const completed = rows.filter((r) => r.status === "finalized").length;

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter(({ project, scores, status }) => {
      const matchesQuery =
        !q ||
        project.project_name.toLowerCase().includes(q) ||
        project.team_name.toLowerCase().includes(q) ||
        project.track.toLowerCase().includes(q) ||
        project.participants.some((p) => p.name.toLowerCase().includes(q));

      let matchesFilter = true;
      if (filter === "notScored") matchesFilter = !hasAnyScore(scores);
      else if (filter === "scored") matchesFilter = isComplete(scores, criteria);
      else if (filter === "needsReview")
        matchesFilter = project.scan.review_priority === "needs" || project.scan.review_priority === "high";

      return matchesQuery && matchesFilter;
    });
  }, [rows, search, filter, criteria]);

  return (
    <div>
      <div className="border-b border-line bg-canvas">
        <div className="mx-auto w-full max-w-content px-8 pt-[34px]">
          <div className="mb-3.5 flex items-start justify-between gap-4">
            <Eyebrow>Judging</Eyebrow>
            <div className="flex items-center gap-2.5">
              <ThemeToggle variant="icon" />
              <ProfileMenu />
            </div>
          </div>
          <h1 className="mb-1.5 text-[30px] font-semibold tracking-[-0.025em]">Projects to judge</h1>
          <p className="mb-6 text-[14.5px] text-dim">
            {projects.length === 0
              ? "No projects assigned yet, they'll appear here once the organizer imports them."
              : `Search, open a project, and score it against the rubric. ${projects.length - completed} of ${projects.length} still need your score.`}
          </p>
          <div className="pb-[18px]">
            <ProjectSearchBar search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-content px-8 pb-16 pt-6">
        {visible.length > 0 ? (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map(({ project, status, myScore }) => (
              <ProjectCard
                key={project.id}
                project={project}
                status={status}
                myScore={myScore}
                tracks={tracks}
                selectedTrackId={assignmentTracks[project.id] ?? project.track_id ?? null}
              />
            ))}
          </div>
        ) : (
          <div className="py-12">
            <div className="mb-5 text-center text-faint">
              <div className="font-mono text-[13px]">
                {search ? `No projects match “${search}”` : "No projects to judge yet"}
              </div>
            </div>

            {hackathonId &&
              (adding ? (
                <div className="mx-auto max-w-[560px]">
                  <ManualSubmissionForm
                    hackathonId={hackathonId}
                    prefillProjectName={search}
                    submitLabel="Add & start scoring"
                    onAdded={(submission) => {
                      if (submission?.id) router.push(ROUTES.project(submission.id));
                      else router.refresh();
                    }}
                  />
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={() => setAdding(false)}
                      className="font-mono text-[12px] text-faint transition-colors hover:text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-[460px] rounded-[14px] border border-line bg-surface p-6 text-center">
                  <div className="mb-1.5 text-[15px] font-semibold tracking-[-0.01em]">
                    Can&apos;t find the project?
                  </div>
                  <p className="mb-4 text-[13px] leading-[1.55] text-dim">
                    Add it yourself in a few seconds, just the team and product name. It joins this
                    event with the same rubric, and you&apos;ll jump straight into scoring.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="rounded-control bg-ink px-4 py-2.5 text-[13px] font-semibold text-canvas transition-opacity hover:opacity-90"
                  >
                    Add a project
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
