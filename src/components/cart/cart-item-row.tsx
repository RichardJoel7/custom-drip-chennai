"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { GarmentMockup } from "@/components/custom/garment-mockup";
import { SIDE_NAMES, cartLineKey } from "@/lib/custom/pricing";
import { formatPrice } from "@/lib/utils/format";
import type { CartItem, CustomCartItem, ProductCartItem } from "@/types";

// The cart persists to localStorage, so an item added under a different Supabase project
// (e.g. local dev vs. production) or whose photo was since removed can leave a stale image
// URL behind. next/image throws rather than failing gracefully for an unconfigured host, so
// both cases are guarded here instead of letting a bad thumbnail crash the whole cart page.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** unitPrice: today's price (custom tees are re-priced); null = no longer available. */
export function CartItemRow({ item, unitPrice }: { item: CartItem; unitPrice: number | null }) {
  const { updateQuantity, removeItem } = useCart();
  const lineKey = cartLineKey(item);

  return (
    <div className="flex gap-4 border-b border-border py-4">
      {item.kind === "custom" ? <CustomThumb item={item} /> : <ProductThumb item={item} />}

      <div className="flex flex-1 flex-col justify-between gap-2">
        <div>
          {item.kind === "custom" ? (
            <>
              <Link href="/customize" className="text-sm font-semibold">
                {item.name}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[item.colorName, item.sizeLabel, item.gsmLabel].filter(Boolean).join(" · ")}
              </p>
              {item.prints && (
                <ul className="mt-0.5 text-xs text-muted-foreground">
                  {item.prints.map((p) => (
                    <li key={`${p.side}:${p.printOption.id}`}>
                      {SIDE_NAMES[p.side]} · {p.printOption.name}: {p.design.name}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <Link href={`/product/${item.slug}`} className="text-sm font-semibold">
                {item.name}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.color} · {item.size}
              </p>
            </>
          )}
          {unitPrice === null && (
            <p className="mt-1.5 text-xs font-semibold text-danger">
              This option is no longer available — please remove it and design it again.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex h-9 items-center border border-border">
            <button
              type="button"
              aria-label="Decrease quantity"
              className="flex h-full w-8 items-center justify-center"
              onClick={() => updateQuantity(lineKey, item.quantity - 1)}
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              className="flex h-full w-8 items-center justify-center"
              disabled={item.quantity >= item.maxStock}
              onClick={() => updateQuantity(lineKey, item.quantity + 1)}
            >
              +
            </button>
          </div>

          <span className="text-sm font-bold">
            {unitPrice === null ? "—" : formatPrice(unitPrice * item.quantity)}
          </span>
        </div>
      </div>

      <button
        type="button"
        aria-label={`Remove ${item.name} from cart`}
        className="self-start text-xs font-semibold uppercase text-muted-foreground underline underline-offset-4"
        onClick={() => removeItem(lineKey)}
      >
        Remove
      </button>
    </div>
  );
}

function ProductThumb({ item }: { item: ProductCartItem }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!item.image && item.image.startsWith(SUPABASE_URL) && !imageFailed;

  return (
    <Link href={`/product/${item.slug}`} className="relative h-24 w-20 flex-none overflow-hidden rounded-lg bg-muted">
      {showImage && (
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="80px"
          className="object-cover"
          onError={() => setImageFailed(true)}
        />
      )}
    </Link>
  );
}

function CustomThumb({ item }: { item: CustomCartItem }) {
  const prints = item.prints ?? [];
  const view = prints.some((p) => p.side === "front") || prints.length === 0 ? "front" : "back";

  return (
    <Link
      href="/customize"
      className="flex h-24 w-20 flex-none items-center justify-center overflow-hidden rounded-lg bg-muted"
    >
      <GarmentMockup
        spec={item.mockup?.spec}
        colorPhotos={item.mockup?.colorPhotos}
        colorHex={item.colorHex}
        view={view}
        prints={prints
          .filter((p) => p.side === view)
          .map((p) => ({
            key: p.printOption.id,
            printArea: p.printOption,
            transform: p.transform,
            designUrl: p.design.image_url,
          }))}
        imageWidth={256}
        className="w-full"
        title={`${item.name} preview`}
      />
    </Link>
  );
}
