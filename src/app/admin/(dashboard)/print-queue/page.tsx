import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/require-admin";
import type { OrderWithItems } from "@/types";

export const metadata: Metadata = { title: "Print Queue" };

export default async function PrintQueuePage() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("orders")
    .select("*, order_items ( * )")
    .eq("order_status", "payment_confirmed")
    .order("created_at", { ascending: true });

  const orders = (data ?? []) as OrderWithItems[];

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide">PRINT QUEUE</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Orders with confirmed payment — print, pack, then enter shipping details to notify the customer.
      </p>

      {orders.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Nothing in the print queue right now.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border border-border p-4">
              <p className="font-semibold">{order.order_number}</p>

              <div className="mt-3 space-y-1">
                {order.order_items.map((item) => (
                  <p key={item.id} className="text-sm">
                    {item.product_name} — {item.color} / {item.size}{" "}
                    <span className="font-semibold">Qty: {item.quantity}</span>
                  </p>
                ))}
              </div>

              <Link
                href={`/admin/orders/${order.id}`}
                className="mt-4 inline-block text-sm font-semibold uppercase tracking-wide underline underline-offset-4"
              >
                Enter Shipping Details →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
