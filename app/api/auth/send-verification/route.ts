import { NextResponse } from "next/server";
import { z } from "zod";
import { createVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail, isMailerConfigured } from "@/lib/mailer";

export const runtime = "nodejs"; // nodemailer + crypto need the Node runtime

const schema = z.object({ email: z.string().email() });

/**
 * POST /api/auth/send-verification — issue a signed token and email a verify link.
 *
 * Real mode (Gmail/SMTP configured): sends the email, returns { sent: true }.
 * Demo mode (no SMTP): returns the link so the UI can still complete the flow.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const token = createVerificationToken(email);
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const link = `${base}/verify?token=${encodeURIComponent(token)}`;

  if (!isMailerConfigured()) {
    // Demo mode: no backend mailer — hand the link back so the user can continue.
    return NextResponse.json({ ok: true, demo: true, link });
  }

  const result = await sendVerificationEmail(email, link);
  if (!result.sent) {
    return NextResponse.json(
      { ok: false, error: result.error || "Could not send the verification email." },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, demo: false });
}
