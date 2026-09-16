"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";

export interface SettingsInput {
  storeName: string;
  instagramUrl: string;
  contactNumber: string;
  whatsappNumber: string;
  upiId: string;
  upiDisplayName: string;
  upiQrImageUrl: string;
  standardShippingFee: number;
  freeShippingThreshold: number;
}

export async function updateSettings(input: SettingsInput): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();

  if (!input.storeName.trim()) return { error: "Store name can't be empty." };
  if (!(input.standardShippingFee >= 0)) return { error: "Enter a valid shipping fee." };
  if (!(input.freeShippingThreshold >= 0)) return { error: "Enter a valid free shipping threshold." };

  const { error } = await supabase
    .from("settings")
    .update({
      store_name: input.storeName.trim(),
      instagram_url: input.instagramUrl.trim(),
      contact_number: input.contactNumber.trim() || null,
      whatsapp_number: input.whatsappNumber.trim() || null,
      upi_id: input.upiId.trim() || null,
      upi_display_name: input.upiDisplayName.trim() || null,
      upi_qr_image_url: input.upiQrImageUrl || null,
      standard_shipping_fee: input.standardShippingFee,
      free_shipping_threshold: input.freeShippingThreshold,
    })
    .eq("id", 1);

  if (error) {
    console.error("updateSettings failed:", error);
    return { error: "Something went wrong while saving settings. Please try again." };
  }

  revalidatePath("/", "layout");
  return {};
}
