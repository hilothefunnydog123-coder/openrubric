import "server-only";
import path from "node:path";
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

// The logo mark, embedded as an inline (CID) attachment so it renders in every email
// client without depending on a public URL (localhost wouldn't reach the recipient).
const LOGO_CID = "openrubric-logo";
const logoAttachment = {
  filename: "openrubric.png",
  path: path.join(process.cwd(), "public", "openrubric-logo-256.png"),
  cid: LOGO_CID,
};

/** Brand header: the logo mark to the left of the OpenRubric wordmark. */
function brandHeader(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="padding-right:10px;vertical-align:middle;">
      <img src="cid:${LOGO_CID}" width="28" height="28" alt="${FROM_NAME}" style="display:block;border-radius:7px;" />
    </td>
    <td style="vertical-align:middle;">
      <span style="font-size:18px;font-weight:600;letter-spacing:-0.01em;color:#0a0b0d;">${FROM_NAME}</span>
    </td>
  </tr></table>`;
}

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
  const addr = process.env.GMAIL_USER || process.env.SMTP_USER || "openrubric@gmail.com";
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
      attachments: [logoAttachment],
    });
    return { sent: true, demo: false, messageId: info.messageId };
  } catch (err) {
    return { sent: false, demo: false, error: err instanceof Error ? err.message : "send failed" };
  }
}

export async function sendVerificationCodeEmail(
  to: string,
  code: string,
  continueLink?: string,
): Promise<SendResult> {
  const transport = getTransport();
  if (!transport) return { sent: false, demo: true };

  try {
    const info = await transport.sendMail({
      from: fromAddress(),
      to,
      subject: `${code} is your ${FROM_NAME} Verification Code`,
      text: `Your ${FROM_NAME} verification code is ${code}.\n\nEnter it to confirm your email (it expires in 10 minutes)${
        continueLink ? `, or just open this link to continue:\n${continueLink}` : "."
      }\n\nIf you didn't request this, you can ignore this message.`,
      html: verificationCodeEmailHtml(code, continueLink),
      attachments: [logoAttachment],
    });
    return { sent: true, demo: false, messageId: info.messageId };
  } catch (err) {
    return { sent: false, demo: false, error: err instanceof Error ? err.message : "send failed" };
  }
}

export async function sendOrganizerInviteEmail(
  to: string,
  opts: { acceptLink: string; hackathonName?: string; inviterName?: string },
): Promise<SendResult> {
  const transport = getTransport();
  if (!transport) return { sent: false, demo: true };

  const event = opts.hackathonName || "a hackathon";
  const inviter = opts.inviterName ? `${opts.inviterName} ` : "";
  try {
    const info = await transport.sendMail({
      from: fromAddress(),
      to,
      subject: `You're invited to co-organize ${event} on ${FROM_NAME}`,
      text: `${inviter}invited you to co-organize ${event} on ${FROM_NAME}.\n\nAccept and create your account with this email:\n${opts.acceptLink}\n`,
      html: inviteEmailHtml({
        acceptLink: opts.acceptLink,
        heading: "You're invited to co-organize",
        line: `${opts.inviterName ? `${opts.inviterName} invited you` : "You've been invited"} to co-organize <strong style="color:#f3f1ec;">${event}</strong>. Accept below and create your account with <em>this</em> email address.`,
      }),
      attachments: [logoAttachment],
    });
    return { sent: true, demo: false, messageId: info.messageId };
  } catch (err) {
    return { sent: false, demo: false, error: err instanceof Error ? err.message : "send failed" };
  }
}

/** A plain notification to the host (e.g. "X joined as a co-organizer"). */
export async function sendHostNotificationEmail(
  to: string,
  opts: { subject: string; heading: string; body: string },
): Promise<SendResult> {
  const transport = getTransport();
  if (!transport) return { sent: false, demo: true };
  try {
    const info = await transport.sendMail({
      from: fromAddress(),
      to,
      subject: opts.subject,
      text: `${opts.heading}\n\n${opts.body}\n`,
      html: notificationEmailHtml(opts.heading, opts.body),
      attachments: [logoAttachment],
    });
    return { sent: true, demo: false, messageId: info.messageId };
  } catch (err) {
    return { sent: false, demo: false, error: err instanceof Error ? err.message : "send failed" };
  }
}

export async function sendJudgeInviteEmail(
  to: string,
  opts: { acceptLink: string; hackathonName?: string; inviterName?: string },
): Promise<SendResult> {
  const transport = getTransport();
  if (!transport) return { sent: false, demo: true };

  const event = opts.hackathonName || "a hackathon";
  const inviter = opts.inviterName ? `${opts.inviterName} ` : "";
  try {
    const info = await transport.sendMail({
      from: fromAddress(),
      to,
      subject: `You're invited to judge ${event} on ${FROM_NAME}`,
      text: `${inviter}invited you to judge ${event} on ${FROM_NAME}.\n\nAccept and create your judge account with this email:\n${opts.acceptLink}\n`,
      html: judgeInviteEmailHtml(opts.acceptLink, event, opts.inviterName),
      attachments: [logoAttachment],
    });
    return { sent: true, demo: false, messageId: info.messageId };
  } catch (err) {
    return { sent: false, demo: false, error: err instanceof Error ? err.message : "send failed" };
  }
}

