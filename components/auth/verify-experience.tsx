"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { ROUTES, PENDING_SIGNUP_KEY } from "@/lib/constants";

interface PendingSignup {
  email: string;
  fullName: string;
  role: "organizer" | "judge" | "participant";
  password: string;
  invite: string | null;
}

/** Every verified path lands on the same get-started screen (invited judges keep their welcome). */
function destinationFor(invite: string | null): string {
  return invite ? `${ROUTES.getStarted}?invite=${encodeURIComponent(invite)}` : ROUTES.getStarted;
}

type Status = "verifying" | "success" | "error" | "expired";

const MIN_VERIFY_MS = 1300; // let the animation breathe even if the API is instant

export function VerifyExperience({ token }: { token?: string }) {
  const [status, setStatus] = useState<Status>("verifying");
  const [email, setEmail] = useState<string | null>(null);
  const [dest, setDest] = useState<string>(ROUTES.getStarted);
  const reduce = useReducedMotion();
  const ran = useRef(false);
  const router = useRouter();

  // On success, the magic link signs you straight into your dashboard.
  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => router.push(dest), 1500);
    return () => clearTimeout(t);
  }, [status, dest, router]);

  // Reads the pending signup stashed by the form, creates + signs in the verified
  // user, and returns where to send them. No pending signup → just to get-started.
  async function completeDeferredSignup(linkToken: string, verifiedEmail: string | null): Promise<string> {
    let pending: PendingSignup | null = null;
    try {
      const raw = window.localStorage.getItem(PENDING_SIGNUP_KEY);
      if (raw) pending = JSON.parse(raw) as PendingSignup;
    } catch {
      /* ignore */
    }
    if (!pending?.email || !pending.password) return ROUTES.getStarted;
    if (verifiedEmail && pending.email.toLowerCase() !== verifiedEmail.toLowerCase()) {
      return ROUTES.getStarted;
    }

    try {
      const reg = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkToken,
          email: pending.email,
          password: pending.password,
          fullName: pending.fullName,
          role: pending.role,
        }),
      });
      const regData = await reg.json().catch(() => ({}));
      if (!reg.ok || !regData.ok) return ROUTES.getStarted;

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.auth
          .signInWithPassword({ email: pending.email, password: pending.password })
          .catch(() => {});
      }
      if (pending.invite) {
        await fetch("/api/judges/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: pending.invite, email: pending.email }),
        }).catch(() => {});
      }
      return destinationFor(pending.invite);
    } catch {
      return ROUTES.getStarted;
    } finally {
      try {
        window.localStorage.removeItem(PENDING_SIGNUP_KEY);
      } catch {
        /* ignore */
      }
    }
  }

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setStatus("error");
      return;
    }
    const started = Date.now();
    (async () => {
      let next: Status = "error";
      let mail: string | null = null;
      let destination: string = ROUTES.getStarted;
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          next = "success";
          mail = data.email ?? null;
          // Finish the deferred signup if this browser holds the pending details:
          // create the (now-verified) account, sign in, and head to the dashboard.
          destination = await completeDeferredSignup(token!, data.email ?? null);
        } else {
          next = data.reason === "expired" ? "expired" : "error";
        }
      } catch {
        next = "error";
      }
      const wait = Math.max(0, MIN_VERIFY_MS - (Date.now() - started));
      setTimeout(() => {
        setEmail(mail);
        setDest(destination);
        setStatus(next);
      }, wait);
    })();
  }, [token]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0b0d] px-6 text-white">
      <Aurora reduce={!!reduce} status={status} />

      <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center text-center">
        <Stage status={status} reduce={!!reduce} />

        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ opacity: 0, y: reduce ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -10 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9"
          >
            {status === "verifying" && (
              <Copy
                title="Verifying your email"
                body="Hang tight, confirming your secure link."
                shimmer
              />
            )}

            {status === "success" && (
              <>
                <Copy title="Email verified" body={email ? `${email} is confirmed.` : "Your email is confirmed."} />
                <motion.div
                  initial={{ opacity: 0, y: reduce ? 0 : 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-7"
                >
                  <Link
                    href={dest}
                    className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-black transition-transform hover:scale-[1.03] active:scale-95"
                  >
                    Continue
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                </motion.div>
              </>
            )}

            {(status === "error" || status === "expired") && (
              <>
                <Copy
                  title={status === "expired" ? "Link expired" : "Verification failed"}
                  body={
                    status === "expired"
                      ? "This link is older than 30 minutes. Request a fresh one."
                      : "This link is invalid or already used. Try requesting a new one."
                  }
                />
                <div className="mt-7 flex items-center justify-center gap-3">
                  <Link
                    href={ROUTES.signUp}
                    className="rounded-full bg-white px-5 py-2.5 text-[13.5px] font-semibold text-black transition-transform hover:scale-[1.03] active:scale-95"
                  >
                    Request new link
                  </Link>
                  <Link
                    href={ROUTES.signIn}
                    className="rounded-full border border-white/15 px-5 py-2.5 text-[13.5px] font-medium text-white/80 transition-colors hover:border-white/40 hover:text-white"
                  >
                    Back to sign in
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

/* ─────────────────────────── the animated stage ─────────────────────────── */

function Stage({ status, reduce }: { status: Status; reduce: boolean }) {
  const accent =
    status === "success" ? "#34d399" : status === "verifying" ? "#5b8cff" : "#f87171";

  return (
    <div className="relative flex h-[168px] w-[168px] items-center justify-center">
      {/* expanding ripple rings */}
      {!reduce &&
        (status === "success" || status === "verifying") &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={`${status}-ripple-${i}`}
            className="absolute rounded-full border"
            style={{ borderColor: accent }}
            initial={{ width: 84, height: 84, opacity: 0.5 }}
            animate={{ width: 220, height: 220, opacity: 0 }}
            transition={{
              duration: status === "success" ? 1.1 : 2.4,
              ease: "easeOut",
              repeat: Infinity,
              delay: i * (status === "success" ? 0.18 : 0.8),
            }}
          />
        ))}

      {/* rotating orbit rings while verifying */}
      {status === "verifying" && (
        <>
          <motion.span
            className="absolute rounded-full border-2 border-transparent"
            style={{ width: 132, height: 132, borderTopColor: accent, borderRightColor: accent }}
            animate={reduce ? {} : { rotate: 360 }}
            transition={{ duration: 1.4, ease: "linear", repeat: Infinity }}
          />
          <motion.span
            className="absolute rounded-full border-2 border-transparent"
            style={{ width: 104, height: 104, borderBottomColor: accent, opacity: 0.6 }}
            animate={reduce ? {} : { rotate: -360 }}
            transition={{ duration: 2.1, ease: "linear", repeat: Infinity }}
          />
        </>
      )}

      {/* the core */}
      <motion.div
        className="relative flex h-[84px] w-[84px] items-center justify-center rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${accent}33, ${accent}0d)`,
          boxShadow: `0 0 48px ${accent}55, inset 0 0 0 1px ${accent}66`,
        }}
        animate={
          reduce
            ? {}
            : status === "verifying"
              ? { scale: [1, 1.06, 1] }
              : { scale: [0.6, 1.12, 1] }
        }
        transition={
          status === "verifying"
            ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
        }
      >
        <Glyph status={status} reduce={reduce} accent={accent} />
      </motion.div>

      {/* success particle burst */}
      <AnimatePresence>{status === "success" && !reduce && <Burst accent={accent} />}</AnimatePresence>
    </div>
  );
}

