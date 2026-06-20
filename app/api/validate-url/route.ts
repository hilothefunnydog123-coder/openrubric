import { NextResponse } from "next/server";
import { rateLimit, clientKey, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/validate-url — normalize a URL (add https://), then actually fetch it to
 * confirm it's a real, reachable site. Returns the normalized URL + the page <title>
 * so the form can show a friendly "✓ <site name>" confirmation before continuing.
 */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "validate-url"), 30, 60_000);
  if (!rl.ok) return tooManyRequests(rl.reset);

  const body = await req.json().catch(() => ({}));
  const raw = typeof body.url === "string" ? body.url.trim() : "";
  if (!raw) return NextResponse.json({ ok: false, reason: "empty" }, { status: 400 });

  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return NextResponse.json({ ok: true, reachable: false, reason: "invalid", url: normalized });
  }
  // Must look like a real domain (has a dot, not localhost/IP-less junk).
  if (!parsed.hostname.includes(".")) {
    return NextResponse.json({ ok: true, reachable: false, reason: "invalid", url: normalized });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (OpenRubric link check)", Accept: "text/html,*/*" },
    });
    clearTimeout(timer);
    let title: string | undefined;
    if (res.ok) {
      const html = await res.text().catch(() => "");
      const m = html.match(/<title[^>]*>([^<]{1,140})<\/title>/i);
      title = m ? m[1].trim().replace(/\s+/g, " ") : undefined;
    }
    return NextResponse.json({
      ok: true,
      reachable: res.status < 400,
      status: res.status,
      url: parsed.toString().replace(/\/$/, ""),
      title,
    });
  } catch (err) {
    clearTimeout(timer);
    const reason = err instanceof Error && err.name === "AbortError" ? "timeout" : "unreachable";
    return NextResponse.json({ ok: true, reachable: false, reason, url: parsed.toString() });
  }
}
