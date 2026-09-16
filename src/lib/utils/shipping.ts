import type { Settings } from "@/types";

export function calculateShipping(subtotal: number, settings: Settings): number {
  if (subtotal >= settings.free_shipping_threshold) return 0;
  return settings.standard_shipping_fee;
}
