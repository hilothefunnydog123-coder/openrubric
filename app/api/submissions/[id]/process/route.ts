import { NextResponse } from "next/server";
import { getSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { enrichSubmission } from "@/lib/import-pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/submissions/[id]/process — run a real GitHub scan + README fetch + AI summary
 * for a submission and persist them to github_scans + ai_summaries. Idempotent: replaces
 * any prior scan/summary. The actual work lives in the shared import pipeline so the
 * organizer UI and the background cron enrich submissions identically.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured." }, { status: 503 });
  }
  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ ok: false, error: "Missing service-role key." }, { status: 503 });

  const result = await enrichSubmission(service, id);
  if (!result.ok) {
    const status = result.error === "Submission not found." ? 404 : 500;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }
  return NextResponse.json(result);
}
