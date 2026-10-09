import type { Metadata } from "next";
import Link from "next/link";
import { OrdersTabs } from "@/components/admin/orders-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatPrice } from "@/lib/utils/format";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/types";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { ADMIN_ORDERS_PAGE_SIZE, getOrdersPageForAdmin } from "@/services/orders";
import { settleStaleOnlinePayments } from "@/services/payments";

export const metadata: Metadata = { title: "Orders" };

function pageHref(page: number, search: string) {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  await settleStaleOnlinePayments();

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "", 10) || 1);
  const { orders, total } = await getOrdersPageForAdmin(page, search);
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_ORDERS_PAGE_SIZE));

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide">ORDERS</h1>
      <div className="mt-4">
        <OrdersTabs />
      </div>

      <form action="/admin/orders" method="get" role="search" className="mt-6 flex max-w-xl gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Order number, name, mobile or email"
          aria-label="Search orders"
        />
        <Button type="submit" variant="outline" size="md" className="flex-none rounded-none">
          Search
        </Button>
      </form>
      <p className="mt-3 text-sm text-muted-foreground">
        {total} {total === 1 ? "order" : "orders"}
        {search && (
          <>
            {" "}
            matching &ldquo;{search}&rdquo; ·{" "}
            <Link href="/admin/orders" className="underline underline-offset-2 hover:text-foreground">
              Show all
            </Link>
          </>
        )}
      </p>

      {orders.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          {search ? "No orders match that search." : page > 1 ? "No orders on this page." : "No orders yet."}
        </p>
      ) : (
        <div className="mt-4 divide-y divide-border border-t border-border">
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
                <Badge
                  tone={
                    order.payment_status === "paid"
                      ? "success"
                      : order.payment_status === "rejected" || order.payment_status === "failed"
                        ? "danger"
                        : "warning"
                  }
                >
                  {PAYMENT_STATUS_LABELS[order.payment_status]}
                </Badge>
                <Badge tone="neutral">{ORDER_STATUS_LABELS[order.order_status]}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <nav className="mt-6 flex items-center justify-between gap-4 text-sm" aria-label="Order pages">
          {page > 1 ? (
            <Link href={pageHref(page - 1, search)} className="font-semibold underline underline-offset-2">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Page {Math.min(page, pageCount)} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={pageHref(page + 1, search)} className="font-semibold underline underline-offset-2">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
