import { NextResponse } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { getSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

const schema = z.object({
  submission_id: z.string().uuid(),
  // null clears the judge's track choice (back to "unassigned").
  track_id: z.string().uuid().nullable().optional(),
});

/**
 * POST /api/judges/track — the signed-in judge picks which track they're judging a
 * project under. Upserts the judge's own assignment row (judge_id + submission_id) with
 * the chosen track_id, so each judge decides the track independently.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, demo: true });

  const viewer = await getViewer();
  if (!viewer || viewer.role !== "judge") {
    return NextResponse.json({ ok: false, error: "Judges only." }, { status: 403 });
  }
  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ ok: false, error: "Server not configured." }, { status: 500 });

  const { submission_id, track_id } = parsed.data;
  const { data: sub } = await service
    .from("submissions")
    .select("hackathon_id")
    .eq("id", submission_id)
    .maybeSingle();
  if (!sub) return NextResponse.json({ ok: false, error: "Submission not found." }, { status: 404 });

  const { error } = await service.from("judge_assignments").upsert(
    {
      hackathon_id: sub.hackathon_id,
      judge_id: viewer.id,
      submission_id,
      track_id: track_id ?? null,
    },
    { onConflict: "judge_id,submission_id" },
  );
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
