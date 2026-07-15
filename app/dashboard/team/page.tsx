import type { Metadata } from "next";
import Link from "next/link";
import { SimpleHeader } from "@/components/app/simple-header";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Badge } from "@/components/ui/badge";
import { getViewer } from "@/lib/auth";
import { getProjectViewForEmail } from "@/lib/live-data";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = { title: "My team" };
export const dynamic = "force-dynamic";

export default async function TeamDashboardPage() {
  const viewer = await getViewer();
  const project = viewer ? await getProjectViewForEmail(viewer.email) : null;

  if (!project) {
    return (
      <div className="min-h-screen bg-canvas">
        <SimpleHeader />
        <div className="mx-auto w-full max-w-content px-8 pb-20 pt-10">
          <Eyebrow className="mb-2">Participant</Eyebrow>
          <h1 className="mb-4 text-[28px] font-semibold tracking-[-0.025em]">Your submission</h1>
          <div className="rounded-[14px] border border-line bg-surface p-6">
            <p className="max-w-[60ch] text-[14px] leading-[1.6] text-dim">
              We couldn&apos;t find a submission linked to your account
              {viewer?.email ? ` (${viewer.email})` : ""}. Once an organizer imports your project, or
              you&apos;re listed as a participant with this email, your submission and judging status
              will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const links = [
    { label: "Devpost", url: project.devpost_url },
    { label: "GitHub", url: project.repo_url },
    { label: "Live demo", url: project.live_url },
    { label: "Video", url: project.demo_video_url },
  ].filter((lk) => lk.url);

  return (
    <div className="min-h-screen bg-canvas">
      <SimpleHeader />
      <div className="mx-auto w-full max-w-content px-8 pb-20 pt-10">
        <Eyebrow className="mb-2">Participant · {project.team_name}</Eyebrow>
        <h1 className="mb-8 text-[28px] font-semibold tracking-[-0.025em]">Your submission</h1>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
          {/* submission card */}
          <div className="rounded-[14px] border border-line bg-surface p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-[20px] font-semibold tracking-[-0.01em]">{project.project_name}</div>
                <div className="mt-1 font-mono text-[11.5px] text-dim">{project.team_name}</div>
              </div>
            </div>
            <Badge variant="accent" className="mb-4">
              {project.track}
            </Badge>
            <p className="mb-6 max-w-[60ch] text-[14px] leading-[1.6] text-ink">
              {project.description}
            </p>
            {links.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {links.map((lk) => (
                  <a
                    key={lk.label}
                    href={lk.url!.startsWith("http") ? lk.url! : `https://${lk.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[9px] border border-line bg-raised px-3 py-2.5 text-center text-[12.5px] font-medium transition-colors hover:border-ink"
                  >
                    {lk.label} ↗
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* status rail */}
          <div className="flex flex-col gap-5">
            <div className="rounded-[14px] border border-line bg-surface p-5">
              <div className="mb-3.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim">
                Judging status
              </div>
              <div className="flex items-center justify-between border-b border-line-softer pb-3">
                <span className="text-[13.5px] text-ink">Judges scored</span>
                <span className="font-mono text-[13px] font-semibold">
                  {project.judgesDone} / {project.judgesTotal}
                </span>
              </div>
            </div>

            <div className="rounded-[14px] border border-line bg-raised p-5">
              <p className="mb-4 text-[13px] leading-[1.6] text-dim">
                Individual judge scores stay private until the organizer publishes results. You can
                request your score and the organizers decide how much to share.
              </p>
              <Link
                href={ROUTES.teamScores}
                className="inline-flex items-center gap-1.5 rounded-[9px] bg-ink px-4 py-2.5 text-[13px] font-semibold text-canvas transition-opacity hover:opacity-90"
              >
                See your score
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
