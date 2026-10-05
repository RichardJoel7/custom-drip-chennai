import { NextResponse } from "next/server";
import { cashfreeConfig, isValidWebhookSignature } from "@/lib/payments/cashfree";
import { syncByGatewayOrderId } from "@/services/payments";

/**
 * Cashfree calls this when a payment succeeds, fails or is abandoned — so an order is
 * confirmed even if the customer closes the tab before coming back. The payload only says
 * which order to look at: its status is re-read from Cashfree's API, never taken from here.
 */
export async function POST(request: Request) {
  const config = cashfreeConfig();
  if (!config) return NextResponse.json({ error: "Online payments are not set up." }, { status: 503 });

  const rawBody = await request.text();
  const timestamp = request.headers.get("x-webhook-timestamp");
  const signature = request.headers.get("x-webhook-signature");
  if (!timestamp || !signature || !isValidWebhookSignature(config, rawBody, timestamp, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let gatewayOrderId: unknown;
  try {
    gatewayOrderId = (JSON.parse(rawBody) as { data?: { order?: { order_id?: unknown } } }).data?.order?.order_id;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  // Cashfree's dashboard "test webhook" has no order of ours; just acknowledge it.
  if (typeof gatewayOrderId === "string" && gatewayOrderId) {
    try {
      await syncByGatewayOrderId(gatewayOrderId);
    } catch (error) {
      console.error("Cashfree webhook sync failed:", error);
      // a 5xx makes Cashfree retry later
      return NextResponse.json({ error: "Try again." }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
