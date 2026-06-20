import { NextResponse } from "next/server";
import { getSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { rescanSubmission } from "@/lib/import-pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/submissions/[id]/rescan — re-run ONLY the GitHub scan + README for a
 * submission (no AI summary). Applies the current timezone + grace-window policy so the
 * timeline refreshes without spending AI calls. Idempotent.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured." }, { status: 503 });
  }
  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ ok: false, error: "Missing service-role key." }, { status: 503 });

  const result = await rescanSubmission(service, id);
  if (!result.ok) {
    const status = result.error === "Submission not found." ? 404 : 500;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }
  return NextResponse.json(result);
}
