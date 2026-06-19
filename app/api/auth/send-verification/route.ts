import { NextResponse } from "next/server";
import { z } from "zod";
import { createEmailCode, createVerificationToken } from "@/lib/tokens";
import { sendVerificationCodeEmail, isMailerConfigured } from "@/lib/mailer";
import { rateLimit, clientKey, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs"; // nodemailer + crypto need the Node runtime

const schema = z.object({ email: z.string().email() });

/**
 * POST /api/auth/send-verification — issue a 6-digit code and email it.
 *
 * Returns a `token` that binds the code (the client holds it and submits it back
 * with the typed code). Real mode (Gmail/SMTP) sends the email. Demo mode (no SMTP)
 * additionally returns the code so the flow still completes without a mailbox.
 */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "send-verification"), 5, 60_000);
  if (!rl.ok) return tooManyRequests(rl.reset);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const { code, token } = createEmailCode(email);

  // One-click "Continue" magic link — opens /verify, which plays the verification
  // animation, completes the (deferred) signup, and routes to the dashboard.
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const continueLink = `${base}/verify?token=${encodeURIComponent(createVerificationToken(email))}`;

  if (!isMailerConfigured()) {
    // Demo mode: no mailer — hand the code + link back so the user can still continue.
    return NextResponse.json({ ok: true, demo: true, token, code, continueLink });
  }

  const result = await sendVerificationCodeEmail(email, code, continueLink);
  if (!result.sent) {
    return NextResponse.json(
      { ok: false, error: result.error || "Could not send the verification email." },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, demo: false, token });
}
