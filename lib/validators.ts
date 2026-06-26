/**
 * Zod schemas — the single source of truth for form + API payload validation.
 * Used with React Hook Form on the client and to guard Route Handlers on the server.
 */

import { z } from "zod";
import { passwordMeetsRules } from "./password";

// ── Auth ──────────────────────────────────────────────────────────────────
export const roleSchema = z.enum(["organizer", "judge", "participant"]);

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  fullName: z.string().min(2, "Tell us your name"),
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .refine(passwordMeetsRules, "Password must meet all the requirements below"),
  role: roleSchema,
});

// ── Setup wizard ──────────────────────────────────────────────────────────
export const hackathonSchema = z
  .object({
    name: z.string().min(2, "Name your hackathon"),
    website_url: z.string().optional().or(z.literal("")),
    devpost_url: z.string().optional().or(z.literal("")),
    start_time: z.string().min(1, "Set a start time"),
    submission_deadline: z.string().min(1, "Set a submission deadline"),
    judging_deadline: z.string().min(1, "Set a judging deadline"),
  })
  // S6: enforce chronological ordering start < submission < judging. Only validated
  // when all three parse as dates, so the field-level "required" messages still fire first.
  .superRefine((v, ctx) => {
    const start = Date.parse(v.start_time);
    const sub = Date.parse(v.submission_deadline);
    const judge = Date.parse(v.judging_deadline);
    if (Number.isNaN(start) || Number.isNaN(sub) || Number.isNaN(judge)) return;
    if (sub <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["submission_deadline"],
        message: "Submission deadline must be after the start time",
      });
    }
    if (judge <= sub) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["judging_deadline"],
        message: "Judging deadline must be after the submission deadline",
      });
    }
  });

export const rubricCriterionSchema = z.object({
  name: z.string().min(1, "Criterion needs a name"),
  description: z.string().optional().default(""),
  max_points: z.coerce.number().int().min(1, "At least 1 point").max(100),
});

export const rubricSchema = z.object({
  rubric_text: z.string().optional().default(""),
  criteria: z.array(rubricCriterionSchema).min(1, "Add at least one criterion"),
});

export const trackSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
});

export const judgeInviteSchema = z.object({
  name: z.string().min(2, "Judge name is required"),
  email: z.string().email("Enter a valid email"),
  tracks: z.array(z.string()).default([]),
  scope: z.enum(["all", "selected"]).default("all"),
});

// ── Imports ───────────────────────────────────────────────────────────────
export const devpostImportSchema = z.object({
  url: z.string().min(3, "Paste a Devpost hackathon or project URL"),
});

export const projectUrlsSchema = z.object({
  urls: z.string().min(3, "Paste at least one project URL"),
});

/** CSV columns (header order is enforced in the import UI, not here). */
export const csvRowSchema = z.object({
  project_name: z.string().min(1),
  team_name: z.string().optional().default(""),
  participant_names: z.string().optional().default(""),
  repo_url: z.string().optional().default(""),
  devpost_url: z.string().optional().default(""),
  demo_url: z.string().optional().default(""),
  live_url: z.string().optional().default(""),
  track: z.string().optional().default(""),
  description: z.string().optional().default(""),
});

export const CSV_COLUMNS = [
  "project_name",
  "team_name",
  "participant_names",
  "repo_url",
  "devpost_url",
  "demo_url",
  "live_url",
  "track",
  "description",
] as const;

export const manualSubmissionSchema = z.object({
  project_name: z.string().min(1, "Project name is required"),
  team_name: z.string().optional().default(""),
  track: z.string().optional().default(""),
  repo_url: z.string().optional().default(""),
  devpost_url: z.string().optional().default(""),
  live_url: z.string().optional().default(""),
  description: z.string().optional().default(""),
});

// ── Scoring ───────────────────────────────────────────────────────────────
export const scoreAutosaveSchema = z.object({
  submission_id: z.string().min(1),
  judge_id: z.string().min(1),
  // Coarse upper bound (no rubric criterion can exceed 100 max_points). The exact
  // per-criterion clamp happens server-side in the autosave route. (Suspect S1.)
  scores: z.record(z.string(), z.number().min(0).max(100)),
  presentation: z.record(z.string(), z.number().min(0).max(100)).optional(),
  comment: z.string().optional(),
  // When the client knows whether every criterion is scored, it sends this so the
  // autosave can flip is_final + the assignment status (In Progress ↔ Completed)
  // without a separate "submit" step.
  complete: z.boolean().optional(),
});

export const scoreSubmitSchema = scoreAutosaveSchema.extend({
  is_final: z.literal(true),
});

// ── Score requests (participant "see my score" → owner approves) ────────────
export const scoreDetailLevelSchema = z.enum([
  "score_only",
  "score_rubric",
  "score_rubric_feedback",
]);

export const scoreVisibilitySchema = z.object({
  score_visibility: z.enum(["none", "score_only", "score_rubric", "score_rubric_feedback"]),
});

/** A participant asking to see their project's score. Requester is taken from the session. */
export const scoreRequestSchema = z.object({
  hackathon_id: z.string().min(1),
  submission_id: z.string().min(1),
});

/** An owner approving or denying a request, choosing how much detail to reveal. */
export const scoreDecisionSchema = z.object({
  status: z.enum(["approved", "denied"]),
  detail_level: scoreDetailLevelSchema.optional(),
  notify: z.boolean().optional().default(false),
});

// ── Review cases ──────────────────────────────────────────────────────────
export const reviewResolveSchema = z.object({
  status: z.enum(["open", "resolved"]).default("resolved"),
  organizer_notes: z.string().optional().default(""),
  final_decision: z.string().optional().default(""),
});

// ── Feedback / feature requests ──────────────────────────────────────────
export const feedbackSchema = z.object({
  // "feature" = a feature request, "bug" = a problem report, "other" = general note.
  kind: z.enum(["feature", "bug", "other"]).default("feature"),
  message: z.string().min(5, "Tell us a little more").max(5000),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  name: z.string().max(120).optional().default(""),
});
export type FeedbackValues = z.infer<typeof feedbackSchema>;

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type HackathonValues = z.infer<typeof hackathonSchema>;
export type RubricValues = z.infer<typeof rubricSchema>;
export type JudgeInviteValues = z.infer<typeof judgeInviteSchema>;
export type CsvRow = z.infer<typeof csvRowSchema>;
export type ManualSubmissionValues = z.infer<typeof manualSubmissionSchema>;
