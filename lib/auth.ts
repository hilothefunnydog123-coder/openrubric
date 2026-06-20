import "server-only";
import { redirect } from "next/navigation";
import { getSupabaseServerClient, getSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { ROUTES } from "@/lib/constants";

export type ViewerRole = "organizer" | "judge";

export interface Viewer {
  id: string;
  email: string;
  name: string;
  role: ViewerRole;
}

/**
 * The currently signed-in user + their real role, read server-side from the auth
 * session and profiles table. Returns null when nobody is signed in (or Supabase is
 * not configured). This is the single source of truth for "who is this and what may
 * they see" — pages use it to keep organizers and judges in their own lanes.
 */
export async function getViewer(): Promise<Viewer | null> {
  const server = await getSupabaseServerClient();
  if (!server) return null;
  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) return null;

  // Read the role with the service client so RLS can't hide the profile from itself.
  const service = await getSupabaseServiceClient();
  const sb = service ?? server;
  const { data: profile } = await sb
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  // Self-serve signups are organizers; only an explicit invite makes someone a judge.
  const role: ViewerRole = profile?.role === "judge" ? "judge" : "organizer";
  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    name: profile?.full_name || user.email?.split("@")[0] || "You",
    role,
  };
}

/**
 * Page guard: keep each role in its own lane.
 *
 * - Signed-out visitor + Supabase configured → sent to sign in. These are protected
 *   pages; a real backend means real auth, so we never render a populated dashboard with
 *   a misleading "Sign in" button for someone who isn't actually signed in.
 * - Signed-out visitor + demo mode (no Supabase) → passes through so the seeded demo
 *   still renders with no backend.
 * - Signed-in user whose role doesn't match → redirected to their own dashboard.
 */
export async function requireRole(role: ViewerRole): Promise<Viewer | null> {
  const viewer = await getViewer();
  if (!viewer) {
    if (isSupabaseConfigured()) redirect(ROUTES.signIn);
    return null; // demo mode — let the seeded demo render
  }
  if (viewer.role !== role) {
    redirect(viewer.role === "organizer" ? ROUTES.organizerDashboard : ROUTES.judgeDashboard);
  }
  return viewer;
}
