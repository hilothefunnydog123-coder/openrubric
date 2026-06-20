/**
 * GitHub timeline review.
 *
 * When GITHUB_TOKEN is set, scanRepository() hits the GitHub REST API and derives
 * review *signals* from the real commit history. With no token it returns the
 * matching demo scan. Either way the output is identical in shape (GithubScan).
 *
 * LANGUAGE POLICY (enforced by reviewNote + assertSafeLanguage):
 *   OpenRubric never accuses. It surfaces a question for a human organizer.
 *   Allowed:  "review signal", "timeline concern", "needs organizer review",
 *             "clean timeline", "pre-event commits detected",
 *             "post-deadline activity detected", "this is a signal, not a verdict".
 *   Forbidden: cheater, fraud, guilty, stolen, plagiarized, caught.
 */

import type { GithubScan, ReviewPriority, TimelineEvent, TimelineFlag } from "./types";

export const FORBIDDEN_LANGUAGE = ["cheater", "fraud", "guilty", "stolen", "plagiarized", "caught"];

/** Throw in development if review copy ever uses accusatory language. */
export function assertSafeLanguage(text: string): void {
  const lower = text.toLowerCase();
  const hit = FORBIDDEN_LANGUAGE.find((w) => lower.includes(w));
  if (hit) {
    throw new Error(
      `Review copy used forbidden language "${hit}". OpenRubric surfaces signals, never verdicts.`,
    );
  }
}

export function isGithubConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}

/** Accepts "github.com/owner/repo", a full URL, or "owner/repo". */
export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  if (!url) return null;
  const cleaned = url
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0], repo: parts[1] };
}

/**
 * Fetch a repo's README as raw markdown so judges see the real README text and the AI
 * summary can actually read it. Returns null when there's no token, the URL can't be
 * parsed, or the repo has no README. Never throws — README is a bonus, not a blocker.
 */
export async function fetchReadme(repoUrl: string, maxChars = 12000): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN;
  const parsed = parseRepoUrl(repoUrl);
  if (!token || !parsed) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/readme`, {
      headers: {
        Authorization: `Bearer ${token}`,
        // raw media type returns the README file content directly (not base64-wrapped).
        Accept: "application/vnd.github.raw+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.trim() ? text.slice(0, maxChars) : null;
  } catch {
    return null;
  }
}

export const PRIORITY_LABEL: Record<ReviewPriority, string> = {
  clean: "Clean timeline",
  light: "Light review",
  needs: "Needs review",
  high: "High priority",
};

interface ScanMetrics {
  totalCommits: number;
  preEventCommits: number;
  postDeadlineCommits: number;
  repoCreatedBeforeEvent: boolean;
  firstCommitInWindow: boolean;
  hasUnlistedContributors: boolean;
}

/**
 * Map raw metrics → a single review priority, taking the most severe signal.
 * Thresholds are intentionally conservative; everything is a prompt to ask, not a
 * conclusion.
 */
export function deriveReviewPriority(m: ScanMetrics): ReviewPriority {
  const severities: ReviewPriority[] = ["clean"];

  if (m.totalCommits === 0) severities.push("needs"); // no useful history
  if (m.postDeadlineCommits > 0) severities.push("needs"); // post-deadline activity
  if (m.preEventCommits > 0 && m.preEventCommits <= 20) severities.push("light");
  if (m.preEventCommits > 20) severities.push("high"); // many pre-event commits
  if (m.repoCreatedBeforeEvent && m.firstCommitInWindow) severities.push("light"); // placeholder repo
  if (m.hasUnlistedContributors) severities.push("needs");

  const order: ReviewPriority[] = ["clean", "light", "needs", "high"];
  return severities.reduce((worst, s) => (order.indexOf(s) > order.indexOf(worst) ? s : worst), "clean");
}

/**
 * Careful, non-accusatory summary for a scan. Always framed as a question for the
 * organizer and always ends on "a signal, not a verdict".
 */
export function reviewNote(m: ScanMetrics, priority: ReviewPriority, grace = DEFAULT_GRACE_MINUTES): string {
  let note: string;
  const latePhrase = grace > 0 ? `more than ${grace} minutes past the submission deadline` : "after the submission deadline";
  if (priority === "clean") {
    note = `All ${m.totalCommits} commits fall inside the event window (a ${grace}-minute grace period applies). Nothing here needs review.`;
  } else if (m.preEventCommits > 20) {
    note = `GitHub timeline shows ${m.preEventCommits} commits before the hackathon start. This does not prove a rule violation, but judges may want to ask which parts were built during the event.`;
  } else if (m.postDeadlineCommits > 0) {
    note = `GitHub timeline shows ${m.postDeadlineCommits} commits ${latePhrase}. This does not prove a rule violation, but judges may want to ask what changed after submission.`;
  } else if (m.preEventCommits > 0 || m.repoCreatedBeforeEvent) {
    note = `Some activity predates the event window. This is often a pre-created repo — judges may simply want to confirm which parts were built during the event.`;
  } else if (m.totalCommits === 0) {
    note = `No useful commit history was found for this repo. Judges may want to ask the team to share where the work lives.`;
  } else {
    note = "A review signal was detected. Judges may want to ask the team about it.";
  }
  assertSafeLanguage(note);
  return note;
}

/** GitHub commit shape (subset we use). */
interface GhCommit {
  commit: { author: { date: string } | null; committer: { date: string } | null };
  author: { login: string } | null;
}

/** Format an instant in an IANA timezone — e.g. "May 23, 7:01 PM PDT". Falls back to UTC. */
function fmtInZone(ms: number, timeZone: string | null): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  };
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: timeZone || "UTC", ...opts }).format(new Date(ms));
  } catch {
    return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(new Date(ms));
  }
}

async function gh<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    // Cache scans briefly; commit history doesn't change mid-judging.
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${path}`);
  return (await res.json()) as T;
}

