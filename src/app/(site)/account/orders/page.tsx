import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrdersForCustomer } from "@/services/orders";
import { formatDate, formatPrice } from "@/lib/utils/format";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/types";

export const metadata: Metadata = { title: "My Orders", robots: { index: false } };

export default async function MyOrdersPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/account/orders");

  const orders = await getOrdersForCustomer();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="font-display text-4xl tracking-wide sm:text-5xl">MY ORDERS</h1>

      {orders.length === 0 ? (
        <p className="mt-6 text-muted-foreground">
          No orders yet. <Link href="/shop" className="underline underline-offset-4">Start shopping →</Link>
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/track/${order.tracking_token}`}
              className="block rounded-2xl border border-border p-5 hover:border-foreground"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{order.order_number}</span>
                <span className="text-sm text-muted-foreground">{formatDate(order.created_at)}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {order.order_items.length} item{order.order_items.length > 1 ? "s" : ""} · {formatPrice(order.total)}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
                  {ORDER_STATUS_LABELS[order.order_status]}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
                  {PAYMENT_STATUS_LABELS[order.payment_status]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
