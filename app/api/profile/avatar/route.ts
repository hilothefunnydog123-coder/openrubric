import { NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

const BUCKET = "avatars";
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** POST /api/profile/avatar — upload a profile picture, store it, set avatar_url. */
export async function POST(req: Request) {
  const server = await getSupabaseServerClient();
  const {
    data: { user },
  } = (await server?.auth.getUser()) ?? { data: { user: null } };
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be under 4 MB." }, { status: 400 });

  const ext = EXT[file.type];
  if (!ext) return NextResponse.json({ error: "Use a PNG, JPG, WEBP, or GIF." }, { status: 400 });

  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ error: "Server not configured." }, { status: 500 });

  // Ensure the public bucket exists (idempotent).
  await service.storage
    .createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES })
    .catch(() => {});

  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await service.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const {
    data: { publicUrl },
  } = service.storage.from(BUCKET).getPublicUrl(path);

  const { error: updErr } = await service.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, avatar_url: publicUrl });
}
