import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SavedCheckoutDetails } from "@/lib/validations/checkout";

interface SavedDetailsRow {
  full_name: string;
  mobile_number: string;
  email: string;
  address_line1: string;
  address_line2: string | null;
  area: string | null;
  city: string;
  state: string;
  pincode: string;
  instagram_username: string | null;
}

/** The signed-in customer's saved delivery details (RLS: own row only). Null if none — or if 0010 hasn't been run. */
export async function getSavedCheckoutDetails(userId: string): Promise<SavedCheckoutDetails | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("saved_checkout_details")
    .select(
      "full_name, mobile_number, email, address_line1, address_line2, area, city, state, pincode, instagram_username"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as SavedDetailsRow;

  return {
    fullName: row.full_name,
    mobileNumber: row.mobile_number,
    email: row.email,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2 ?? "",
    area: row.area ?? "",
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    instagramUsername: row.instagram_username ?? "",
  };
}