/** Default lateness/earliness grace, in minutes. Override with GITHUB_GRACE_MINUTES. */
export const DEFAULT_GRACE_MINUTES = 30;

export function graceMinutes(override?: number): number {
  if (typeof override === "number" && override >= 0) return override;
  const env = Number(process.env.GITHUB_GRACE_MINUTES);
  return Number.isFinite(env) && env >= 0 ? env : DEFAULT_GRACE_MINUTES;
}

export interface ScanInput {
  submissionId: string;
  repoUrl: string;
  eventStart: string | null; // ISO; null = no start bound (don't flag early commits)
  submissionDeadline: string | null; // ISO; null = no deadline bound (don't flag late commits)
  listedHandles?: string[];
  /** IANA timezone — commit times in the timeline render in this zone. */
  timezone?: string | null;
  /** Grace window in minutes for early/late commits. Defaults to GITHUB_GRACE_MINUTES (30). */
  graceMinutes?: number;
}

/**
 * Scan a repository for review signals. Falls back to demo data when GITHUB_TOKEN
 * is absent or the repo can't be read — OpenRubric never blocks judging on a failed
 * scan.
 */
export async function scanRepository(input: ScanInput): Promise<GithubScan> {
  const token = process.env.GITHUB_TOKEN;
  const parsed = parseRepoUrl(input.repoUrl);

  if (!token || !parsed) {
    return demoScanFor(input.submissionId);
  }

  try {
    // Absolute instants, so the comparison is timezone-correct regardless of where the
    // commit, the organizer, or the server sit. A grace window forgives commits that land
    // a little early or a little late (default 30 min) — being a minute over isn't a flag.
    const grace = graceMinutes(input.graceMinutes) * 60_000;
    const tz = input.timezone ?? null;
    // Open-ended when a bound isn't set, so a hackathon without times doesn't flag
    // every commit as out-of-window.
    const start = input.eventStart ? new Date(input.eventStart).getTime() - grace : Number.NEGATIVE_INFINITY;
    const deadline = input.submissionDeadline
      ? new Date(input.submissionDeadline).getTime() + grace
      : Number.POSITIVE_INFINITY;

    const [repo, commits, contributors, languages] = await Promise.all([
      gh<{ created_at: string }>(`/repos/${parsed.owner}/${parsed.repo}`, token),
      gh<GhCommit[]>(`/repos/${parsed.owner}/${parsed.repo}/commits?per_page=100`, token),
      gh<{ login: string }[]>(`/repos/${parsed.owner}/${parsed.repo}/contributors?per_page=100`, token).catch(() => []),
      gh<Record<string, number>>(`/repos/${parsed.owner}/${parsed.repo}/languages`, token).catch(() => ({})),
    ]);

    // Language breakdown → [{ name, pct }] sorted by share (desc).
    const langTotal = Object.values(languages).reduce((a, b) => a + b, 0);
    const languages_json =
      langTotal > 0
        ? Object.entries(languages)
            .map(([name, bytes]) => ({ name, pct: Math.round((bytes / langTotal) * 1000) / 10 }))
            .sort((a, b) => b.pct - a.pct)
        : [];

    // Prefer the committer date (when the commit actually landed in the repo) over the
    // author date (which a rebase/amend can backdate) — the better signal for timeline.
    const dates = commits
      .map((c) => c.commit.committer?.date ?? c.commit.author?.date)
      .filter((d): d is string => Boolean(d))
      .map((d) => new Date(d).getTime())
      .sort((a, b) => a - b);

    const preEventCommits = dates.filter((d) => d < start).length;
    const postDeadlineCommits = dates.filter((d) => d > deadline).length;
    const repoCreatedBeforeEvent = new Date(repo.created_at).getTime() < start;
    const firstCommitInWindow = dates.length > 0 && dates[0] >= start;

    const listed = new Set((input.listedHandles ?? []).map((h) => h.toLowerCase()));
    const contributorRecords = contributors.map((c) => ({
      login: c.login,
      listed: listed.size === 0 ? true : listed.has(c.login.toLowerCase()),
    }));
    const hasUnlistedContributors = contributorRecords.some((c) => !c.listed);

    const metrics: ScanMetrics = {
      totalCommits: dates.length,
      preEventCommits,
      postDeadlineCommits,
      repoCreatedBeforeEvent,
      firstCommitInWindow,
      hasUnlistedContributors,
    };

    const priority = deriveReviewPriority(metrics);
    const fmt = (ms: number) => new Date(ms).toISOString();
    const repoCreatedMs = new Date(repo.created_at).getTime();

    const timeline: TimelineEvent[] = [
      {
        label: "Repo created",
        meta: `${fmtInZone(repoCreatedMs, tz)} · ${repoCreatedBeforeEvent ? "before the event window" : "within the event window"}`,
        tone: repoCreatedBeforeEvent ? "needs" : "clean",
      },
      dates.length > 0
        ? { label: "First commit", meta: `${fmtInZone(dates[0], tz)} · ${firstCommitInWindow ? "within window" : "before event start"}`, tone: firstCommitInWindow ? "clean" : "needs" }
        : { label: "No commits found", meta: "empty history", tone: "needs" },
      dates.length > 0
        ? { label: "Last commit", meta: `${fmtInZone(dates[dates.length - 1], tz)} · ${postDeadlineCommits > 0 ? "after deadline" : "before deadline"}`, tone: postDeadlineCommits > 0 ? "needs" : "clean" }
        : { label: "—", meta: "", tone: "needs" },
    ];

    const flags: TimelineFlag[] = [
      { label: preEventCommits > 0 ? `${preEventCommits} commits before event start` : "All commits inside event window", ok: preEventCommits === 0 },
      { label: postDeadlineCommits > 0 ? `${postDeadlineCommits} commits after the deadline` : "No post-deadline activity", ok: postDeadlineCommits === 0 },
      { label: hasUnlistedContributors ? "Unlisted contributor detected" : "All contributors listed", ok: !hasUnlistedContributors },
    ];

    return {
      id: `scan-${input.submissionId}`,
      submission_id: input.submissionId,
      repo_owner: parsed.owner,
      repo_name: parsed.repo,
      repo_created_at: repo.created_at,
      first_commit_at: dates.length ? fmt(dates[0]) : repo.created_at,
      last_commit_at: dates.length ? fmt(dates[dates.length - 1]) : repo.created_at,
      total_commits: dates.length,
      pre_event_commits: preEventCommits,
      post_deadline_commits: postDeadlineCommits,
      contributors_json: contributorRecords,
      timeline_json: timeline,
      flags_json: flags,
      review_priority: priority,
      summary: reviewNote(metrics, priority, graceMinutes(input.graceMinutes)),
      languages_json,
      created_at: new Date().toISOString(),
    };
  } catch {
    // Never block judging on a failed scan.
    return demoScanFor(input.submissionId);
  }
}

/** A neutral, unscanned placeholder — used when no repo is connected or a scan fails. */
export function demoScanFor(submissionId: string): GithubScan {
  return {
    id: `scan-${submissionId}`,
    submission_id: submissionId,
    repo_owner: "—",
    repo_name: "—",
    repo_created_at: new Date(0).toISOString(),
    first_commit_at: new Date(0).toISOString(),
    last_commit_at: new Date(0).toISOString(),
    total_commits: 0,
    pre_event_commits: 0,
    post_deadline_commits: 0,
    contributors_json: [],
    timeline_json: [{ label: "No scan yet", meta: "connect a repo to scan", tone: "clean" }],
    flags_json: [],
    review_priority: "clean",
    summary: "No repository connected yet.",
    created_at: new Date().toISOString(),
  };
}
