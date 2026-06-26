import { NextResponse } from "next/server";
import {
  isSupabaseConfigured,
  getSupabaseServiceClient,
  getSupabaseServerClient,
} from "@/lib/supabase";
import { getScoreBreakdownForSubmission } from "@/lib/live-data";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/score-requests/mine?submission_id=… — the signed-in participant's own request
 * status, and (only once approved) the revealed score at the granted detail level. The
 * request is matched by the caller's email, so a participant can only see their own.
 */
export async function GET(req: Request) {
  const submissionId = new URL(req.url).searchParams.get("submission_id") ?? "";
  if (!isSupabaseConfigured() || !UUID.test(submissionId)) {
    return NextResponse.json({ status: "none" });
  }
  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ status: "none" });

  const server = await getSupabaseServerClient();
  const email = (server ? (await server.auth.getUser()).data.user?.email ?? "" : "").toLowerCase();
  if (!email) return NextResponse.json({ status: "none" }, { status: 401 });

  const { data: reqRow } = await service
    .from("score_requests")
    .select("status, detail_level")
    .eq("submission_id", submissionId)
    .ilike("requester_email", email)
    .maybeSingle();
  if (!reqRow) return NextResponse.json({ status: "none" });

  // Nothing is revealed until an owner has approved AND set a detail level.
  if (reqRow.status !== "approved" || !reqRow.detail_level) {
    return NextResponse.json({ status: reqRow.status });
  }

  const score = await getScoreBreakdownForSubmission(submissionId, reqRow.detail_level);
  return NextResponse.json({ status: "approved", detail_level: reqRow.detail_level, score });
}
