import { NextResponse } from "next/server";
import { feedbackSchema } from "@/lib/validators";
import {
  isSupabaseConfigured,
  getSupabaseServiceClient,
  getSupabaseServerClient,
} from "@/lib/supabase";
import { sendHostNotificationEmail } from "@/lib/mailer";
import { SITE } from "@/lib/constants";
import { rateLimit, clientKey, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

const LABELS: Record<string, string> = {
  feature: "Feature request",
  bug: "Bug report",
  other: "Message",
};

/**
 * POST /api/feedback — store a feature request / bug / contact note in the `feedback`
 * table (when Supabase is configured) and email a notification to the support inbox
 * (when a mailer is configured). Either path degrades gracefully on its own.
 */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "feedback"), 5, 60_000);
  if (!rl.ok) return tooManyRequests(rl.reset);

  const body = await req.json().catch(() => ({}));
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const { kind, message, email, name } = parsed.data;

  // Attribute to the signed-in user when there's a session (anonymous is fine too).
  let userId: string | null = null;
  const server = await getSupabaseServerClient();
  if (server) {
    const { data } = await server.auth.getUser();
    userId = data.user?.id ?? null;
  }

  let stored = false;
  if (isSupabaseConfigured()) {
    const service = await getSupabaseServiceClient();
    if (service) {
      const { error } = await service.from("feedback").insert({
        kind,
        message,
        email: email || null,
        name: name || null,
        user_id: userId,
      });
      stored = !error;
    }
  }

  const label = LABELS[kind] ?? "Message";
  const from = `${name || "Anonymous"}${email ? ` <${email}>` : ""}`;
  const emailRes = await sendHostNotificationEmail(SITE.supportEmail, {
    subject: `${label} · ${SITE.name}`,
    heading: `New ${label.toLowerCase()}`,
    body: `${message}<br/><br/><strong>From:</strong> ${from}`,
  });

  // Succeed as long as the message landed somewhere (DB or email).
  const ok = stored || emailRes.sent;
  return NextResponse.json({ ok, stored, emailed: emailRes.sent });
}
