import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CashfreeError,
  PAYMENT_WINDOW_MINUTES,
  cashfreeConfig,
  createCashfreeOrder,
  getCashfreeOrder,
  getCashfreePayments,
  type CashfreePaymentStatus,
} from "@/lib/payments/cashfree";
import { sendPaymentConfirmedEmail } from "@/services/notifications";

const NOTIFIABLE_FIELDS = "order_number, email, full_name, total, tracking_token, courier_name, courier_tracking_number";

/** Where an online payment stands, as far as the customer is concerned. */
export type OnlinePaymentState =
  /** `method` is how it was paid, as Cashfree names it (upi, credit_card…). */
  | { state: "paid"; method: string | null }
  | { state: "failed" }
  /** Still payable. `lastAttempt` is how the latest try ended, if there was one. */
  | { state: "awaiting"; lastAttempt: CashfreePaymentStatus | null; sessionId: string | null };

interface PaymentRow {
  id: string;
  order_number: string;
  total: number;
  payment_method?: string;
  payment_status: string;
  gateway_order_id: string | null;
  gateway_session_id: string | null;
  gateway_payment_method: string | null;
  created_at: string;
}

const PAYMENT_ROW =
  "id, order_number, total, payment_method, payment_status, gateway_order_id, gateway_session_id, gateway_payment_method, created_at";

/** Cashfree's id for one of our orders: readable, and unique across live, staging and local databases. */
function gatewayOrderIdFor(order: { id: string; order_number: string }) {
  return `${order.order_number}_${order.id.replace(/-/g, "").slice(0, 8)}`;
}

/**
 * Opens a Cashfree payment for an order place_order() just created (awaiting payment) and
 * returns the session the browser pays with. If Cashfree can't be reached, the order is
 * cancelled straight away so its stock isn't held.
 */
export async function startOnlinePayment(input: {
  orderId: string;
  customer: { userId: string; name: string; email: string; phone: string };
  /** The site the customer is on (live, staging or local), so they come back to the same one. */
  origin: string;
  /** Bought with Buy Now: the page they come back to then leaves the cart alone. */
  buyNow?: boolean;
}): Promise<{ sessionId: string; mode: "sandbox" | "production" } | null> {
  const config = cashfreeConfig();
  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select(`${PAYMENT_ROW}, tracking_token`)
    .eq("id", input.orderId)
    .single();
  if (!config || !order) return null;

  const gatewayOrderId = gatewayOrderIdFor(order);
  const returnUrl = `${input.origin}/order-success/${encodeURIComponent(order.order_number)}?t=${order.tracking_token}${
    input.buyNow ? "&from=buy-now" : ""
  }`;
  // Cashfree can only call back a public https address (not localhost).
  const notifyUrl = input.origin.startsWith("https://") ? `${input.origin}/api/payments/cashfree/webhook` : null;

  try {
    const created = await createCashfreeOrder(config, {
      orderId: gatewayOrderId,
      amount: Number(order.total),
      customer: {
        id: input.customer.userId.replace(/-/g, ""),
        name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
      },
      returnUrl,
      notifyUrl,
      note: `Custom Drip Chennai order ${order.order_number}`,
      idempotencyKey: order.id,
    });
    if (!created.payment_session_id) throw new Error("Cashfree returned no payment session");

    await supabase
      .from("orders")
      .update({ gateway_order_id: gatewayOrderId, gateway_session_id: created.payment_session_id })
      .eq("id", order.id);
    return { sessionId: created.payment_session_id, mode: config.mode };
  } catch (error) {
    console.error("starting the Cashfree payment failed:", error);
    await supabase.rpc("cancel_unpaid_order", { p_order_id: order.id });
    return null;
  }
}

/**
 * Brings one online order up to date with Cashfree: marks it paid (and emails the customer)
 * once Cashfree reports a successful payment of the full amount, or cancels it once Cashfree
 * says it expired. Safe to call any number of times, from anywhere — the return page, the
 * webhook, the admin. Never trusts anything but Cashfree's own API.
 */
