"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { recommendProducts } from "@/lib/products/recommend";
import { cn } from "@/lib/utils/cn";
import { getColorSwatch } from "@/lib/utils/color-swatch";
import { formatPrice } from "@/lib/utils/format";
import { availableColorsForProduct, availableSizesForProduct, stockForVariant } from "@/lib/utils/product-helpers";
import type { ProductWithDetails } from "@/types";

const MAX_QUICK_QUANTITY = 10;

/**
 * Suggestions customers can add without leaving the page: "+ Add" opens colour, size and
 * quantity right on the card. The picture and name still open the product page. While the cart
 * is short of free shipping, the heading says by how much and tees that would get it there are
 * marked.
 */
export function QuickAddRow({
  products,
  basisProductIds,
  freeShippingShortfall,
  title = "You may also like",
  limit = 8,
  className,
}: {
  products: ProductWithDetails[];
  basisProductIds: string[];
  /** ₹ still needed for free shipping, or 0/null when there's nothing to reach. */
  freeShippingShortfall?: number | null;
  title?: string;
  limit?: number;
  className?: string;
}) {
  const { addItem } = useCart();
  // Tees added from this row stay on it (marked as added) instead of jumping away.
  const [added, setAdded] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  const picks = recommendProducts(
    products,
    basisProductIds.filter((id) => !added[id]),
    limit
  );
  if (picks.length === 0) return null;

  const shortfall = freeShippingShortfall && freeShippingShortfall > 0 ? freeShippingShortfall : 0;

  function add(product: ProductWithDetails, color: string, size: string, quantity: number) {
    const variant = product.product_variants.find((v) => v.size === size && v.color === color);
    if (!variant) return;
    const mainImage = product.product_images.find((i) => i.is_main) ?? product.product_images[0];
    addItem({
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      image: mainImage?.image_url ?? "",
      size,
      color,
      price: product.price,
      quantity,
      maxStock: variant.stock_quantity,
    });
    const colours = availableColorsForProduct(product);
    setAdded((a) => ({ ...a, [product.id]: `${colours.length > 1 ? `${color} · ` : ""}${size} × ${quantity}` }));
    setOpenId(null);
  }

  return (
    <section className={cn("rounded-2xl bg-muted p-4 sm:p-5", className)} aria-labelledby="quick-add-title">
      <h2 id="quick-add-title" className="font-display text-lg uppercase leading-tight tracking-wide sm:text-xl">
        {shortfall > 0 ? `Add ${formatPrice(shortfall)} more for free shipping` : title}
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">Tap + Add to pick your colour and size right here.</p>

      <div className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5">
        {picks.map((product) => {
          const image = product.product_images.find((i) => i.is_main) ?? product.product_images[0];
          const addedAs = added[product.id];
          const unlocks = shortfall > 0 && product.price >= shortfall;

          return (
            <article key={product.id} className="flex w-44 flex-none snap-start flex-col rounded-xl bg-background p-2 sm:w-48">
              <Link
                href={`/product/${product.slug}`}
                prefetch={false}
                className="relative block aspect-[4/5] overflow-hidden rounded-lg bg-muted"
                aria-label={`${product.name} — see details`}
              >
                {image && <Image src={image.image_url} alt={product.name} fill sizes="192px" className="object-cover" />}
                {unlocks && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase leading-tight text-accent-foreground">
                    Gets free shipping
                  </span>
                )}
              </Link>
              <Link href={`/product/${product.slug}`} prefetch={false} className="mt-2 truncate text-sm font-semibold" title={product.name}>
                {product.name}
              </Link>
              <p className="text-sm">
                <span className="font-semibold">{formatPrice(product.price)}</span>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className="ml-1.5 text-xs text-muted-foreground line-through">{formatPrice(product.compare_at_price)}</span>
                )}
              </p>

              <div className="mt-auto pt-2">
                {addedAs ? (
                  <p className="rounded-full bg-success/10 px-2 py-2 text-center text-xs font-semibold text-success">
                    ✓ Added · {addedAs}
                  </p>
                ) : openId === product.id ? (
                  <QuickAddPicker
                    product={product}
                    onAdd={(color, size, quantity) => add(product, color, size, quantity)}
                    onCancel={() => setOpenId(null)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setOpenId(product.id)}
                    className="h-9 w-full rounded-full bg-foreground text-xs font-semibold uppercase tracking-wide text-background"
                  >
                    + Add
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** Colour (when there's a choice), size and quantity, then Add to cart — all on the card. */
function QuickAddPicker({
  product,
  onAdd,
  onCancel,
}: {
  product: ProductWithDetails;
  onAdd: (color: string, size: string, quantity: number) => void;
  onCancel: () => void;
}) {
  const colors = availableColorsForProduct(product);
  const sizes = availableSizesForProduct(product);
  const hasStock = (c: string) => sizes.some((s) => stockForVariant(product, s, c) > 0);
  const [color, setColor] = useState(() => colors.find(hasStock) ?? colors[0] ?? "");
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const stock = size ? stockForVariant(product, size, color) : 0;
  const maxQuantity = Math.max(1, Math.min(stock, MAX_QUICK_QUANTITY));

  function chooseColor(next: string) {
    setColor(next);
    // keep the size only if it's in stock in the new colour too
    if (size && stockForVariant(product, size, next) === 0) setSize(null);
    setQuantity(1);
  }

  return (
    <div className="space-y-2.5">
      {colors.length > 1 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide">Colour: {color}</p>
          <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Colour">
            {colors.map((c) => {
              const hex = getColorSwatch(c);
              const selected = c === color;
              return hex ? (
                <button
                  key={c}
                  type="button"
                  title={c}
                  aria-label={c}
                  aria-pressed={selected}
                  disabled={!hasStock(c)}
                  onClick={() => chooseColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full border disabled:opacity-30",
                    selected ? "border-foreground ring-2 ring-foreground ring-offset-1 ring-offset-background" : "border-border"
                  )}
                  style={{ backgroundColor: hex }}
                />
              ) : (
                <button
                  key={c}
                  type="button"
                  aria-pressed={selected}
                  disabled={!hasStock(c)}
                  onClick={() => chooseColor(c)}
                  className={cn(
                    "h-7 rounded-full border px-2 text-[11px] font-semibold disabled:opacity-30",
                    selected ? "border-foreground bg-foreground text-background" : "border-border"
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide">Size{size ? `: ${size}` : ""}</p>
        <div className="mt-1 flex flex-wrap gap-1" role="group" aria-label="Size">
          {sizes.map((s) => {
            const inStock = stockForVariant(product, s, color) > 0;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={s === size}
                disabled={!inStock}
                onClick={() => {
                  setSize(s);
                  setQuantity(1);
                }}
                className={cn(
                  "h-8 min-w-8 rounded-full border px-2 text-xs font-semibold disabled:border-border disabled:text-muted-foreground disabled:line-through",
                  s === size ? "border-foreground bg-foreground text-background" : "border-foreground"
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide">Qty</p>
        <div className="flex items-center rounded-full border border-border">
          <button
            type="button"
            aria-label="One fewer"
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-8 w-8 items-center justify-center text-base disabled:opacity-30"
          >
            −
          </button>
          <span className="w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="One more"
            disabled={!size || quantity >= maxQuantity}
            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
            className="flex h-8 w-8 items-center justify-center text-base disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={!size}
        onClick={() => size && onAdd(color, size, quantity)}
        className="h-9 w-full rounded-full bg-foreground text-xs font-semibold uppercase tracking-wide text-background disabled:opacity-40"
      >
        {size ? "Add to cart" : "Choose a size"}
      </button>
      <button type="button" onClick={onCancel} className="w-full text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground underline underline-offset-2">
        Cancel
      </button>
    </div>
  );
}
