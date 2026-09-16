import type { Metadata } from "next";
import { getSettings } from "@/services/settings";
import { formatPrice } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description: "Shipping information for Custom Drip Chennai orders.",
};

export default async function ShippingPolicyPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="font-display text-4xl tracking-wide sm:text-5xl">SHIPPING POLICY</h1>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Shipping Fee</h2>
          <p>
            Standard shipping is {formatPrice(settings.standard_shipping_fee)} across India. Orders
            above {formatPrice(settings.free_shipping_threshold)} ship free.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Processing Time</h2>
          <p>
            Every tee is printed to order. Please allow 2–4 business days for printing and quality
            checks before your order ships.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Delivery Time</h2>
          <p>Once shipped, orders typically arrive within 3–7 business days depending on your location.</p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Order Tracking</h2>
          <p>
            You&apos;ll receive a tracking link with your order confirmation. Once your order ships,
            the courier name and tracking number will appear on that page.
          </p>
        </section>
      </div>
    </div>
  );
}
