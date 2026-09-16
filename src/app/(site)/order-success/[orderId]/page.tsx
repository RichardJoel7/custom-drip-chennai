import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils/format";
import { getOrderByTrackingToken } from "@/services/orders";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = { title: "Order Confirmed", robots: { index: false } };

export default async function OrderSuccessPage({
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const [order, settings] = await Promise.all([
    t ? getOrderByTrackingToken(t) : Promise.resolve(null),
    getSettings(),
  ]);

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl tracking-wide">ORDER NOT FOUND</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn&apos;t find that order. If you just placed an order, check your order
          confirmation link.
        </p>
        <LinkButton href="/shop" size="lg" className="mt-6">
          Continue Shopping
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-16">
      <div className="text-center">
        <p className="text-4xl">🎉</p>
        <h1 className="mt-2 font-display text-3xl tracking-wide sm:text-4xl">
          ORDER PLACED SUCCESSFULLY
        </h1>
        <p className="mt-3 text-muted-foreground">
          We&apos;ve received your order. Your payment will be verified and we&apos;ll begin
          processing your order shortly.
        </p>
      </div>

      <div className="mt-8 space-y-4 border border-border p-5">
        <Row label="Order Number" value={order.order_number} />
        <Row label="Total" value={formatPrice(order.total)} />
        <Row label="Payment" value="Payment submitted for verification" />
      </div>

      <div className="mt-6 space-y-1 border border-border p-5 text-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Shipping To
        </p>
        <p className="font-semibold">{order.full_name}</p>
        <p>{order.mobile_number}</p>
        <p>
          {order.address_line1}
          {order.address_line2 ? `, ${order.address_line2}` : ""}
        </p>
        {order.area && <p>{order.area}</p>}
        <p>
          {order.city}, {order.state} {order.pincode}
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <LinkButton href={`/track/${order.tracking_token}`} variant="outline" size="lg">
          Track Your Order
        </LinkButton>
        <LinkButton href={settings.instagram_url} external size="lg">
          Contact Us on Instagram
        </LinkButton>
        <Link href="/shop" className="text-center text-sm font-semibold uppercase tracking-wide underline underline-offset-4">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex-none text-sm text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
