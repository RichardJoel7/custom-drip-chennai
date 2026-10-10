import { ProductCard } from "@/components/products/product-card";
import { recommendProducts } from "@/lib/products/recommend";
import { cn } from "@/lib/utils/cn";
import type { ProductWithDetails } from "@/types";

/** A row of tees to add, picked from what's in the cart or order (see recommendProducts). */
export function YouMayLike({
  products,
  basisProductIds,
  title = "You may also like",
  limit = 8,
  className,
}: {
  products: ProductWithDetails[];
  basisProductIds: string[];
  title?: string;
  limit?: number;
  className?: string;
}) {
  const picks = recommendProducts(products, basisProductIds, limit);
  if (picks.length === 0) return null;

  return (
    <section className={cn("border-t border-border pt-8", className)} aria-labelledby="you-may-like">
      <h2 id="you-may-like" className="font-display text-2xl uppercase tracking-wide">
        {title}
      </h2>
      <div className="no-scrollbar -mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
        {picks.map((product) => (
          <div key={product.id} className="w-[44%] flex-none snap-start sm:w-[30%] lg:w-[23%]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
