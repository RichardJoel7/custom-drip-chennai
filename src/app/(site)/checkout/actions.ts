"use server";

import { revalidatePath } from "next/cache";
import { COUPON_CODE_PATTERN, couponErrorMessage, normalizeCouponCode } from "@/lib/coupons/codes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { savedDetailsSchema, type SavedCheckoutDetails } from "@/lib/validations/checkout";

export async function saveCheckoutDetails(values: SavedCheckoutDetails): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Please sign in to save your details." };

  const parsed = savedDetailsSchema.safeParse(values);
  if (!parsed.success) return { error: "Please check the details you entered." };

  const d = parsed.data;
  const { error } = await supabase.from("saved_checkout_details").upsert(
    {
      user_id: user.id,
      full_name: d.fullName,
      mobile_number: d.mobileNumber,
      email: d.email.toLowerCase(),
      address_line1: d.addressLine1,
      address_line2: d.addressLine2 || null,
      area: d.area || null,
      city: d.city,
      state: d.state,
      pincode: d.pincode,
      instagram_username: d.instagramUsername || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("saveCheckoutDetails failed:", error);
    return { error: "Couldn't save your details this time." };
  }

  revalidatePath("/account");
  return {};
}

export async function forgetCheckoutDetails(): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Please sign in first." };

  const { error } = await supabase.from("saved_checkout_details").delete().eq("user_id", user.id);
  if (error) {
    console.error("forgetCheckoutDetails failed:", error);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath("/account");
  return {};
}

export interface AppliedCoupon {
  code: string;
  percentOff: number;
  discount: number;
}

const COUPON_INVALID = "That coupon code isn't valid or has expired.";

/**
 * Shows the customer what a coupon takes off before they pay. Advisory only: the database
 * checks the code again, on the real subtotal, when the order is placed.
 */
export async function checkCoupon(input: {
  code: string;
  subtotal: number;
  email: string;
}): Promise<{ error?: string; coupon?: AppliedCoupon }> {
  const code = normalizeCouponCode(input.code ?? "");
  if (!COUPON_CODE_PATTERN.test(code)) return { error: COUPON_INVALID };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in to use a coupon." };

  const subtotal = Number(input.subtotal);
  if (!Number.isFinite(subtotal) || subtotal < 0) return { error: COUPON_INVALID };

  const { data, error } = await createAdminClient().rpc("coupon_check", {
    p_code: code,
    p_subtotal: subtotal,
    p_email: (input.email || user.email || "").trim(),
    p_lock: false,
  });
  if (error) {
    const message = couponErrorMessage(error.message);
    if (!message) console.error("coupon_check failed:", error);
    return { error: message ?? "Coupons can't be checked right now. Please try again." };
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { out_code: string; out_percent_off: number; out_discount: number | string }
    | undefined;
  if (!row) return { error: COUPON_INVALID };
  return { coupon: { code: row.out_code, percentOff: row.out_percent_off, discount: Number(row.out_discount) } };
}
