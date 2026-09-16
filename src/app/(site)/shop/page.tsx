import type { Metadata } from "next";
import { ProductGrid } from "@/components/products/product-grid";
import { getActiveProducts } from "@/services/products";

export const metadata: Metadata = {
  title: "Shop",
  description: "Shop original graphic T-shirts from Custom Drip Chennai.",
};

export const revalidate = 60;

export default async function ShopPage() {
  const products = await getActiveProducts();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-display text-4xl tracking-wide sm:text-5xl">SHOP</h1>
      <p className="mt-2 text-muted-foreground">{products.length} tees in stock</p>
      <div className="mt-8">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
