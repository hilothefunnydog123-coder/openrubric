import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request so server components and
 * route handlers always see a fresh user. No-ops in demo mode (no Supabase env),
 * so the app runs identically with or without a backend.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  // Only do auth work when a Supabase session cookie is actually present. Anonymous
  // visitors skip the network refresh entirely, and the "invalid refresh token" log
  // (a harmless stale-cookie artifact) is confined to genuinely stale sessions.
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (!hasAuthCookie) return NextResponse.next();

  const { createServerClient } = await import("@supabase/ssr");

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]),
        );
      },
    },
  });

  // Touch the session to trigger a refresh if needed. Never throws on the request path.
  const result = await supabase.auth
    .getUser()
    .catch((e: unknown) => ({ error: e as { code?: string; status?: number; message?: string } }));
  const err = "error" in result ? result.error : null;

  // A stale/invalid refresh token (e.g. the user was deleted, or the session expired
  // beyond refresh) keeps erroring on every request. Clear the dead `sb-` cookies so the
  // browser drops the session and stops retrying — the visitor is simply logged out.
  const invalidSession =
    err != null &&
    (err.code === "refresh_token_not_found" ||
      err.code === "session_not_found" ||
      err.status === 400 ||
      /refresh.*token|session.*not.*found/i.test(err.message || ""));
  if (invalidSession) {
    request.cookies
      .getAll()
      .filter((c) => c.name.startsWith("sb-"))
      .forEach((c) => response.cookies.set(c.name, "", { maxAge: 0, path: "/" }));
  }

  return response;
}

export const config = {
  // Run on everything except static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
