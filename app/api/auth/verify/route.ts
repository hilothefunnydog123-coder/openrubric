import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyToken } from "@/lib/tokens";

export const runtime = "nodejs"; // crypto HMAC needs the Node runtime

const schema = z.object({ token: z.string().min(1) });

/** POST /api/auth/verify — validate a verification token. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "malformed" }, { status: 400 });
  }

  const result = verifyToken(parsed.data.token);
  if (!result.valid) {
    const status = result.reason === "expired" ? 410 : 400;
    return NextResponse.json({ ok: false, reason: result.reason }, { status });
  }
  return NextResponse.json({ ok: true, email: result.email });
}