function Glyph({ status, reduce, accent }: { status: Status; reduce: boolean; accent: string }) {
  if (status === "success") {
    return (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <motion.path
          d="M11 20.5L17 26.5L29 13.5"
          stroke={accent}
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
        />
      </svg>
    );
  }
  if (status === "error" || status === "expired") {
    return (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
        {[
          "M13 13L25 25",
          "M25 13L13 25",
        ].map((d, i) => (
          <motion.path
            key={d}
            d={d}
            stroke={accent}
            strokeWidth="3.2"
            strokeLinecap="round"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.32, ease: "easeOut", delay: 0.1 + i * 0.12 }}
          />
        ))}
      </svg>
    );
  }
  // verifying, an envelope that gently breathes
  return (
    <motion.svg
      width="38"
      height="38"
      viewBox="0 0 24 24"
      fill="none"
      animate={reduce ? {} : { y: [0, -2, 0] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke={accent} strokeWidth="1.7" />
      <path d="M4 7l8 6 8-6" stroke={accent} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  );
}

function Burst({ accent }: { accent: string }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        const dist = 70 + (i % 3) * 18;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          size: 5 + (i % 3) * 2,
          delay: 0.12 + (i % 5) * 0.015,
          color: i % 2 ? accent : "#ffffff",
        };
      }),
    [accent],
  );
  return (
    <>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ width: b.size, height: b.size, background: b.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: b.x, y: b.y, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.85, ease: "easeOut", delay: b.delay }}
        />
      ))}
    </>
  );
}

/* ──────────────────────────────── copy ──────────────────────────────────── */

function Copy({ title, body, shimmer }: { title: string; body: string; shimmer?: boolean }) {
  return (
    <>
      <h1
        className={
          "text-[26px] font-semibold tracking-[-0.02em] " +
          (shimmer
            ? "animate-shimmer bg-[linear-gradient(110deg,#ffffff_40%,#7da2ff_50%,#ffffff_60%)] bg-[length:200%_100%] bg-clip-text text-transparent"
            : "text-white")
        }
      >
        {title}
      </h1>
      <p className="mx-auto mt-2.5 max-w-[34ch] text-[14.5px] leading-relaxed text-white/55">{body}</p>
    </>
  );
}

/* ───────────────────────── animated background ──────────────────────────── */

function Aurora({ reduce, status }: { reduce: boolean; status: Status }) {
  const tint =
    status === "success" ? "52,211,153" : status === "error" || status === "expired" ? "248,113,113" : "91,140,255";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* drifting color blobs */}
      <motion.div
        className="absolute -left-32 -top-24 h-[460px] w-[460px] rounded-full blur-[90px]"
        style={{ background: `rgba(${tint},0.22)` }}
        animate={reduce ? {} : { x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 -right-24 h-[420px] w-[420px] rounded-full blur-[90px]"
        style={{ background: "rgba(124,58,237,0.18)" }}
        animate={reduce ? {} : { x: [0, -50, 0], y: [0, -30, 0] }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* faint drifting grid */}
      <motion.div
        className="absolute inset-0 opacity-[0.6]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.035) 1px,transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(circle at 50% 45%, black, transparent 72%)",
        }}
        animate={reduce ? {} : { backgroundPositionY: [0, 44] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_30%,#0a0b0d_85%)]" />
    </div>
  );
}
