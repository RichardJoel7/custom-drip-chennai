import "server-only";
import { getResendClient, EMAIL_FROM } from "@/lib/email/resend";
import { formatPrice } from "@/lib/utils/format";
import type { Order } from "@/types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function emailShell(heading: string, bodyHtml: string): string {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0a0a0a;">
      <p style="font-weight: 800; letter-spacing: 0.04em; font-size: 18px; margin: 0 0 28px; text-transform: uppercase;">
        Custom Drip Chennai
      </p>
      <h1 style="font-size: 20px; margin: 0 0 16px;">${heading}</h1>
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #6b6b6b;">
        Questions about your order? Message us on Instagram — we reply fastest there.
      </p>
    </div>
  `;
}

function trackButton(trackingToken: string, label = "Track Your Order"): string {
  const url = `${siteUrl}/track/${trackingToken}`;
  return `<p style="margin-top: 24px;">
    <a href="${url}" style="display: inline-block; background: #0a0a0a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; font-size: 13px;">
      ${label}
    </a>
  </p>`;
}

type NotifiableOrder = Pick<
  Order,
  "order_number" | "email" | "full_name" | "total" | "tracking_token" | "courier_name" | "courier_tracking_number"
>;

/**
 * Fire-and-forget by design: a Resend outage or missing API key should never block an admin
 * from confirming a payment or marking an order shipped. Failures are logged, not thrown.
 */
export async function sendPaymentConfirmedEmail(order: NotifiableOrder): Promise<void> {
  const resend = getResendClient();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: order.email,
      subject: `Payment confirmed — Order ${order.order_number}`,
      html: emailShell(
        "Payment Confirmed ✓",
        `
          <p>Hi ${order.full_name},</p>
          <p>We've confirmed your payment of <strong>${formatPrice(order.total)}</strong> for order
          <strong>${order.order_number}</strong>.</p>
          <p>Your tee will be printed and shipped within <strong>3–7 business days</strong>. We'll email you
          again as soon as it ships.</p>
          ${trackButton(order.tracking_token)}
        `
      ),
    });
  } catch (error) {
    console.error("sendPaymentConfirmedEmail failed:", error);
  }
}

export async function sendOrderShippedEmail(order: NotifiableOrder): Promise<void> {
  const resend = getResendClient();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: order.email,
      subject: `Your order has shipped — ${order.order_number}`,
      html: emailShell(
        "Your Order Has Shipped 📦",
        `
          <p>Hi ${order.full_name},</p>
          <p>Order <strong>${order.order_number}</strong> is on its way!</p>
          ${order.courier_name ? `<p>Courier: <strong>${order.courier_name}</strong></p>` : ""}
          ${
            order.courier_tracking_number
              ? `<p>Tracking Number: <strong>${order.courier_tracking_number}</strong></p>`
              : ""
          }
          ${trackButton(order.tracking_token, "Track Your Shipment")}
        `
      ),
    });
  } catch (error) {
    console.error("sendOrderShippedEmail failed:", error);
  }
}
