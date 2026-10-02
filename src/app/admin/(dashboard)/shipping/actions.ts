"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const MAX_LABELS = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ShipFromInput {
  name: string;
  phone: string;
  address: string;
}

export async function saveShipFrom(input: ShipFromInput): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();
  const name = input.name.trim();
  const phone = input.phone.trim();
  // one line per row on the label; blank lines dropped
  const address = input.address
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  if (!name) return { error: "Enter the name to ship from." };
  if (!address) return { error: "Enter the address to ship from." };
  if (name.length > 80 || phone.length > 30 || address.length > 400) return { error: "That's too long for a label." };

  const { error } = await supabase
    .from("shipping_settings")
    .update({ from_name: name, from_phone: phone || null, from_address: address, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { error: GENERIC_ERROR };

  revalidatePath("/admin/shipping");
  return {};
}

/** Remembers that these orders' labels were printed, so they leave the "Ready to print" list. */
export async function markLabelsPrinted(orderIds: string[]): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();
  const ids = orderIds.filter((id) => UUID.test(id)).slice(0, MAX_LABELS);
  if (ids.length === 0) return {};

  const { error } = await supabase
    .from("orders")
    .update({ label_printed_at: new Date().toISOString() })
    .in("id", ids);
  if (error) return { error: GENERIC_ERROR };

  revalidatePath("/admin/shipping");
  return {};
}
