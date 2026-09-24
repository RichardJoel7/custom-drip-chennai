"use server";

import { revalidatePath } from "next/cache";
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
