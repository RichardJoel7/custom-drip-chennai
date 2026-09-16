import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPrice } from "@/lib/utils/format";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/types";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getOrdersForAdmin } from "@/services/orders";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage() {
  await requireAdmin();
  const orders = await getOrdersForAdmin();

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide">ORDERS</h1>

      {orders.length === 0 ? (
        <p className="mt-8 text-muted-foreground">No orders yet.</p>
      ) : (
        <div className="mt-6 divide-y divide-border border-t border-border">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/orders/${order.id}`}
              className="flex flex-col gap-2 py-4 hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold">{order.order_number}</p>
                <p className="text-sm text-muted-foreground">
                  {order.full_name} · {formatDate(order.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{formatPrice(order.total)}</span>
                <Badge tone={order.payment_status === "paid" ? "success" : order.payment_status === "rejected" ? "danger" : "warning"}>
                  {PAYMENT_STATUS_LABELS[order.payment_status]}
                </Badge>
                <Badge tone="neutral">{ORDER_STATUS_LABELS[order.order_status]}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
