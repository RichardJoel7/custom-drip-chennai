import { ProductCard } from "@/components/products/product-card";
import type { ProductWithDetails } from "@/types";

export function ProductGrid({ products }: { products: ProductWithDetails[] }) {
  if (products.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        No products available right now. Check back soon.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
