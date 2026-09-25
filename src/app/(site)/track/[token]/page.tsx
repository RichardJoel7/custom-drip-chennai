import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/ui/button";
import { GarmentMockup } from "@/components/custom/garment-mockup";
import { mockupFromSnapshot } from "@/lib/custom/mockup";
import { OrderTimeline } from "@/components/track/order-timeline";
import { customDetailsOf, orderItemVariantLabel, placementsOf } from "@/lib/custom/order-item";
import { formatDate, formatPrice } from "@/lib/utils/format";
import { PAYMENT_STATUS_LABELS } from "@/types";
import { getOrderByTrackingToken } from "@/services/orders";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = { title: "Track Your Order", robots: { index: false } };

export default async function TrackOrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [order, settings] = await Promise.all([getOrderByTrackingToken(token), getSettings()]);

  if (!order) notFound();

  const trackingUrl = order.courier_tracking_number
    ? `https://www.google.com/search?q=${encodeURIComponent(
        `${order.courier_name ?? ""} tracking ${order.courier_tracking_number}`
      )}`
    : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <h1 className="font-display text-3xl tracking-wide sm:text-4xl">TRACK YOUR ORDER</h1>

      <div className="mt-6 rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between">
          <span className="font-semibold">{order.order_number}</span>
          <span className="text-sm text-muted-foreground">{formatDate(order.created_at)}</span>
        </div>

        <div className="mt-4 space-y-2 border-t border-border pt-4">
          {order.order_items.map((item) => {
            const details = customDetailsOf(item);
            const placements = details ? placementsOf(details) : [];
            const view = placements.some((p) => p.side === "front") || placements.length === 0 ? "front" : "back";
            return (
              <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-3">
                  {details && (
                    <span className="w-12 flex-none rounded-lg bg-muted p-0.5">
                      <GarmentMockup
                        {...mockupFromSnapshot(details.garment)}
                        colorHex={details.color_hex}
                        view={view}
                        prints={placements
                          .filter((p) => p.side === view)
                          .map((p, i) => ({
                            key: `${p.print_option.id}-${i}`,
                            printArea: p.print_option,
                            transform: p.transform,
                            designUrl: p.design?.image_url,
                          }))}
                        imageWidth={256}
                        className="w-full"
                      />
                    </span>
                  )}
                  <span>
                    {item.product_name} ({orderItemVariantLabel(item)}) x{item.quantity}
                  </span>
                </span>
                <span className="font-semibold">{formatPrice(item.line_total)}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-bold">{formatPrice(order.total)}</span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Payment Status</span>
          <span className="text-sm font-semibold">{PAYMENT_STATUS_LABELS[order.payment_status]}</span>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Order Status
        </h2>
        <OrderTimeline orderStatus={order.order_status} paymentStatus={order.payment_status} />
      </div>

      {order.order_status === "shipped" && order.courier_tracking_number && (
        <div className="mt-8 rounded-2xl border border-border bg-muted p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Shipment Details
          </p>
          {order.courier_name && <p className="mt-2 text-sm">Courier: {order.courier_name}</p>}
          <p className="text-sm">Tracking Number: {order.courier_tracking_number}</p>
          {trackingUrl && (
            <LinkButton href={trackingUrl} external size="md" className="mt-3">
              Track Shipment
            </LinkButton>
          )}
        </div>
      )}

      <div className="mt-8">
        <LinkButton href={settings.instagram_url} external variant="outline" size="lg" className="w-full">
          Contact Us on Instagram
        </LinkButton>
      </div>
    </div>
  );
}
