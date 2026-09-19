import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProductGrid } from "@/components/products/product-grid";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWishlistProducts } from "@/services/wishlist";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default async function WishlistPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/wishlist");

  const products = await getWishlistProducts(user.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-display text-4xl tracking-wide sm:text-5xl">MY WISHLIST</h1>
      <p className="mt-2 text-muted-foreground">
        {products.length} saved tee{products.length === 1 ? "" : "s"}
      </p>
      <div className="mt-8">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
