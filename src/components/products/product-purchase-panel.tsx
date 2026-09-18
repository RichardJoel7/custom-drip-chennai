"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-context";
import { useIsFavorited, useToggleFavorite } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils/cn";
import { getColorSwatch } from "@/lib/utils/color-swatch";
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
  const [justShared, setJustShared] = useState(false);

  const { addItem } = useCart();
  const router = useRouter();
  const isFavorited = useIsFavorited(product.id);
  const toggleFavorite = useToggleFavorite(product.id);

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
      } catch {
        // user cancelled the native share sheet — nothing to do
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setJustShared(true);
      setTimeout(() => setJustShared(false), 1800);
    } catch {
      // clipboard unavailable — silently ignore, sharing is a nice-to-have
    }
  }

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
      <div className="flex items-start justify-between gap-4">
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

        <div className="flex flex-none items-center gap-2">
          <button
            type="button"
            aria-label={isFavorited ? "Remove from favourites" : "Add to favourites"}
            aria-pressed={isFavorited}
            onClick={toggleFavorite}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:border-foreground"
          >
            <HeartIcon filled={isFavorited} />
          </button>
          <button
            type="button"
            aria-label="Share this product"
            onClick={handleShare}
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:border-foreground"
          >
            <ShareIcon />
            {justShared && (
              <span className="absolute -bottom-8 right-0 whitespace-nowrap rounded-full bg-foreground px-2.5 py-1 text-xs font-semibold text-background">
                Link copied
              </span>
            )}
          </button>
        </div>
      </div>

      {product.description && (
        <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
      )}

      {colors.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide">Colour: {color}</p>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((c) => {
              const hex = getColorSwatch(c);
              if (hex) {
                return (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    aria-label={c}
                    aria-pressed={c === color}
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-9 w-9 rounded-full border transition-all",
                      c === color
                        ? "border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-background"
                        : "border-border hover:border-foreground"
                    )}
                    style={{ backgroundColor: hex }}
                  />
                );
              }
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-10 min-w-16 rounded-full border px-3 text-sm font-medium transition-colors ${
                    c === color
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:border-foreground"
                  }`}
                >
                  {c}
                </button>
              );
            })}
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
                  className={`h-10 min-w-12 rounded-full border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
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
          <div className="flex h-12 w-32 items-center rounded-full border border-border">
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

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} aria-hidden="true">
      <path
        d="M12 20.5s-7.5-4.6-10-9.3C.5 8 2 4.5 5.5 4c2-.3 3.7.6 5 2.4a1 1 0 0 0 1 0c1.3-1.8 3-2.7 5-2.4 3.5.5 5 4 3.5 7.2-2.5 4.7-10 9.3-10 9.3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="18" cy="5" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18" cy="19" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.1 10.8 15.9 6.2M8.1 13.2l7.8 4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
