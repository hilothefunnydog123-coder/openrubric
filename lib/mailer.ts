import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { SITE } from "@/lib/constants";

/**
 * Gmail SMTP mailer (nodemailer).
 *
 * Configure with a Gmail account + App Password (NOT your normal password —
 * Google requires 2-Step Verification, then an App Password):
 *
 *   GMAIL_USER=you@gmail.com
 *   GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx   # 16 chars, from myaccount.google.com/apppasswords
 *
 * A generic SMTP server also works via SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS.
 *
 * When nothing is configured the app stays in DEMO MODE: emails aren't sent, and the
 * verification link is returned to the client so the flow is still fully demonstrable.
 */

const FROM_NAME = SITE.name;

export function isMailerConfigured(): boolean {
  return Boolean(
    (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) ||
      (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
  );
}

let cached: Transporter | null = null;

function getTransport(): Transporter | null {
  if (!isMailerConfigured()) return null;
  if (cached) return cached;

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    cached = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        // App passwords are often shown with spaces ("abcd efgh ijkl mnop").
        pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, ""),
      },
    });
  } else {
    cached = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return cached;
}

function fromAddress(): string {
  const addr = process.env.GMAIL_USER || process.env.SMTP_USER || "no-reply@openrubric.org";
  return `"${FROM_NAME}" <${addr}>`;
}

export type SendResult = { sent: boolean; demo: boolean; messageId?: string; error?: string };

export async function sendVerificationEmail(to: string, link: string): Promise<SendResult> {
  const transport = getTransport();
  if (!transport) return { sent: false, demo: true };

  try {
    const info = await transport.sendMail({
      from: fromAddress(),
      to,
      subject: `Verify your email · ${FROM_NAME}`,
      text: `Welcome to ${FROM_NAME}!\n\nConfirm your email by opening this link (valid for 30 minutes):\n${link}\n\nIf you didn't create an account, you can ignore this message.`,
      html: verificationEmailHtml(link),
    });
    return { sent: true, demo: false, messageId: info.messageId };
  } catch (err) {
    return { sent: false, demo: false, error: err instanceof Error ? err.message : "send failed" };
  }
}

/** Verify the SMTP credentials/connection without sending mail. */
export async function verifyTransport(): Promise<{ ok: boolean; demo: boolean; error?: string }> {
  const transport = getTransport();
  if (!transport) return { ok: false, demo: true };
  try {
    await transport.verify();
    return { ok: true, demo: false };
  } catch (err) {
    return { ok: false, demo: false, error: err instanceof Error ? err.message : "verify failed" };
  }
}

function verificationEmailHtml(link: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#0d0e10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:40px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
      <tr><td style="padding:0 0 28px;">
        <span style="font-size:18px;font-weight:600;letter-spacing:-0.01em;color:#f3f1ec;">${FROM_NAME}</span>
      </td></tr>
      <tr><td style="background:#17181b;border:1px solid #27292e;border-radius:18px;padding:36px 32px;">
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;color:#f3f1ec;font-weight:600;letter-spacing:-0.02em;">Confirm your email</h1>
        <p style="margin:0 0 26px;font-size:15px;line-height:1.6;color:#a0a09a;">
          You're one click away from your judging account. This link is valid for 30 minutes.
        </p>
        <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 26px;border-radius:10px;">
          Verify email →
        </a>
        <p style="margin:26px 0 0;font-size:12.5px;line-height:1.6;color:#6a6a6a;word-break:break-all;">
          Or paste this link into your browser:<br/>
          <span style="color:#7a8aa8;">${link}</span>
        </p>
      </td></tr>
      <tr><td style="padding:22px 4px 0;font-size:12px;line-height:1.5;color:#5a5a5a;">
        If you didn't create a ${FROM_NAME} account, you can safely ignore this email.
      </td></tr>
    </table>
  </body>
</html>`;
}
