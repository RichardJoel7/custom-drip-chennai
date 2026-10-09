"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CUSTOMER_DESIGN_BUCKET } from "@/lib/storage/customer-design-bucket";
import { fileUrl } from "@/lib/storage/files";
import { storedFileSize } from "@/lib/storage/r2";
import { uploadToStudioDesign } from "@/services/custom-studio";
import type { CustomerDesign, StudioDesign } from "@/types";

const UPLOADS_PER_HOUR = 30;

const toPixels = (n: unknown) => (typeof n === "number" && Number.isInteger(n) && n > 0 && n <= 20000 ? n : null);

/**
 * Records a design the customer just uploaded to their own storage folder, so it can be
 * printed. Rows are written here (never straight from the browser) so the stored URL is
 * always the real file in this customer's folder.
 */
export async function saveCustomerDesign(input: {
  storagePath: string;
  name: string;
  width: number | null;
  height: number | null;
}): Promise<{ error?: string; design?: StudioDesign }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in to upload your design." };

  const [folder, file, ...rest] = input.storagePath.split("/");
  if (folder !== user.id || !file || rest.length > 0 || !/^[A-Za-z0-9-]+\.(png|jpg|webp)$/.test(file)) {
    return { error: "That upload didn't work. Please try again." };
  }

  const admin = createAdminClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("customer_designs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= UPLOADS_PER_HOUR) {
    return { error: "You've uploaded a lot of designs in the last hour. Please try again a little later." };
  }

  // The file has to really be there, in this customer's own folder.
  const size = await storedFileSize(CUSTOMER_DESIGN_BUCKET, input.storagePath);
  if (!size) return { error: "The upload didn't finish. Please try again." };

  const { data, error } = await admin
    .from("customer_designs")
    .insert({
      user_id: user.id,
      name: input.name.trim().slice(0, 120) || "My design",
      image_url: fileUrl(CUSTOMER_DESIGN_BUCKET, input.storagePath),
      storage_path: input.storagePath,
      width: toPixels(input.width),
      height: toPixels(input.height),
    })
    .select("*")
    .single();
  if (error || !data) {
    console.error("saveCustomerDesign failed:", error);
    return { error: "Something went wrong while saving your design. Please try again." };
  }

  return { design: uploadToStudioDesign(data as CustomerDesign) };
}
