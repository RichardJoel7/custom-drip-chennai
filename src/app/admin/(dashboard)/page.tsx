import type { Metadata } from "next";
import Link from "next/link";
import { StatCard } from "@/components/admin/stat-card";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  getDashboardStats,
  isStatsPeriod,
  STATS_PERIODS,
  type StatsPeriod,
} from "@/services/admin-stats";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: rawPeriod } = await searchParams;
  const period: StatsPeriod = isStatsPeriod(rawPeriod) ? rawPeriod : "today";
  const stats = await getDashboardStats(period);
  const periodLabel = STATS_PERIODS.find((p) => p.value === period)?.label ?? "Today";

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide">DASHBOARD</h1>
      <p className="mt-1 text-sm text-muted-foreground">{stats.allTimeOrders} orders all-time</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATS_PERIODS.map((p) => (
          <Link
            key={p.value}
            href={`/admin?period=${p.value}`}
            className={cn(
              "h-9 rounded-full px-4 text-sm font-semibold uppercase tracking-wide flex items-center",
              p.value === period
                ? "bg-foreground text-background"
                : "border border-border text-foreground"
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {periodLabel}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Orders" value={stats.periodOrders} tone="accent" />
        <StatCard label="Revenue (Paid)" value={formatPrice(stats.periodRevenue)} tone="accent" />
        <StatCard label="Failed Payments" value={stats.periodFailedPayments} tone="warning" />
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Needs Your Attention Now
      </p>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Payments Pending" value={stats.pendingPayments} tone="warning" />
        <StatCard label="To Fulfill" value={stats.toFulfill} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/products/new"
          className="inline-flex h-12 items-center bg-foreground px-5 text-sm font-semibold uppercase tracking-wide text-background"
        >
          + Add New T-Shirt
        </Link>
        <Link
          href="/admin/orders"
          className="inline-flex h-12 items-center border border-foreground px-5 text-sm font-semibold uppercase tracking-wide"
        >
          View Orders
        </Link>
      </div>
    </div>
  );
}
