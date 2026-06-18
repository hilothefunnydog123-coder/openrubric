import { NextResponse } from "next/server";
import { scoreAutosaveSchema } from "@/lib/validators";
import { isSupabaseConfigured, getSupabaseServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const { submission_id, judge_id, scores, presentation } = parsed.data;

  const real = isSupabaseConfigured() && UUID.test(submission_id) && UUID.test(judge_id);
  if (real) {
    const service = await getSupabaseServiceClient();
    if (service) {
      const rows = Object.entries(scores)
        .filter(([cid]) => UUID.test(cid))
        .map(([criterion_id, score]) => ({ submission_id, judge_id, criterion_id, score }));
      if (rows.length) {
        await service.from("judge_scores").upsert(rows, { onConflict: "submission_id,judge_id,criterion_id" });
      }
      if (presentation && Object.keys(presentation).length) {
        await service
          .from("presentation_scores")
          .upsert({ submission_id, judge_id, ...presentation }, { onConflict: "submission_id,judge_id" });
      }
      return NextResponse.json({ status: "saved", saved_at: new Date().toISOString(), demo: false });
    }
  }
  return NextResponse.json({ status: "saved", saved_at: new Date().toISOString(), demo: true });
}
