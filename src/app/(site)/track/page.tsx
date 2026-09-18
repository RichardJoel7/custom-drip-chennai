import type { Metadata } from "next";
import { TrackOrderLookupForm } from "@/components/track/track-order-lookup-form";

export const metadata: Metadata = { title: "Track Your Order", robots: { index: false } };

export default function TrackOrderLookupPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:py-20">
      <h1 className="font-display text-3xl tracking-wide sm:text-4xl">TRACK YOUR ORDER</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Paste the tracking link or code from your confirmation email to see your order status.
      </p>
      <TrackOrderLookupForm />
    </div>
  );
}
