import { prettyUrl } from "@/lib/utils";
import { TechIcon } from "@/components/ui/tech-icon";
import { ScreenshotGallery } from "./screenshot-gallery";
import { ReadmeCard } from "./readme-card";
import type { ProjectView } from "@/lib/types";

/**
 * Real screenshots scraped from the public Devpost gallery + an embedded view of the
 * GitHub repo. When no screenshots were captured (CSV/manual import, or Devpost blocked
 * the scrape), it shows a clear "no screenshots" state rather than fake tiles.
 */

function ext(url: string | null): string {
  if (!url) return "#";
  return url.startsWith("http") ? url : `https://${url}`;
}

/**
 * ISO timestamp → "May 23, 2026, 7:01 PM PDT" rendered in the hackathon's timezone.
 * An explicit `timeZone` makes the output identical on server and client (no hydration
 * drift) and shows judges the time in the event's local zone, not raw UTC.
 */
function fmtDateTime(iso: string, timeZone: string | null): string {
  if (!iso) return "N/A";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    }).format(d);
  } catch {
    // Invalid IANA zone, fall back to UTC.
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    }).format(d);
  }
}

export function ScreenshotsGithubCard({
  project,
  timezone = null,
  readme = null,
}: {
  project: ProjectView;
  timezone?: string | null;
  /** The repo's README markdown (scan-cached or fetched on demand by the page). */
  readme?: string | null;
}) {
  const shots = project.screenshots ?? [];
  const scan = project.scan;
  const contributors = scan.contributors_json ?? [];
  const readmeText = readme ?? scan.readme_md ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* Demo video (Vimeo / YouTube), when the project has one */}
      {project.demo_video_url && (
        <div className="rounded-[14px] border border-line bg-surface p-5">
          <div className="mb-3.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
            Demo video
          </div>
          <div className="aspect-video w-full overflow-hidden rounded-[10px] border border-line bg-black">
            <iframe
              src={project.demo_video_url}
              title={`${project.project_name} demo video`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Screenshots */}
      <div className="rounded-[14px] border border-line bg-surface p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
            Screenshots
          </div>
          <div className="font-mono text-[10.5px] text-faint">
            {shots.length ? `${shots.length} from Devpost` : "N/A"}
          </div>
        </div>

        {shots.length === 0 ? (
          <p className="text-[13px] text-dim">
            No screenshots were captured for this project. They&apos;re pulled from the public Devpost
            gallery on import, some projects don&apos;t upload any, or Devpost blocked the scrape.
          </p>
        ) : (
          <ScreenshotGallery shots={shots} name={project.project_name} />
        )}
      </div>

      {/* GitHub embed */}
      <div className="rounded-[14px] border border-line bg-surface p-5">
        <div className="mb-3.5 flex items-center gap-2">
          <TechIcon name="GitHub" className="h-4 w-4 text-ink" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
            GitHub repository
          </span>
        </div>

        {project.repo_url ? (
          <>
            <a
              href={ext(project.repo_url)}
              target="_blank"
              rel="noreferrer"
              className="text-[15px] font-semibold text-ink underline-offset-2 hover:underline"
            >
              {scan.repo_owner}/{scan.repo_name}
            </a>
            <p className="mt-1.5 text-[13px] leading-[1.55] text-dim">{project.ai.what}</p>

            {(project.ai.tech ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(project.ai.tech ?? []).slice(0, 8).map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-0.5 font-mono text-[11px] text-dim"
                  >
                    <TechIcon name={t} className="h-3 w-3" />
                    {t}
                  </span>
                ))}
              </div>
            )}

            <LanguagesBar languages={scan.languages_json ?? []} />

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line-soft pt-4">
              <Stat label="Commits" value={String(scan.total_commits)} />
              <Stat label="Contributors" value={String(contributors.length)} />
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
                  Last commit
                </div>
                <div className="mt-0.5 text-[12.5px] font-medium leading-snug text-ink">
                  {fmtDateTime(scan.last_commit_at, timezone)}
                </div>
              </div>
            </div>

            <a
              href={ext(project.repo_url)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-control border border-line bg-raised px-4 py-2.5 text-[13px] font-medium text-ink transition-colors hover:border-ink"
            >
              <TechIcon name="GitHub" className="h-4 w-4" />
              Open {prettyUrl(project.repo_url)} ↗
            </a>
          </>
        ) : (
          <p className="text-[13px] text-dim">No repository linked, N/A.</p>
        )}
      </div>

      {/* The repo's real README, rendered inline */}
      {readmeText && <ReadmeCard readme={readmeText} repoUrl={project.repo_url} />}
    </div>
  );
}

const LANG_COLORS = ["#3178c6", "#f1e05a", "#2b7489", "#e34c26", "#563d7c", "#89e051", "#dea584", "#b07219"];

/** GitHub-style stacked language breakdown bar + legend. */
function LanguagesBar({ languages }: { languages: { name: string; pct: number }[] }) {
  if (!languages.length) return null;
  const top = languages.slice(0, 6);
  return (
    <div className="mt-4 border-t border-line-soft pt-4">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-faint">Languages</div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-sunken">
        {top.map((l, i) => (
          <span
            key={l.name}
            title={`${l.name} ${l.pct}%`}
            style={{ width: `${l.pct}%`, background: LANG_COLORS[i % LANG_COLORS.length] }}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {top.map((l, i) => (
          <span key={l.name} className="inline-flex items-center gap-1.5 text-[11.5px] text-dim">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: LANG_COLORS[i % LANG_COLORS.length] }}
            />
            <span className="font-medium text-ink">{l.name}</span>
            <span className="font-mono text-faint">{l.pct}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">{label}</div>
      <div className="mt-0.5 truncate text-[13px] font-medium text-ink">{value}</div>
    </div>
  );
}
