import { NextResponse } from "next/server";
import { listProjectViews, listReviewCases } from "@/lib/live-data";
import { rankProjects, suggestedOverallWinner, trackWinners } from "@/lib/scoring";

/** GET /api/rankings/[hackathonId] — overall + per-track standings with eligibility. */
export async function GET(_req: Request, { params }: { params: Promise<{ hackathonId: string }> }) {
  const { hackathonId } = await params;

  const [projects, reviewCases] = await Promise.all([
    listProjectViews(hackathonId),
    listReviewCases(hackathonId),
  ]);

  const ranked = rankProjects(projects, reviewCases);
  const tracks = trackWinners(projects, reviewCases);
  const { eligibleWinner, heldBack } = suggestedOverallWinner(projects, reviewCases);

  return NextResponse.json({
    hackathon_id: hackathonId,
    overall: ranked.map(({ project, rank, blocked }) => ({
      rank,
      id: project.id,
      project_name: project.project_name,
      team_name: project.team_name,
      track: project.track,
      avg: project.othersAvg,
      judges: `${project.judgesDone}/${project.judgesTotal}`,
      review_priority: project.scan.review_priority,
      eligible: !blocked,
    })),
    track_winners: tracks.map((t) => ({
      track: t.track,
      project: t.project.project_name,
      avg: t.project.othersAvg,
      eligible: !t.blocked,
    })),
    suggested_overall_winner: eligibleWinner?.project.project_name ?? null,
    held_back: heldBack?.project.project_name ?? null,
  });
}
