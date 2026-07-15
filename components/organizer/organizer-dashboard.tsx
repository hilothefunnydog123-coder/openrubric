import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TopNav } from "@/components/app/top-nav";
import { SubmissionsTable } from "./submissions-table";
import { ReviewQueue } from "./review-queue";
import { LiveImport } from "./live-import";
import { ROUTES } from "@/lib/constants";
import { suggestedOverallWinner, trackWinners } from "@/lib/scoring";
import type { ProjectView, ReviewCase } from "@/lib/types";

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="border-line p-5 [&:not(:last-child)]:border-b sm:[&:not(:last-child)]:border-b-0 sm:[&:not(:last-child)]:border-r">
      <div className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint">{label}</div>
      <div className={`text-[30px] font-bold tracking-[-0.02em] tabular-nums ${danger ? "text-signal-high" : ""}`}>
        {value}
      </div>
    </div>
  );
}

export function OrganizerDashboard({
  projects,
  reviewCases = [],
  hackathonId,
  devpostUrl = null,
  submissionDeadline = null,
  judgeCount = 0,
}: {
  projects: ProjectView[];
  reviewCases?: ReviewCase[];
  hackathonId: string | null;
  devpostUrl?: string | null;
  submissionDeadline?: string | null;
  judgeCount?: number;
}) {
  const doneSlots = projects.reduce((a, p) => a + p.judgesDone, 0);
  const totalSlots = projects.reduce((a, p) => a + p.judgesTotal, 0);
  const needsReview = projects.filter(
    (p) => p.scan.review_priority === "needs" || p.scan.review_priority === "high",
  ).length;
  const progressPct = totalSlots > 0 ? Math.round((doneSlots / totalSlots) * 100) : 0;

  const leaders = trackWinners(projects, reviewCases);
  const { eligibleWinner } = suggestedOverallWinner(projects, reviewCases);

  return (
    <>
      <TopNav
        eyebrow="Organizer"
        title="Dashboard"
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <Link href={ROUTES.organize}>Edit setup</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={ROUTES.rankings}>View rankings</Link>
            </Button>
          </>
        }
      />

      <div className="mx-auto w-full max-w-app px-8 pb-[70px] pt-6">
        {/* metrics */}
        <div className="mb-[22px] grid grid-cols-1 overflow-hidden rounded-[14px] border border-line bg-surface sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Submissions" value={String(projects.length)} />
          <Metric label="Judges active" value={String(judgeCount)} />
          <Metric label="Scores completed" value={`${doneSlots} / ${totalSlots}`} />
          <Metric label="Needs review" value={String(needsReview)} danger />
        </div>

        {/* judging progress */}
        <div className="mb-[22px] rounded-[14px] border border-line bg-surface px-5 py-[18px]">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[14px] font-semibold">Judging progress</span>
            <span className="font-mono text-[12px] text-dim">{doneSlots} of {totalSlots} judge scores in</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sunken">
            <div className="h-full rounded-full bg-accent" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* table + rail */}
        <div className="grid grid-cols-1 items-start gap-[22px] lg:grid-cols-[1.65fr_1fr]">
          <div className="flex flex-col gap-[22px]">
            {hackathonId && (
              <LiveImport
                hackathonId={hackathonId}
                devpostUrl={devpostUrl}
                submissionDeadline={submissionDeadline}
              />
            )}
            {projects.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-line bg-surface px-5 py-10 text-center">
                <div className="text-[15px] font-semibold">No projects yet</div>
                <p className="mx-auto mt-1.5 max-w-[42ch] text-[13px] text-dim">
                  Paste your Devpost gallery above, projects scan and summarize as they come in, and
                  new submissions keep syncing automatically until your deadline.
                </p>
              </div>
            ) : (
              <SubmissionsTable projects={projects} reviewCases={reviewCases} />
            )}
          </div>

          <div className="flex flex-col gap-[18px]">
            <div className="rounded-[14px] border border-line bg-surface p-[18px]">
              <div className="mb-3.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim">
                Track leaders
              </div>
              <div className="flex flex-col gap-3">
                {leaders.map((t) => (
                  <div key={t.track} className="flex items-center justify-between gap-2.5">
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold">{t.project.project_name}</div>
                      <div className="font-mono text-[10.5px] text-faint">{t.track}</div>
                    </div>
                    <span className="font-mono text-[13px] font-semibold">{t.project.othersAvg}</span>
                  </div>
                ))}
              </div>
            </div>

            {eligibleWinner && (
              <div className="rounded-[14px] border border-accent bg-accent-soft p-[18px]">
                <div className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-accent">
                  Overall winner · suggested
                </div>
                <div className="text-[18px] font-semibold tracking-[-0.01em]">
                  {eligibleWinner.project.project_name}
                </div>
                <div className="mt-1 font-mono text-[11.5px] text-dim">
                  Avg {eligibleWinner.project.othersAvg} · {eligibleWinner.project.judgesDone} /{" "}
                  {eligibleWinner.project.judgesTotal} judges · clean timeline
                </div>
              </div>
            )}

            <ReviewQueue reviewCases={reviewCases} projects={projects} />
          </div>
        </div>
      </div>
    </>
  );
}
