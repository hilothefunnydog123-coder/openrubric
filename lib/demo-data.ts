/**
 * OpenRubric demo data — "Bay Area AI Hacks 2026".
 *
 * Ported verbatim from the original design prototype (design-reference/) and typed
 * against lib/types.ts. This is the seed used in DEMO MODE (no env required) and the
 * shape a real Supabase backend returns. Five projects deliberately span every
 * timeline/score state: one clean+finalized, one post-deadline, one light review,
 * one clean in-progress, one high-priority.
 */

import type {
  AiSummary,
  GithubScan,
  Hackathon,
  Participant,
  Profile,
  ProjectView,
  PresentationMap,
  ReviewCase,
  RubricCriterion,
  ScoreMap,
  Track,
} from "./types";

export const DEMO_HACKATHON: Hackathon = {
  id: "bay-area-ai-hacks-2026",
  name: "Bay Area AI Hacks 2026",
  slug: "bay-area-ai-hacks-2026",
  website_url: "bayareaaihacks.org",
  devpost_url: "bayareaaihacks.devpost.com",
  rules_text: null,
  rubric_text:
    "Innovation (20), Technical Complexity (25), Functionality (20), Design / UX (15), Impact (10), Presentation (10).",
  start_time: "2026-02-14T09:00:00-08:00",
  submission_deadline: "2026-02-16T18:00:00-08:00",
  judging_deadline: "2026-02-17T20:00:00-08:00",
  created_by: "priya-shah",
  created_at: "2026-01-20T00:00:00-08:00",
};

export const DEMO_TRACKS: Track[] = [
  { id: "overall", hackathon_id: DEMO_HACKATHON.id, name: "Overall", description: "Best project across the entire event." },
  { id: "health-ai", hackathon_id: DEMO_HACKATHON.id, name: "Health AI", description: "AI applied to health and care." },
  { id: "education", hackathon_id: DEMO_HACKATHON.id, name: "Education", description: "Tools that help people learn." },
  { id: "developer-tools", hackathon_id: DEMO_HACKATHON.id, name: "Developer Tools", description: "Software that helps engineers." },
  { id: "social-impact", hackathon_id: DEMO_HACKATHON.id, name: "Social Impact", description: "Projects serving a community need." },
];

/** Default 100-point rubric — also the wizard's pre-filled criteria. */
export const DEFAULT_CRITERIA: RubricCriterion[] = [
  { id: "innovation", hackathon_id: DEMO_HACKATHON.id, name: "Innovation", description: "Originality of the idea and the approach taken.", max_points: 20, weight: 1, sort_order: 0, helper: "A fresh take, or a known pattern reapplied?" },
  { id: "technical", hackathon_id: DEMO_HACKATHON.id, name: "Technical Complexity", description: "Engineering depth and difficulty of what was built.", max_points: 25, weight: 1, sort_order: 1, helper: "How hard was this to build well?" },
  { id: "functionality", hackathon_id: DEMO_HACKATHON.id, name: "Functionality", description: "How much of the product actually works end to end.", max_points: 20, weight: 1, sort_order: 2, helper: "Working product vs. demo-only?" },
  { id: "design", hackathon_id: DEMO_HACKATHON.id, name: "Design / UX", description: "Clarity and quality of the experience.", max_points: 15, weight: 1, sort_order: 3, helper: "Is it usable and considered?" },
  { id: "impact", hackathon_id: DEMO_HACKATHON.id, name: "Impact", description: "Potential real-world value and reach.", max_points: 10, weight: 1, sort_order: 4, helper: "Who benefits, and how much?" },
  { id: "presentation", hackathon_id: DEMO_HACKATHON.id, name: "Presentation", description: "Quality of the demo and the pitch.", max_points: 10, weight: 1, sort_order: 5, helper: "Clear story, confident demo?" },
];

/** Default track set offered in the setup wizard. */
export const DEFAULT_TRACK_NAMES = [
  "Overall",
  "Beginner",
  "Advanced",
  "AI",
  "Health",
  "Education",
  "Social Impact",
  "Developer Tools",
  "Sponsor Prize",
];

