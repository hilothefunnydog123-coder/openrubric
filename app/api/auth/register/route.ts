import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmailCode, verifyToken } from "@/lib/tokens";
import { getSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { rateLimit, clientKey, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs"; // crypto HMAC + admin API need the Node runtime

const schema = z.object({
  // Proof the email was verified: either the 6-digit code (token+code) OR the
  // magic-link token (linkToken). At least one pair must be present.
  token: z.string().optional(),
  code: z.string().optional(),
  linkToken: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  role: z.enum(["organizer", "judge", "participant"]).optional().default("organizer"),
});

/**
 * POST /api/auth/register — create the account ONLY after the email is verified.
 *
 * The signup form no longer creates a Supabase user up front; it just emails a code +
 * a magic link. This endpoint re-checks that proof (stateless HMAC) and, only if it's
 * valid, creates an already-confirmed user. Unverified emails never land in auth.users.
 */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "register"), 10, 60_000);
  if (!rl.ok) return tooManyRequests(rl.reset);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, reason: "malformed" }, { status: 400 });
  const { token, code, linkToken, email, password, fullName, role } = parsed.data;

  // Establish the verified email from whichever proof was supplied.
  let verifiedEmail: string | null = null;
  let failReason = "missing-proof";
  let failStatus = 400;
  if (token && code) {
    const v = verifyEmailCode(token, code);
    if (v.valid) verifiedEmail = v.email;
    else ((failReason = v.reason), (failStatus = v.reason === "expired" ? 410 : 400));
  } else if (linkToken) {
    const v = verifyToken(linkToken);
    if (v.valid) verifiedEmail = v.email;
    else ((failReason = v.reason), (failStatus = v.reason === "expired" ? 410 : 400));
  }
  if (!verifiedEmail) {
    return NextResponse.json({ ok: false, reason: failReason }, { status: failStatus });
  }
  if (verifiedEmail.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ ok: false, reason: "email-mismatch" }, { status: 400 });
  }

  // Demo mode (no backend): nothing to persist — the flow still completes.
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, demo: true });
  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ ok: true, demo: true });

  const { error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // verified here, so mark confirmed → password sign-in works
    user_metadata: { full_name: fullName, role },
  });

  if (error) {
    // Already-registered is fine: the client will just sign in with the typed password.
    if (/already.*(registered|exists|been)/i.test(error.message)) {
      return NextResponse.json({ ok: true, existed: true });
    }
    return NextResponse.json({ ok: false, reason: "create-failed", error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
