"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { sendOrderShippedEmail, sendPaymentConfirmedEmail } from "@/services/notifications";
import { syncOnlinePayment } from "@/services/payments";
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

/** Asks Cashfree again about an online order (in case its webhook went missing). */
export async function recheckOnlinePayment(orderId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const result = await syncOnlinePayment(orderId);
  if (!result) return { error: "This order wasn't paid online." };
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
  trackingNumber: string,
  packageWeightG: number | null = null
): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();
  if (packageWeightG !== null && (!Number.isInteger(packageWeightG) || packageWeightG < 1 || packageWeightG > 50000)) {
    return { error: "Enter the weight in grams, e.g. 250." };
  }

  const shipment = {
    courier_name: courierName.trim() || null,
    courier_tracking_number: trackingNumber.trim() || null,
    order_status: "shipped" as const,
  };

  // The label's ship date: the first time it's marked shipped (re-saving a correction keeps it).
  const { data: existing, error: noLabelColumns } = await supabase
    .from("orders")
    .select("shipped_at")
    .eq("id", orderId)
    .maybeSingle();

  const { data: order, error } = await supabase
    .from("orders")
    .update(
      noLabelColumns
        ? shipment // 0017_shipping_labels.sql not run yet: no ship date or weight to keep
        : { ...shipment, shipped_at: existing?.shipped_at ?? new Date().toISOString(), package_weight_g: packageWeightG }
    )
    .eq("id", orderId)
    .select(NOTIFIABLE_ORDER_FIELDS)
    .single();

  if (error) return { error: GENERIC_ERROR };

  await sendOrderShippedEmail(order);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/shipping");
  return {};
}
