import { NextResponse } from "next/server";
import { scoreSubmitSchema } from "@/lib/validators";
import { DEFAULT_CRITERIA } from "@/lib/demo-data";
import { totalScore } from "@/lib/scoring";
import { isSupabaseConfigured, getSupabaseServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** POST /api/scores/submit — finalize a judge's score; persists to Supabase for real ids. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = scoreSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { submission_id, judge_id, scores, presentation, comment } = parsed.data;
  const total = totalScore(scores, DEFAULT_CRITERIA);

  // Real persistence only when ids are UUIDs (the demo uses string ids → ack only).
  const real = isSupabaseConfigured() && UUID.test(submission_id) && UUID.test(judge_id);
  if (!real) {
    return NextResponse.json({ status: "submitted", total, submission_id, judge_id, demo: true });
  }
  const service = await getSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ status: "submitted", total, submission_id, judge_id, demo: true });
  }

  const rows = Object.entries(scores)
    .filter(([cid]) => UUID.test(cid))
    .map(([criterion_id, score]) => ({ submission_id, judge_id, criterion_id, score, is_final: true }));
  if (rows.length) {
    await service.from("judge_scores").upsert(rows, { onConflict: "submission_id,judge_id,criterion_id" });
  }
  if (presentation && Object.keys(presentation).length) {
    await service
      .from("presentation_scores")
      .upsert({ submission_id, judge_id, ...presentation }, { onConflict: "submission_id,judge_id" });
  }
  if (comment) {
    await service.from("judge_comments").insert({ submission_id, judge_id, comment });
  }
  await service
    .from("judge_assignments")
    .update({ status: "finalized" })
    .eq("judge_id", judge_id)
    .eq("submission_id", submission_id);

  return NextResponse.json({ status: "submitted", total, submission_id, judge_id, demo: false });
}
