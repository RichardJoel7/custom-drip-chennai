import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Cashfree Payment Gateway over plain HTTPS — no SDK needed on the server.
// Docs: https://www.cashfree.com/docs/api-reference/payments/latest/orders/create
const API_VERSION = "2025-01-01";

export type CashfreeMode = "sandbox" | "production";

export interface CashfreeConfig {
  appId: string;
  secretKey: string;
  mode: CashfreeMode;
  baseUrl: string;
}

/**
 * Null until CASHFREE_APP_ID and CASHFREE_SECRET_KEY are set — the checkout then falls back to
 * the manual UPI flow. CASHFREE_ENV=production uses live money; anything else is Test mode.
 */
export function cashfreeConfig(): CashfreeConfig | null {
  const appId = process.env.CASHFREE_APP_ID?.trim();
  const secretKey = process.env.CASHFREE_SECRET_KEY?.trim();
  if (!appId || !secretKey) return null;
  const mode: CashfreeMode = process.env.CASHFREE_ENV?.trim() === "production" ? "production" : "sandbox";
  const baseUrl =
    // only for pointing local tests at a stand-in server
    process.env.CASHFREE_API_URL?.trim() ||
    (mode === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg");
  return { appId, secretKey, mode, baseUrl };
}

export class CashfreeError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function call<T>(config: CashfreeConfig, path: string, init: { method?: string; body?: unknown; idempotencyKey?: string } = {}) {
  const response = await fetch(`${config.baseUrl}${path}`, {
    method: init.method ?? "GET",
    headers: {
      "x-api-version": API_VERSION,
      "x-client-id": config.appId,
      "x-client-secret": config.secretKey,
      "content-type": "application/json",
      accept: "application/json",
      ...(init.idempotencyKey ? { "x-idempotency-key": init.idempotencyKey } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    let message = text.slice(0, 300);
    try {
      message = (JSON.parse(text) as { message?: string }).message ?? message;
    } catch {
      // not JSON — keep the raw text
    }
    throw new CashfreeError(`Cashfree ${init.method ?? "GET"} ${path} failed (${response.status}): ${message}`, response.status);
  }
  return JSON.parse(text) as T;
}

export type CashfreeOrderStatus = "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED" | "TERMINATION_REQUESTED";

export interface CashfreeOrder {
  cf_order_id?: string | number;
  order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: CashfreeOrderStatus;
  payment_session_id?: string;
}

export type CashfreePaymentStatus = "SUCCESS" | "NOT_ATTEMPTED" | "FAILED" | "USER_DROPPED" | "VOID" | "CANCELLED" | "PENDING";

export interface CashfreePayment {
  cf_payment_id: string | number;
  order_id: string;
  payment_status: CashfreePaymentStatus;
  payment_amount: number;
  payment_currency?: string;
  payment_group?: string;
  payment_time?: string;
  bank_reference?: string | null;
  payment_message?: string | null;
}

/** How long a customer has to pay before the order expires and its stock goes back. */
export const PAYMENT_WINDOW_MINUTES = 30;

/** "2026-10-05T16:20:00+05:30" — Cashfree's expiry format, in India time. */
function istTimestamp(date: Date) {
  const ist = new Date(date.getTime() + 330 * 60_000);
  return `${ist.toISOString().slice(0, 19)}+05:30`;
}

export interface NewCashfreeOrder {
  orderId: string;
  amount: number;
  customer: { id: string; name: string; email: string; phone: string };
  returnUrl: string;
  notifyUrl: string | null;
  note: string;
  /** Sent as the idempotency key, so a retried request can't create a second order. */
  idempotencyKey: string;
}

export function createCashfreeOrder(config: CashfreeConfig, order: NewCashfreeOrder) {
  return call<CashfreeOrder>(config, "/orders", {
    method: "POST",
    idempotencyKey: order.idempotencyKey,
    body: {
      order_id: order.orderId,
      order_amount: Math.round(order.amount * 100) / 100,
      order_currency: "INR",
      customer_details: {
        customer_id: order.customer.id,
        customer_name: order.customer.name.slice(0, 100),
        customer_email: order.customer.email,
        customer_phone: order.customer.phone,
      },
      order_meta: {
        return_url: order.returnUrl,
        ...(order.notifyUrl ? { notify_url: order.notifyUrl } : {}),
      },
      order_expiry_time: istTimestamp(new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60_000)),
      order_note: order.note.slice(0, 200),
    },
  });
}

export function getCashfreeOrder(config: CashfreeConfig, orderId: string) {
  return call<CashfreeOrder>(config, `/orders/${encodeURIComponent(orderId)}`);
}

export function getCashfreePayments(config: CashfreeConfig, orderId: string) {
  return call<CashfreePayment[]>(config, `/orders/${encodeURIComponent(orderId)}/payments`);
}

/**
 * Whether a webhook really came from Cashfree: they sign "timestamp + raw body" with our
 * secret key (HMAC-SHA256, base64). Must be checked against the body exactly as received.
 */
export function isValidWebhookSignature(config: CashfreeConfig, rawBody: string, timestamp: string, signature: string) {
  const expected = createHmac("sha256", config.secretKey).update(timestamp + rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
