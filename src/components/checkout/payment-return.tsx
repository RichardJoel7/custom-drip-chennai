"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearBuyNowItem } from "@/components/cart/buy-now";
import { useCart } from "@/components/cart/cart-context";
import { Button } from "@/components/ui/button";
import { openCashfreeCheckout } from "@/lib/payments/cashfree-checkout";

/**
 * Once an order is paid, or its payment is being confirmed: empties the cart it came from (or
 * just the Buy Now item), so nobody pays for the same things twice.
 */
export function ClearOrderedItems({ buyNow }: { buyNow: boolean }) {
  const { clearCart, isHydrated } = useCart();
  useEffect(() => {
    if (!isHydrated) return;
    if (buyNow) clearBuyNowItem();
    else clearCart();
  }, [isHydrated, clearCart, buyNow]);
  return null;
}

/** Re-opens Cashfree for an order that's still waiting to be paid. */
export function RetryPaymentButton({ sessionId, mode }: { sessionId: string; mode: "sandbox" | "production" }) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setOpening(true);
    setError(null);
    try {
      await openCashfreeCheckout({ sessionId, mode });
    } catch {
      setError("We couldn't open the payment page. Check your connection and try again.");
      setOpening(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button size="lg" className="w-full" disabled={opening} onClick={retry}>
        {opening ? "Opening secure payment…" : "Try Payment Again"}
      </Button>
      {error && <p className="text-center text-sm text-danger">{error}</p>}
    </div>
  );
}

/** While the bank is still confirming a payment: checks again every few seconds, for a while. */
export function RefreshWhilePending({ everySeconds = 4, maxTries = 30 }: { everySeconds?: number; maxTries?: number }) {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (tries > maxTries) window.clearInterval(timer);
      else router.refresh();
    }, everySeconds * 1000);
    return () => window.clearInterval(timer);
  }, [router, everySeconds, maxTries]);
  return null;
}
