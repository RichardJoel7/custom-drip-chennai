import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import type { Settings } from "@/types";

/** "Add ₹X more for FREE shipping", with progress towards the admin's free-shipping amount. */
export function FreeShippingNudge({
  subtotal,
  settings,
  className,
}: {
  subtotal: number;
  settings: Pick<Settings, "free_shipping_threshold" | "standard_shipping_fee">;
  className?: string;
}) {
  const threshold = Number(settings.free_shipping_threshold);
  if (!(Number(settings.standard_shipping_fee) > 0) || !(threshold > 0)) return null;

  const remaining = Math.max(0, threshold - subtotal);
  const progress = Math.min(1, subtotal / threshold);

  return (
    <div className={cn("rounded-2xl border border-border p-4", className)} role="status">
      {remaining > 0 ? (
        <p className="text-sm">
          Add <span className="font-semibold">{formatPrice(remaining)}</span> more to get{" "}
          <span className="font-semibold">FREE shipping</span>
          <span className="text-muted-foreground"> (on orders of {formatPrice(threshold)} and above)</span>
        </p>
      ) : (
        <p className="text-sm font-semibold text-success">✓ You&apos;ve unlocked FREE shipping</p>
      )}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
      </div>
      {remaining > 0 && (
        <Link href="/shop" className="mt-2 inline-block text-xs font-semibold uppercase tracking-wide underline underline-offset-4">
          Shop more tees →
        </Link>
      )}
    </div>
  );
}
