import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { isStaging } from "@/lib/utils/app-env";

let cachedTransporter: Transporter | null = null;

/**
 * Sends email through a Gmail (or Google Workspace) account via SMTP, using an App
 * Password rather than the account's real login password. Returns null (rather than
 * throwing) when not configured, so emails are simply skipped until GMAIL_USER /
 * GMAIL_APP_PASSWORD are set — order creation, payment verification, and shipping all
 * work without it; email is a bonus.
 *
 * The staging site never sends email, even though it shares the live Gmail credentials.
 */
export function getEmailTransporter(): Transporter | null {
  if (isStaging) return null;

  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  if (!user || !appPassword) return null;

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: appPassword },
    });
  }
  return cachedTransporter;
}

/**
 * Admin check that this server can actually send through Gmail (some hosts block outgoing
 * mail). Runs on staging too — it only ever writes to the admin who asked for it.
 */
export async function sendTestEmail(to: string): Promise<{ error?: string }> {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  if (!user || !appPassword) return { error: "GMAIL_USER and GMAIL_APP_PASSWORD aren't set on this site." };

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
  });
  try {
    await transporter.sendMail({
      from: getEmailFrom(),
      to,
      subject: "Test email from your Custom Drip Chennai website",
      text: `This test was sent by the website at ${process.env.NEXT_PUBLIC_SITE_URL ?? "(unknown address)"}. Order emails will reach customers the same way.`,
    });
    return {};
  } catch (error) {
    const err = error as { code?: string; responseCode?: number; message?: string };
    if (err.code === "EAUTH" || err.responseCode === 535) {
      return { error: "Gmail refused the login. Check GMAIL_USER and create a new App Password for GMAIL_APP_PASSWORD." };
    }
    if (err.code === "ETIMEDOUT" || err.code === "ECONNECTION" || err.code === "ESOCKET") {
      return { error: `This server couldn't reach Gmail (${err.code}). The host may be blocking outgoing email.` };
    }
    return { error: `Sending failed: ${err.message ?? "unknown error"}` };
  } finally {
    transporter.close();
  }
}

/**
 * Gmail's SMTP relay only allows sending as the authenticated address itself (it blocks
 * spoofed From addresses) — so only the display name is customizable, never the email.
 */
export function getEmailFrom(): string {
  const displayName = process.env.GMAIL_FROM_NAME || "Custom Drip Chennai";
  return `${displayName} <${process.env.GMAIL_USER}>`;
}
