import "server-only";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { SUGGESTED_QUESTIONS } from "@/lib/demo-data";
import type {
  AiSummary,
  GithubScan,
  Hackathon,
  ProjectView,
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
    created_at: row.created_at ?? new Date(0).toISOString(),
  };
}

function mapAi(submissionId: string, description: string, row: any): AiSummary {
  if (!row) return neutralAi(submissionId, description);
  return {
    id: row.id,
    submission_id: submissionId,
    summary: row.summary ?? "",
    what: row.summary ?? "",
    who: "",
    how: "",
    tech: [],
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
  return data.map(mapProject);
}

/** A single submission as a ProjectView, or null if not found. */
export async function getProjectView(id: string): Promise<ProjectView | null> {
  const sb = await getSupabaseServiceClient();
  if (!sb) return null;
  const { data, error } = await sb.from("submissions").select(PROJECT_SELECT).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapProject(data);
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
