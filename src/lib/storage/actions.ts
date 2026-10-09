"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { CUSTOMER_DESIGN_BUCKET } from "@/lib/storage/customer-design-bucket";
import { createUploadTicket, deleteStoredFiles } from "@/lib/storage/r2";
import type { UploadTicket } from "@/lib/storage/files";

const MAX_CATALOG_BYTES = 20 * 1024 * 1024;
const MAX_DESIGN_UPLOAD_BYTES = 25 * 1024 * 1024;
const DESIGN_UPLOADS_PER_HOUR = 30;

const NOT_SET_UP = "File uploads aren't set up on this site yet.";

// "products/my-tee", "designs", "garments/<id>/colors", "settings/upi-qr"
const isCatalogFolder = (folder: string) =>
  /^[a-z0-9][a-z0-9_-]*(\/[A-Za-z0-9_-]+){0,3}$/.test(folder) && folder.length <= 120;

type TicketResult = { error?: string; ticket?: UploadTicket };

/** Admin: a link to upload one catalogue image (product photo, design, garment photo, UPI QR). */
export async function requestCatalogUpload(input: { folder: string; contentType: string; size: number }): Promise<TicketResult> {
  await requireAdmin();
  if (!isCatalogFolder(input.folder)) return { error: "Upload failed. Please try again." };
  if (input.size > MAX_CATALOG_BYTES) return { error: "That file is over 20 MB." };

  const ticket = await createUploadTicket("product-images", input.folder, input.contentType, input.size);
  return ticket ? { ticket } : { error: NOT_SET_UP };
}

/** Admin: removes files uploaded for something that then couldn't be saved. */
export async function discardCatalogUploads(paths: string[]): Promise<void> {
  await requireAdmin();
  await deleteStoredFiles("product-images", paths);
}

/** Signed-in customer: a link to upload their own artwork into their folder. */
export async function requestDesignUpload(input: { contentType: string; size: number }): Promise<TicketResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in to upload your design." };
  if (input.size > MAX_DESIGN_UPLOAD_BYTES) return { error: "That file is over 25 MB. Please use a smaller one." };

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await createAdminClient()
    .from("customer_designs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= DESIGN_UPLOADS_PER_HOUR) {
    return { error: "You've uploaded a lot of designs in the last hour. Please try again a little later." };
  }

  const ticket = await createUploadTicket(CUSTOMER_DESIGN_BUCKET, user.id, input.contentType, input.size);
  return ticket ? { ticket } : { error: NOT_SET_UP };
}
