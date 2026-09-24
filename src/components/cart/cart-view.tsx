"use client";

import { CartItemRow } from "@/components/cart/cart-item-row";
import { usePricedCart } from "@/components/cart/use-priced-cart";
import { LinkButton } from "@/components/ui/button";
import { cartLineKey } from "@/lib/custom/pricing";
import { formatPrice } from "@/lib/utils/format";
import { calculateShipping } from "@/lib/utils/shipping";
import type { CustomCatalog, Settings } from "@/types";

export function CartView({ settings, catalog }: { settings: Settings; catalog: CustomCatalog | null }) {
  const { lines, subtotal, hasUnavailable, isHydrated } = usePricedCart(catalog);

  if (!isHydrated) return null;

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl tracking-wide">YOUR CART IS EMPTY</h1>
        <p className="mt-2 text-muted-foreground">Time to find your next favourite tee.</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <LinkButton href="/shop" size="lg">
            Shop the Drop
          </LinkButton>
          <LinkButton href="/customize" variant="outline" size="lg">
            Design Your Own
          </LinkButton>
        </div>
      </div>
    );
  }

  const shipping = calculateShipping(subtotal, settings);
  const total = subtotal + shipping;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl tracking-wide sm:text-4xl">YOUR CART</h1>

      <div className="mt-6">
        {lines.map(({ item, unitPrice }) => (
          <CartItemRow key={cartLineKey(item)} item={item} unitPrice={unitPrice} />
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

      {hasUnavailable ? (
        <p className="mt-6 text-center text-sm font-semibold text-danger">
          Remove the unavailable item above to continue to checkout.
        </p>
      ) : (
        <LinkButton href="/checkout" size="lg" className="mt-6 w-full">
          Proceed to Checkout
        </LinkButton>
      )}
    </div>
  );
}
