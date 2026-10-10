"use client";

import { CartItemRow } from "@/components/cart/cart-item-row";
import { FreeShippingNudge } from "@/components/cart/free-shipping-nudge";
import { usePricedCart } from "@/components/cart/use-priced-cart";
import { QuickAddRow } from "@/components/products/quick-add-row";
import { YouMayLike } from "@/components/products/you-may-like";
import { LinkButton } from "@/components/ui/button";
import { cartLineKey } from "@/lib/custom/pricing";
import { formatPrice } from "@/lib/utils/format";
import { calculateShipping } from "@/lib/utils/shipping";
import type { CustomCatalog, ProductWithDetails, Settings } from "@/types";

export function CartView({
  settings,
  catalog,
  products,
}: {
  settings: Settings;
  catalog: CustomCatalog | null;
  /** The shop's live tees, for the suggestions. */
  products: ProductWithDetails[];
}) {
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
        <YouMayLike products={products} basisProductIds={[]} title="Popular right now" className="mt-14 text-left" />
      </div>
    );
  }

  const inCart = lines.flatMap(({ item }) => (item.kind === "custom" ? [] : [item.productId]));
  const shipping = calculateShipping(subtotal, settings);
  const total = subtotal + shipping;
  const shortfall =
    Number(settings.standard_shipping_fee) > 0 ? Math.max(0, Number(settings.free_shipping_threshold) - subtotal) : 0;

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-6 sm:px-6 sm:pt-10 lg:max-w-6xl lg:pb-12">
        <h1 className="font-display text-3xl tracking-wide sm:text-4xl">YOUR CART</h1>

        <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
          <div className="min-w-0">
            <FreeShippingNudge subtotal={subtotal} settings={settings} />

            <div className="mt-4">
              {lines.map(({ item, unitPrice }) => (
                <CartItemRow key={cartLineKey(item)} item={item} unitPrice={unitPrice} />
              ))}
            </div>

            {/* Right under the items, while the customer is still deciding — not after the checkout button. */}
            <QuickAddRow products={products} basisProductIds={inCart} freeShippingShortfall={shortfall} className="mt-6" />
          </div>

          <aside className="mt-6 rounded-2xl border border-border p-5 lg:sticky lg:top-24 lg:mt-0">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order summary</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-semibold">{shipping === 0 ? "FREE" : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold">{formatPrice(total)}</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Have a coupon? Add it at checkout.</p>
            <div className="mt-5">
              {hasUnavailable ? (
                <p className="text-center text-sm font-semibold text-danger">
                  Remove the unavailable item above to continue to checkout.
                </p>
              ) : (
                <LinkButton href="/checkout" size="lg" className="w-full">
                  Proceed to Checkout
                </LinkButton>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Phones: the total and checkout button stay on screen while the customer browses suggestions. */}
      {!hasUnavailable && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total{shipping === 0 ? " · free shipping" : ""}</p>
              <p className="font-display text-xl tracking-wide">{formatPrice(total)}</p>
            </div>
            <LinkButton href="/checkout" size="md">
              Checkout →
            </LinkButton>
          </div>
        </div>
      )}
    </>
  );
}
