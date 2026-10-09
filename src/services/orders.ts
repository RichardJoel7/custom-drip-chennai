import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order, OrderStatus, OrderWithItems, PaymentStatus } from "@/types";

const ORDER_SELECT = `*, order_items ( * )`;

export const ADMIN_ORDERS_PAGE_SIZE = 50;

export type AdminOrderRow = Pick<
  Order,
  "id" | "order_number" | "full_name" | "created_at" | "total" | "payment_status" | "order_status"
>;

/**
 * Admin-only (RLS is_admin()): one page of orders, newest first, optionally only those whose
 * order number, name, mobile or email contains `search`. Just the list columns, not the items.
 */
export async function getOrdersPageForAdmin(
  page: number,
  search: string
): Promise<{ orders: AdminOrderRow[]; total: number }> {
  const supabase = await createServerSupabaseClient();
  const from = (page - 1) * ADMIN_ORDERS_PAGE_SIZE;
  let query = supabase
    .from("orders")
    .select("id, order_number, full_name, created_at, total, payment_status, order_status", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_ORDERS_PAGE_SIZE - 1);

  // Letters, digits and the few symbols in phone numbers/emails; quoted for PostgREST's or().
  const term = search.replace(/[^\p{L}\p{N}@.+\- ]/gu, "").trim();
  if (term) {
    query = query.or(
      ["order_number", "full_name", "mobile_number", "email"].map((column) => `${column}.ilike."*${term}*"`).join(",")
    );
  }

  const { data, count, error } = await query;
  if (error || !data) return { orders: [], total: count ?? 0 };
  return { orders: data as AdminOrderRow[], total: count ?? 0 };
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

/** A signed-in customer's own orders — relies on RLS (orders_self_select) via the session-bound client. */
export async function getOrdersForCustomer(): Promise<OrderWithItems[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as OrderWithItems[];
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
