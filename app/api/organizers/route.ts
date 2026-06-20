import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import {
  getSupabaseServiceClient,
  getSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { sendOrganizerInviteEmail, sendHostNotificationEmail, isMailerConfigured } from "@/lib/mailer";
import { rateLimit, clientKey, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/organizers?hackathon_id=… — co-organizers + their invite status. */
export async function GET(req: Request) {
  const hackathonId = new URL(req.url).searchParams.get("hackathon_id") ?? "";
  if (!isSupabaseConfigured() || !UUID.test(hackathonId)) {
    return NextResponse.json({ organizers: [] });
  }
  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ organizers: [] });

  const { data } = await service
    .from("invitations")
    .select("email, status, created_at, accepted_at")
    .eq("hackathon_id", hackathonId)
    .eq("role", "organizer")
    .order("created_at", { ascending: true });

  return NextResponse.json({
    organizers: (data ?? []).map((r: { email: string; status: string; created_at: string; accepted_at: string | null }) => ({
      email: r.email,
      status: r.status === "accepted" ? "approved" : "pending",
      created_at: r.created_at,
      accepted_at: r.accepted_at,
    })),
  });
}

const inviteSchema = z.object({ email: z.string().email(), hackathon_id: z.string().uuid() });

/** POST /api/organizers — invite a co-organizer (status pending) + email them + notify the host. */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "organizer-invite"), 20, 60_000);
  if (!rl.ok) return tooManyRequests(rl.reset);

  const body = await req.json().catch(() => ({}));
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "A valid email + hackathon is required." }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured." }, { status: 503 });
  }
  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ ok: false, error: "Missing service-role key." }, { status: 503 });

  const email = parsed.data.email.toLowerCase().trim();
  const token = crypto.randomBytes(24).toString("base64url");

  // Identify the host (inviter) from the session.
  const server = await getSupabaseServerClient();
  const { data: auth } = (await server?.auth.getUser()) ?? { data: { user: null } };
  const invitedBy = auth?.user?.id ?? null;

  const { error } = await service.from("invitations").insert({
    email,
    role: "organizer",
    token,
    hackathon_id: parsed.data.hackathon_id,
    invited_by: invitedBy,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Names for the emails.
  const { data: hk } = await service
    .from("hackathons")
    .select("name")
    .eq("id", parsed.data.hackathon_id)
    .maybeSingle();
  let hostName: string | undefined;
  let hostEmail: string | undefined;
  if (invitedBy) {
    const { data: host } = await service
      .from("profiles")
      .select("full_name, email")
      .eq("id", invitedBy)
      .maybeSingle();
    hostName = host?.full_name || undefined;
    hostEmail = host?.email || undefined;
  }

  const base = (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/+$/, "");
  const acceptLink = `${base}/sign-up?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  if (!isMailerConfigured()) return NextResponse.json({ ok: true, demo: true, acceptLink });

  const sent = await sendOrganizerInviteEmail(email, {
    acceptLink,
    hackathonName: hk?.name,
    inviterName: hostName,
  });
  if (!sent.sent) {
    return NextResponse.json({ ok: false, error: sent.error || "Could not send the invite." }, { status: 502 });
  }

  // Notify the host that they invited a co-organizer (so they "see it").
  if (hostEmail) {
    await sendHostNotificationEmail(hostEmail, {
      subject: `You invited ${email} as a co-organizer`,
      heading: "Co-organizer invited",
      body: `You invited ${email} to co-organize${hk?.name ? ` ${hk.name}` : ""}. They'll show as “Pending” until they accept and sign up.`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, demo: false });
}