export async function syncOnlinePayment(orderId: string): Promise<OnlinePaymentState | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("orders").select(PAYMENT_ROW).eq("id", orderId).maybeSingle();
  const order = data as PaymentRow | null;
  if (!order || order.payment_method !== "cashfree") return null;
  if (order.payment_status === "paid") return { state: "paid", method: order.gateway_payment_method };
  if (order.payment_status !== "awaiting_payment") return { state: "failed" };

  const config = cashfreeConfig();
  if (!config) return { state: "awaiting", lastAttempt: null, sessionId: null };

  if (!order.gateway_order_id) {
    // the payment never started (Cashfree was down mid-checkout); give up once it's had time
    if (Date.now() - new Date(order.created_at).getTime() > (PAYMENT_WINDOW_MINUTES + 5) * 60_000) {
      await supabase.rpc("cancel_unpaid_order", { p_order_id: order.id });
      return { state: "failed" };
    }
    return { state: "awaiting", lastAttempt: null, sessionId: null };
  }

  let cfOrder;
  try {
    cfOrder = await getCashfreeOrder(config, order.gateway_order_id);
  } catch (error) {
    console.error("checking the Cashfree order failed:", error);
    if (error instanceof CashfreeError && error.status === 404) {
      await supabase.rpc("cancel_unpaid_order", { p_order_id: order.id });
      return { state: "failed" };
    }
    return { state: "awaiting", lastAttempt: null, sessionId: order.gateway_session_id };
  }

  if (cfOrder.order_status === "EXPIRED" || cfOrder.order_status === "TERMINATED") {
    await supabase.rpc("cancel_unpaid_order", { p_order_id: order.id });
    return { state: "failed" };
  }

  const payments = await getCashfreePayments(config, order.gateway_order_id).catch((error) => {
    console.error("listing the Cashfree payments failed:", error);
    return [];
  });
  const success = payments.find((p) => p.payment_status === "SUCCESS");

  if (cfOrder.order_status === "PAID" && success) {
    const expected = Number(order.total);
    if (Math.abs(Number(cfOrder.order_amount) - expected) > 0.005 || Math.abs(Number(success.payment_amount) - expected) > 0.005) {
      // never happens unless something's very wrong — leave it for the team to look at
      console.error(`Cashfree amount mismatch on ${order.order_number}: paid ${success.payment_amount}, order ${expected}`);
      return { state: "awaiting", lastAttempt: "PENDING", sessionId: null };
    }

    // Only the first caller to get here moves the order on, so the email goes out once.
    const { data: updated } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        order_status: "payment_confirmed",
        paid_at: success.payment_time ?? new Date().toISOString(),
        gateway_payment_id: String(success.cf_payment_id),
        gateway_payment_method: success.payment_group ?? null,
        gateway_bank_reference: success.bank_reference ?? null,
      })
      .eq("id", order.id)
      .eq("payment_status", "awaiting_payment")
      .select(NOTIFIABLE_FIELDS);
    if (updated?.[0]) await sendPaymentConfirmedEmail(updated[0]);
    return { state: "paid", method: success.payment_group ?? null };
  }

  const latest = [...payments].sort((a, b) => (b.payment_time ?? "").localeCompare(a.payment_time ?? ""))[0];
  return { state: "awaiting", lastAttempt: latest?.payment_status ?? null, sessionId: order.gateway_session_id };
}

/** Looks up the order a Cashfree webhook is about, then syncs it. */
export async function syncByGatewayOrderId(gatewayOrderId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("orders").select("id").eq("gateway_order_id", gatewayOrderId).maybeSingle();
  if (data) await syncOnlinePayment(data.id);
}

/**
 * Settles online orders left unpaid past the payment window: paid ones are confirmed (a missed
 * webhook), the rest cancelled with their stock put back. Runs on its own from the checkout and
 * the admin pages, a few orders at a time, so nothing needs scheduling.
 */
export async function settleStaleOnlinePayments(limit = 5) {
  if (!cashfreeConfig()) return;
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - (PAYMENT_WINDOW_MINUTES + 5) * 60_000).toISOString();
  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("payment_status", "awaiting_payment")
    .lt("created_at", cutoff)
    .order("created_at")
    .limit(limit);
  if (error || !data) return; // e.g. 0018 not run yet
  for (const row of data) {
    await syncOnlinePayment(row.id).catch((e) => console.error("settling an unpaid order failed:", e));
  }
}