export const DEMO_JUDGES: Profile[] = [
  { id: "priya-shah", email: "priya@bayareahacks.org", full_name: "Priya Shah", role: "judge", avatar_url: null, created_at: DEMO_HACKATHON.created_at },
  { id: "alex-chen", email: "alex@bayareahacks.org", full_name: "Alex Chen", role: "judge", avatar_url: null, created_at: DEMO_HACKATHON.created_at },
  { id: "maya-patel", email: "maya@bayareahacks.org", full_name: "Maya Patel", role: "judge", avatar_url: null, created_at: DEMO_HACKATHON.created_at },
];

/** The judge "you" are signed in as in the demo. */
export const CURRENT_JUDGE = DEMO_JUDGES[0];

export interface DemoJudgeRow {
  name: string;
  email: string;
  tracks: string;
  scope: string;
}
export const DEMO_JUDGE_ROWS: DemoJudgeRow[] = [
  { name: "Priya Shah", email: "priya@bayareahacks.org", tracks: "Health AI, Overall", scope: "All submissions" },
  { name: "Alex Chen", email: "alex@bayareahacks.org", tracks: "Developer Tools", scope: "Selected (12)" },
  { name: "Maya Patel", email: "maya@bayareahacks.org", tracks: "Education, Social Impact", scope: "All submissions" },
];

export const SUGGESTED_QUESTIONS = [
  "Which part was built during the hackathon?",
  "What was the hardest technical challenge?",
  "Can you walk through the architecture?",
  "What is fully working versus demo-only?",
  "What would you improve with another week?",
];

// ─────────────────────────────────────────────────────────────────────────────
// Projects — each carries its participants, GitHub scan, and AI summary inline.
// ─────────────────────────────────────────────────────────────────────────────

function mkParticipants(submissionId: string, names: string[], handles: string[]): Participant[] {
  return names.map((name, i) => ({
    id: `${submissionId}-p${i}`,
    submission_id: submissionId,
    name,
    email: null,
    github_username: handles[i] ?? null,
    devpost_profile_url: null,
  }));
}

