import { describePrints, gsmLabel } from "@/lib/custom/pricing";
import type { CustomItemDetails, OrderItem, PlacementSnapshot } from "@/types";

export function customDetailsOf(item: OrderItem): CustomItemDetails | null {
  return item.is_custom && item.custom_details ? item.custom_details : null;
}

/** An order line's prints; orders from before 0012 had one print size and a front/back design. */
export function placementsOf(details: CustomItemDetails): PlacementSnapshot[] {
  if (details.placements) return details.placements;
  const option = details.print_option;
  if (!option) return [];
  const legacy: PlacementSnapshot[] = [];
  if (details.sides !== "back") legacy.push({ side: "front", print_option: option, design: details.front_design ?? null, transform: null });
  if (details.sides !== "front") legacy.push({ side: "back", print_option: option, design: details.back_design ?? null, transform: null });
  return legacy;
}

/** "Black / L · 240 GSM · Front: Chest Print + Brand Logo · Back: A3 Print" for custom tees, "Black / L" for products. */
export function orderItemVariantLabel(item: OrderItem) {
  const details = customDetailsOf(item);
  const base = `${item.color} / ${item.size}`;
  if (!details) return base;
  const prints = describePrints(placementsOf(details).map((p) => ({ side: p.side, name: p.print_option.name })));
  return [base, details.gsm && gsmLabel(details.gsm.gsm), prints].filter(Boolean).join(" · ");
}
