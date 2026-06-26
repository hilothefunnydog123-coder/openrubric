import { describe, it, expect } from "vitest";
import {
  signInSchema,
  signUpSchema,
  hackathonSchema,
  scoreRequestSchema,
  scoreDecisionSchema,
  scoreVisibilitySchema,
  rubricCriterionSchema,
  rubricSchema,
  judgeInviteSchema,
  devpostImportSchema,
  manualSubmissionSchema,
  scoreAutosaveSchema,
  scoreSubmitSchema,
  feedbackSchema,
  reviewResolveSchema,
} from "@/lib/validators";

describe("signInSchema / signUpSchema", () => {
  it("rejects a bad email", () => {
    expect(signInSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
  it("accepts a valid sign in", () => {
    expect(signInSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });
  it("rejects a weak password on sign up", () => {
    expect(
      signUpSchema.safeParse({ fullName: "Ada Lovelace", email: "a@b.com", password: "weak", role: "judge" })
        .success,
    ).toBe(false);
  });
  it("accepts a strong password on sign up", () => {
    expect(
      signUpSchema.safeParse({
        fullName: "Ada Lovelace",
        email: "a@b.com",
        password: "Strong1pass",
        role: "judge",
      }).success,
    ).toBe(true);
  });
  it("rejects an unknown role", () => {
    expect(
      signUpSchema.safeParse({ fullName: "Ada", email: "a@b.com", password: "Strong1pass", role: "wizard" })
        .success,
    ).toBe(false);
  });
});

describe("rubricCriterionSchema", () => {
  it("rejects max_points below 1", () => {
    expect(rubricCriterionSchema.safeParse({ name: "X", max_points: 0 }).success).toBe(false);
  });
  it("rejects max_points above 100", () => {
    expect(rubricCriterionSchema.safeParse({ name: "X", max_points: 101 }).success).toBe(false);
  });
  it("coerces a numeric string and accepts in-range", () => {
    const r = rubricCriterionSchema.safeParse({ name: "X", max_points: "20" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.max_points).toBe(20);
  });
  it("rejects an empty name", () => {
    expect(rubricCriterionSchema.safeParse({ name: "", max_points: 10 }).success).toBe(false);
  });
});

describe("rubricSchema", () => {
  it("requires at least one criterion", () => {
    expect(rubricSchema.safeParse({ criteria: [] }).success).toBe(false);
  });
  it("accepts a valid rubric", () => {
    expect(rubricSchema.safeParse({ criteria: [{ name: "Tech", max_points: 50 }] }).success).toBe(true);
  });
});

describe("hackathonSchema (S6: deadline ordering)", () => {
  const base = {
    name: "Hack The Planet",
    start_time: "2026-06-01T10:00",
    submission_deadline: "2026-06-02T10:00",
    judging_deadline: "2026-06-03T10:00",
  };
  it("accepts well-ordered dates", () => {
    expect(hackathonSchema.safeParse(base).success).toBe(true);
  });
  it("rejects submission_deadline before start_time", () => {
    expect(
      hackathonSchema.safeParse({ ...base, submission_deadline: "2026-05-30T10:00" }).success,
    ).toBe(false);
  });
  it("rejects judging_deadline before submission_deadline", () => {
    expect(
      hackathonSchema.safeParse({ ...base, judging_deadline: "2026-06-01T12:00" }).success,
    ).toBe(false);
  });
  it("rejects a fully reversed ordering", () => {
    expect(
      hackathonSchema.safeParse({
        ...base,
        start_time: "2026-06-03T10:00",
        submission_deadline: "2026-06-02T10:00",
        judging_deadline: "2026-06-01T10:00",
      }).success,
    ).toBe(false);
  });
});

describe("judgeInviteSchema", () => {
  it("rejects a short name", () => {
    expect(judgeInviteSchema.safeParse({ name: "A", email: "a@b.com" }).success).toBe(false);
  });
  it("defaults tracks/scope", () => {
    const r = judgeInviteSchema.safeParse({ name: "Judge One", email: "a@b.com" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.tracks).toEqual([]);
      expect(r.data.scope).toBe("all");
    }
  });
});

describe("import + submission schemas", () => {
  it("devpostImportSchema rejects too-short url", () => {
    expect(devpostImportSchema.safeParse({ url: "a" }).success).toBe(false);
  });
  it("manualSubmissionSchema requires project_name", () => {
    expect(manualSubmissionSchema.safeParse({ project_name: "" }).success).toBe(false);
    expect(manualSubmissionSchema.safeParse({ project_name: "Cool App" }).success).toBe(true);
  });
});

describe("scoreAutosaveSchema / scoreSubmitSchema", () => {
  it("accepts a valid autosave payload", () => {
    expect(
      scoreAutosaveSchema.safeParse({ submission_id: "s1", judge_id: "j1", scores: { c1: 5 } }).success,
    ).toBe(true);
  });
  it("rejects a negative score", () => {
    expect(
      scoreAutosaveSchema.safeParse({ submission_id: "s1", judge_id: "j1", scores: { c1: -1 } }).success,
    ).toBe(false);
  });
  it("scoreSubmitSchema requires is_final === true", () => {
    expect(
      scoreSubmitSchema.safeParse({ submission_id: "s1", judge_id: "j1", scores: { c1: 5 }, is_final: false })
        .success,
    ).toBe(false);
    expect(
      scoreSubmitSchema.safeParse({ submission_id: "s1", judge_id: "j1", scores: { c1: 5 }, is_final: true })
        .success,
    ).toBe(true);
  });
});

describe("score request schemas", () => {
  it("scoreRequestSchema requires both ids", () => {
    expect(scoreRequestSchema.safeParse({ hackathon_id: "h", submission_id: "s" }).success).toBe(true);
    expect(scoreRequestSchema.safeParse({ hackathon_id: "h" }).success).toBe(false);
  });
  it("scoreDecisionSchema accepts approved/denied and a detail level", () => {
    expect(scoreDecisionSchema.safeParse({ status: "approved", detail_level: "score_rubric" }).success).toBe(true);
    expect(scoreDecisionSchema.safeParse({ status: "denied" }).success).toBe(true);
    expect(scoreDecisionSchema.safeParse({ status: "maybe" }).success).toBe(false);
    expect(scoreDecisionSchema.safeParse({ status: "approved", detail_level: "everything" }).success).toBe(false);
  });
  it("scoreDecisionSchema defaults notify to false", () => {
    const r = scoreDecisionSchema.safeParse({ status: "approved" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.notify).toBe(false);
  });
  it("scoreVisibilitySchema enforces the enum", () => {
    expect(scoreVisibilitySchema.safeParse({ score_visibility: "none" }).success).toBe(true);
    expect(scoreVisibilitySchema.safeParse({ score_visibility: "score_rubric_feedback" }).success).toBe(true);
    expect(scoreVisibilitySchema.safeParse({ score_visibility: "public" }).success).toBe(false);
  });
});

describe("feedbackSchema / reviewResolveSchema", () => {
  it("feedback requires a message of length >= 5", () => {
    expect(feedbackSchema.safeParse({ message: "hi" }).success).toBe(false);
    expect(feedbackSchema.safeParse({ message: "Hello there" }).success).toBe(true);
  });
  it("feedback rejects an invalid email but allows empty", () => {
    expect(feedbackSchema.safeParse({ message: "Hello there", email: "nope" }).success).toBe(false);
    expect(feedbackSchema.safeParse({ message: "Hello there", email: "" }).success).toBe(true);
  });
  it("reviewResolve defaults to resolved", () => {
    const r = reviewResolveSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe("resolved");
  });
});
