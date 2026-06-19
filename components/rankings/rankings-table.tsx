import { cn } from "@/lib/utils";
import type { RankedProject } from "@/lib/scoring";

const COLS = "grid-cols-[0.5fr_2.4fr_1.2fr_0.8fr_0.8fr]";

export function RankingsTable({ ranked }: { ranked: RankedProject[] }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <div className="border-b border-line-soft px-5 py-[15px] text-[14px] font-semibold">
        Overall leaderboard
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div
            className={`grid ${COLS} gap-2.5 border-b border-line-soft px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-faint`}
          >
            <span>#</span>
            <span>Project</span>
            <span>Track</span>
            <span>Avg</span>
            <span>Judges</span>
          </div>
          {ranked.map(({ project, rank, blocked }) => {
            const award = rank === 1 && !blocked ? "Suggested winner" : blocked ? "Review first" : null;
            return (
              <div
                key={project.id}
                className={cn(
                  `grid ${COLS} items-center gap-2.5 border-b border-line-softer px-5 py-3.5 last:border-b-0`,
                  rank === 1 && "bg-accent-soft",
                )}
              >
                <span className="font-mono text-[13px] font-semibold text-faint">
                  {String(rank).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[14px] font-semibold">
                    <span className="truncate">{project.project_name}</span>
                    {award && (
                      <span
                        className={cn(
                          "whitespace-nowrap rounded-full border px-[7px] py-px font-mono text-[9.5px] font-medium",
                          blocked
                            ? "border-signal-high text-signal-high"
                            : "border-signal-clean text-signal-clean",
                        )}
                      >
                        {award}
                      </span>
                    )}
                  </div>
                  <div className="truncate font-mono text-[10.5px] text-faint">{project.team_name}</div>
                </div>
                <span className="text-[12.5px] text-dim">{project.track}</span>
                <span className="font-mono text-[15px] font-bold">{project.othersAvg}</span>
                <span className="font-mono text-[12px] text-dim">
                  {project.judgesDone} / {project.judgesTotal}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
