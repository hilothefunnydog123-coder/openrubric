import crypto from "node:crypto";

/**
 * Stateless, signed email-verification tokens — no database table required.
 *
 * A token is `base64url(payload).base64url(hmac)`, where the HMAC is keyed by a
 * server-only secret. Verification recomputes the HMAC (timing-safe) and checks the
 * purpose + expiry. Tampering or expiry → invalid. This keeps the verify flow fully
 * self-contained while still being cryptographically sound.
 */

const SECRET =
  process.env.EMAIL_TOKEN_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "openrubric-dev-secret-change-me";

const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

type Purpose = "email-verify";

type Payload = { e: string; p: Purpose; x: number };

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

function sign(payloadB64: string): string {
  return crypto.createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
}

export function createVerificationToken(email: string, ttlMs = DEFAULT_TTL_MS): string {
  const payload: Payload = { e: email.toLowerCase().trim(), p: "email-verify", x: Date.now() + ttlMs };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export type VerifyResult =
  | { valid: true; email: string }
  | { valid: false; reason: "malformed" | "bad-signature" | "expired" | "wrong-purpose" };

export function verifyToken(token: string, purpose: Purpose = "email-verify"): VerifyResult {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { valid: false, reason: "malformed" };
  }
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return { valid: false, reason: "malformed" };

  const expected = sign(payloadB64);
  // Timing-safe compare; lengths must match first or timingSafeEqual throws.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, reason: "bad-signature" };
  }

  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return { valid: false, reason: "malformed" };
  }
  if (payload.p !== purpose) return { valid: false, reason: "wrong-purpose" };
  if (typeof payload.x !== "number" || Date.now() > payload.x) {
    return { valid: false, reason: "expired" };
  }
  return { valid: true, email: payload.e };
}
