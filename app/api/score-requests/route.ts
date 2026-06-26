import { NextResponse } from "next/server";
import { scoreRequestSchema } from "@/lib/validators";
import {
  isSupabaseConfigured,
  getSupabaseServiceClient,
  getSupabaseServerClient,
} from "@/lib/supabase";
import {
  isHackathonOwner,
  listOwnerEmailsForHackathon,
  emailIsParticipantOnSubmission,
} from "@/lib/live-data";
import { rateLimit, clientKey, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The signed-in user's id + email (null/"" in demo mode). */
async function currentUser(): Promise<{ id: string | null; email: string }> {
  const server = await getSupabaseServerClient();
  if (!server) return { id: null, email: "" };
  const { data } = await server.auth.getUser();
  return { id: data.user?.id ?? null, email: (data.user?.email ?? "").toLowerCase() };
}

/**
 * POST /api/score-requests — a participant asks to see their own project's score.
 * Creates a pending request keyed by (submission_id, requester_email) and notifies the
 * hackathon's owner(s). Re-requesting never downgrades an already-decided request.
 */
export async function POST(req: Request) {
  // Cap how often one client can fire requests — each new one can email the owners.
  const rl = rateLimit(clientKey(req, "score-request"), 10, 60_000);
  if (!rl.ok) return tooManyRequests(rl.reset);

  const body = await req.json().catch(() => ({}));
  const parsed = scoreRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { hackathon_id, submission_id } = parsed.data;

  const real = isSupabaseConfigured() && UUID.test(hackathon_id) && UUID.test(submission_id);
  if (!real) return NextResponse.json({ ok: true, demo: true, status: "pending" });
  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ ok: true, demo: true, status: "pending" });

  const { id: requesterId, email } = await currentUser();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Sign in to request your score." }, { status: 401 });
  }

  const verified = await emailIsParticipantOnSubmission(submission_id, email);

  // Insert; a duplicate (already requested) keeps the existing row so an earlier
  // decision is never reset to pending. Only a genuinely NEW request notifies owners —
  // re-submitting must not spam them.
  const { error: insErr } = await service.from("score_requests").insert({
    hackathon_id,
    submission_id,
    requester_id: requesterId,
    requester_email: email,
    status: "pending",
  });
  const isNew = !insErr;
  const { data: row } = await service
    .from("score_requests")
    .select("*")
    .eq("submission_id", submission_id)
    .ilike("requester_email", email)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ ok: false, error: "Could not create the request." }, { status: 500 });
  }

  // Notify owner(s) on a new request only — best-effort, degrades in demo / unconfigured mailer.
  if (isNew) {
    try {
      const { isMailerConfigured, sendHostNotificationEmail } = await import("@/lib/mailer");
      if (isMailerConfigured()) {
        const owners = await listOwnerEmailsForHackathon(hackathon_id);
        await Promise.all(
          owners.map((to) =>
            sendHostNotificationEmail(to, {
              subject: "New score request on OpenRubric",
              heading: "Score request",
              body: `${email} asked to see their score${
                verified ? " (verified participant on that project)" : ""
              }. Review it in your approvals queue.`,
            }),
          ),
        );
      }
    } catch {
      /* notification is best-effort */
    }
  }

  return NextResponse.json({ ok: true, demo: false, status: row.status, verified, request: row });
}

/**
 * GET /api/score-requests?hackathon_id=… — the owner's approval queue. Owner-only:
 * the caller must be the creator or a co-owner of the hackathon.
 */
export async function GET(req: Request) {
  const hackathonId = new URL(req.url).searchParams.get("hackathon_id") ?? "";
  if (!isSupabaseConfigured() || !UUID.test(hackathonId)) {
    return NextResponse.json({ requests: [] });
  }
  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ requests: [] });

  const { id: userId } = await currentUser();
  if (!userId || !(await isHackathonOwner(userId, hackathonId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data } = await service
    .from("score_requests")
    .select("*, submission:submissions(project_name, team_name)")
    .eq("hackathon_id", hackathonId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ requests: data ?? [] });
}
