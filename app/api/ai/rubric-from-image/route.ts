import { NextResponse } from "next/server";
import { generateRubricFromImage, isAiConfigured } from "@/lib/ai";
import { rateLimit, clientKey, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const OK_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * POST /api/ai/rubric-from-image — upload a photo/screenshot of a rubric and get back
 * scorable criteria ([{ name, max }]). Powered by the vision model (gpt-4o-mini).
 */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "rubric-image"), 8, 60_000);
  if (!rl.ok) return tooManyRequests(rl.reset);

  if (!isAiConfigured()) {
    return NextResponse.json(
      { ok: false, error: "AI isn't configured — set GITHUB_API_MODEL_KEY to auto-generate rubrics." },
      { status: 503 },
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No image uploaded." }, { status: 400 });
  }
  if (!OK_TYPES.includes(file.type)) {
    return NextResponse.json({ ok: false, error: "Upload a PNG, JPG, WEBP, or GIF." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Image is too large (max 8 MB)." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;
  const criteria = await generateRubricFromImage(dataUrl);
  if (!criteria.length) {
    return NextResponse.json(
      { ok: false, error: "Couldn't read a rubric from that image. Try a clearer, straight-on photo." },
      { status: 422 },
    );
  }
  return NextResponse.json({ ok: true, criteria });
}
