import { NextResponse } from "next/server";
import { z } from "zod";
import { createEmailCode, createVerificationToken } from "@/lib/tokens";
import { sendVerificationCodeEmail, isMailerConfigured } from "@/lib/mailer";
import { rateLimit, clientKey, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs"; // nodemailer + crypto need the Node runtime

const schema = z.object({ email: z.string().email() });

/** Best-effort "City, Region" from the requester's IP (anti-phishing footer). */
async function geolocate(ip: string | null): Promise<string | undefined> {
  if (!ip) return undefined;
  // Private / loopback ranges have no public geolocation.
  if (/^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) return undefined;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const d = (await res.json().catch(() => ({}))) as {
      status?: string;
      city?: string;
      regionName?: string;
    };
    if (d.status === "success" && (d.city || d.regionName)) {
      return [d.city, d.regionName].filter(Boolean).join(", ");
    }
  } catch {
    /* geo unavailable — just omit it */
  }
  return undefined;
}

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

  // One-click "Continue" magic link (opens the app + verifies via /verify).
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const continueLink = `${base}/verify?token=${encodeURIComponent(createVerificationToken(email))}`;

  if (!isMailerConfigured()) {
    // Demo mode: no mailer — hand the code + link back so the user can still continue.
    return NextResponse.json({ ok: true, demo: true, token, code, continueLink });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  const location = await geolocate(ip);

  const result = await sendVerificationCodeEmail(email, code, continueLink, location);
  if (!result.sent) {
    return NextResponse.json(
      { ok: false, error: result.error || "Could not send the verification email." },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, demo: false, token });
}
