/**
 * OpenRubric domain types.
 *
 * These mirror the Postgres schema in supabase/schema.sql one-to-one, so the
 * in-memory demo data and a real Supabase backend share the same shape. Swapping
 * demo mode for live data is a matter of changing the data source, not the types.
 */

export type Role = "organizer" | "judge" | "participant";

/** Lifecycle of a single submission in the judging flow. */
export type SubmissionStatus = "imported" | "not_scored" | "in_progress" | "finalized";

/**
 * GitHub-timeline review priority. Deliberately framed as review *signals*, never
 * verdicts. Order of severity: clean < light < needs < high.
 */
export type ReviewPriority = "clean" | "light" | "needs" | "high";

export type ReviewCaseStatus = "open" | "resolved";

export type ImportSource = "devpost" | "csv" | "manual";

/** How much of a project's score a participant sees once their request is approved. */
export type ScoreDetailLevel = "score_only" | "score_rubric" | "score_rubric_feedback";

/** Per-hackathon default for score sharing. "none" = approval still required, nothing shown by default. */
export type ScoreVisibility = "none" | ScoreDetailLevel;

export type ScoreRequestStatus = "pending" | "approved" | "denied";

/** A hackathon owner / co-owner (per-hackathon ownership link). */
export type CollaboratorRole = "owner" | "co_owner";

// ─────────────────────────────────────────────────────────────────────────────
// Core records (1:1 with schema.sql)
// ─────────────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  avatar_url: string | null;
  created_at: string;
}

export interface Hackathon {
  id: string;
  name: string;
  slug: string;
  website_url: string | null;
  devpost_url: string | null;
  logo_url?: string | null;
  rules_text: string | null;
  rubric_text: string | null;
  start_time: string;
  submission_deadline: string;
  judging_deadline: string;
  timezone?: string | null;
  /** How many judges score each project; their totals are averaged into the final score. */
  judges_per_project?: number;
  /** Per-hackathon default for how much score detail an approved participant sees. */
  score_visibility?: ScoreVisibility;
  created_by: string;
  created_at: string;
}

/** Per-hackathon ownership row — the creator ("owner") plus accepted co-organizers. */
export interface HackathonCollaborator {
  id: string;
  hackathon_id: string;
  user_id: string;
  role: CollaboratorRole;
  created_at: string;
}

/** A participant's request to see their own project's score, gated by owner approval. */
export interface ScoreRequest {
  id: string;
  hackathon_id: string;
  submission_id: string;
  requester_id: string | null;
  requester_email: string;
  status: ScoreRequestStatus;
  detail_level: ScoreDetailLevel | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

/** The revealed score for one submission, shaped by the granted detail level. */
export interface ScoreBreakdown {
  submission_id: string;
  total: number;
  max: number;
  judgesDone: number;
  judgesTotal: number;
  /** Per-criterion averages — included for "score_rubric" and above. */
  perCriterion?: { criterion_id: string; name: string; avg: number; max: number }[];
  /** Anonymized judge feedback — included only for "score_rubric_feedback". */
  feedback?: string[];
}

export interface Track {
  id: string;
  hackathon_id: string;
  name: string;
  description: string | null;
}

export interface Submission {
  id: string;
  hackathon_id: string;
  track_id: string;
  project_name: string;
  team_name: string;
  description: string;
  repo_url: string | null;
  devpost_url: string | null;
  live_url: string | null;
  demo_video_url: string | null;
  source_url: string | null;
  source: ImportSource;
  status: SubmissionStatus;
  created_at: string;
}

export interface Participant {
  id: string;
  submission_id: string;
  name: string;
  email: string | null;
  github_username: string | null;
  devpost_profile_url: string | null;
}

export interface RubricCriterion {
  id: string;
  hackathon_id: string;
  name: string;
  description: string;
  max_points: number;
  weight: number;
  sort_order: number;
  /** Short prompt shown under the slider to anchor the judge. */
  helper?: string;
}

export interface JudgeAssignment {
  id: string;
  hackathon_id: string;
  judge_id: string;
  submission_id: string;
  track_id: string | null;
  status: SubmissionStatus;
}

/** One judge's score for one criterion on one submission. Judges never collide. */
export interface JudgeScore {
  id: string;
  submission_id: string;
  judge_id: string;
  criterion_id: string;
  score: number;
  comment: string | null;
  is_final: boolean;
  updated_at: string;
  created_at: string;
}

export interface PresentationScore {
  id: string;
  submission_id: string;
  judge_id: string;
  clarity: number;
  demo_quality: number;
  technical_explanation: number;
  answers: number;
  confidence: number;
  notes: string | null;
  updated_at: string;
}

export interface JudgeComment {
  id: string;
  submission_id: string;
  judge_id: string;
  comment: string;
  visibility: "private" | "organizer";
  created_at: string;
}

export interface TimelineEvent {
  label: string;
  meta: string;
  /** Severity of this single event, drives the dot color. */
  tone: ReviewPriority;
}

export interface TimelineFlag {
  label: string;
  ok: boolean;
}

export interface GithubScan {
  id: string;
  submission_id: string;
  repo_owner: string;
  repo_name: string;
  repo_created_at: string;
  first_commit_at: string;
  last_commit_at: string;
  total_commits: number;
  pre_event_commits: number;
  post_deadline_commits: number;
  contributors_json: { login: string; listed: boolean }[];
  timeline_json: TimelineEvent[];
  flags_json: TimelineFlag[];
  review_priority: ReviewPriority;
  summary: string;
  /** GitHub language breakdown for the repo, sorted by share. */
  languages_json?: { name: string; pct: number }[];
  /** The repo's README, as raw markdown, so judges see the real README text. */
  readme_md?: string | null;
  created_at: string;
}

export interface AiSummary {
  id: string;
  submission_id: string;
  /** "What it does" — one-line overview. */
  summary: string;
  what: string;
  who: string;
  how: string;
  tech: string[];
  strengths_json: string[];
  weaknesses_json: string[];
  suggested_questions_json: string[];
  created_at: string;
}

export interface ReviewCase {
  id: string;
  submission_id: string;
  status: ReviewCaseStatus;
  priority: ReviewPriority;
  reason: string;
  organizer_notes: string | null;
  final_decision: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Derived / view-model types used by the UI
// ─────────────────────────────────────────────────────────────────────────────

/** A submission joined with everything a judge needs to grade it. */
export interface ProjectView extends Submission {
  track: string;
  participants: Participant[];
  scan: GithubScan;
  ai: AiSummary;
  /** Screenshot image URLs scraped from the public Devpost gallery. */
  screenshots?: string[];
  /** Aggregate average across all judges (organizer-facing). */
  othersAvg: number;
  judgesDone: number;
  judgesTotal: number;
}

export type AutosaveStatus = "saved" | "saving" | "unsaved";

/** Per-criterion scores for a single judge+submission, keyed by criterion id. */
export type ScoreMap = Record<string, number>;
export type PresentationMap = Record<string, number>;
