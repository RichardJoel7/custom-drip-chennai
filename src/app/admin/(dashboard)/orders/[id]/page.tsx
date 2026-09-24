import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomItemCard } from "@/components/admin/custom-item-card";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { customDetailsOf } from "@/lib/custom/order-item";
import { PaymentVerificationPanel } from "@/components/admin/payment-verification-panel";
import { ShipmentForm } from "@/components/admin/shipment-form";
import { formatDateTime, formatPrice } from "@/lib/utils/format";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getOrderByIdForAdmin } from "@/services/orders";

export const metadata: Metadata = { title: "Order Details" };

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const order = await getOrderByIdForAdmin(id);

  if (!order) notFound();

  return (
    <div className="max-w-xl">
      <Link href="/admin/orders" className="text-sm text-muted-foreground underline underline-offset-4">
        ← Back to Orders
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wide">{order.order_number}</h1>
        <span className="text-sm text-muted-foreground">{formatDateTime(order.created_at)}</span>
      </div>

      <div className="mt-6 space-y-4">
        <PaymentVerificationPanel
          orderId={order.id}
          paymentStatus={order.payment_status}
          upiTransactionId={order.upi_transaction_id}
        />

        <div className="border border-border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</p>
          <p className="mt-1 font-semibold">{order.full_name}</p>
          <p className="text-sm">{order.mobile_number}</p>
          {order.email && <p className="text-sm text-muted-foreground">{order.email}</p>}
          {order.instagram_username && (
            <p className="text-sm text-muted-foreground">@{order.instagram_username}</p>
          )}
        </div>

        <div className="border border-border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shipping</p>
          <p className="mt-1 text-sm">
            {order.address_line1}
            {order.address_line2 ? `, ${order.address_line2}` : ""}
          </p>
          {order.area && <p className="text-sm">{order.area}</p>}
          <p className="text-sm">
            {order.city}, {order.state} {order.pincode}
          </p>
          {order.order_notes && (
            <p className="mt-2 text-sm text-muted-foreground">Note: {order.order_notes}</p>
          )}
        </div>

        <div className="border border-border p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Products
          </p>
          <div className="space-y-2">
            {order.order_items.map((item) => {
              const details = customDetailsOf(item);
              if (details) return <CustomItemCard key={item.id} item={item} details={details} />;
              return (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span>
                    {item.product_name}
                    <span className="text-muted-foreground">
                      {" "}
                      · {item.color} / {item.size} · Qty {item.quantity}
                    </span>
                  </span>
                  <span className="font-semibold">{formatPrice(item.line_total)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{order.shipping_fee === 0 ? "FREE" : formatPrice(order.shipping_fee)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="border border-border p-4">
          <OrderStatusSelect orderId={order.id} currentStatus={order.order_status} />
        </div>

        <ShipmentForm
          orderId={order.id}
          courierName={order.courier_name}
          courierTrackingNumber={order.courier_tracking_number}
        />

        <div className="border border-border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Customer Tracking Link
          </p>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
            /track/{order.tracking_token}
          </p>
        </div>
      </div>
    </div>
  );
}
