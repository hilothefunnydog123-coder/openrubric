"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, MailCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toast } from "@/components/ui/toast";
import { OtpInput } from "@/components/ui/otp-input";
import { GoogleIcon } from "@/components/ui/google-icon";
import { GithubIcon } from "@/components/ui/github-icon";
import { GmailIcon } from "@/components/ui/gmail-icon";
import { YahooIcon } from "@/components/ui/yahoo-icon";
import { PASSWORD_RULES } from "@/lib/password";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { ROUTES, PENDING_SIGNUP_KEY } from "@/lib/constants";
import { signInSchema, signUpSchema, type SignInValues, type SignUpValues } from "@/lib/validators";

/** Turn raw Supabase auth errors into clear, human-readable messages. */
function friendlyAuthError(message: string): string {
  const m = (message || "").toLowerCase();
  if (m.includes("already registered") || m.includes("already exists"))
    return "An account with this email already exists. Try signing in instead.";
  if (m.includes("invalid login credentials"))
    return "We couldn't find an account matching that email and password. Check your details, or create an account.";
  if (m.includes("email not confirmed"))
    return "Please verify your email first. Check your inbox for the code we sent.";
  if (m.includes("rate") || m.includes("too many"))
    return "Too many attempts right now. Wait a minute, then try again.";
  if (m.includes("password"))
    return "That password doesn't meet the requirements: 8+ characters with upper- and lower-case letters and a number.";
  if (m.includes("email"))
    return "That email address looks invalid. Double-check it and try again.";
  return message || "Something went wrong. Please try again.";
}

/**
 * The "open your inbox" shortcut, matched to the email's provider. Only providers we
 * can deep-link to get a button; anything else (custom domains, Outlook, etc.) returns
 * null so we don't show a misleading "Go to Gmail" link.
 */
function webmailFor(email: string | null) {
  const domain = (email ?? "").split("@")[1]?.toLowerCase() ?? "";
  if (!domain) return null;
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return {
      name: "Gmail",
      href: `https://mail.google.com/mail/u/0/#search/${encodeURIComponent("OpenRubric verification code")}`,
      Icon: GmailIcon,
      iconClass: "h-[18px] w-[18px]",
    };
  }
  if (domain === "yahoo.com" || domain === "ymail.com" || domain === "rocketmail.com" || domain.startsWith("yahoo.")) {
    return {
      name: "Yahoo Mail",
      href: "https://mail.yahoo.com/",
      Icon: YahooIcon,
      // The accent purple the user specified: rgba(177,151,252,1).
      iconClass: "h-[18px] w-[18px] text-[#B197FC]",
    };
  }
  return null;
}

