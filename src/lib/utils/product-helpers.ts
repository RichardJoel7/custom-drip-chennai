// Pure, client-safe helpers for working with a product's variants.
// Kept separate from services/products.ts (which imports the server-only Supabase client)
// so client components can use these without pulling server-only code into the browser bundle.
import type { ProductWithDetails } from "@/types";

export const COMMON_SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export const COMMON_COLORS = ["Black", "White", "Beige", "Brown", "Navy", "Maroon"] as const;

export function stockForVariant(
  product: ProductWithDetails,
  size: string,
  color: string
): number {
  const variant = product.product_variants.find((v) => v.size === size && v.color === color);
  return variant?.stock_quantity ?? 0;
}

export function availableColorsForProduct(product: ProductWithDetails): string[] {
  return Array.from(new Set(product.product_variants.map((v) => v.color)));
}

export function availableSizesForProduct(product: ProductWithDetails): string[] {
  const order = COMMON_SIZES as readonly string[];
  const sizes = Array.from(new Set(product.product_variants.map((v) => v.size)));
  return sizes.sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function isProductInStock(product: ProductWithDetails): boolean {
  return product.product_variants.some((v) => v.stock_quantity > 0);
}
