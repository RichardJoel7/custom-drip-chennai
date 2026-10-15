// Reporting periods for the influencer dashboard, in Indian time (UTC+05:30, no daylight
// saving): days start at midnight in India and weeks on Monday. Pure, so it's safe anywhere.
import type { InfluencerOrder } from "@/types";

export type PeriodKey = "today" | "week" | "month" | "last-month" | "year" | "all" | "custom";

export const PERIODS: { key: Exclude<PeriodKey, "custom">; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
];

export interface Period {
  key: PeriodKey;
  label: string;
  /** Start, inclusive. */
  from: Date;
  /** End, exclusive. */
  to: Date;
  /** How the chart groups orders. */
  bucket: "day" | "month" | null;
  /** For the custom-dates form: "2026-10-01". */
  fromDate: string;
  toDate: string;
}

const IST_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** The shop's first day; "All time" starts here. */
const BEGINNING = Date.UTC(2026, 0, 1) - IST_MS;
const MAX_CUSTOM_DAYS = 3 * 366;

/** A moment's calendar date in India. */
function istDate(time: number) {
  const d = new Date(time + IST_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), weekday: (d.getUTCDay() + 6) % 7 };
}

/** Midnight in India on a calendar date, as a moment. */
function istMidnight(y: number, m: number, d: number) {
  return Date.UTC(y, m, d) - IST_MS;
}

const isoDay = (time: number) => {
  const { y, m, d } = istDate(time);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

function parseDay(value: string | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  const time = istMidnight(y, m, d);
  return isoDay(time) === value ? time : null; // rejects 2026-02-31
}

/** The period asked for in the address (?period=month, or ?from=…&to=…); "This month" otherwise. */
export function resolvePeriod(params: { period?: string; from?: string; to?: string }, now = Date.now()): Period {
  const today = istDate(now);
  const startOfToday = istMidnight(today.y, today.m, today.d);
  const end = now + 1; // up to this moment
  const make = (key: PeriodKey, label: string, from: number, to: number, bucket: Period["bucket"]): Period => ({
    key,
    label,
    from: new Date(from),
    to: new Date(to),
    bucket,
    fromDate: isoDay(from),
    toDate: isoDay(Math.max(from, to - 1)),
  });

  const customFrom = parseDay(params.from);
  const customTo = parseDay(params.to);
  if (customFrom !== null && customTo !== null && customFrom <= customTo) {
    const to = Math.min(customTo + DAY_MS, Math.max(end, customFrom + DAY_MS));
    const from = Math.max(customFrom, to - MAX_CUSTOM_DAYS * DAY_MS);
    const days = Math.round((to - from) / DAY_MS);
    const label = from === customTo ? isoLabel(from) : `${isoLabel(from)} – ${isoLabel(to - 1)}`;
    return make("custom", label, from, to, days <= 1 ? null : days <= 62 ? "day" : "month");
  }

  switch (params.period) {
    case "today":
      return make("today", "Today", startOfToday, end, null);
    case "week":
      return make("week", "This week", startOfToday - today.weekday * DAY_MS, end, "day");
    case "last-month": {
      const from = istMidnight(today.y, today.m - 1, 1);
      return make("last-month", "Last month", from, istMidnight(today.y, today.m, 1), "day");
    }
    case "year":
      return make("year", "This year", istMidnight(today.y, 0, 1), end, "month");
    case "all":
      return make("all", "All time", Math.min(BEGINNING, startOfToday), end, "month");
    default:
      return make("month", "This month", istMidnight(today.y, today.m, 1), end, "day");
  }
}

function isoLabel(time: number) {
  return new Date(time).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

export interface PeriodSummary {
  orders: number;
  sales: number;
  /** Earned plus pending. */
  commission: number;
  earned: number;
  pending: number;
  /** For the chart: one bar per day or month of the period. */
  series: { label: string; sales: number; commission: number; orders: number }[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Totals for the period, and the chart's bars (empty days included, so gaps show). */
export function summarize(orders: InfluencerOrder[], period: Period): PeriodSummary {
  const summary: PeriodSummary = { orders: 0, sales: 0, commission: 0, earned: 0, pending: 0, series: [] };
  const buckets = new Map<string, PeriodSummary["series"][number]>();

  if (period.bucket) {
    // "All time" starts its chart at the first order, not at the shop's first day
    const firstOrder = Math.min(...orders.map((o) => new Date(o.placedAt).getTime()));
    const start = istDate(period.key === "all" ? (orders.length ? firstOrder : Date.now()) : period.from.getTime());
    const last = period.to.getTime() - 1;
    if (period.bucket === "day") {
      for (let t = period.from.getTime(); t <= last; t += DAY_MS) {
        const { d, m } = istDate(t);
        buckets.set(isoDay(t), { label: `${d} ${MONTHS[m]}`, sales: 0, commission: 0, orders: 0 });
      }
    } else {
      for (let y = start.y, m = start.m; istMidnight(y, m, 1) <= last; m === 11 ? (y++, (m = 0)) : m++) {
        buckets.set(`${y}-${m}`, { label: `${MONTHS[m]} ${String(y).slice(2)}`, sales: 0, commission: 0, orders: 0 });
      }
    }
  }

  for (const order of orders) {
    summary.orders++;
    summary.sales += order.sale;
    summary.commission += order.commission;
    if (order.status === "earned") summary.earned += order.commission;
    else summary.pending += order.commission;

    const time = new Date(order.placedAt).getTime();
    const { y, m } = istDate(time);
    const bar = buckets.get(period.bucket === "day" ? isoDay(time) : `${y}-${m}`);
    if (bar) {
      bar.orders++;
      bar.sales += order.sale;
      bar.commission += order.commission;
    }
  }

  summary.sales = round2(summary.sales);
  summary.commission = round2(summary.commission);
  summary.earned = round2(summary.earned);
  summary.pending = round2(summary.pending);
  summary.series = [...buckets.values()].map((b) => ({ ...b, sales: round2(b.sales), commission: round2(b.commission) }));
  return summary;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "10% of order value + ₹20 per order", in plain words. */
export function commissionTerms(percent: number, fixed: number) {
  const parts = [
    percent > 0 && `${Number(percent)}% of the order value`,
    fixed > 0 && `₹${Number(fixed).toLocaleString("en-IN")} per order`,
  ].filter(Boolean);
  return parts.length ? parts.join(" + ") : "No commission set yet";
}
