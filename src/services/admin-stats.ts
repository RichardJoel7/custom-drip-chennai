import { createServerSupabaseClient } from "@/lib/supabase/server";

export type StatsPeriod = "today" | "week" | "month" | "quarter" | "year";

export const STATS_PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "This Year" },
];

export function isStatsPeriod(value: string | undefined): value is StatsPeriod {
  return STATS_PERIODS.some((p) => p.value === value);
}

function getPeriodStart(period: StatsPeriod): Date {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case "today":
      return start;
    case "week": {
      const day = start.getDay(); // 0 = Sunday
      const daysSinceMonday = (day + 6) % 7;
      start.setDate(start.getDate() - daysSinceMonday);
      return start;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), quarter * 3, 1);
    }
    case "year":
      return new Date(now.getFullYear(), 0, 1);
  }
}

export interface DashboardStats {
  periodOrders: number;
  periodRevenue: number;
  periodFailedPayments: number;
  allTimeOrders: number;
  pendingPayments: number;
  toFulfill: number;
}

export async function getDashboardStats(period: StatsPeriod = "today"): Promise<DashboardStats> {
  const supabase = await createServerSupabaseClient();
  const periodStart = getPeriodStart(period).toISOString();

  // "Pending Payments" / "To Fulfill" are live operational queues — things that need your
  // attention right now — so they deliberately ignore the period filter. Orders / Revenue /
  // Failed Payments are historical KPIs scoped to the period.
  const [periodOrdersRes, allTimeOrdersRes, pendingPaymentsRes, failedPaymentsRes, toFulfillRes] =
    await Promise.all([
      supabase
        .from("orders")
        .select("total, payment_status", { count: "exact" })
        .gte("created_at", periodStart),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "pending_verification"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "rejected")
        .gte("created_at", periodStart),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("order_status", "payment_confirmed"),
    ]);

  const periodRevenue = (periodOrdersRes.data ?? [])
    .filter((order) => order.payment_status === "paid")
    .reduce((sum, order) => sum + Number(order.total), 0);

  return {
    periodOrders: periodOrdersRes.count ?? 0,
    periodRevenue,
    periodFailedPayments: failedPaymentsRes.count ?? 0,
    allTimeOrders: allTimeOrdersRes.count ?? 0,
    pendingPayments: pendingPaymentsRes.count ?? 0,
    toFulfill: toFulfillRes.count ?? 0,
  };
}
