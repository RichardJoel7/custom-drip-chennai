import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Coupon } from "@/types";

export type AdminCoupon = Coupon & { expired: boolean };

/**
 * Admin-only (RLS is_admin()): every coupon, newest first, with how many orders used each
 * (failed and rejected orders don't count). `ready` is false until 0019_coupons.sql has run.
 */
export async function getCouponsForAdmin(): Promise<{ ready: boolean; coupons: AdminCoupon[]; uses: Record<string, number> }> {
  const supabase = await createServerSupabaseClient();
  const [coupons, used] = await Promise.all([
    supabase.from("coupons").select("*").order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("coupon_code")
      .not("coupon_code", "is", null)
      .not("payment_status", "in", "(failed,rejected)"),
  ]);
  if (coupons.error) return { ready: false, coupons: [], uses: {} };

  const uses: Record<string, number> = {};
  for (const row of (used.data ?? []) as { coupon_code: string }[]) uses[row.coupon_code] = (uses[row.coupon_code] ?? 0) + 1;

  const now = Date.now();
  return {
    ready: true,
    coupons: (coupons.data as Coupon[]).map((c) => ({
      ...c,
      min_order_amount: c.min_order_amount === null ? null : Number(c.min_order_amount),
      expired: !!c.expires_at && new Date(c.expires_at).getTime() <= now,
    })),
    uses,
  };
}
