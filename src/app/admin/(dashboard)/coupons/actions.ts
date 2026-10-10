"use server";

import { revalidatePath } from "next/cache";
import { COUPON_CODE_PATTERN, normalizeCouponCode } from "@/lib/coupons/codes";
import { requireAdmin } from "@/lib/supabase/require-admin";

export interface CouponInput {
  code: string;
  percentOff: number;
  /** "2026-12-31": valid to the end of that day in India; "" for no end date. */
  expiresOn: string;
  minOrderAmount: number | null;
  maxUses: number | null;
  oncePerCustomer: boolean;
}

const GENERIC_ERROR = "Something went wrong while saving. Please try again.";

export async function createCoupon(input: CouponInput): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();

  const code = normalizeCouponCode(input.code ?? "");
  if (!COUPON_CODE_PATTERN.test(code)) {
    return { error: "Use 3–30 letters, numbers, - or _ for the code (e.g. DRIP10)." };
  }
  if (!Number.isInteger(input.percentOff) || input.percentOff < 1 || input.percentOff > 90) {
    return { error: "Enter a discount between 1% and 90%." };
  }
  if (input.expiresOn && !/^\d{4}-\d{2}-\d{2}$/.test(input.expiresOn)) return { error: "Choose a valid end date." };
  const expiresAt = input.expiresOn ? `${input.expiresOn}T23:59:59+05:30` : null;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return { error: "The end date has already passed." };
  if (input.minOrderAmount !== null && !(input.minOrderAmount >= 0)) return { error: "Enter a valid minimum order amount." };
  if (input.maxUses !== null && !(Number.isInteger(input.maxUses) && input.maxUses > 0)) {
    return { error: "Enter how many times it can be used (1 or more), or leave it empty." };
  }

  const { error } = await supabase.from("coupons").insert({
    code,
    percent_off: input.percentOff,
    expires_at: expiresAt,
    min_order_amount: input.minOrderAmount,
    max_uses: input.maxUses,
    once_per_customer: input.oncePerCustomer,
  });
  if (error) {
    if (error.code === "23505") return { error: `There's already a coupon called ${code}.` };
    console.error("createCoupon failed:", error);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/admin/coupons");
  return {};
}

export async function setCouponActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("coupons").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: GENERIC_ERROR };
  revalidatePath("/admin/coupons");
  return {};
}

/** Orders keep the code and discount they used, so deleting a coupon doesn't change them. */
export async function deleteCoupon(id: string): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) return { error: GENERIC_ERROR };
  revalidatePath("/admin/coupons");
  return {};
}
