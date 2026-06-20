import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { SUGGESTED_QUESTIONS } from "@/lib/demo-data";
import type {
  AiSummary,
  GithubScan,
  Hackathon,
  ProjectView,
  ReviewCase,
  RubricCriterion,
} from "@/lib/types";

/**
 * Live Supabase reads, mapped to the exact view-model types the UI already renders
 * (ProjectView etc.). Freshly imported projects may have no scan/AI/scores yet, so
 * missing pieces get neutral defaults rather than crashing the UI. Everything here
 * is server-only (service client).
 */

function neutralScan(submissionId: string): GithubScan {
  return {
    id: `scan-${submissionId}`,
    submission_id: submissionId,
    repo_owner: "",
    repo_name: "",
    repo_created_at: "",
    first_commit_at: "",
    last_commit_at: "",
    total_commits: 0,
    pre_event_commits: 0,
    post_deadline_commits: 0,
    contributors_json: [],
    timeline_json: [],
    flags_json: [],
    review_priority: "clean",
    summary: "Not scanned yet.",
    created_at: new Date(0).toISOString(),
  };
}

function neutralAi(submissionId: string, description: string): AiSummary {
  return {
    id: `ai-${submissionId}`,
    submission_id: submissionId,
    summary: description || "No summary yet.",
    what: description || "No summary yet.",
    who: "",
    how: "",
    tech: [],
    strengths_json: [],
    weaknesses_json: [],
    suggested_questions_json: SUGGESTED_QUESTIONS,
    created_at: new Date(0).toISOString(),
  };
}

function mapScan(submissionId: string, row: any): GithubScan {
  if (!row) return neutralScan(submissionId);
  return {
    id: row.id,
    submission_id: submissionId,
    repo_owner: row.repo_owner ?? "",
    repo_name: row.repo_name ?? "",
    repo_created_at: row.repo_created_at ?? "",
    first_commit_at: row.first_commit_at ?? "",
    last_commit_at: row.last_commit_at ?? "",
    total_commits: row.total_commits ?? 0,
    pre_event_commits: row.pre_event_commits ?? 0,
    post_deadline_commits: row.post_deadline_commits ?? 0,
    contributors_json: row.contributors_json ?? [],
    timeline_json: row.timeline_json ?? [],
    flags_json: row.flags_json ?? [],
    review_priority: row.review_priority ?? "clean",
    summary: row.summary ?? "",
    languages_json: Array.isArray(row.languages_json) ? row.languages_json : [],
    readme_md: row.readme_md ?? null,
    created_at: row.created_at ?? new Date(0).toISOString(),
  };
}

