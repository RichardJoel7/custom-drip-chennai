import type { ProductWithDetails } from "@/types";

const inStock = (product: ProductWithDetails) => product.product_variants.some((v) => v.stock_quantity > 0);

/**
 * "You may like" picks for a cart or an order (`basisIds` = the products in it).
 * When everything in it is from one collection (e.g. "THALA T-SHIRT"), other in-stock tees from
 * that collection come first; with no collections, the same gender's. Mixed (or custom-only)
 * baskets, and any space left over, get featured tees, then the newest. Never repeats an item
 * already in the basket. `products` is newest first, as the shop lists them.
 */
export function recommendProducts(products: ProductWithDetails[], basisIds: string[], limit: number) {
  const basis = new Set(basisIds);
  const chosen = products.filter((p) => basis.has(p.id));
  const collections = new Set(chosen.flatMap((p) => p.collections ?? []));
  const genders = new Set(chosen.map((p) => p.gender).filter(Boolean));
  const candidates = products.filter((p) => !basis.has(p.id) && inStock(p));

  const picks: ProductWithDetails[] = [];
  const add = (list: ProductWithDetails[]) => {
    for (const product of list) {
      if (picks.length >= limit) return;
      if (!picks.includes(product)) picks.push(product);
    }
  };

  if (collections.size === 1) {
    const [collection] = collections;
    add(candidates.filter((p) => p.collections?.includes(collection)));
  } else if (collections.size === 0 && genders.size === 1) {
    const [gender] = genders;
    add(candidates.filter((p) => p.gender === gender));
  }
  add(candidates.filter((p) => p.is_featured));
  add(candidates);
  return picks;
}
