"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { sendOrderShippedEmail, sendPaymentConfirmedEmail } from "@/services/notifications";
import type { OrderStatus } from "@/types";

const GENERIC_ERROR = "Something went wrong. Please try again.";

const NOTIFIABLE_ORDER_FIELDS =
  "order_number, email, full_name, total, tracking_token, courier_name, courier_tracking_number";

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("orders").update({ order_status: status }).eq("id", orderId);

  if (error) return { error: GENERIC_ERROR };

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/print-queue");
  return {};
}

export async function confirmPayment(orderId: string): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();

  const { data: existing } = await supabase
    .from("orders")
    .select("order_status")
    .eq("id", orderId)
    .maybeSingle();

  // Only advance a brand-new order to "payment confirmed" — never downgrade an order that's
  // already further along (e.g. an admin re-confirming after a correction).
  const nextOrderStatus = existing?.order_status === "new" ? "payment_confirmed" : existing?.order_status;

  const { data: order, error } = await supabase
    .from("orders")
    .update({ payment_status: "paid", order_status: nextOrderStatus })
    .eq("id", orderId)
    .select(NOTIFIABLE_ORDER_FIELDS)
    .single();

  if (error) return { error: GENERIC_ERROR };

  await sendPaymentConfirmedEmail(order);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/print-queue");
  return {};
}

export async function rejectPayment(orderId: string): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("orders")
    .update({ payment_status: "rejected" })
    .eq("id", orderId);

  if (error) return { error: GENERIC_ERROR };

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}

export async function updateShipment(
  orderId: string,
  courierName: string,
  trackingNumber: string
): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();
  const { data: order, error } = await supabase
    .from("orders")
    .update({
      courier_name: courierName || null,
      courier_tracking_number: trackingNumber || null,
      order_status: "shipped",
    })
    .eq("id", orderId)
    .select(NOTIFIABLE_ORDER_FIELDS)
    .single();

  if (error) return { error: GENERIC_ERROR };

  await sendOrderShippedEmail(order);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}
