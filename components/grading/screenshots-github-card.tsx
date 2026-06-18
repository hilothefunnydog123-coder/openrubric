import { getScreenshots } from "@/lib/demo-data";
import { prettyUrl } from "@/lib/utils";
import { TechIcon } from "@/components/ui/tech-icon";
import type { ProjectView } from "@/lib/types";

/**
 * Screenshots imported from Devpost + an embedded view of the GitHub repo.
 *
 * Demo data for now (gradient screenshot tiles + repo stats from the scan). The real
 * implementation will populate `screenshots` and repo metadata from the Devpost +
 * GitHub scrape — the markup here won't change, only the data source.
 */

const TILE_GRADIENTS = [
  "linear-gradient(135deg,#dbe4ff,#eef2ff)",
  "linear-gradient(135deg,#e7f8ef,#f0fbf5)",
  "linear-gradient(135deg,#fdeede,#fdf5ec)",
  "linear-gradient(135deg,#efe7fb,#f6f1fd)",
  "linear-gradient(135deg,#e6f6fb,#f0fafd)",
  "linear-gradient(135deg,#fbe9ef,#fdf1f5)",
];

function ext(url: string | null): string {
  if (!url) return "#";
  return url.startsWith("http") ? url : `https://${url}`;
}

export function ScreenshotsGithubCard({ project }: { project: ProjectView }) {
  const shots = getScreenshots(project.id);
  const scan = project.scan;
  const contributors = scan.contributors_json ?? [];

  return (
    <div className="flex flex-col gap-4">
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
          <p className="text-[13px] text-dim">No screenshots were imported for this project.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {shots.map((caption, i) => (
              <figure key={caption} className="overflow-hidden rounded-[10px] border border-line">
                <div className="relative aspect-[4/3]" style={{ background: TILE_GRADIENTS[i % TILE_GRADIENTS.length] }}>
                  {/* faux browser chrome */}
                  <div className="flex items-center gap-1 px-2.5 py-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-black/15" />
                    <span className="h-1.5 w-1.5 rounded-full bg-black/15" />
                    <span className="h-1.5 w-1.5 rounded-full bg-black/15" />
                  </div>
                  <div className="absolute inset-x-3 bottom-3 top-7 rounded-md bg-white/45" />
                </div>
                <figcaption className="truncate border-t border-line bg-raised px-2.5 py-1.5 font-mono text-[10.5px] text-dim">
                  {caption}
                </figcaption>
              </figure>
            ))}
          </div>
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

            {project.ai.tech.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {project.ai.tech.slice(0, 5).map((t) => (
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

            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line-soft pt-4">
              <Stat label="Commits" value={String(scan.total_commits)} />
              <Stat label="Contributors" value={String(contributors.length)} />
              <Stat label="Last commit" value={scan.last_commit_at} />
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
          <p className="text-[13px] text-dim">No repository linked — N/A.</p>
        )}
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
