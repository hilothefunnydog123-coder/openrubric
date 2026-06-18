import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

const schema = z.object({ token: z.string().min(1), email: z.string().email().optional() });

/**
 * POST /api/judges/accept — mark an invitation accepted after the invitee signs up.
 * Also pins the new user's profile role to 'judge' (in case signup metadata missed it)
 * and creates judge_assignments for every submission in the invited hackathon.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Missing token." }, { status: 400 });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured." }, { status: 503 });
  }
  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ ok: false, error: "Missing service-role key." }, { status: 503 });

  const { data: invite, error } = await service
    .from("invitations")
    .select("id, email, hackathon_id, status")
    .eq("token", parsed.data.token)
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!invite) return NextResponse.json({ ok: false, error: "Invalid invite." }, { status: 404 });

  await service
    .from("invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  // Pin the profile to judge + assign all submissions in the hackathon to them.
  const judgeEmail = (parsed.data.email || invite.email).toLowerCase();
  const { data: profile } = await service
    .from("profiles")
    .select("id")
    .eq("email", judgeEmail)
    .maybeSingle();

  if (profile && invite.hackathon_id) {
    await service.from("profiles").update({ role: "judge" }).eq("id", profile.id);
    const { data: subs } = await service
      .from("submissions")
      .select("id, track_id")
      .eq("hackathon_id", invite.hackathon_id);
    if (subs?.length) {
      await service.from("judge_assignments").upsert(
        subs.map((s) => ({
          hackathon_id: invite.hackathon_id,
          judge_id: profile.id,
          submission_id: s.id,
          track_id: s.track_id,
        })),
        { onConflict: "judge_id,submission_id", ignoreDuplicates: true },
      );
    }
  } else if (profile) {
    await service.from("profiles").update({ role: "judge" }).eq("id", profile.id);
  }

  return NextResponse.json({ ok: true, hackathon_id: invite.hackathon_id });
}
