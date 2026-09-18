"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { formatPrice } from "@/lib/utils/format";
import type { CartItem } from "@/types";

// The cart persists to localStorage, so an item added under a different Supabase project
// (e.g. local dev vs. production) or whose photo was since removed can leave a stale image
// URL behind. next/image throws rather than failing gracefully for an unconfigured host, so
// both cases are guarded here instead of letting a bad thumbnail crash the whole cart page.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export function CartItemRow({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!item.image && item.image.startsWith(SUPABASE_URL) && !imageFailed;

  return (
    <div className="flex gap-4 border-b border-border py-4">
      <Link
        href={`/product/${item.slug}`}
        className="relative h-24 w-20 flex-none overflow-hidden rounded-lg bg-muted"
      >
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

      <div className="flex flex-1 flex-col justify-between">
        <div>
          <Link href={`/product/${item.slug}`} className="text-sm font-semibold">
            {item.name}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.color} · {item.size}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex h-9 items-center border border-border">
            <button
              type="button"
              aria-label="Decrease quantity"
              className="flex h-full w-8 items-center justify-center"
              onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              className="flex h-full w-8 items-center justify-center"
              disabled={item.quantity >= item.maxStock}
              onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
            >
              +
            </button>
          </div>

          <span className="text-sm font-bold">{formatPrice(item.price * item.quantity)}</span>
        </div>
      </div>

      <button
        type="button"
        aria-label={`Remove ${item.name} from cart`}
        className="self-start text-xs font-semibold uppercase text-muted-foreground underline underline-offset-4"
        onClick={() => removeItem(item.variantId)}
      >
        Remove
      </button>
    </div>
  );
}