export const DEMO_PROJECTS: ProjectView[] = [
  {
    id: "lighthouse",
    hackathon_id: DEMO_HACKATHON.id,
    track_id: "health-ai",
    track: "Health AI",
    project_name: "Lighthouse",
    team_name: "Team Beacon",
    description:
      "A triage assistant for rural clinics that routes patient intake photos to the right specialist using an offline-first PWA.",
    repo_url: "github.com/team-beacon/lighthouse",
    devpost_url: "devpost.com/software/lighthouse",
    live_url: "lighthouse-demo.vercel.app",
    demo_video_url: "youtu.be/demo",
    source_url: "bayareaaihacks.devpost.com",
    source: "devpost",
    status: "finalized",
    created_at: DEMO_HACKATHON.start_time,
    participants: mkParticipants("lighthouse", ["Dana Okafor", "Liam Reyes", "Sora Tan"], ["danaok", "lreyes", "soratan"]),
    othersAvg: 87,
    judgesDone: 3,
    judgesTotal: 3,
    scan: {
      id: "scan-lighthouse",
      submission_id: "lighthouse",
      repo_owner: "team-beacon",
      repo_name: "lighthouse",
      repo_created_at: "2026-02-14T09:12:00-08:00",
      first_commit_at: "2026-02-14T10:40:00-08:00",
      last_commit_at: "2026-02-16T17:55:00-08:00",
      total_commits: 142,
      pre_event_commits: 0,
      post_deadline_commits: 0,
      contributors_json: [
        { login: "danaok", listed: true },
        { login: "lreyes", listed: true },
        { login: "soratan", listed: true },
      ],
      timeline_json: [
        { label: "Repo created", meta: "Feb 14, 9:12 AM — within event window", tone: "clean" },
        { label: "First commit", meta: "Feb 14, 10:40 AM — 3 contributors", tone: "clean" },
        { label: "Last commit", meta: "Feb 16, 5:55 PM — before deadline", tone: "clean" },
      ],
      flags_json: [
        { label: "All commits inside event window", ok: true },
        { label: "No pre-event activity", ok: true },
        { label: "All contributors listed on the team", ok: true },
      ],
      review_priority: "clean",
      summary:
        "All 142 commits fall inside the event window across 3 contributors. Nothing here needs review.",
      created_at: DEMO_HACKATHON.submission_deadline,
    },
    ai: {
      id: "ai-lighthouse",
      submission_id: "lighthouse",
      summary: "A triage assistant for rural clinics that routes patient intake photos to the right specialist.",
      what: "A triage assistant for rural clinics that routes patient intake photos to the right specialist.",
      who: "Frontline nurses and clinics with no on-site specialists.",
      how: "An offline-first PWA captures intake photos; a fine-tuned vision model suggests a referral category and confidence.",
      tech: ["Next.js", "PyTorch", "Supabase", "PWA"],
      strengths_json: ["The offline-first sync is genuinely robust — works with intermittent connectivity."],
      weaknesses_json: ["How the model was evaluated for clinical safety is not documented in the repo."],
      suggested_questions_json: SUGGESTED_QUESTIONS,
      created_at: DEMO_HACKATHON.submission_deadline,
    },
  },
  {
    id: "mediscan",
    hackathon_id: DEMO_HACKATHON.id,
    track_id: "health-ai",
    track: "Health AI",
    project_name: "MediScan",
    team_name: "Team Vitals",
    description: "Phone-camera skin-condition pre-screening with a referral hand-off to local dermatologists.",
    repo_url: "github.com/team-vitals/mediscan",
    devpost_url: "devpost.com/software/mediscan",
    live_url: "mediscan.app",
    demo_video_url: "youtu.be/demo2",
    source_url: "bayareaaihacks.devpost.com",
    source: "devpost",
    status: "in_progress",
    created_at: DEMO_HACKATHON.start_time,
    participants: mkParticipants("mediscan", ["Noah Berg", "Ivy Chen"], ["noahb", "ivyc"]),
    othersAvg: 83,
    judgesDone: 2,
    judgesTotal: 3,
    scan: {
      id: "scan-mediscan",
      submission_id: "mediscan",
      repo_owner: "team-vitals",
      repo_name: "mediscan",
      repo_created_at: "2026-02-14T11:02:00-08:00",
      first_commit_at: "2026-02-14T12:15:00-08:00",
      last_commit_at: "2026-02-16T23:40:00-08:00",
      total_commits: 96,
      pre_event_commits: 0,
      post_deadline_commits: 6,
      contributors_json: [
        { login: "noahb", listed: true },
        { login: "ivyc", listed: true },
      ],
      timeline_json: [
        { label: "Repo created", meta: "Feb 14, 11:02 AM — within window", tone: "clean" },
        { label: "First commit", meta: "Feb 14, 12:15 PM — 2 contributors", tone: "clean" },
        { label: "Last commit", meta: "Feb 16, 11:40 PM — after deadline", tone: "needs" },
      ],
      flags_json: [
        { label: "6 commits after the deadline", ok: false },
        { label: "Repo created within window", ok: true },
        { label: "All contributors listed", ok: true },
      ],
      review_priority: "needs",
      summary:
        "GitHub timeline shows 6 commits after the submission deadline. This does not prove a rule violation, but judges may want to ask what changed after submission.",
      created_at: DEMO_HACKATHON.submission_deadline,
    },
    ai: {
      id: "ai-mediscan",
      submission_id: "mediscan",
      summary: "Phone-camera skin-condition pre-screening with a referral hand-off to local dermatologists.",
      what: "Phone-camera skin-condition pre-screening with a referral hand-off to local dermatologists.",
      who: "People without easy access to a dermatologist.",
      how: "On-device classifier flags concern level, then routes to a partner directory.",
      tech: ["React Native", "TensorFlow Lite", "Firebase"],
      strengths_json: ["Clean on-device inference with no image leaving the phone."],
      weaknesses_json: ["Some commit activity appears after the submission deadline — worth confirming what changed."],
      suggested_questions_json: SUGGESTED_QUESTIONS,
      created_at: DEMO_HACKATHON.submission_deadline,
    },
  },
  {
    id: "studyforge",
    hackathon_id: DEMO_HACKATHON.id,
    track_id: "education",
    track: "Education",
    project_name: "StudyForge",
    team_name: "Team Forge",
    description: "Turns lecture recordings into spaced-repetition decks and auto-graded practice problems.",
    repo_url: "github.com/team-forge/studyforge",
    devpost_url: "devpost.com/software/studyforge",
    live_url: "studyforge.io",
    demo_video_url: "youtu.be/demo3",
    source_url: "bayareaaihacks.devpost.com",
    source: "devpost",
    status: "in_progress",
    created_at: DEMO_HACKATHON.start_time,
    participants: mkParticipants("studyforge", ["Mara Quill", "Theo Vance", "Ren Adeyemi"], ["maraq", "theov", "rena"]),
    othersAvg: 76,
    judgesDone: 1,
    judgesTotal: 3,
    scan: {
      id: "scan-studyforge",
      submission_id: "studyforge",
      repo_owner: "team-forge",
      repo_name: "studyforge",
      repo_created_at: "2026-02-09T14:20:00-08:00",
      first_commit_at: "2026-02-14T10:05:00-08:00",
      last_commit_at: "2026-02-16T16:30:00-08:00",
      total_commits: 88,
      pre_event_commits: 0,
      post_deadline_commits: 0,
      contributors_json: [
        { login: "maraq", listed: true },
        { login: "theov", listed: true },
        { login: "rena", listed: true },
      ],
      timeline_json: [
        { label: "Repo created", meta: "Feb 9, 2:20 PM — 5 days pre-event", tone: "needs" },
        { label: "First commit", meta: "Feb 14, 10:05 AM — within window", tone: "clean" },
        { label: "Last commit", meta: "Feb 16, 4:30 PM — before deadline", tone: "clean" },
      ],
      flags_json: [
        { label: "Repo created 5 days before event", ok: false },
        { label: "First commit inside window", ok: true },
        { label: "All contributors listed", ok: true },
      ],
      review_priority: "light",
      summary:
        "Repo was created before the event but the first code commit lands inside the window. Likely a pre-created placeholder repo — a light review.",
      created_at: DEMO_HACKATHON.submission_deadline,
    },
    ai: {
      id: "ai-studyforge",
      submission_id: "studyforge",
      summary: "Turns lecture recordings into spaced-repetition decks and auto-graded practice problems.",
      what: "Turns lecture recordings into spaced-repetition decks and auto-graded practice problems.",
      who: "Students reviewing dense course material.",
      how: "Transcribes audio, extracts concepts, and generates cards plus practice questions.",
      tech: ["Next.js", "Whisper", "Postgres"],
      strengths_json: ["The auto-generated practice problems are surprisingly good."],
      weaknesses_json: ["Grading half of the rubric is still pending from this judge."],
      suggested_questions_json: SUGGESTED_QUESTIONS,
      created_at: DEMO_HACKATHON.submission_deadline,
    },
  },
  {
    id: "campusloop",
    hackathon_id: DEMO_HACKATHON.id,
    track_id: "social-impact",
    track: "Social Impact",
    project_name: "CampusLoop",
    team_name: "Team Loop",
    description: "A mutual-aid board connecting students with surplus dining-hall meals to those who need them.",
    repo_url: "github.com/team-loop/campusloop",
    devpost_url: "devpost.com/software/campusloop",
    live_url: "campusloop.app",
    demo_video_url: "youtu.be/demo4",
    source_url: "bayareaaihacks.devpost.com",
    source: "devpost",
    status: "finalized",
    created_at: DEMO_HACKATHON.start_time,
    participants: mkParticipants("campusloop", ["Priscilla Ade", "Jon Kim"], ["pade", "jkim"]),
    othersAvg: 79,
    judgesDone: 3,
    judgesTotal: 3,
    scan: {
      id: "scan-campusloop",
      submission_id: "campusloop",
      repo_owner: "team-loop",
      repo_name: "campusloop",
      repo_created_at: "2026-02-14T08:50:00-08:00",
      first_commit_at: "2026-02-14T09:30:00-08:00",
      last_commit_at: "2026-02-16T15:10:00-08:00",
      total_commits: 73,
      pre_event_commits: 0,
      post_deadline_commits: 0,
      contributors_json: [
        { login: "pade", listed: true },
        { login: "jkim", listed: true },
      ],
      timeline_json: [
        { label: "Repo created", meta: "Feb 14, 8:50 AM — within window", tone: "clean" },
        { label: "First commit", meta: "Feb 14, 9:30 AM — 2 contributors", tone: "clean" },
        { label: "Last commit", meta: "Feb 16, 3:10 PM — before deadline", tone: "clean" },
      ],
      flags_json: [
        { label: "All commits inside event window", ok: true },
        { label: "No pre-event activity", ok: true },
        { label: "All contributors listed", ok: true },
      ],
      review_priority: "clean",
      summary: "Clean timeline. All activity is inside the event window.",
      created_at: DEMO_HACKATHON.submission_deadline,
    },
    ai: {
      id: "ai-campusloop",
      submission_id: "campusloop",
      summary: "A mutual-aid board connecting students with surplus dining-hall meals to those who need them.",
      what: "A mutual-aid board connecting students with surplus dining-hall meals to those who need them.",
      who: "Students facing food insecurity on campus.",
      how: "Real-time board with claim/hold flow and pickup windows.",
      tech: ["SvelteKit", "Supabase Realtime"],
      strengths_json: ["Thoughtful, low-friction claim flow with dignity in mind."],
      weaknesses_json: ["Scaling beyond a single campus is not yet addressed."],
      suggested_questions_json: SUGGESTED_QUESTIONS,
      created_at: DEMO_HACKATHON.submission_deadline,
    },
  },
  {
    id: "codepilot",
    hackathon_id: DEMO_HACKATHON.id,
    track_id: "developer-tools",
    track: "Developer Tools",
    project_name: "CodePilot",
    team_name: "Team Pilot",
    description: "An IDE companion that explains unfamiliar codebases and drafts onboarding docs from the repo.",
    repo_url: "github.com/team-pilot/codepilot",
    devpost_url: "devpost.com/software/codepilot",
    live_url: "codepilot.dev",
    demo_video_url: "youtu.be/demo5",
    source_url: "bayareaaihacks.devpost.com",
    source: "devpost",
    status: "in_progress",
    created_at: DEMO_HACKATHON.start_time,
    participants: mkParticipants("codepilot", ["Sam Ortiz", "Wei Lin"], ["sortiz", "weilin"]),
    othersAvg: 81,
    judgesDone: 2,
    judgesTotal: 3,
    scan: {
      id: "scan-codepilot",
      submission_id: "codepilot",
      repo_owner: "team-pilot",
      repo_name: "codepilot",
      repo_created_at: "2026-01-03T21:14:00-08:00",
      first_commit_at: "2026-01-03T22:00:00-08:00",
      last_commit_at: "2026-02-16T14:02:00-08:00",
      total_commits: 210,
      pre_event_commits: 38,
      post_deadline_commits: 0,
      contributors_json: [
        { login: "sortiz", listed: true },
        { login: "weilin", listed: true },
        { login: "ghost-dev", listed: false },
      ],
      timeline_json: [
        { label: "Repo created", meta: "Jan 3, 9:14 PM — 6 weeks pre-event", tone: "high" },
        { label: "Pre-event commits", meta: "38 commits before Feb 14", tone: "high" },
        { label: "Last commit", meta: "Feb 16, 2:02 PM — before deadline", tone: "clean" },
      ],
      flags_json: [
        { label: "38 commits before event start", ok: false },
        { label: "Repo created 6 weeks early", ok: false },
        { label: "One unlisted contributor", ok: false },
      ],
      review_priority: "high",
      summary:
        "GitHub timeline shows 38 commits before the hackathon start. This does not prove a rule violation, but judges should ask which parts were built during the event before any award.",
      created_at: DEMO_HACKATHON.submission_deadline,
    },
    ai: {
      id: "ai-codepilot",
      submission_id: "codepilot",
      summary: "An IDE companion that explains unfamiliar codebases and drafts onboarding docs from the repo.",
      what: "An IDE companion that explains unfamiliar codebases and drafts onboarding docs from the repo.",
      who: "Engineers joining a new project.",
      how: "Indexes a repo and answers architecture questions with cited file references.",
      tech: ["VS Code API", "OpenAI", "tree-sitter"],
      strengths_json: ["The cited file references make answers trustworthy."],
      weaknesses_json: ["Several commits predate the hackathon start — judges may want to ask which parts were built during the event."],
      suggested_questions_json: SUGGESTED_QUESTIONS,
      created_at: DEMO_HACKATHON.submission_deadline,
    },
  },
];

