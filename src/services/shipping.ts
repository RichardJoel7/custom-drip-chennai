import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OrderWithItems, Settings, ShippingSettings } from "@/types";

const ORDER_SELECT = `*, order_items ( * )`;

/** How many already-printed labels the "Printed" tab keeps around for reprinting. */
const PRINTED_SHOWN = 60;

/** Admin-only (RLS): the ship-from address. `ready` is false until 0017 has been run. */
export async function getShippingSettings(): Promise<{ shipFrom: ShippingSettings; ready: boolean }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("shipping_settings")
    .select("from_name, from_phone, from_address")
    .eq("id", 1)
    .maybeSingle();

  const empty = { from_name: null, from_phone: null, from_address: null };
  if (error) return { shipFrom: empty, ready: false };
  return { shipFrom: (data as ShippingSettings | null) ?? empty, ready: true };
}

/** The store's name and number, printed when no ship-from name or phone has been set. */
export async function getStoreContact(): Promise<Pick<Settings, "store_name" | "contact_number">> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("settings").select("store_name, contact_number").eq("id", 1).maybeSingle();
  return data ?? { store_name: "Custom Drip Chennai", contact_number: null };
}

export interface LabelQueue {
  /** Shipment details saved, label not printed yet. */
  toPrint: OrderWithItems[];
  /** Paid, but no shipment details yet. */
  notShipped: OrderWithItems[];
  /** Labels already printed, newest first. */
  printed: OrderWithItems[];
}

/** Admin-only (RLS): paid orders, sorted into what still needs a label. */
export async function getLabelQueue(): Promise<LabelQueue> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .in("order_status", ["payment_confirmed", "shipped", "delivered"])
    .order("created_at", { ascending: false })
    .limit(500);

  const orders = error || !data ? [] : (data as OrderWithItems[]);
  const newestFirst = (a?: string | null, b?: string | null) => (b ?? "").localeCompare(a ?? "");

  return {
    toPrint: orders
      .filter((o) => o.order_status === "shipped" && !o.label_printed_at)
      .sort((a, b) => newestFirst(a.shipped_at, b.shipped_at)),
    notShipped: orders.filter((o) => o.order_status === "payment_confirmed"),
    printed: orders
      .filter((o) => o.label_printed_at && o.order_status !== "payment_confirmed")
      .sort((a, b) => newestFirst(a.label_printed_at, b.label_printed_at))
      .slice(0, PRINTED_SHOWN),
  };
}

/** Admin-only (RLS): the orders to print labels for, in the order they were asked for. */
export async function getOrdersForLabels(ids: string[]): Promise<OrderWithItems[]> {
  if (ids.length === 0) return [];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("orders").select(ORDER_SELECT).in("id", ids);
  if (error || !data) return [];
  const byId = new Map((data as OrderWithItems[]).map((o) => [o.id, o]));
  return ids.map((id) => byId.get(id)).filter((o): o is OrderWithItems => !!o);
}
