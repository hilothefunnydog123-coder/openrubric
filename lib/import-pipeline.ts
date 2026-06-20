import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { scanRepository, fetchReadme } from "@/lib/github";
import { generateSummary } from "@/lib/ai";

/**
 * Shared Devpost → Supabase import pipeline.
 *
 * One source of truth for "turn scraped projects into judgeable submissions" and "run
 * the GitHub scan + README + AI summary for a submission". The interactive import routes
 * (organizer UI) AND the background cron (/api/cron/poll-devpost) both call these, so the
 * automatic deadline-polling behaves exactly like a manual import.
 *
 * Every write is defensive about newer columns (screenshots_json, built_with_json,
 * languages_json, readme_md): if a column hasn't been migrated yet, the insert retries
 * without it so judging never breaks on a half-migrated database.
 */

type Service = NonNullable<Awaited<ReturnType<typeof getSupabaseServiceClient>>>;

export interface PipelineProject {
  project_name: string;
  team_name?: string;
  track?: string;
  description?: string;
  repo_url?: string | null;
  devpost_url?: string | null;
  live_url?: string | null;
  video_url?: string | null;
  screenshots?: string[];
  built_with?: string[];
  members?: { name: string; username?: string; profile_url?: string }[];
}

export interface ImportResult {
  imported: number;
  submissions: { id: string; project_name: string }[];
  error?: string;
}

/** De-duplicate a string list case-insensitively, keeping the first spelling seen. */
function dedupe(list: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const name = String(raw ?? "").trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/**
 * Persist scraped projects as submissions + participants, skipping any already present
 * in the hackathon (matched by Devpost URL, else project name). Idempotent: safe to call
 * on every poll without creating duplicates.
 */
export async function importDevpostProjects(
  service: Service,
  hackathonId: string,
  source: string,
  projects: PipelineProject[],
): Promise<ImportResult> {
  const { data: existing } = await service
    .from("submissions")
    .select("project_name, devpost_url")
    .eq("hackathon_id", hackathonId);
  const seenDevpost = new Set(
    (existing ?? []).map((e) => e.devpost_url?.toLowerCase()).filter(Boolean) as string[],
  );
  const seenName = new Set((existing ?? []).map((e) => e.project_name.toLowerCase()));
  const fresh = projects.filter((p) =>
    p.devpost_url ? !seenDevpost.has(p.devpost_url.toLowerCase()) : !seenName.has(p.project_name.toLowerCase()),
  );
  if (!fresh.length) return { imported: 0, submissions: [] };

  // Map track names → track_ids for this hackathon.
  const { data: tracks } = await service.from("tracks").select("id, name").eq("hackathon_id", hackathonId);
  const trackId = new Map((tracks ?? []).map((t) => [t.name.toLowerCase(), t.id]));

  const rows = fresh.map((p) => ({
    hackathon_id: hackathonId,
    track_id: p.track ? (trackId.get(p.track.toLowerCase()) ?? null) : null,
    project_name: p.project_name,
    team_name: p.team_name ?? "",
    description: p.description ?? "",
    repo_url: p.repo_url || null,
    devpost_url: p.devpost_url || null,
    live_url: p.live_url || null,
    demo_video_url: p.video_url || null,
    screenshots_json: p.screenshots ?? [],
    built_with_json: p.built_with ?? [],
    source,
    status: "imported" as const,
  }));

  let { data: inserted, error } = await service
    .from("submissions")
    .insert(rows)
    .select("id, project_name");
  // If the newer columns don't exist yet (migration not run), retry without them.
  if (error && /screenshots_json|built_with_json/.test(error.message)) {
    const legacy = rows.map((r) => {
      const copy: Record<string, unknown> = { ...r };
      delete copy.screenshots_json;
      delete copy.built_with_json;
      return copy;
    });
    ({ data: inserted, error } = await service
      .from("submissions")
      .insert(legacy)
      .select("id, project_name"));
  }
  if (error || !inserted) {
    return { imported: 0, submissions: [], error: error?.message || "Insert failed." };
  }

  // Participants (PostgREST preserves insert order, so zip by index).
  const participantRows = inserted.flatMap((sub, i) =>
    (fresh[i].members ?? []).map((m) => ({
      submission_id: sub.id,
      name: m.name,
      github_username: m.username || null,
      devpost_profile_url: m.profile_url || null,
    })),
  );
  if (participantRows.length) {
    await service.from("participants").insert(participantRows);
  }

  return { imported: inserted.length, submissions: inserted };
}

export interface EnrichResult {
  ok: boolean;
  scan?: string;
  summary?: boolean;
  readme?: boolean;
  error?: string;
}

type ScanHackathon = {
  start_time?: string | null;
  submission_deadline?: string | null;
  timezone?: string | null;
} | null;

/**
 * Run the GitHub scan (with the event's timezone + grace window) and persist it to
 * github_scans, tolerating unmigrated columns. Shared by enrichSubmission (full pipeline)
 * and rescanSubmission (scan-only refresh). Returns the review priority + whether the
 * README was cached.
 */
async function persistScan(
  service: Service,
  submissionId: string,
  repoUrl: string,
  hk: ScanHackathon,
  readme: string | null,
): Promise<{ priority: string; readmeStored: boolean }> {
  const scan = await scanRepository({
    submissionId,
    repoUrl,
    eventStart: hk?.start_time ?? new Date(0).toISOString(),
    submissionDeadline: hk?.submission_deadline ?? new Date().toISOString(),
    timezone: hk?.timezone ?? null,
  });
  await service.from("github_scans").delete().eq("submission_id", submissionId);
  const scanBase = {
    submission_id: submissionId,
    repo_owner: scan.repo_owner,
    repo_name: scan.repo_name,
    repo_created_at: scan.repo_created_at || null,
    first_commit_at: scan.first_commit_at || null,
    last_commit_at: scan.last_commit_at || null,
    total_commits: scan.total_commits,
    pre_event_commits: scan.pre_event_commits,
    post_deadline_commits: scan.post_deadline_commits,
    contributors_json: scan.contributors_json,
    timeline_json: scan.timeline_json,
    flags_json: scan.flags_json,
    review_priority: scan.review_priority,
    summary: scan.summary,
  };
  // Try the richest row first; fall back as columns (languages_json, readme_md) may be
  // unmigrated. Whichever variant lands first wins.
  const variants: Record<string, unknown>[] = [
    { ...scanBase, languages_json: scan.languages_json ?? [], readme_md: readme },
    { ...scanBase, languages_json: scan.languages_json ?? [] },
    scanBase,
  ];
  let readmeStored = false;
  for (const v of variants) {
    const { error } = await service.from("github_scans").insert(v);
    if (!error) {
      readmeStored = Boolean(readme) && "readme_md" in v;
      break;
    }
  }
  return { priority: scan.review_priority, readmeStored };
}

/**
 * Re-run ONLY the GitHub scan + README for a submission (no AI). Used to refresh the
 * timeline after a scan-policy change (timezone / grace window) without spending AI calls.
 */
export async function rescanSubmission(service: Service, submissionId: string): Promise<EnrichResult> {
  const { data: sub, error } = await service
    .from("submissions")
    .select("id, repo_url, hackathon_id")
    .eq("id", submissionId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!sub) return { ok: false, error: "Submission not found." };
  if (!sub.repo_url) return { ok: true, scan: "no-repo" };

  const { data: hk } = await service
    .from("hackathons")
    .select("start_time, submission_deadline, timezone")
    .eq("id", sub.hackathon_id)
    .maybeSingle();
  try {
    const readme = await fetchReadme(sub.repo_url);
    const out = await persistScan(service, sub.id, sub.repo_url, hk, readme);
    return { ok: true, scan: out.priority, readme: out.readmeStored };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "scan failed" };
  }
}

