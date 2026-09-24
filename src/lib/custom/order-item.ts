import { SIDE_LABELS } from "@/lib/custom/pricing";
import type { CustomItemDetails, OrderItem } from "@/types";

export function customDetailsOf(item: OrderItem): CustomItemDetails | null {
  return item.is_custom && item.custom_details ? item.custom_details : null;
}

/** "Black / L · A4 Print · Front & back" for custom tees, "Black / L" for products. */
export function orderItemVariantLabel(item: OrderItem) {
  const details = customDetailsOf(item);
  const base = `${item.color} / ${item.size}`;
  return details ? `${base} · ${details.print_option.name} · ${SIDE_LABELS[details.sides]}` : base;
}
