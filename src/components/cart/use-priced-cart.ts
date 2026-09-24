"use client";

import { useMemo } from "react";
import { useCart } from "@/components/cart/cart-context";
import { currentUnitPrice } from "@/lib/custom/pricing";
import type { CustomCatalog } from "@/types";

export function usePricedCart(catalog: CustomCatalog | null) {
  const { items, isHydrated } = useCart();

  return useMemo(() => {
    const lines = items.map((item) => ({ item, unitPrice: currentUnitPrice(item, catalog) }));
    const subtotal = lines.reduce((sum, line) => sum + (line.unitPrice ?? 0) * line.item.quantity, 0);
    const hasUnavailable = lines.some((line) => line.unitPrice === null);
    return { items, lines, subtotal, hasUnavailable, isHydrated };
  }, [items, catalog, isHydrated]);
}
