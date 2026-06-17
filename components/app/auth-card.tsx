"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TechIcon } from "@/components/ui/tech-icon";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { signInSchema, signUpSchema, type SignInValues, type SignUpValues } from "@/lib/validators";
import type { Role } from "@/lib/types";

const ROLES: { value: Role; label: string }[] = [
  { value: "organizer", label: "Organizer" },
  { value: "judge", label: "Judge" },
  { value: "participant", label: "Participant" },
];

const ROLE_DEST: Record<Role, string> = {
  organizer: ROUTES.organizerDashboard,
  judge: ROUTES.judgeDashboard,
  participant: ROUTES.teamDashboard,
};

export function AuthCard({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // After sign-up we send a verification email and switch to a "check your inbox"
  // panel. demoLink is only set when no SMTP is configured (so the flow still works).
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [demoLink, setDemoLink] = useState<string | null>(null);

  const signIn = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const signUp = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "", role: "organizer" },
  });

  const role = signUp.watch("role");

  async function onOAuth(provider: "google" | "github") {
    setError(null);
    setInfo(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      router.push(ROUTES.judgeDashboard); // demo mode — no backend configured
      return;
    }
    setPending(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}${ROUTES.judgeDashboard}`
            : undefined,
      },
    });
    if (error) {
      setPending(false);
      setError(error.message);
    }
    // On success the browser is redirected to the provider's consent screen.
  }

  async function onSignIn(values: SignInValues) {
    setError(null);
    setInfo(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      router.push(ROUTES.judgeDashboard); // demo mode
      return;
    }
    setPending(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
    router.push(ROUTES.judgeDashboard);
  }

  /** Issue + send a verification email, then switch to the "check your inbox" panel. */
  async function requestVerification(email: string) {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      setPending(false);
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not send the verification email.");
        return;
      }
      setSentTo(email);
      setDemoLink(data.demo ? data.link : null);
    } catch {
      setPending(false);
      setError("Network error sending the verification email.");
    }
  }

  async function onSignUp(values: SignUpValues) {
    setError(null);
    setInfo(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      // Demo mode: no backend auth, but still demonstrate the verification flow.
      await requestVerification(values.email);
      return;
    }
    setPending(true);
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.fullName, role: values.role },
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}${ROUTES.verify}` : undefined,
      },
    });
    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.refresh();
      router.push(ROLE_DEST[values.role]);
    } else {
      // Account needs email confirmation — send our branded verification link too.
      await requestVerification(values.email);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas p-8">
      <div className="w-full max-w-[420px]">
        <Link href={ROUTES.home} className="mb-7 flex items-center justify-center text-ink">
          <Logo />
        </Link>

        <div className="rounded-[18px] border border-line bg-surface p-8 shadow-card">
          {sentTo ? (
            <div className="animate-floatup py-2 text-center">
              <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-accent/15" />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <MailCheck className="h-7 w-7" strokeWidth={1.7} />
                </span>
              </div>
              <h1 className="mb-1.5 text-[22px] font-semibold tracking-[-0.02em]">Check your inbox</h1>
              <p className="mb-5 text-sm leading-relaxed text-dim">
                We sent a verification link to{" "}
                <span className="font-medium text-ink">{sentTo}</span>. It expires in 30 minutes.
              </p>
              {error && <p className="mb-3 text-[12.5px] text-signal-high">{error}</p>}
              {demoLink && (
                <>
                  <a
                    href={demoLink}
                    className="mb-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-control bg-accent px-4 py-3 text-[14px] font-medium text-white transition-colors hover:bg-accent/90"
                  >
                    Open verification link →
                  </a>
                  <p className="mb-4 font-mono text-[10.5px] text-faint">
                    Demo mode — no SMTP configured, so the link is shown here.
                  </p>
                </>
              )}
              <button
                type="button"
                onClick={() => requestVerification(sentTo)}
                disabled={pending}
                className="text-[13px] font-medium text-accent transition-opacity hover:opacity-70 disabled:opacity-50"
              >
                {pending ? "Resending…" : "Resend email"}
              </button>
              <div className="mt-5 border-t border-line-soft pt-4">
                <Link href={ROUTES.signIn} className="text-[13px] text-dim underline">
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h1 className="mb-1.5 text-[22px] font-semibold tracking-[-0.02em]">
                {isSignUp ? "Create your account" : "Sign in to your hackathon"}
              </h1>
          <p className="mb-6 text-sm text-dim">
            {isSignUp
              ? "Organize, judge, or submit — pick a role to get started."
              : "Continue with your judging account, or jump into a demo workspace."}
          </p>

          {error && (
            <div className="mb-4 rounded-control border border-[rgba(180,69,60,0.3)] bg-[rgba(180,69,60,0.06)] px-3.5 py-2.5 text-[13px] text-signal-high">
              {error}
            </div>
          )}
          {info && (
            <div className="mb-4 rounded-control border border-[rgba(46,138,94,0.3)] bg-[rgba(46,138,94,0.06)] px-3.5 py-2.5 text-[13px] text-signal-clean">
              {info}
            </div>
          )}

          {/* OAuth providers */}
          <div className="mb-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => onOAuth("google")}
              disabled={pending}
              className="group flex items-center justify-center gap-2.5 rounded-control bg-accent px-4 py-3 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-60"
            >
              <TechIcon name="Google" className="h-[18px] w-[18px]" />
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => onOAuth("github")}
              disabled={pending}
              className="group flex items-center justify-center gap-2.5 rounded-control border border-line bg-raised px-4 py-3 text-[14px] font-medium text-ink transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 disabled:opacity-60"
            >
              <TechIcon name="GitHub" className="h-[18px] w-[18px]" />
              Continue with GitHub
            </button>
          </div>

          <div className="mb-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="font-mono text-[11px] text-faint">OR CONTINUE WITH EMAIL</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {isSignUp ? (
            <form onSubmit={signUp.handleSubmit(onSignUp)} noValidate>
              <Label htmlFor="role">Role</Label>
              <div className="mb-4 grid grid-cols-3 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => signUp.setValue("role", r.value)}
                    className={cn(
                      "rounded-control border py-2.5 font-mono text-[11.5px] uppercase tracking-[0.06em] transition-colors",
                      role === r.value
                        ? "border-ink bg-ink text-canvas"
                        : "border-line bg-raised text-dim hover:border-ink",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" placeholder="Priya Shah" className="mb-3.5" {...signUp.register("fullName")} />
              {signUp.formState.errors.fullName && (
                <p className="-mt-2 mb-3 text-[12px] text-signal-high">{signUp.formState.errors.fullName.message}</p>
              )}

              <Label htmlFor="su-email">Email</Label>
              <Input id="su-email" type="email" placeholder="you@hackathon.org" className="mb-3.5" {...signUp.register("email")} />
              {signUp.formState.errors.email && (
                <p className="-mt-2 mb-3 text-[12px] text-signal-high">{signUp.formState.errors.email.message}</p>
              )}

              <Label htmlFor="su-password">Password</Label>
              <Input id="su-password" type="password" placeholder="••••••••" className="mb-[18px]" {...signUp.register("password")} />
              {signUp.formState.errors.password && (
                <p className="-mt-3 mb-3 text-[12px] text-signal-high">{signUp.formState.errors.password.message}</p>
              )}

              <Button type="submit" className="mt-1 w-full" disabled={pending}>
                {pending ? "Creating account…" : "Create account"}
              </Button>
            </form>
          ) : (
            <form onSubmit={signIn.handleSubmit(onSignIn)} noValidate>
              <Label htmlFor="si-email">Email</Label>
              <Input id="si-email" type="email" placeholder="you@hackathon.org" className="mb-3.5" {...signIn.register("email")} />
              {signIn.formState.errors.email && (
                <p className="-mt-2 mb-3 text-[12px] text-signal-high">{signIn.formState.errors.email.message}</p>
              )}
              <Label htmlFor="si-password">Password</Label>
              <Input id="si-password" type="password" placeholder="••••••••" className="mb-[18px]" {...signIn.register("password")} />
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Signing in…" : "Continue"}
              </Button>
            </form>
          )}
            </>
          )}
        </div>

        <div className="mt-5 text-center text-[13px] text-dim">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <Link href={ROUTES.signIn} className="font-medium text-accent">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href={ROUTES.signUp} className="font-medium text-accent">
                Create an account
              </Link>
            </>
          )}{" "}
          ·{" "}
          <Link href={ROUTES.home} className="underline">
            Back to site
          </Link>
        </div>
      </div>
    </div>
  );
}