/** De-duplicate tech tags case-insensitively, keeping the first spelling seen. */
function dedupeTech(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const name = String(raw ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

function mapAi(submissionId: string, description: string, row: any): AiSummary {
  if (!row) return neutralAi(submissionId, description);
  return {
    id: row.id,
    submission_id: submissionId,
    summary: row.summary ?? "",
    what: row.what ?? row.summary ?? "",
    who: row.who ?? "",
    how: row.how ?? "",
    tech: dedupeTech(row.tech_json),
    strengths_json: row.strengths_json ?? [],
    weaknesses_json: row.weaknesses_json ?? [],
    suggested_questions_json: row.suggested_questions_json ?? SUGGESTED_QUESTIONS,
    created_at: row.created_at ?? new Date(0).toISOString(),
  };
}

function mapProject(row: any): ProjectView {
  const scan = mapScan(row.id, Array.isArray(row.github_scans) ? row.github_scans[0] : row.github_scans);
  const ai = mapAi(
    row.id,
    row.description ?? "",
    Array.isArray(row.ai_summaries) ? row.ai_summaries[0] : row.ai_summaries,
  );
  return {
    id: row.id,
    hackathon_id: row.hackathon_id,
    track_id: row.track_id,
    project_name: row.project_name,
    team_name: row.team_name ?? "",
    description: row.description ?? "",
    repo_url: row.repo_url,
    devpost_url: row.devpost_url,
    live_url: row.live_url,
    demo_video_url: row.demo_video_url ?? null,
    source_url: row.source_url ?? null,
    source: row.source ?? "manual",
    status: row.status ?? "imported",
    created_at: row.created_at,
    track: row.track?.name ?? "General",
    screenshots: Array.isArray(row.screenshots_json) ? row.screenshots_json : [],
    participants: (row.participants ?? []).map((p: any) => ({
      id: p.id,
      submission_id: row.id,
      name: p.name,
      email: p.email ?? null,
      github_username: p.github_username ?? null,
      devpost_profile_url: p.devpost_profile_url ?? null,
    })),
    scan,
    ai,
    othersAvg: 0,
    judgesDone: 0,
    judgesTotal: 0,
  };
}

/** Track names for a hackathon (used to pre-fill the setup wizard in edit mode). */
export async function listTrackNames(hackathonId: string): Promise<string[]> {
  const sb = await getSupabaseServiceClient();
  if (!sb) return [];
  const { data } = await sb
    .from("tracks")
    .select("name")
    .eq("hackathon_id", hackathonId)
    .order("name", { ascending: true });
  return (data ?? []).map((t: any) => t.name);
}

/** Tracks (id + name) for a hackathon — feeds the judge's per-project track dropdown. */
export async function listTracks(hackathonId: string): Promise<{ id: string; name: string }[]> {
  const sb = await getSupabaseServiceClient();
  if (!sb) return [];
  const { data } = await sb
    .from("tracks")
    .select("id, name")
    .eq("hackathon_id", hackathonId)
    .order("name", { ascending: true });
  return (data ?? []).map((t: any) => ({ id: t.id, name: t.name }));
}

/**
 * The track this judge has chosen for each submission, keyed by submission_id. Lets the
 * judge dashboard show each project's dropdown on the judge's own pick (not the default).
 */
export async function listJudgeAssignmentTracks(
  judgeId: string,
  hackathonId: string,
): Promise<Record<string, string | null>> {
  const sb = await getSupabaseServiceClient();
  if (!sb) return {};
  const { data } = await sb
    .from("judge_assignments")
    .select("submission_id, track_id")
    .eq("judge_id", judgeId)
    .eq("hackathon_id", hackathonId);
  const out: Record<string, string | null> = {};
  for (const r of (data ?? []) as { submission_id: string; track_id: string | null }[]) {
    out[r.submission_id] = r.track_id ?? null;
  }
  return out;
}

/** The most recently created hackathon (the one a fresh organizer just made). */
export async function getActiveHackathon(): Promise<Hackathon | null> {
  const sb = await getSupabaseServiceClient();
  if (!sb) return null;
  const { data } = await sb
    .from("hackathons")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Hackathon) ?? null;
}

const PROJECT_SELECT = "*, track:tracks(name), participants(*), github_scans(*), ai_summaries(*)";

/**
 * Aggregate judge_scores into per-submission stats: the FINAL score is the average of
 * each finalized judge's total (so two judges → mean of their two totals), and `done` is
 * how many judges have completed (auto-finalized) their scoring.
 */
async function aggregateScores(
  sb: NonNullable<Awaited<ReturnType<typeof getSupabaseServiceClient>>>,
  submissionIds: string[],
): Promise<Map<string, { avg: number; done: number }>> {
  const out = new Map<string, { avg: number; done: number }>();
  if (!submissionIds.length) return out;
  const { data } = await sb
    .from("judge_scores")
    .select("submission_id, judge_id, score, is_final")
    .in("submission_id", submissionIds);

  // submission → judge → { sum of scores, whether ALL their rows are final }
  const bySub = new Map<string, Map<string, { sum: number; allFinal: boolean }>>();
  for (const r of (data ?? []) as { submission_id: string; judge_id: string; score: number; is_final: boolean }[]) {
    let judges = bySub.get(r.submission_id);
    if (!judges) {
      judges = new Map();
      bySub.set(r.submission_id, judges);
    }
    const cur = judges.get(r.judge_id) ?? { sum: 0, allFinal: true };
    cur.sum += Number(r.score) || 0;
    cur.allFinal = cur.allFinal && Boolean(r.is_final);
    judges.set(r.judge_id, cur);
  }

  for (const [sid, judges] of bySub) {
    // Final score = average of the COMPLETED judges' totals (a half-scored judge doesn't
    // drag it down). Until at least one judge finishes, there's no final score yet.
    const finalTotals = [...judges.values()].filter((j) => j.allFinal).map((j) => j.sum);
    const avg = finalTotals.length
      ? Math.round(finalTotals.reduce((a, b) => a + b, 0) / finalTotals.length)
      : 0;
    out.set(sid, { avg, done: finalTotals.length });
  }
  return out;
}

/** All submissions for a hackathon, as ProjectViews (newest first). */
export async function listProjectViews(hackathonId: string): Promise<ProjectView[]> {
  const sb = await getSupabaseServiceClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("submissions")
    .select(PROJECT_SELECT)
    .eq("hackathon_id", hackathonId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];

  const ids = data.map((r: any) => r.id);
  const agg = await aggregateScores(sb, ids);
  // How many judges are expected per project (the organizer's 1/2/3 setting).
  const { data: hk } = await sb
    .from("hackathons")
    .select("judges_per_project")
    .eq("id", hackathonId)
    .maybeSingle();
  const perProject = Math.max(1, Number(hk?.judges_per_project ?? 1));

  return data.map((row: any) => {
    const p = mapProject(row);
    const a = agg.get(row.id);
    p.othersAvg = a?.avg ?? 0;
    p.judgesDone = a?.done ?? 0;
    p.judgesTotal = perProject;
    return p;
  });
}

/** A single submission as a ProjectView, or null if not found. */
export async function getProjectView(id: string): Promise<ProjectView | null> {
  const sb = await getSupabaseServiceClient();
  if (!sb) return null;
  const { data, error } = await sb.from("submissions").select(PROJECT_SELECT).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapProject(data);
}

/** The participant's own submission, matched by the email on their account. */
export async function getProjectViewForEmail(email: string): Promise<ProjectView | null> {
  const sb = await getSupabaseServiceClient();
  if (!sb || !email) return null;
  const { data } = await sb
    .from("participants")
    .select("submission_id")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();
  if (!data?.submission_id) return null;
  return getProjectView(data.submission_id);
}

/** Open + resolved review cases for every submission in a hackathon. */
export async function listReviewCases(hackathonId: string): Promise<ReviewCase[]> {
  const sb = await getSupabaseServiceClient();
  if (!sb) return [];
  const { data: subs } = await sb.from("submissions").select("id").eq("hackathon_id", hackathonId);
  const ids = (subs ?? []).map((s: any) => s.id);
  if (!ids.length) return [];
  const { data } = await sb.from("review_cases").select("*").in("submission_id", ids);
  return (data ?? []).map(
    (r: any): ReviewCase => ({
      id: r.id,
      submission_id: r.submission_id,
      status: r.status,
      priority: r.priority,
      reason: r.reason ?? "",
      organizer_notes: r.organizer_notes ?? null,
      final_decision: r.final_decision ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }),
  );
}

/** The event start + submission deadline of a submission's hackathon (for repo scans). */
export async function getEventWindowForSubmission(
  submissionId: string,
): Promise<{ eventStart: string | null; submissionDeadline: string | null }> {
  const sb = await getSupabaseServiceClient();
  if (!sb) return { eventStart: null, submissionDeadline: null };
  const hackathonId = await getHackathonIdForSubmission(submissionId);
  if (!hackathonId) return { eventStart: null, submissionDeadline: null };
  const { data } = await sb
    .from("hackathons")
    .select("start_time, submission_deadline")
    .eq("id", hackathonId)
    .maybeSingle();
  return {
    eventStart: data?.start_time ?? null,
    submissionDeadline: data?.submission_deadline ?? null,
  };
}

export interface InvitationView {
  token: string;
  email: string;
  status: string;
  hackathon_id: string | null;
  hackathon_name: string;
  inviter_name: string | null;
}

/** Look up a judge invitation by token, with the hackathon + inviter names. */
export async function getInvitationByToken(token: string): Promise<InvitationView | null> {
  const sb = await getSupabaseServiceClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("invitations")
    .select("token, email, status, hackathon_id, hackathon:hackathons(name), inviter:profiles(full_name)")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as any;
  return {
    token: row.token,
    email: row.email,
    status: row.status,
    hackathon_id: row.hackathon_id,
    hackathon_name: row.hackathon?.name ?? "the hackathon",
    inviter_name: row.inviter?.full_name ?? null,
  };
}

/** Number of judges actually on a hackathon (distinct judge assignments). */
export async function countHackathonJudges(hackathonId: string): Promise<number> {
  const sb = await getSupabaseServiceClient();
  if (!sb) return 0;
  const { data } = await sb
    .from("judge_assignments")
    .select("judge_id")
    .eq("hackathon_id", hackathonId);
  if (!data) return 0;
  return new Set(data.map((r: any) => r.judge_id)).size;
}

/** The hackathon a submission belongs to (used to load its live rubric). */
export async function getHackathonIdForSubmission(submissionId: string): Promise<string | null> {
  const sb = await getSupabaseServiceClient();
  if (!sb) return null;
  const { data } = await sb
    .from("submissions")
    .select("hackathon_id")
    .eq("id", submissionId)
    .maybeSingle();
  return (data?.hackathon_id as string) ?? null;
}

/** The IANA timezone the organizer set for a submission's hackathon (null if unset). */
export async function getHackathonTimezone(submissionId: string): Promise<string | null> {
  const sb = await getSupabaseServiceClient();
  if (!sb) return null;
  const hackathonId = await getHackathonIdForSubmission(submissionId);
  if (!hackathonId) return null;
  // timezone is a newer column — tolerate it not existing yet.
  const { data, error } = await sb
    .from("hackathons")
    .select("timezone")
    .eq("id", hackathonId)
    .maybeSingle();
  if (error) return null;
  return (data?.timezone as string) ?? null;
}

/**
 * The hackathon's live rubric criteria (real UUID ids), sorted. Returns [] when the
 * hackathon has no rubric yet — callers fall back to the demo rubric so the grading
 * UI always renders.
 */
export async function listRubricCriteria(hackathonId: string): Promise<RubricCriterion[]> {
  const sb = await getSupabaseServiceClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("rubric_criteria")
    .select("*")
    .eq("hackathon_id", hackathonId)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data.map(
    (r: any): RubricCriterion => ({
      id: r.id,
      hackathon_id: r.hackathon_id,
      name: r.name,
      description: r.description ?? "",
      max_points: r.max_points,
      weight: Number(r.weight ?? 1),
      sort_order: r.sort_order ?? 0,
    }),
  );
}
