import { NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

/** PATCH /api/profile — update the logged-in user's display name. */
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const fullName = (body.full_name ?? "").toString().trim();
  if (!fullName) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const server = await getSupabaseServerClient();
  const {
    data: { user },
  } = (await server?.auth.getUser()) ?? { data: { user: null } };
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const service = await getSupabaseServiceClient();
  if (!service) return NextResponse.json({ error: "Server not configured." }, { status: 500 });

  const { error } = await service.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Keep auth metadata in sync so it survives a fresh profile bootstrap.
  await service.auth.admin.updateUserById(user.id, { user_metadata: { full_name: fullName } }).catch(() => {});

  return NextResponse.json({ ok: true, full_name: fullName });
}
