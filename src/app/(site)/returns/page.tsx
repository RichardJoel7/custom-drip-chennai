import type { Metadata } from "next";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = {
  title: "Returns & Exchange",
  description: "Returns and exchange policy for Custom Drip Chennai.",
};

export default async function ReturnsPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="font-display text-4xl tracking-wide sm:text-5xl">RETURNS & EXCHANGE</h1>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Made to Order</h2>
          <p>
            Every Custom Drip Chennai tee is printed specifically for your order, so we&apos;re
            unable to accept returns for a change of mind.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Damaged or Wrong Item</h2>
          <p>
            If your order arrives damaged, defective, or isn&apos;t what you ordered, message us on
            Instagram within 48 hours of delivery with a photo of the item and your order number.
            We&apos;ll sort out a replacement or refund.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-semibold text-foreground">Size Exchange</h2>
          <p>
            Ordered the wrong size? Reach out within 48 hours of delivery and we&apos;ll try our
            best to arrange an exchange, subject to stock availability.
          </p>
        </section>

        <a
          href={settings.instagram_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-semibold uppercase tracking-wide underline underline-offset-4"
        >
          Contact us on Instagram
        </a>
      </div>
    </div>
  );
}
