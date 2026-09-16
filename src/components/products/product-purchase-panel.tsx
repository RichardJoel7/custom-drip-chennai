"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-context";
import { formatPrice } from "@/lib/utils/format";
import {
  availableColorsForProduct,
  availableSizesForProduct,
  stockForVariant,
} from "@/lib/utils/product-helpers";
import type { ProductWithDetails } from "@/types";

export function ProductPurchasePanel({ product }: { product: ProductWithDetails }) {
  const colors = useMemo(() => availableColorsForProduct(product), [product]);
  const sizes = useMemo(() => availableSizesForProduct(product), [product]);

  const [color, setColor] = useState(colors[0] ?? "");
  const [size, setSize] = useState(sizes[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const { addItem } = useCart();
  const router = useRouter();

  const stock = stockForVariant(product, size, color);
  const variant = product.product_variants.find((v) => v.size === size && v.color === color);
  const canOrder = !!variant && stock > 0;

  function buildCartItem() {
    if (!variant) return null;
    const mainImage = product.product_images.find((i) => i.is_main) ?? product.product_images[0];
    return {
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      image: mainImage?.image_url ?? "",
      size,
      color,
      price: product.price,
      quantity,
      maxStock: stock,
    };
  }

  function handleAddToCart() {
    const item = buildCartItem();
    if (!item) return;
    addItem(item);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  }

  function handleBuyNow() {
    const item = buildCartItem();
    if (!item) return;
    addItem(item);
    router.push("/checkout");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide sm:text-4xl">{product.name}</h1>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-xl font-bold">{formatPrice(product.price)}</span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-muted-foreground line-through">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>
      </div>

      {product.description && (
        <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
      )}

      {colors.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide">Colour: {color}</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-10 min-w-16 border px-3 text-sm font-medium transition-colors ${
                  c === color
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:border-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide">Size: {size}</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const sizeStock = stockForVariant(product, s, color);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={sizeStock === 0}
                  onClick={() => setSize(s)}
                  className={`h-10 min-w-12 border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                    s === size
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:border-foreground"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {canOrder ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide">Quantity</p>
          <div className="flex h-12 w-32 items-center border border-border">
            <button
              type="button"
              aria-label="Decrease quantity"
              className="flex h-full w-10 items-center justify-center text-lg"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span className="flex-1 text-center text-sm font-semibold">{quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              className="flex h-full w-10 items-center justify-center text-lg"
              onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
            >
              +
            </button>
          </div>
          {stock <= 5 && <p className="mt-2 text-xs text-danger">Only {stock} left in stock</p>}
        </div>
      ) : (
        <p className="text-sm font-semibold uppercase text-danger">Sold out in this size/colour</p>
      )}

      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button variant="outline" size="lg" disabled={!canOrder} onClick={handleAddToCart}>
          {justAdded ? "Added ✓" : "Add to Cart"}
        </Button>
        <Button variant="primary" size="lg" disabled={!canOrder} onClick={handleBuyNow}>
          Buy Now
        </Button>
      </div>
    </div>
  );
}
