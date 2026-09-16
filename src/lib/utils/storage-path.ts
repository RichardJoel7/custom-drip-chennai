const BUCKET_MARKER = "/product-images/";

/** Extracts the storage object path from a Supabase Storage public URL. */
export function extractStoragePath(url: string): string | null {
  const idx = url.indexOf(BUCKET_MARKER);
  if (idx === -1) return null;
  return url.slice(idx + BUCKET_MARKER.length);
}
