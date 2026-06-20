import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase";
import { acceptInvitation } from "@/lib/invitations";

export const runtime = "nodejs";

const schema = z.object({ token: z.string().min(1), email: z.string().email().optional() });

/**
 * POST /api/judges/accept — mark an invitation accepted after the invitee signs up.
 * Pins the new user's profile role + creates judge assignments. The actual work lives in
 * lib/invitations so the email-verify flow and the OAuth callback share one path.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Missing token." }, { status: 400 });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured." }, { status: 503 });
  }

  const result = await acceptInvitation(parsed.data.token, parsed.data.email);
  if (!result.ok) {
    const status = result.error === "Invalid invite." ? 404 : 500;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }
  return NextResponse.json({ ok: true, role: result.role, hackathon_id: result.hackathon_id });
}
