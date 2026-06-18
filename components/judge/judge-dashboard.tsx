"use client";

import { useMemo, useState } from "react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ProfileMenu } from "@/components/app/profile-menu";
import { ProjectSearchBar, type JudgeFilter } from "./project-search-bar";
import { ProjectCard } from "./project-card";
import { useDemo } from "@/components/app/demo-store";
import { DEFAULT_CRITERIA } from "@/lib/demo-data";
import { hasAnyScore, isComplete, judgeStatus, totalScore } from "@/lib/scoring";
import type { ProjectView } from "@/lib/types";

export function JudgeDashboard({ projects }: { projects: ProjectView[] }) {
  const { scoresFor } = useDemo();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<JudgeFilter>("all");

  const rows = useMemo(() => {
    return projects.map((project) => {
      const scores = scoresFor(project.id);
      return {
        project,
        scores,
        status: judgeStatus(scores, DEFAULT_CRITERIA),
        myScore: totalScore(scores, DEFAULT_CRITERIA),
      };
    });
  }, [scoresFor, projects]);

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
      else if (filter === "scored") matchesFilter = isComplete(scores, DEFAULT_CRITERIA);
      else if (filter === "needsReview")
        matchesFilter = project.scan.review_priority === "needs" || project.scan.review_priority === "high";

      return matchesQuery && matchesFilter;
    });
  }, [rows, search, filter]);

  return (
    <div>
      <div className="border-b border-line bg-canvas">
        <div className="mx-auto w-full max-w-content px-8 pt-[34px]">
          <div className="mb-3.5 flex items-start justify-between gap-4">
            <Eyebrow>Judging</Eyebrow>
            <ProfileMenu />
          </div>
          <h1 className="mb-1.5 text-[30px] font-semibold tracking-[-0.025em]">Projects to judge</h1>
          <p className="mb-6 text-[14.5px] text-dim">
            {projects.length === 0
              ? "No projects assigned yet — they'll appear here once the organizer imports them."
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
              <ProjectCard key={project.id} project={project} status={status} myScore={myScore} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-faint">
            <div className="font-mono text-[13px]">No projects match “{search}”</div>
          </div>
        )}
      </div>
    </div>
  );
}
