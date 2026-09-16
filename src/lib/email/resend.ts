import "server-only";
import { Resend } from "resend";

let cachedClient: Resend | null = null;

/**
 * Returns null (rather than throwing) when RESEND_API_KEY isn't configured, so that emails
 * are simply skipped — not a hard failure — until the store owner sets up Resend. Order
 * confirmation, payment verification, and shipping all work without it; email is a bonus.
 */
export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) cachedClient = new Resend(apiKey);
  return cachedClient;
}

// Resend's shared onboarding@resend.dev sender works immediately with no domain setup, but
// has low sending limits and looks unbranded — verify your own domain in Resend and set
// RESEND_FROM_EMAIL once you're ready to send real customer emails.
export const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || "Custom Drip Chennai <onboarding@resend.dev>";
