/**
 * Uploaded files (product photos, designs, garment photos, customers' artwork) live in
 * Cloudflare R2 under "<bucket>/<path>" and are served from NEXT_PUBLIC_FILES_URL
 * (https://files.customdripchennai.com on live). `storage_path` columns hold the <path> part.
 */
export type StorageBucket = "product-images" | "customer-designs";

export const FILES_URL = (process.env.NEXT_PUBLIC_FILES_URL ?? "").trim().replace(/\/+$/, "");

export function fileUrl(bucket: StorageBucket, path: string) {
  return `${FILES_URL}/${bucket}/${path}`;
}

/** True for files served from our own storage (not legacy Supabase Storage links). */
export function isStoredFileUrl(url: string) {
  return !!FILES_URL && url.startsWith(`${FILES_URL}/`);
}

/** A one-time link the browser uploads the file to, with the headers it must send. */
export interface UploadTicket {
  uploadUrl: string;
  headers: Record<string, string>;
  url: string;
  storagePath: string;
}

export const UPLOAD_CONTENT_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