export function AuthCard({
  mode,
  invite,
  inviteEmail,
}: {
  mode: "sign-in" | "sign-up";
  invite?: string;
  inviteEmail?: string;
}) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // After sign-up we email a 6-digit code and switch to the code-entry panel.
  // demoCode is only set when no SMTP is configured (so the flow still works).
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeStatus, setCodeStatus] = useState<"idle" | "error" | "success">("idle");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyCode(value: string) {
    navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => showToast("Couldn't copy. Select the code and copy it manually."));
  }

  function openWorkspace() {
    // Invited judges already had their invite accepted during verification, send them
    // straight to judging in the SAME tab (no second sign-up). Organizers open setup.
    if (invite) {
      router.push(ROUTES.judgeDashboard);
      router.refresh();
      return;
    }
    window.open(ROUTES.getStarted, "_blank", "noopener,noreferrer");
  }
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }

  const signIn = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const signUp = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: inviteEmail ?? "",
      password: "",
      role: invite ? "judge" : "organizer",
    },
  });
  const pw = signUp.watch("password") ?? "";

  async function onOAuth(provider: "google" | "github") {
    setError(null);
    setInfo(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      router.push(ROUTES.getStarted); // demo mode, no backend configured
      return;
    }
    setPending(true);
    const inviteQs = invite ? `?invite=${encodeURIComponent(invite)}` : "";
    // Prefer the canonical app URL (openrubric.vercel.app via NEXT_PUBLIC_APP_URL) so OAuth
    // always returns to production, never localhost or a preview origin. Falls back to the
    // current origin only if the env var isn't set.
    const base =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // Return to our callback route, which exchanges the code for a session, accepts
        // the invite, and routes the judge straight to judging, never back to sign in.
        redirectTo: `${base}${ROUTES.authCallback}${inviteQs}`,
      },
    });
    if (error) {
      setPending(false);
      showToast(friendlyAuthError(error.message));
    }
    // On success the browser is redirected to the provider's consent screen.
  }

  async function onSignIn(values: SignInValues) {
    setError(null);
    setInfo(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      router.push(ROUTES.getStarted); // demo mode
      return;
    }
    setPending(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setPending(false);
    if (error) {
      showToast(friendlyAuthError(error.message));
      return;
    }
    router.refresh();
    router.push(ROUTES.getStarted);
  }

  /** Email a 6-digit code, then switch to the code-entry panel. */
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
        showToast(data.error || "Could not send the verification email.");
        return;
      }
      setCode("");
      setCodeStatus("idle");
      setVerifyToken(data.token ?? null);
      setDemoCode(data.demo ? (data.code ?? null) : null);
      setSentTo(email);
    } catch {
      setPending(false);
      showToast("Network error sending the verification email.");
    }
  }

  /**
   * Verify the typed 6-digit code. Only NOW do we create the account (so unverified
   * emails never reach Supabase), then sign in to establish the session.
   */
  async function verifyCode(submitted: string) {
    if (!verifyToken || submitted.length < 6 || verifying || codeStatus === "success") return;
    setVerifying(true);
    setCodeStatus("idle");
    try {
      const values = signUp.getValues();
      const email = sentTo ?? values.email;
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: verifyToken,
          code: submitted,
          email,
          password: values.password,
          fullName: values.fullName,
          role: values.role,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setVerifying(false);
      if (!res.ok || !data.ok) {
        setCodeStatus("error");
        setCode("");
        showToast(
          data.reason === "expired"
            ? "That code expired. Tap resend for a new one."
            : "That code isn't right. Check your email and try again.",
        );
        return;
      }

      // Account exists (or was just created) → sign in to set the session.
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: values.password,
        });
        if (signInError) {
          setCodeStatus("error");
          showToast(
            data.existed
              ? "This email already has an account. Please sign in with your existing password."
              : friendlyAuthError(signInError.message),
          );
          return;
        }
      }

      // Invited judge: accept the invitation (marks accepted, pins judge role).
      if (invite) {
        await fetch("/api/judges/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: invite, email }),
        }).catch(() => {});
      }
      // Verified here, clear the pending stash so a later magic-link click is a no-op.
      try {
        window.localStorage.removeItem(PENDING_SIGNUP_KEY);
      } catch {
        /* ignore */
      }
      setCodeStatus("success");
    } catch {
      setVerifying(false);
      setCodeStatus("error");
      showToast("Network error verifying the code.");
    }
  }

  async function onSignUp(values: SignUpValues) {
    setError(null);
    setInfo(null);
    // No account is created yet, we only email a 6-digit code and open the
    // verification panel. The Supabase user is created after the code is verified
    // (see verifyCode → /api/auth/register), so unverified emails never get stored.
    //
    // Briefly hold the details in this browser so the email's "Continue" magic link
    // (opened in the same browser) can finish the signup without re-typing anything.
    try {
      window.localStorage.setItem(
        PENDING_SIGNUP_KEY,
        JSON.stringify({
          email: values.email.toLowerCase().trim(),
          fullName: values.fullName,
          role: values.role,
          password: values.password,
          invite: invite ?? null,
        }),
      );
    } catch {
      /* storage may be unavailable, the typed-code path still works */
    }
    await requestVerification(values.email);
  }

  return (
    <>
      <Toast message={toast} onDismiss={() => setToast(null)} />
      <div className="relative flex min-h-screen items-center justify-center bg-canvas p-8">
        <div className="w-full max-w-[420px]">
          <Link href={ROUTES.home} className="mb-7 flex items-center justify-center text-ink">
            <Logo />
          </Link>

          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-[18px] border border-line bg-surface p-8 shadow-card"
          >
          {sentTo ? (
            <div className="animate-floatup py-1 text-center">
              {codeStatus === "success" ? (
                <div className="py-6">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(46,138,94,0.12)] text-[#2e8a5e]"
                  >
                    <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
                      <motion.path
                        d="M11 20.5L17 26.5L29 13.5"
                        stroke="currentColor"
                        strokeWidth="3.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
                      />
                    </svg>
                  </motion.div>
                  <h1 className="mb-1.5 font-serif text-[28px] font-normal leading-[1.12] tracking-[-0.015em]">
                    Email verified
                  </h1>
                  <p className="mb-6 text-[14.5px] font-semibold text-ink">
                    You&apos;re all set.
                    {sentTo ? (
                      <>
                        {" "}
                        <span className="font-bold text-ink">{sentTo}</span>
                      </>
                    ) : null}{" "}
                    is confirmed.
                  </p>
                  <button
                    type="button"
                    onClick={openWorkspace}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-control bg-accent px-4 py-3 text-[14px] font-medium text-white transition-colors hover:bg-accent/90"
                  >
                    Continue →
                  </button>
                  <p className="mt-2.5 font-mono text-[11px] font-bold text-ink">
                    Opens your workspace in a new tab.
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-accent/15" />
                    <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <MailCheck className="h-7 w-7" strokeWidth={1.7} />
                    </span>
                  </div>
                  <h1 className="mb-2 font-serif text-[28px] font-normal leading-[1.12] tracking-[-0.015em]">
                    Check your email
                  </h1>
                  <p className="mb-4 text-[14.5px] font-semibold leading-relaxed text-ink">
                    Enter the 6-digit code we sent to{" "}
                    <span className="font-medium text-ink">{sentTo}</span>.
                  </p>

                  <OtpInput
                    value={code}
                    onChange={(v) => {
                      setCode(v);
                      if (codeStatus === "error") setCodeStatus("idle");
                      if (v.length === 6) verifyCode(v);
                    }}
                    status={codeStatus}
                    disabled={verifying}
                  />

                  {verifying && (
                    <p className="mb-3 mt-3 font-mono text-[11px] font-bold text-ink">Verifying…</p>
                  )}

                  {demoCode && (
                    <div className="mb-4 flex items-center justify-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-ink">Demo code</span>
                      <button
                        type="button"
                        onClick={() => copyCode(demoCode)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-raised px-2.5 py-1 font-mono text-[12px] tabular-nums tracking-[0.15em] text-ink transition-colors hover:border-ink"
                        aria-label="Copy verification code"
                      >
                        {demoCode}
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-[#2e8a5e]" strokeWidth={3} />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-dim" strokeWidth={2} />
                        )}
                      </button>
                      {copied && <span className="text-[11px] text-[#2e8a5e]">Copied</span>}
                    </div>
                  )}

                  {(() => {
                    const webmail = webmailFor(sentTo);
                    if (!webmail) return null;
                    const { Icon } = webmail;
                    return (
                      <a
                        href={webmail.href}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 py-3 text-[14px] font-medium text-ink shadow-sm transition-colors hover:border-ink"
                      >
                        <Icon className={webmail.iconClass} />
                        Go to {webmail.name} &amp; find the code
                      </a>
                    );
                  })()}

                  <p className="mb-4 mt-2.5 text-[11.5px] font-semibold text-ink">
                    Don&apos;t see it? Check your spam or promotions folder.
                  </p>

                  <div className="flex items-center justify-center gap-3 text-[13px]">
                    <button
                      type="button"
                      onClick={() => requestVerification(sentTo)}
                      disabled={pending || verifying}
                      className="font-medium text-accent transition-opacity hover:opacity-70 disabled:opacity-50"
                    >
                      {pending ? "Resending…" : "Resend code"}
                    </button>
                    <span className="text-faint">·</span>
                    <Link href={ROUTES.signIn} className="text-dim underline">
                      Back to sign in
                    </Link>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <h1 className="mb-2 text-center font-serif text-[30px] font-normal leading-[1.12] tracking-[-0.015em]">
                {isSignUp ? "Create your account" : "Welcome back"}
              </h1>
          <p className="mx-auto mb-7 max-w-[34ch] text-center text-[14.5px] font-semibold leading-[1.55] text-ink">
            {isSignUp
              ? invite
                ? "Accept your judge invitation by signing up with the invited email."
                : "You'll pick your role during onboarding."
              : "Sign in and pick up right where you left off."}
          </p>

          {invite && isSignUp && (
            <div className="mb-4 rounded-control border border-[rgba(46,138,94,0.3)] bg-[rgba(46,138,94,0.06)] px-3.5 py-2.5 text-[13px] text-signal-clean">
              You&apos;ve been invited as a <strong>judge</strong>. Sign up with this email to accept.
            </div>
          )}

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
              className="group flex items-center justify-center gap-2.5 rounded-control border border-line bg-surface px-4 py-3 text-[14px] font-medium text-ink shadow-sm transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 disabled:opacity-60"
            >
              <GoogleIcon className="h-[18px] w-[18px]" />
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => onOAuth("github")}
              disabled={pending}
              className="group flex items-center justify-center gap-2.5 rounded-control border border-line bg-raised px-4 py-3 text-[14px] font-medium text-ink transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 disabled:opacity-60"
            >
              <GithubIcon className="h-[18px] w-[18px]" />
              Continue with GitHub
            </button>
          </div>

          <div className="mb-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="font-mono text-[11px] font-bold text-ink">OR CONTINUE WITH EMAIL</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {isSignUp ? (
            <form onSubmit={signUp.handleSubmit(onSignUp)} noValidate>
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
              <div className="relative">
                <Input
                  id="su-password"
                  type="password"
                  placeholder="••••••••"
                  className="mb-2.5 lg:mb-[18px]"
                  {...signUp.register("password")}
                />
                <AnimatePresence>
                  {(pw.length > 0 || !!signUp.formState.errors.password) && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="mb-[18px] rounded-control border border-line bg-raised p-3.5 lg:absolute lg:left-full lg:top-0 lg:z-20 lg:mb-0 lg:ml-5 lg:w-56 lg:bg-surface lg:shadow-card"
                    >
                      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                        Password must have
                      </div>
                      <ul className="flex flex-col gap-1.5">
                        {PASSWORD_RULES.map((r) => {
                          const ok = r.test(pw);
                          return (
                            <li key={r.id} className="flex items-center gap-2 text-[12.5px]">
                              <span
                                className={cn(
                                  "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition-colors",
                                  ok
                                    ? "border-[#2e8a5e] bg-[#2e8a5e] text-white"
                                    : "border-line text-transparent",
                                )}
                              >
                                <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                              </span>
                              <span className={cn("transition-colors", ok ? "text-ink" : "text-dim")}>
                                {r.label}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

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
          </motion.div>

        <div className="mt-5 text-center text-[13px] font-semibold text-ink">
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
    </>
  );
}
