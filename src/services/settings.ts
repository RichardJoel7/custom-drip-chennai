import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Settings } from "@/types";

export { calculateShipping } from "@/lib/utils/shipping";

const FALLBACK_SETTINGS: Settings = {
  id: 1,
  store_name: "Custom Drip Chennai",
  instagram_url: "https://www.instagram.com/custom_drip_chennai/",
  contact_number: null,
  whatsapp_number: null,
  upi_id: null,
  upi_display_name: null,
  upi_qr_image_url: null,
  standard_shipping_fee: 50,
  free_shipping_threshold: 999,
  updated_at: new Date().toISOString(),
};

export async function getSettings(): Promise<Settings> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();

  if (error || !data) return FALLBACK_SETTINGS;
  return data as Settings;
}
