import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmailCode } from "@/lib/tokens";
import { rateLimit, clientKey, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs"; // crypto HMAC needs the Node runtime

const schema = z.object({ token: z.string().min(1), code: z.string().min(1) });

/** POST /api/auth/verify-code — validate a typed 6-digit code against its token. */
export async function POST(req: Request) {
  // Tight limit: 6 digits is brute-forceable, so cap attempts per client.
  const rl = rateLimit(clientKey(req, "verify-code"), 10, 60_000);
  if (!rl.ok) return tooManyRequests(rl.reset);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "malformed" }, { status: 400 });
  }

  const result = verifyEmailCode(parsed.data.token, parsed.data.code);
  if (!result.valid) {
    const status = result.reason === "expired" ? 410 : 400;
    return NextResponse.json({ ok: false, reason: result.reason }, { status });
  }
  return NextResponse.json({ ok: true, email: result.email });
}
