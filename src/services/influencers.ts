import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Period } from "@/lib/influencers/periods";
import type { Coupon, Influencer, InfluencerOrder, InfluencerPayout } from "@/types";

// Everything here goes through the signed-in user's session: admins read the tables (RLS
// is_admin()), influencers only through the my_influencer_* functions, which return their own
// numbers and nothing else. Until 0020_influencers.sql has run, admins see `ready: false` and
// nobody is an influencer.

export interface InfluencerTotals {
  orders: number;
  /** What customers paid for the items after the discount, excluding shipping. */
  sales: number;
  /** Payable: orders delivered. */
  earned: number;
  /** Paid but not delivered yet. */
  pending: number;
  /** Paid out so far. */
  paid: number;
  /** Earned minus paid out (negative after a cancelled order that was already paid for). */
  due: number;
}

export interface InfluencerCode {
  code: string;
  percent_off: number;
  is_active: boolean;
}

const num = (value: unknown) => Number(value ?? 0) || 0;
const round2 = (n: number) => Math.round(n * 100) / 100;

function withDue(t: Omit<InfluencerTotals, "due">): InfluencerTotals {
  return { ...t, sales: round2(t.sales), earned: round2(t.earned), pending: round2(t.pending), paid: round2(t.paid), due: round2(t.earned - t.paid) };
}

// --- the signed-in influencer -----------------------------------------------------------------

/** For the header: is the signed-in user an influencer? */
export async function isInfluencer(): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("my_influencer_id");
  return !error && !!data;
}

export interface MyInfluencer {
  name: string;
  instagram: string | null;
  commission_percent: number;
  commission_fixed: number;
  is_active: boolean;
  codes: InfluencerCode[];
}

export async function getMyInfluencer(): Promise<MyInfluencer | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("my_influencer");
  const row = !error && Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  return {
    name: row.name,
    instagram: row.instagram,
    commission_percent: num(row.commission_percent),
    commission_fixed: num(row.commission_fixed),
    is_active: row.is_active,
    codes: ((row.codes ?? []) as InfluencerCode[]).map((c) => ({ ...c, percent_off: num(c.percent_off) })),
  };
}

export async function getMyInfluencerOrders(period: Period): Promise<InfluencerOrder[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("my_influencer_orders", {
    p_from: period.from.toISOString(),
    p_to: period.to.toISOString(),
  });
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => ({
    placedAt: row.placed_at,
    orderRef: row.order_ref,
    couponCode: row.coupon_code,
    sale: num(row.sale),
    commission: num(row.commission),
    status: row.status === "earned" ? "earned" : "pending",
  }));
}

export async function getMyInfluencerTotals(): Promise<InfluencerTotals> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.rpc("my_influencer_totals");
  const row = Array.isArray(data) ? data[0] : null;
  return withDue({
    orders: num(row?.orders),
    sales: num(row?.sales),
    earned: num(row?.earned),
    pending: num(row?.pending),
    paid: num(row?.paid),
  });
}

export async function getMyInfluencerPayouts(): Promise<Pick<InfluencerPayout, "amount" | "paid_on" | "note">[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.rpc("my_influencer_payouts");
  return Array.isArray(data) ? data.map((p) => ({ amount: num(p.amount), paid_on: p.paid_on, note: p.note })) : [];
}

// --- admin ------------------------------------------------------------------------------------

export interface AdminInfluencer extends Influencer {
  codes: Coupon[];
  totals: InfluencerTotals;
}

type CountedOrder = { influencer_id: string; subtotal: number; discount_amount: number; influencer_commission: number | null; order_status: string };

/** Paid, not cancelled: the orders that count. */
const COUNTED = "influencer_id, subtotal, discount_amount, influencer_commission, order_status";

