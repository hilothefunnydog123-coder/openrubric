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
export const hackathonSchema = z.object({
  name: z.string().min(2, "Name your hackathon"),
  website_url: z.string().optional().or(z.literal("")),
  devpost_url: z.string().optional().or(z.literal("")),
  start_time: z.string().min(1, "Set a start time"),
  submission_deadline: z.string().min(1, "Set a submission deadline"),
  judging_deadline: z.string().min(1, "Set a judging deadline"),
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
  scores: z.record(z.string(), z.number().min(0)),
  presentation: z.record(z.string(), z.number().min(0)).optional(),
  comment: z.string().optional(),
  // When the client knows whether every criterion is scored, it sends this so the
  // autosave can flip is_final + the assignment status (In Progress ↔ Completed)
  // without a separate "submit" step.
  complete: z.boolean().optional(),
});

export const scoreSubmitSchema = scoreAutosaveSchema.extend({
  is_final: z.literal(true),
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
