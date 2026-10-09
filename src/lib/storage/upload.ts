import { requestCatalogUpload, requestDesignUpload } from "@/lib/storage/actions";
import type { UploadTicket } from "@/lib/storage/files";

const UPLOAD_FAILED = "Upload failed. Please check your connection and try again.";

/** Sends the file to the link the server signed (straight to R2, not through our server). */
async function send(ticket: UploadTicket, blob: Blob) {
  const response = await fetch(ticket.uploadUrl, { method: "PUT", headers: ticket.headers, body: blob }).catch(() => null);
  if (!response?.ok) throw new Error(UPLOAD_FAILED);
  return { url: ticket.url, storagePath: ticket.storagePath };
}

/** Admin: uploads one catalogue image into product-images/<folder>/. */
export async function uploadCatalogFile(blob: Blob, folder: string, contentType: string) {
  const { ticket, error } = await requestCatalogUpload({ folder, contentType, size: blob.size });
  if (!ticket) throw new Error(error ?? UPLOAD_FAILED);
  return send(ticket, blob);
}

/** Signed-in customer: uploads their artwork into customer-designs/<their id>/. */
export async function uploadDesignFile(blob: Blob, contentType: string) {
  const { ticket, error } = await requestDesignUpload({ contentType, size: blob.size });
  if (!ticket) throw new Error(error ?? UPLOAD_FAILED);
  return send(ticket, blob);
}
