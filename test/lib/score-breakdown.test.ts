import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFakeSupabase, type FakeSupabase } from "../helpers/supabase-mock";

const h = vi.hoisted(() => ({ state: { service: null as FakeSupabase | null } }));
vi.mock("@/lib/supabase", () => ({
  getSupabaseServiceClient: async () => h.state.service,
}));

import { getScoreBreakdownForSubmission } from "@/lib/live-data";

const SUB = "22222222-2222-2222-2222-222222222222";

/** Two finalized judges: A totals 14 (8+6), B totals 20 (10+10) → avg 17. */
function configured() {
  return createFakeSupabase({
    "submissions:select": { data: [{ hackathon_id: "hk" }] },
    "rubric_criteria:select": {
      data: [
        { id: "c1", hackathon_id: "hk", name: "Tech", description: "", max_points: 10, weight: 1, sort_order: 0 },
        { id: "c2", hackathon_id: "hk", name: "Design", description: "", max_points: 10, weight: 1, sort_order: 1 },
      ],
    },
    "hackathons:select": { data: [{ judges_per_project: 2 }] },
    "judge_scores:select": {
      data: [
        { judge_id: "jA", criterion_id: "c1", score: 8, is_final: true, comment: "Solid build" },
        { judge_id: "jA", criterion_id: "c2", score: 6, is_final: true, comment: null },
        { judge_id: "jB", criterion_id: "c1", score: 10, is_final: true, comment: null },
        { judge_id: "jB", criterion_id: "c2", score: 10, is_final: true, comment: "Great UX" },
      ],
    },
  });
}

beforeEach(() => {
  h.state.service = configured();
});

describe("getScoreBreakdownForSubmission", () => {
  it("score_only: total is the average of finalized judges' totals, no breakdown", async () => {
    const b = await getScoreBreakdownForSubmission(SUB, "score_only");
    expect(b).not.toBeNull();
    expect(b!.total).toBe(17); // (14 + 20) / 2
    expect(b!.max).toBe(20);
    expect(b!.judgesDone).toBe(2);
    expect(b!.judgesTotal).toBe(2);
    expect(b!.perCriterion).toBeUndefined();
    expect(b!.feedback).toBeUndefined();
  });

  it("score_rubric: includes per-criterion averages, no feedback", async () => {
    const b = await getScoreBreakdownForSubmission(SUB, "score_rubric");
    expect(b!.perCriterion).toEqual([
      { criterion_id: "c1", name: "Tech", avg: 9, max: 10 }, // (8+10)/2
      { criterion_id: "c2", name: "Design", avg: 8, max: 10 }, // (6+10)/2
    ]);
    expect(b!.feedback).toBeUndefined();
  });

  it("score_rubric_feedback: includes anonymized judge comments", async () => {
    const b = await getScoreBreakdownForSubmission(SUB, "score_rubric_feedback");
    expect(b!.feedback).toEqual(expect.arrayContaining(["Solid build", "Great UX"]));
    // never exposes judge identities
    expect(JSON.stringify(b)).not.toContain("jA");
    expect(JSON.stringify(b)).not.toContain("jB");
  });

  it("a non-finalized judge does not count toward the total", async () => {
    h.state.service = createFakeSupabase({
      "submissions:select": { data: [{ hackathon_id: "hk" }] },
      "rubric_criteria:select": {
        data: [{ id: "c1", hackathon_id: "hk", name: "Tech", description: "", max_points: 10, weight: 1, sort_order: 0 }],
      },
      "hackathons:select": { data: [{ judges_per_project: 2 }] },
      "judge_scores:select": {
        data: [
          { judge_id: "jA", criterion_id: "c1", score: 9, is_final: true, comment: null },
          { judge_id: "jB", criterion_id: "c1", score: 2, is_final: false, comment: null }, // half-done
        ],
      },
    });
    const b = await getScoreBreakdownForSubmission(SUB, "score_only");
    expect(b!.judgesDone).toBe(1);
    expect(b!.total).toBe(9); // only jA counts
  });
});