function totalsFor(id: string, orders: CountedOrder[], payouts: { influencer_id: string; amount: number }[]) {
  const mine = orders.filter((o) => o.influencer_id === id);
  return withDue({
    orders: mine.length,
    sales: mine.reduce((sum, o) => sum + Math.max(num(o.subtotal) - num(o.discount_amount), 0), 0),
    earned: mine.filter((o) => o.order_status === "delivered").reduce((sum, o) => sum + num(o.influencer_commission), 0),
    pending: mine.filter((o) => o.order_status !== "delivered").reduce((sum, o) => sum + num(o.influencer_commission), 0),
    paid: payouts.filter((p) => p.influencer_id === id).reduce((sum, p) => sum + num(p.amount), 0),
  });
}

function toInfluencer(row: Influencer): Influencer {
  return { ...row, commission_percent: num(row.commission_percent), commission_fixed: num(row.commission_fixed) };
}

/** Every influencer with their codes and all-time totals. */
export async function getInfluencersForAdmin(): Promise<{ ready: boolean; influencers: AdminInfluencer[] }> {
  const supabase = await createServerSupabaseClient();
  const [influencers, coupons, orders, payouts] = await Promise.all([
    supabase.from("influencers").select("*").order("created_at", { ascending: false }),
    supabase.from("coupons").select("*").not("influencer_id", "is", null).order("created_at"),
    supabase.from("orders").select(COUNTED).not("influencer_id", "is", null).eq("payment_status", "paid").neq("order_status", "cancelled"),
    supabase.from("influencer_payouts").select("influencer_id, amount"),
  ]);
  if (influencers.error) return { ready: false, influencers: [] };

  return {
    ready: true,
    influencers: (influencers.data as Influencer[]).map((row) => ({
      ...toInfluencer(row),
      codes: ((coupons.data ?? []) as Coupon[]).filter((c) => c.influencer_id === row.id),
      totals: totalsFor(row.id, (orders.data ?? []) as CountedOrder[], (payouts.data ?? []) as { influencer_id: string; amount: number }[]),
    })),
  };
}

export interface AdminInfluencerDetail {
  influencer: AdminInfluencer;
  payouts: InfluencerPayout[];
  /** Codes not given to anyone yet, which can be given to this influencer. */
  freeCoupons: Coupon[];
}

export async function getInfluencerForAdmin(id: string): Promise<AdminInfluencerDetail | null> {
  const supabase = await createServerSupabaseClient();
  const [influencer, coupons, orders, payouts, free] = await Promise.all([
    supabase.from("influencers").select("*").eq("id", id).maybeSingle(),
    supabase.from("coupons").select("*").eq("influencer_id", id).order("created_at"),
    supabase.from("orders").select(COUNTED).eq("influencer_id", id).eq("payment_status", "paid").neq("order_status", "cancelled"),
    supabase.from("influencer_payouts").select("*").eq("influencer_id", id).order("paid_on", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("coupons").select("*").is("influencer_id", null).order("created_at", { ascending: false }),
  ]);
  if (influencer.error || !influencer.data) return null;

  const payoutRows = ((payouts.data ?? []) as InfluencerPayout[]).map((p) => ({ ...p, amount: num(p.amount) }));
  return {
    influencer: {
      ...toInfluencer(influencer.data as Influencer),
      codes: (coupons.data ?? []) as Coupon[],
      totals: totalsFor(id, (orders.data ?? []) as CountedOrder[], payoutRows),
    },
    payouts: payoutRows,
    freeCoupons: (free.data ?? []) as Coupon[],
  };
}

/** The influencer's orders in a period, with full order numbers for the admin. */
export async function getInfluencerOrdersForAdmin(id: string, period: Period): Promise<InfluencerOrder[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, created_at, coupon_code, subtotal, discount_amount, influencer_commission, order_status")
    .eq("influencer_id", id)
    .eq("payment_status", "paid")
    .neq("order_status", "cancelled")
    .gte("created_at", period.from.toISOString())
    .lt("created_at", period.to.toISOString())
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error || !data) return [];
  return data.map((o) => ({
    placedAt: o.created_at,
    orderRef: o.order_number,
    orderId: o.id,
    couponCode: o.coupon_code,
    sale: Math.max(num(o.subtotal) - num(o.discount_amount), 0),
    commission: num(o.influencer_commission),
    status: o.order_status === "delivered" ? "earned" : "pending",
  }));
}
