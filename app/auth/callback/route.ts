import { NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase";
import { acceptInvitation } from "@/lib/invitations";
import { ROUTES } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /auth/callback — the OAuth (Google / GitHub) + magic-link return URL.
 *
 * Supabase redirects here with a `?code=…` after the provider's consent screen. We
 * exchange that code for a real session (sets the auth cookies), then route the user to
 * the right place — crucially, an INVITED JUDGE is sent straight to the judging dashboard
 * (after their invite is accepted), never bounced back to sign in. Without this exchange
 * the code is never turned into a session, so the guarded dashboards would reject them.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const invite = url.searchParams.get("invite");
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}${ROUTES.signIn}`);
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(`${origin}${ROUTES.signIn}`);

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}${ROUTES.signIn}?error=oauth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Invited judge/co-organizer → accept the invite (pins their role + assignments) and
  // route them to the dashboard for that role.
  if (invite) {
    const result = await acceptInvitation(invite, user?.email);
    const dest = result.role === "organizer" ? ROUTES.organizerDashboard : ROUTES.judgeDashboard;
    return NextResponse.redirect(`${origin}${dest}`);
  }

  // No invite — route by the user's existing role so a returning judge lands on judging
  // and an organizer lands on setup, instead of the generic role-choice screen.
  const service = await getSupabaseServiceClient();
  let role: string | null = null;
  if (user && service) {
    const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).maybeSingle();
    role = (profile?.role as string) ?? null;
  }
  const dest = role === "judge" ? ROUTES.judgeDashboard : ROUTES.getStarted;
  return NextResponse.redirect(`${origin}${dest}`);
}
