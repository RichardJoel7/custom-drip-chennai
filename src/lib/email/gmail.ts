import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;

/**
 * Sends email through a Gmail (or Google Workspace) account via SMTP, using an App
 * Password rather than the account's real login password. Returns null (rather than
 * throwing) when not configured, so emails are simply skipped until GMAIL_USER /
 * GMAIL_APP_PASSWORD are set — order creation, payment verification, and shipping all
 * work without it; email is a bonus.
 */
export function getEmailTransporter(): Transporter | null {
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
 * Gmail's SMTP relay only allows sending as the authenticated address itself (it blocks
 * spoofed From addresses) — so only the display name is customizable, never the email.
 */
export function getEmailFrom(): string {
  const displayName = process.env.GMAIL_FROM_NAME || "Custom Drip Chennai";
  return `${displayName} <${process.env.GMAIL_USER}>`;
}
