import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import {
  getSupabaseServiceClient,
  getSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { sendJudgeInviteEmail, isMailerConfigured } from "@/lib/mailer";
import { rateLimit, clientKey, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  hackathon_id: z.string().uuid().optional(),
  hackathon_name: z.string().optional(),
  tracks: z.array(z.string()).optional().default([]),
});

/**
 * POST /api/judges/invite — create a judge invitation + email an accept link.
 * The accept link routes to /sign-up?invite=<token>; signing up with the invited
 * email assigns the judge role (see /api/judges/accept).
 */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "judge-invite"), 20, 60_000);
  if (!rl.ok) return tooManyRequests(rl.reset);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "A valid judge email is required." }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured." }, { status: 503 });
  }
  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ ok: false, error: "Missing service-role key." }, { status: 503 });

  const email = parsed.data.email.toLowerCase().trim();
  const token = crypto.randomBytes(24).toString("base64url");

  let invitedBy: string | null = null;
  const server = await getSupabaseServerClient();
  if (server) {
    const { data } = await server.auth.getUser();
    invitedBy = data.user?.id ?? null;
  }

  const { error } = await service.from("invitations").insert({
    email,
    role: "judge",
    token,
    tracks: parsed.data.tracks,
    hackathon_id: parsed.data.hackathon_id ?? null,
    invited_by: invitedBy,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // The inviter is the logged-in ORGANIZER (host) — not the judge being invited.
  // Resolve their name from their profile so the email reads correctly.
  let inviterName: string | undefined;
  if (invitedBy) {
    const { data: host } = await service
      .from("profiles")
      .select("full_name")
      .eq("id", invitedBy)
      .maybeSingle();
    inviterName = host?.full_name || undefined;
  }

  // Prefer the hackathon's real name; resolve from id when not passed in.
  let hackathonName = parsed.data.hackathon_name;
  if (!hackathonName && parsed.data.hackathon_id) {
    const { data: hk } = await service
      .from("hackathons")
      .select("name")
      .eq("id", parsed.data.hackathon_id)
      .maybeSingle();
    hackathonName = hk?.name || undefined;
  }

  const base = (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/+$/, "");
  const acceptLink = `${base}/sign-up?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  if (!isMailerConfigured()) {
    return NextResponse.json({ ok: true, demo: true, acceptLink });
  }
  const sent = await sendJudgeInviteEmail(email, {
    acceptLink,
    hackathonName,
    inviterName,
  });
  if (!sent.sent) {
    return NextResponse.json({ ok: false, error: sent.error || "Could not send the invite." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, demo: false });
}
