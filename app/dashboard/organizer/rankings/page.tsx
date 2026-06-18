import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { TopNav } from "@/components/app/top-nav";
import { RankingsTable } from "@/components/rankings/rankings-table";
import { TrackWinnersPanel } from "@/components/rankings/track-winners-panel";
import { ScoreBreakdownChart } from "@/components/rankings/score-breakdown-chart";
import { ExportButton } from "@/components/rankings/export-button";
import { getActiveHackathon, listProjectViews } from "@/lib/live-data";
import { rankProjects, suggestedOverallWinner, trackWinners } from "@/lib/scoring";
import type { ReviewCase } from "@/lib/types";

export const metadata: Metadata = { title: "Organizer · Rankings" };
export const dynamic = "force-dynamic";

export default async function RankingsPage() {
  const hackathon = await getActiveHackathon();
  const projects = hackathon ? await listProjectViews(hackathon.id) : [];
  const reviewCases: ReviewCase[] = [];

  const ranked = rankProjects(projects, reviewCases);
  const winners = trackWinners(projects, reviewCases);
  const { eligibleWinner } = suggestedOverallWinner(projects, reviewCases);
  const blockedTop = ranked.find((r) => r.blocked);

  const chartData = ranked.map((r) => ({
    name: r.project.project_name,
    avg: r.project.othersAvg,
    blocked: r.blocked,
  }));

  return (
    <AppShell role="organizer">
      <TopNav eyebrow="Final Rankings" title="Rankings" actions={<ExportButton />} />

      <div className="mx-auto w-full max-w-content px-8 pb-[70px] pt-6">
        {/* winner callouts */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {eligibleWinner && (
            <div className="rounded-[14px] border border-accent bg-accent-soft p-5">
              <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-accent">
                Suggested overall winner
              </div>
              <div className="text-[22px] font-bold tracking-[-0.02em]">
                {eligibleWinner.project.project_name}
              </div>
              <div className="mt-1.5 font-mono text-[12px] text-dim">
                Avg {eligibleWinner.project.othersAvg} · clean timeline · eligible to award
              </div>
            </div>
          )}

          {blockedTop && (
            <div className="rounded-[14px] border border-[rgba(180,69,60,0.3)] bg-[rgba(180,69,60,0.04)] p-5">
              <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-signal-high">
                Hold before award
              </div>
              <div className="text-[16px] font-semibold tracking-[-0.01em]">
                {blockedTop.project.project_name} — top in {blockedTop.project.track}
              </div>
              <div className="mt-1.5 text-[12.5px] leading-[1.45] text-dim">
                Top score, but a high-priority review is unresolved. Resolve it before this award is final.
              </div>
            </div>
          )}
        </div>

        {/* score breakdown chart */}
        <div className="mb-6">
          <ScoreBreakdownChart data={chartData} />
        </div>

        {/* overall leaderboard */}
        <div className="mb-6">
          <RankingsTable ranked={ranked} />
        </div>

        {/* track winners */}
        <TrackWinnersPanel winners={winners} />
      </div>
    </AppShell>
  );
}