/**
 * Run a real GitHub scan + README fetch + AI summary for one submission and persist them
 * to github_scans + ai_summaries. The README and the FULL Devpost write-up are both fed
 * to the AI so the summary is a real rewrite, not a copy of the tagline. Idempotent:
 * replaces any prior scan/summary for the submission.
 */
export async function enrichSubmission(service: Service, submissionId: string): Promise<EnrichResult> {
  const { data: sub, error } = await service
    .from("submissions")
    .select("*") // '*' so optional columns (built_with_json) don't error pre-migration
    .eq("id", submissionId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!sub) return { ok: false, error: "Submission not found." };

  const { data: hk } = await service
    .from("hackathons")
    .select("start_time, submission_deadline, timezone")
    .eq("id", sub.hackathon_id)
    .maybeSingle();

  const result: EnrichResult = { ok: true };
  let readme: string | null = null;

  // 1) GitHub scan + README → github_scans
  if (sub.repo_url) {
    try {
      readme = await fetchReadme(sub.repo_url);
      const out = await persistScan(service, sub.id, sub.repo_url, hk, readme);
      result.scan = out.priority;
      result.readme = out.readmeStored;
    } catch (e) {
      result.scan = `error: ${e instanceof Error ? e.message : "scan failed"}`;
    }
  }

  // 2) AI summary → ai_summaries (reads the full Devpost write-up + README)
  try {
    const ai = await generateSummary({
      submissionId: sub.id,
      projectName: sub.project_name,
      description: sub.description,
      repoUrl: sub.repo_url,
      readme,
    });
    // Prefer Devpost's real "Built With" tags for the tech stack (they map to real
    // logos); fall back to the AI's inferred tech only when Devpost gave us nothing.
    const builtWith = dedupe(sub.built_with_json);
    if (builtWith.length) ai.tech = builtWith.slice(0, 8);
    else ai.tech = dedupe(ai.tech);
    await service.from("ai_summaries").delete().eq("submission_id", sub.id);
    const base = {
      submission_id: sub.id,
      summary: ai.what || ai.summary,
      strengths_json: ai.strengths_json,
      weaknesses_json: ai.weaknesses_json,
      suggested_questions_json: ai.suggested_questions_json,
    };
    // Full row keeps the descriptive fields; if those columns don't exist yet
    // (migration not run), fall back to the legacy row so the summary still saves.
    const { error: aiErr } = await service
      .from("ai_summaries")
      .insert({ ...base, what: ai.what, who: ai.who, how: ai.how, tech_json: ai.tech });
    if (aiErr) await service.from("ai_summaries").insert(base);
    result.summary = true;
  } catch {
    result.summary = false;
  }

  return result;
}
