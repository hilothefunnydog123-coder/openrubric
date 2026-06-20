"use client";

/**
 * Client-side session identity.
 *
 * Loads the currently authenticated Supabase user + their profile (name, avatar,
 * role) once and exposes it app-wide via useSession(). This is what makes scoring,
 * comments, and presence "real": every write is attributed to the actual logged-in
 * judge instead of a demo placeholder. In demo mode (no Supabase env) `user` is null
 * and callers fall back to the demo identity.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { colorForId } from "@/lib/utils";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  /** Stable color for presence/notes. */
  color: string;
}

interface SessionValue {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const sb = getSupabaseBrowserClient();
    if (!sb) {
      setUser(null);
      setLoading(false);
      return;
    }
    const {
      data: { user: au },
    } = await sb.auth.getUser();
    if (!au) {
      setUser(null);
      setLoading(false);
      return;
    }
    const { data: profile } = await sb
      .from("profiles")
      .select("full_name, avatar_url, role, email")
      .eq("id", au.id)
      .maybeSingle();

    const metaName = (au.user_metadata?.full_name as string | undefined) ?? "";
    setUser({
      id: au.id,
      email: profile?.email ?? au.email ?? "",
      name: profile?.full_name || metaName || au.email?.split("@")[0] || "You",
      avatarUrl: profile?.avatar_url ?? null,
      role: profile?.role ?? "organizer",
      color: colorForId(au.id),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Re-load on sign-in / sign-out / token refresh so the UI tracks the real session.
  useEffect(() => {
    const sb = getSupabaseBrowserClient();
    if (!sb) return;
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(() => void load());
    return () => subscription.unsubscribe();
  }, [load]);

  const signOut = useCallback(async () => {
    const sb = getSupabaseBrowserClient();
    await sb?.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ user, loading, refresh: load, signOut }),
    [user, loading, load, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within <SessionProvider>");
  return ctx;
}
