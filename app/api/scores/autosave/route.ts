import { NextResponse } from "next/server";
import { scoreAutosaveSchema } from "@/lib/validators";
import { isSupabaseConfigured, getSupabaseServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PRESENTATION_COLUMNS = [
  "clarity",
  "demo_quality",
  "technical_explanation",
  "answers",
  "confidence",
] as const;

/**
 * GET /api/scores/autosave?judge_id=… — a judge's own saved scores, presentation
 * scores, and which submissions they've finalized. Used to hydrate the grading store
 * on load so a judge's work follows them across devices.
 */
export async function GET(req: Request) {
  const judgeId = new URL(req.url).searchParams.get("judge_id") ?? "";
  const empty = { scores: {}, presentation: {}, finalized: {} };
  if (!isSupabaseConfigured() || !UUID.test(judgeId)) return NextResponse.json(empty);
  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json(empty);

  const [{ data: scoreRows }, { data: presRows }] = await Promise.all([
    service
      .from("judge_scores")
      .select("submission_id, criterion_id, score, is_final")
      .eq("judge_id", judgeId),
    service.from("presentation_scores").select("*").eq("judge_id", judgeId),
  ]);

  const scores: Record<string, Record<string, number>> = {};
  // A submission is finalized for this judge when every one of their score rows is final.
  const finalState: Record<string, boolean> = {};
  for (const r of (scoreRows ?? []) as {
    submission_id: string;
    criterion_id: string;
    score: number;
    is_final: boolean;
  }[]) {
    (scores[r.submission_id] ??= {})[r.criterion_id] = Number(r.score) || 0;
    finalState[r.submission_id] = (finalState[r.submission_id] ?? true) && Boolean(r.is_final);
  }
  const finalized: Record<string, boolean> = {};
  for (const [sid, allFinal] of Object.entries(finalState)) if (allFinal) finalized[sid] = true;

  const presentation: Record<string, Record<string, number>> = {};
  for (const row of (presRows ?? []) as Record<string, any>[]) {
    const map: Record<string, number> = {};
    for (const col of PRESENTATION_COLUMNS) map[col] = Number(row[col]) || 0;
    presentation[row.submission_id] = map;
  }

  return NextResponse.json({ scores, presentation, finalized });
}

/**
 * POST /api/scores/autosave — upsert a judge's in-progress scores.
 * Keyed by (submission_id, judge_id, criterion_id) so judges never overwrite each
 * other. Persists to Supabase for real (UUID) ids; demo ids just get acknowledged.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = scoreAutosaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { submission_id, judge_id, scores, presentation, complete } = parsed.data;

  const real = isSupabaseConfigured() && UUID.test(submission_id) && UUID.test(judge_id);
  if (real) {
    const service = await getSupabaseServiceClient();
    if (service) {
      const rows = Object.entries(scores)
        .filter(([cid]) => UUID.test(cid))
        .map(([criterion_id, score]) => ({
          submission_id,
          judge_id,
          criterion_id,
          score,
          // Auto-finalize: when the client says every criterion is scored, mark the
          // rows final; if it later goes incomplete, clear the flag.
          ...(complete !== undefined ? { is_final: complete } : {}),
        }));
      if (rows.length) {
        await service.from("judge_scores").upsert(rows, { onConflict: "submission_id,judge_id,criterion_id" });
      }
      if (presentation && Object.keys(presentation).length) {
        await service
          .from("presentation_scores")
          .upsert({ submission_id, judge_id, ...presentation }, { onConflict: "submission_id,judge_id" });
      }
      // Reflect completion on the assignment so the dashboard reads "Completed".
      if (complete !== undefined) {
        await service
          .from("judge_assignments")
          .update({ status: complete ? "finalized" : rows.length ? "in_progress" : "not_scored" })
          .eq("judge_id", judge_id)
          .eq("submission_id", submission_id);
      }
      return NextResponse.json({ status: "saved", complete: complete ?? null, demo: false });
    }
  }
  return NextResponse.json({ status: "saved", complete: complete ?? null, demo: true });
}
