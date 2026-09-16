import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { formatPrice } from "@/lib/utils/format";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getAllProductsForAdmin } from "@/services/products";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await getAllProductsForAdmin();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wide">PRODUCTS</h1>
        <Link
          href="/admin/products/new"
          className="inline-flex h-11 items-center bg-foreground px-4 text-sm font-semibold uppercase tracking-wide text-background"
        >
          + Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          No products yet. Click &quot;Add Product&quot; to create your first T-shirt.
        </p>
      ) : (
        <div className="mt-6 divide-y divide-border border-t border-border">
          {products.map((product) => {
            const mainImage =
              product.product_images.find((i) => i.is_main) ?? product.product_images[0];
            const totalStock = product.product_variants.reduce(
              (sum, v) => sum + v.stock_quantity,
              0
            );

            return (
              <div key={product.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-3">
                  <div className="relative h-16 w-14 flex-none bg-muted">
                    {mainImage && (
                      <Image src={mainImage.image_url} alt="" fill sizes="56px" className="object-cover" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{formatPrice(product.price)}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge tone={product.is_active ? "success" : "neutral"}>
                        {product.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge tone={totalStock > 0 ? "neutral" : "danger"}>
                        {totalStock > 0 ? `${totalStock} in stock` : "Sold out"}
                      </Badge>
                      {product.is_featured && <Badge tone="accent">Featured</Badge>}
                      {product.is_demo && <Badge tone="warning">Demo</Badge>}
                    </div>
                  </div>
                </div>

                <ProductRowActions productId={product.id} isActive={product.is_active} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
