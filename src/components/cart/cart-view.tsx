"use client";

import { useCart } from "@/components/cart/cart-context";
import { CartItemRow } from "@/components/cart/cart-item-row";
import { LinkButton } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils/format";
import { calculateShipping } from "@/lib/utils/shipping";
import type { Settings } from "@/types";

export function CartView({ settings }: { settings: Settings }) {
  const { items, subtotal, isHydrated } = useCart();

  if (!isHydrated) return null;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl tracking-wide">YOUR CART IS EMPTY</h1>
        <p className="mt-2 text-muted-foreground">Time to find your next favourite tee.</p>
        <LinkButton href="/shop" size="lg" className="mt-6">
          Shop the Drop
        </LinkButton>
      </div>
    );
  }

  const shipping = calculateShipping(subtotal, settings);
  const total = subtotal + shipping;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl tracking-wide sm:text-4xl">YOUR CART</h1>

      <div className="mt-6">
        {items.map((item) => (
          <CartItemRow key={item.variantId} item={item} />
        ))}
      </div>

      <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-semibold">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span className="font-semibold">{shipping === 0 ? "FREE" : formatPrice(shipping)}</span>
        </div>
        {shipping > 0 && (
          <p className="text-xs text-muted-foreground">
            Free shipping on orders above {formatPrice(settings.free_shipping_threshold)}
          </p>
        )}
        <div className="flex justify-between border-t border-border pt-2 text-base">
          <span className="font-semibold">Total</span>
          <span className="font-bold">{formatPrice(total)}</span>
        </div>
      </div>

      <LinkButton href="/checkout" size="lg" className="mt-6 w-full">
        Proceed to Checkout
      </LinkButton>
    </div>
  );
}
