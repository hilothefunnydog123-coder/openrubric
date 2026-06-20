import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

const BUCKET = "logos";
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
};

/**
 * POST /api/upload/logo — upload a hackathon logo and return its public URL.
 * Used during setup (before the hackathon row exists), so it just stores the file and
 * hands back the URL; the create call persists it on the hackathon.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Logo must be under 4 MB." }, { status: 400 });

  const ext = EXT[file.type];
  if (!ext) return NextResponse.json({ error: "Use a PNG, JPG, WEBP, SVG, or GIF." }, { status: 400 });

  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ error: "Server not configured." }, { status: 500 });

  await service.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES }).catch(() => {});

  const path = `${Date.now()}-${Math.round(Math.abs(Math.sin(file.size)) * 1e6)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await service.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const {
    data: { publicUrl },
  } = service.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ ok: true, url: publicUrl });
}
