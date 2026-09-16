import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus, OrderWithItems, PaymentStatus } from "@/types";

const ORDER_SELECT = `*, order_items ( * )`;

/** Admin-only: relies on RLS (is_admin()) via the session-bound server client. */
export async function getOrdersForAdmin(): Promise<OrderWithItems[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as OrderWithItems[];
}

/** Admin-only: relies on RLS (is_admin()) via the session-bound server client. */
export async function getOrderByIdForAdmin(id: string): Promise<OrderWithItems | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as OrderWithItems;
}

/**
 * Guest-facing order tracking. Orders have no public RLS SELECT policy (customer PII must
 * stay locked down), so this deliberately uses the service-role client — the caller has
 * already proven ownership by possessing the unguessable tracking_token from their order
 * confirmation, which stands in for authentication here.
 */
export async function getOrderByTrackingToken(token: string): Promise<OrderWithItems | null> {
  if (!token || token.length < 10) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("tracking_token", token)
    .maybeSingle();

  if (error || !data) return null;
  return data as OrderWithItems;
}

export async function updateOrderStatus(
  orderId: string,
  updates: Partial<{
    order_status: OrderStatus;
    payment_status: PaymentStatus;
    courier_name: string | null;
    courier_tracking_number: string | null;
  }>
) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
  return { error };
}
