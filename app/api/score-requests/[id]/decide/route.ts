import { NextResponse } from "next/server";
import { scoreDecisionSchema } from "@/lib/validators";
import {
  isSupabaseConfigured,
  getSupabaseServiceClient,
  getSupabaseServerClient,
} from "@/lib/supabase";
import { isHackathonOwner, getScoreBreakdownForSubmission } from "@/lib/live-data";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/score-requests/[id]/decide — an owner approves or denies a request and, when
 * approving, sets how much detail to reveal. Mirrors review-cases/[id]/resolve. Owner-only.
 * The decision is always a human's; nothing is revealed automatically.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = scoreDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!isSupabaseConfigured() || !UUID.test(id)) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ error: "Server not configured." }, { status: 503 });

  const { data: reqRow } = await service
    .from("score_requests")
    .select("id, hackathon_id, submission_id, requester_email")
    .eq("id", id)
    .maybeSingle();
  if (!reqRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  // Authorize: only the hackathon's owner or a co-owner may decide.
  const server = await getSupabaseServerClient();
  const userId = server ? (await server.auth.getUser()).data.user?.id ?? null : null;
  if (!userId || !(await isHackathonOwner(userId, reqRow.hackathon_id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = parsed.data.status;
  // Detail level only applies to an approval; default to the most conservative level.
  const detail_level = status === "approved" ? parsed.data.detail_level ?? "score_only" : null;

  const { data: updated, error } = await service
    .from("score_requests")
    .update({ status, detail_level, decided_by: userId, decided_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  // Optionally email the participant the outcome (and the score, if approved). Best-effort.
  if (parsed.data.notify) {
    try {
      const { isMailerConfigured, sendHostNotificationEmail } = await import("@/lib/mailer");
      if (isMailerConfigured()) {
        let body = "Your score request was not approved at this time.";
        if (status === "approved" && detail_level) {
          const breakdown = await getScoreBreakdownForSubmission(reqRow.submission_id, detail_level);
          body = breakdown
            ? `Your score is now available: ${breakdown.total} / ${breakdown.max}. Open OpenRubric to see the full breakdown.`
            : "Your score request was approved. Open OpenRubric to view it.";
        }
        await sendHostNotificationEmail(reqRow.requester_email, {
          subject: `Your OpenRubric score request was ${status}`,
          heading: status === "approved" ? "Score available" : "Score request update",
          body,
        });
      }
    } catch {
      /* notification is best-effort */
    }
  }

  return NextResponse.json({ request: updated });
}
