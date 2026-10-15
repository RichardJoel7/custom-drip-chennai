"use server";

import { revalidatePath } from "next/cache";
import { COUPON_CODE_PATTERN, normalizeCouponCode } from "@/lib/coupons/codes";
import { requireAdmin } from "@/lib/supabase/require-admin";

type Result = { error?: string };

export interface InfluencerInput {
  name: string;
  email: string;
  instagram: string;
  /** % of the items after the discount, excluding shipping. */
  commissionPercent: number;
  /** ₹ per order. */
  commissionFixed: number;
}

export interface CodeInput {
  code: string;
  /** The customer's discount; ignored when giving them a code that already exists. */
  percentOff: number;
}

const GENERIC_ERROR = "Something went wrong while saving. Please try again.";

function checkInfluencer(input: InfluencerInput): { error: string } | { row: Record<string, unknown> } {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const instagram = input.instagram.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/+$/, "");
  if (!name || name.length > 80) return { error: "Enter their name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter the email they'll sign in with." };
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) return { error: "Enter their Instagram username, e.g. wils.styles." };
  const percent = Number(input.commissionPercent);
  const fixed = Number(input.commissionFixed);
  if (!(percent >= 0 && percent <= 100)) return { error: "Commission % must be between 0 and 100." };
  if (!(fixed >= 0 && fixed <= 100000)) return { error: "Enter a valid amount per order (₹)." };
  return {
    row: {
      name,
      email,
      instagram: instagram || null,
      commission_percent: Math.round(percent * 100) / 100,
      commission_fixed: Math.round(fixed * 100) / 100,
    },
  };
}

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

/**
 * Gives an influencer a code: a new coupon, or an existing one nobody has yet (its earlier
 * orders then count for them too).
 */
async function giveCode(supabase: Supabase, influencerId: string, input: CodeInput): Promise<Result> {
  const code = normalizeCouponCode(input.code ?? "");
  if (!COUPON_CODE_PATTERN.test(code)) return { error: "Use 3–30 letters, numbers, - or _ for the code (e.g. WILS10)." };

  const { data: existing, error: lookupError } = await supabase.from("coupons").select("id, influencer_id").eq("code", code).maybeSingle();
  if (lookupError) return { error: GENERIC_ERROR };

  if (existing) {
    if (existing.influencer_id && existing.influencer_id !== influencerId) {
      return { error: `${code} already belongs to another influencer.` };
    }
    const { error } = await supabase.from("coupons").update({ influencer_id: influencerId }).eq("id", existing.id);
    if (error) return { error: GENERIC_ERROR };
  } else {
    if (!Number.isInteger(input.percentOff) || input.percentOff < 1 || input.percentOff > 90) {
      return { error: "Enter the customer's discount, between 1% and 90%." };
    }
    const { error } = await supabase.from("coupons").insert({ code, percent_off: input.percentOff, influencer_id: influencerId });
    if (error) {
      console.error("giving an influencer code failed:", error);
      return { error: GENERIC_ERROR };
    }
  }

  const { error: claimError } = await supabase.rpc("influencer_claim_orders", { p_influencer_id: influencerId });
  if (claimError) console.error("influencer_claim_orders failed:", claimError);
  return {};
}

function refresh(id?: string) {
  revalidatePath("/admin/influencers");
  revalidatePath("/admin/coupons");
  if (id) revalidatePath(`/admin/influencers/${id}`);
}

export async function createInfluencer(input: InfluencerInput & { code: CodeInput }): Promise<Result & { id?: string }> {
  const { supabase } = await requireAdmin();
  const checked = checkInfluencer(input);
  if ("error" in checked) return checked;

  // check the code before adding anyone, so a taken code doesn't leave a half-made influencer
  const code = normalizeCouponCode(input.code.code ?? "");
  if (!COUPON_CODE_PATTERN.test(code)) return { error: "Use 3–30 letters, numbers, - or _ for the code (e.g. WILS10)." };
  const { data: taken } = await supabase.from("coupons").select("influencer_id").eq("code", code).maybeSingle();
  if (taken?.influencer_id) return { error: `${code} already belongs to another influencer.` };
  if (!taken && !(Number.isInteger(input.code.percentOff) && input.code.percentOff >= 1 && input.code.percentOff <= 90)) {
    return { error: "Enter the customer's discount, between 1% and 90%." };
  }

  const { data, error } = await supabase.from("influencers").insert(checked.row).select("id").single();
  if (error || !data) {
    if (error?.code === "23505") return { error: "That email is already on your influencer list." };
    console.error("createInfluencer failed:", error);
    return { error: GENERIC_ERROR };
  }

  const given = await giveCode(supabase, data.id, input.code);
  refresh(data.id);
  return given.error ? { id: data.id, error: `Added ${checked.row.name}, but: ${given.error}` } : { id: data.id };
}

export async function updateInfluencer(id: string, input: InfluencerInput & { isActive: boolean }): Promise<Result> {
  const { supabase } = await requireAdmin();
  const checked = checkInfluencer(input);
  if ("error" in checked) return checked;
  const { error } = await supabase
    .from("influencers")
    .update({ ...checked.row, is_active: input.isActive })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "Another influencer already uses that email." };
    return { error: GENERIC_ERROR };
  }
  refresh(id);
  return {};
}

export async function addInfluencerCode(id: string, input: CodeInput): Promise<Result> {
  const { supabase } = await requireAdmin();
  const result = await giveCode(supabase, id, input);
  refresh(id);
  return result;
}

/** Their earlier orders stay theirs; new orders with the code no longer count for them. */
export async function removeInfluencerCode(influencerId: string, couponId: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("coupons").update({ influencer_id: null }).eq("id", couponId).eq("influencer_id", influencerId);
  if (error) return { error: GENERIC_ERROR };
  refresh(influencerId);
  return {};
}

export async function recordPayout(id: string, input: { amount: number; paidOn: string; note: string }): Promise<Result> {
  const { supabase } = await requireAdmin();
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!(amount > 0 && amount <= 10000000)) return { error: "Enter the amount you paid." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paidOn)) return { error: "Choose the date you paid." };
  const note = input.note.trim().slice(0, 200) || null;
  const { error } = await supabase.from("influencer_payouts").insert({ influencer_id: id, amount, paid_on: input.paidOn, note });
  if (error) {
    console.error("recordPayout failed:", error);
    return { error: GENERIC_ERROR };
  }
  refresh(id);
  return {};
}

export async function deletePayout(influencerId: string, payoutId: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("influencer_payouts").delete().eq("id", payoutId).eq("influencer_id", influencerId);
  if (error) return { error: GENERIC_ERROR };
  refresh(influencerId);
  return {};
}
