import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils/format";
import {
  availableColorsForProduct,
  availableSizesForProduct,
  isProductInStock,
} from "@/lib/utils/product-helpers";
import type { ProductWithDetails } from "@/types";

export function ProductCard({ product }: { product: ProductWithDetails }) {
  const mainImage =
    product.product_images.find((i) => i.is_main) ?? product.product_images[0];
  const colors = availableColorsForProduct(product);
  const sizes = availableSizesForProduct(product);
  const inStock = isProductInStock(product);

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        {mainImage ? (
          <Image
            src={mainImage.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image yet
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-col gap-1.5">
          {product.compare_at_price && product.compare_at_price > product.price && (
            <Badge tone="accent">Sale</Badge>
          )}
          {!inStock && <Badge tone="danger">Sold Out</Badge>}
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="text-sm font-semibold sm:text-base">{product.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold sm:text-base">{formatPrice(product.price)}</span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>
        {(colors.length > 0 || sizes.length > 0) && (
          <p className="text-xs text-muted-foreground">
            {colors.length > 0 && colors.join(" / ")}
            {colors.length > 0 && sizes.length > 0 && " · "}
            {sizes.length > 0 && sizes.join(", ")}
          </p>
        )}
      </div>
    </Link>
  );
}
