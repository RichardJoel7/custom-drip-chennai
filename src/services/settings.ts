import { catalogCache } from "@/lib/cache";
import { createPublicClient } from "@/lib/supabase/public";
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

// Cached across visitors (lib/cache.ts); a Supabase error throws so it isn't cached.
const readSettings = catalogCache("settings", async () => {
  const { data, error } = await createPublicClient().from("settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return (data as Settings | null) ?? FALLBACK_SETTINGS;
});

export async function getSettings(): Promise<Settings> {
  return readSettings().catch(() => FALLBACK_SETTINGS);
}
