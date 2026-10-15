import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PERIODS, type Period, type PeriodSummary } from "@/lib/influencers/periods";
import { cn } from "@/lib/utils/cn";
import type { InfluencerOrder } from "@/types";
import type { InfluencerTotals } from "@/services/influencers";

/** Rupees, with paise when there are any: commission can be ₹49.50. */
export function formatMoney(amount: number) {
  const paise = Math.round(amount * 100) % 100 !== 0;
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: paise ? 2 : 0, maximumFractionDigits: 2 })}`;
}

const istDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

/**
 * One period's numbers: the period picker, totals, a sales chart and the orders. Used on the
 * influencer's own page (order numbers partly hidden) and the admin's (full, linked).
 */
export function InfluencerDashboard({
  basePath,
  period,
  summary,
  orders,
  admin = false,
}: {
  /** Where the period links point, e.g. "/influencer". */
  basePath: string;
  period: Period;
  summary: PeriodSummary;
  orders: InfluencerOrder[];
  admin?: boolean;
}) {
  return (
    <section aria-labelledby="period-title">
      <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Period">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`${basePath}?period=${p.key}`}
            scroll={false}
            aria-current={period.key === p.key ? "page" : undefined}
            className={cn(
              "flex h-10 flex-none items-center rounded-full border px-4 text-xs font-semibold uppercase tracking-wide transition-colors",
              period.key === p.key ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
            )}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      {/* A plain form: works without any script, and the dates land in the address to share. */}
      <form action={basePath} method="get" className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          From
          <input
            type="date"
            name="from"
            defaultValue={period.fromDate}
            required
            className="mt-1 block h-10 rounded-full border border-border bg-background px-4 text-sm text-foreground"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          To
          <input
            type="date"
            name="to"
            defaultValue={period.toDate}
            required
            className="mt-1 block h-10 rounded-full border border-border bg-background px-4 text-sm text-foreground"
          />
        </label>
        <button
          type="submit"
          className={cn(
            "h-10 rounded-full border px-5 text-xs font-semibold uppercase tracking-wide transition-colors",
            period.key === "custom"
              ? "border-foreground bg-foreground text-background"
              : "border-foreground hover:bg-foreground hover:text-background",
          )}
        >
          Show dates
        </button>
      </form>

      <h2 id="period-title" className="mt-6 font-display text-2xl tracking-wide">
        {period.label.toUpperCase()}
      </h2>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label="Orders" value={summary.orders.toLocaleString("en-IN")} />
        <Tile label="Sales" value={formatMoney(summary.sales)} note="After discount, without shipping" />
        <Tile
          label="Commission"
          value={formatMoney(summary.commission)}
          note={`${formatMoney(summary.earned)} earned · ${formatMoney(summary.pending)} pending`}
          strong
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {period.bucket && summary.orders > 0 && <SalesChart series={summary.series} bucket={period.bucket} />}

      <div className="mt-8">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Orders</h3>
        {orders.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No orders with {admin ? "their" : "your"} code in this period yet.</p>
        ) : (
          <>
            {/* Phones: one card per order, so the commission is never off-screen. */}
            <ul className="mt-3 divide-y divide-border border-y border-border sm:hidden">
              {orders.map((o, i) => (
                <li key={`${o.orderRef}-${i}`} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold">{istDateTime(o.placedAt)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {admin && o.orderId ? (
                        <Link href={`/admin/orders/${o.orderId}`} className="font-mono underline underline-offset-4">
                          {o.orderRef}
                        </Link>
                      ) : (
                        <span className="font-mono">{o.orderRef}</span>
                      )}
                      {" · "}
                      <span className="font-mono">{o.couponCode}</span> · Sale {formatMoney(o.sale)}
                    </p>
                  </div>
                  <div className="flex-none text-right">
                    <p className="font-bold tabular-nums">{formatMoney(o.commission)}</p>
                    <p className="mt-1">
                      {o.status === "earned" ? <Badge tone="success">Earned</Badge> : <Badge tone="warning">Pending</Badge>}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-semibold">Date</th>
                    <th className="py-2 pr-3 font-semibold">Order</th>
                    <th className="py-2 pr-3 font-semibold">Code</th>
                    <th className="py-2 pr-3 text-right font-semibold">Sale</th>
                    <th className="py-2 pr-3 text-right font-semibold">Commission</th>
                    <th className="py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={`${o.orderRef}-${i}`} className="border-b border-border">
                      <td className="whitespace-nowrap py-2.5 pr-3">{istDateTime(o.placedAt)}</td>
                      <td className="whitespace-nowrap py-2.5 pr-3 font-mono text-xs">
                        {admin && o.orderId ? (
                          <Link href={`/admin/orders/${o.orderId}`} className="underline underline-offset-4">
                            {o.orderRef}
                          </Link>
                        ) : (
                          o.orderRef
                        )}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs">{o.couponCode}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{formatMoney(o.sale)}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{formatMoney(o.commission)}</td>
                      <td className="py-2.5">
                        {o.status === "earned" ? <Badge tone="success">Earned</Badge> : <Badge tone="warning">Pending</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Pending: paid, waiting for delivery. Earned: delivered, so the commission is payable. Cancelled orders aren&apos;t
          counted.
        </p>
      </div>
    </section>
  );
}

function Tile({
  label,
  value,
  note,
  strong = false,
  className,
}: {
  label: string;
  value: string;
  note?: string;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        strong ? "border-foreground bg-foreground text-background" : "border-border",
        className,
      )}
    >
      <p className={cn("text-xs font-semibold uppercase tracking-wide", strong ? "text-background/70" : "text-muted-foreground")}>
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
      {note && <p className={cn("mt-1 text-xs", strong ? "text-background/70" : "text-muted-foreground")}>{note}</p>}
    </div>
  );
}

/** All-time money: what's payable, what's been paid, what's still owed. */
export function CommissionBalance({ totals, payoutsTitle = "Payouts" }: { totals: InfluencerTotals; payoutsTitle?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label={payoutsTitle}>
      <Tile label="Earned (all time)" value={formatMoney(totals.earned)} note="Delivered orders" />
      <Tile label="Paid out" value={formatMoney(totals.paid)} />
      <Tile
        label={totals.due < 0 ? "To adjust" : "Balance due"}
        value={formatMoney(Math.abs(totals.due))}
        note={totals.due < 0 ? "Paid ahead of a cancelled order" : undefined}
        strong
      />
      <Tile label="Pending" value={formatMoney(totals.pending)} note="Waiting for delivery" />
    </div>
  );
}

/**
 * Sales per day (or month) as columns: one series, so no legend — the title names it. Hover or
 * focus a column for its numbers; the orders table below is the full table view.
 */
function SalesChart({ series, bucket }: { series: PeriodSummary["series"]; bucket: "day" | "month" }) {
  const max = Math.max(...series.map((s) => s.sales), 1);
  const top = niceCeiling(max);
  // label the first, middle and last columns only
  const labelled = new Set([0, Math.floor((series.length - 1) / 2), series.length - 1]);

  return (
    <figure className="mt-8">
      <figcaption className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sales by {bucket === "day" ? "day" : "month"}
      </figcaption>
      <div className="mt-3 flex gap-3">
        <div
          className="flex h-44 flex-none flex-col justify-between pb-6 text-right text-[11px] tabular-nums text-muted-foreground"
          aria-hidden="true"
        >
          <span>{compactRupees(top)}</span>
          <span>₹0</span>
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="relative flex h-38 items-end gap-0.5 border-b border-border"
            role="list"
            aria-label={`Sales by ${bucket}`}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-border" aria-hidden="true" />
            {series.map((s, i) => (
              <div
                key={`${s.label}-${i}`}
                role="listitem"
                className="group relative flex h-full flex-1 items-end justify-center"
                tabIndex={0}
              >
                <div
                  className="w-full max-w-6 rounded-t-[4px] bg-foreground transition-opacity group-hover:opacity-70 group-focus:opacity-70"
                  style={{
                    height: `${s.sales > 0 ? Math.max((s.sales / top) * 100, 2) : 0}%`,
                  }}
                />
                <span className="sr-only">
                  {s.label}: {formatMoney(s.sales)} sales, {s.orders} orders, {formatMoney(s.commission)} commission
                </span>
                <div
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max -translate-x-1/2 rounded-xl bg-foreground px-3 py-2 text-xs text-background shadow-lg group-hover:block group-focus:block"
                  aria-hidden="true"
                >
                  <p className="font-semibold">{s.label}</p>
                  <p className="tabular-nums">
                    {formatMoney(s.sales)} · {s.orders} order
                    {s.orders === 1 ? "" : "s"}
                  </p>
                  <p className="tabular-nums text-background/70">{formatMoney(s.commission)} commission</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-0.5 text-[11px] text-muted-foreground" aria-hidden="true">
            {series.map((s, i) => (
              <span
                key={`${s.label}-${i}`}
                className={cn(
                  "flex-1 whitespace-nowrap",
                  i === 0 ? "text-left" : i === series.length - 1 ? "text-right" : "text-center",
                )}
              >
                {labelled.has(i) ? s.label : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

/** A round number just above the tallest column: 1,840 → 2,000. */
function niceCeiling(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  return (steps.find((s) => s * magnitude >= value) ?? 10) * magnitude;
}

function compactRupees(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toLocaleString("en-IN", { maximumFractionDigits: 1 })}L`;
  if (value >= 1000) return `₹${(value / 1000).toLocaleString("en-IN", { maximumFractionDigits: 1 })}K`;
  return `₹${value}`;
}