/** Open review cases derived from the demo projects (organizer review queue). */
export const DEMO_REVIEW_CASES: ReviewCase[] = [
  {
    id: "rc-codepilot",
    submission_id: "codepilot",
    status: "open",
    priority: "high",
    reason: "38 pre-event commits",
    organizer_notes: null,
    final_decision: null,
    created_at: DEMO_HACKATHON.submission_deadline,
    updated_at: DEMO_HACKATHON.submission_deadline,
  },
  {
    id: "rc-mediscan",
    submission_id: "mediscan",
    status: "open",
    priority: "needs",
    reason: "6 commits after deadline",
    organizer_notes: null,
    final_decision: null,
    created_at: DEMO_HACKATHON.submission_deadline,
    updated_at: DEMO_HACKATHON.submission_deadline,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Seed for the CURRENT judge (Priya) — drives the grading workspace + dashboard.
// Each judge keeps an independent record; this is only Priya's.
// ─────────────────────────────────────────────────────────────────────────────

// Your own judge record starts empty — a clean slate so you score every project
// yourself. The leaderboard/aggregate data the rest of the app shows comes from the
// projects' own fields (othersAvg), so the demo stays rich while your scoring is fresh.
export const SEED_SCORES: Record<string, ScoreMap> = {};

export const SEED_PRESENTATION: Record<string, PresentationMap> = {};

export const SEED_COMMENTS: Record<string, string> = {};

export const PRESENTATION_FIELDS: { key: keyof PresentationMap | string; label: string }[] = [
  { key: "clarity", label: "Clarity of pitch" },
  { key: "demo_quality", label: "Demo quality" },
  { key: "technical_explanation", label: "Technical explanation" },
  { key: "answers", label: "Answers to questions" },
  { key: "confidence", label: "Team confidence" },
];

// Screenshots imported from Devpost (demo captions; real images come from the scrape).
export const DEMO_SCREENSHOTS: Record<string, string[]> = {
  lighthouse: ["Intake capture", "Referral suggestion", "Offline sync status", "Clinic dashboard"],
  mediscan: ["Prescription scan", "Confidence review", "Pharmacist queue"],
  studyforge: ["Syllabus import", "Practice question", "Mastery tracker"],
  campusloop: ["Daily check-in", "Resource nudge", "Cohort trends"],
  codepilot: ["Inline suggestion", "Repo context", "Command palette"],
};

/** Demo screenshots for a submission, with a sensible generic fallback. */
export const getScreenshots = (submissionId: string): string[] =>
  DEMO_SCREENSHOTS[submissionId] ?? ["Home", "Core flow", "Results"];

// Convenience lookups
export const getProject = (id: string): ProjectView | undefined =>
  DEMO_PROJECTS.find((p) => p.id === id);

export const getProjectOr404 = (id: string): ProjectView =>
  getProject(id) ?? DEMO_PROJECTS[0];