function judgeInviteEmailHtml(acceptLink: string, event: string, inviter?: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:40px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
      <tr><td style="padding:0 0 28px;">
        ${brandHeader()}
      </td></tr>
      <tr><td style="background:#17181b;border:1px solid #27292e;border-radius:18px;padding:36px 32px;">
        <h1 style="margin:0 0 10px;font-size:22px;line-height:1.25;color:#f3f1ec;font-weight:600;letter-spacing:-0.02em;">You're invited to judge</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#a0a09a;">
          ${inviter ? `${inviter} invited you` : "You've been invited"} to judge <strong style="color:#f3f1ec;">${event}</strong>. Accept below and create your judge account with <em>this</em> email address.
        </p>
        <a href="${acceptLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 30px;border-radius:10px;">
          Accept &amp; sign up &rarr;
        </a>
      </td></tr>
      <tr><td style="padding:22px 4px 0;font-size:12px;line-height:1.5;color:#5a5a5a;">
        Didn't expect this? You can ignore it — no account is created until you sign up.
      </td></tr>
    </table>
  </body>
</html>`;
}

/** Generic accept-invite email (judge or co-organizer). */
function inviteEmailHtml(opts: { acceptLink: string; heading: string; line: string }): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:40px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
      <tr><td style="padding:0 0 28px;">${brandHeader()}</td></tr>
      <tr><td style="background:#17181b;border:1px solid #27292e;border-radius:18px;padding:36px 32px;">
        <h1 style="margin:0 0 10px;font-size:22px;line-height:1.25;color:#f3f1ec;font-weight:600;letter-spacing:-0.02em;">${opts.heading}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#a0a09a;">${opts.line}</p>
        <a href="${opts.acceptLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 30px;border-radius:10px;">
          Accept &amp; sign up &rarr;
        </a>
      </td></tr>
      <tr><td style="padding:22px 4px 0;font-size:12px;line-height:1.5;color:#5a5a5a;">
        Didn't expect this? You can ignore it — no account is created until you sign up.
      </td></tr>
    </table>
  </body>
</html>`;
}

/** Simple notification email to the host (no action button). */
function notificationEmailHtml(heading: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:40px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
      <tr><td style="padding:0 0 28px;">${brandHeader()}</td></tr>
      <tr><td style="background:#17181b;border:1px solid #27292e;border-radius:18px;padding:36px 32px;">
        <h1 style="margin:0 0 10px;font-size:20px;line-height:1.25;color:#f3f1ec;font-weight:600;letter-spacing:-0.02em;">${heading}</h1>
        <p style="margin:0;font-size:15px;line-height:1.6;color:#a0a09a;">${body}</p>
      </td></tr>
      <tr><td style="padding:22px 4px 0;font-size:12px;line-height:1.5;color:#5a5a5a;">
        You're receiving this because you organize an event on ${FROM_NAME}.
      </td></tr>
    </table>
  </body>
</html>`;
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

function verificationCodeEmailHtml(code: string, continueLink?: string): string {
  const cells = code
    .split("")
    .map(
      (d) =>
        `<td style="width:48px;height:58px;text-align:center;vertical-align:middle;background:#0f1012;border:1px solid #27292e;border-radius:12px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:30px;font-weight:600;color:#f3f1ec;">${d}</td>`,
    )
    .join('<td style="width:8px;"></td>');

  const continueBlock = continueLink
    ? `<tr><td style="padding:24px 0 0;text-align:center;">
        <a href="${continueLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 30px;border-radius:10px;">
          Continue &rarr;
        </a>
      </td></tr>`
    : "";

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:40px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
      <tr><td style="padding:0 0 28px;">
        ${brandHeader()}
      </td></tr>
      <tr><td style="background:#17181b;border:1px solid #27292e;border-radius:18px;padding:36px 32px;">
        <h1 style="margin:0 0 10px;font-size:22px;line-height:1.25;color:#f3f1ec;font-weight:600;letter-spacing:-0.02em;">Verify your email</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#a0a09a;">
          Enter this 6-digit code to confirm your email. It expires in 10 minutes.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 6px;"><tr>${cells}</tr></table>
        ${continueBlock}
      </td></tr>
      <tr><td style="padding:22px 4px 0;font-size:12px;line-height:1.5;color:#5a5a5a;">
        Didn't request this? You can safely ignore this email — no account will be verified.
      </td></tr>
    </table>
  </body>
</html>`;
}

function verificationEmailHtml(link: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:40px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
      <tr><td style="padding:0 0 28px;">
        ${brandHeader()}
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
