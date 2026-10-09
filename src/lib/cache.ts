import "server-only";
import { unstable_cache, updateTag } from "next/cache";

/**
 * Tag on every cached catalogue read visitors see: products, the custom studio's options and
 * designs, and store settings (services/*). Cached for an hour at most; admin changes clear it
 * straight away.
 */
export const CATALOG_TAG = "catalog";
export const CATALOG_MAX_AGE_SECONDS = 3600;

/** In a Server Action, after an admin change: the next visit reads the catalogue fresh. */
export function refreshCatalog() {
  updateTag(CATALOG_TAG);
}

/**
 * Caches a public catalogue read across visitors. Throw inside `read` when Supabase errors:
 * a thrown read is never cached, so a hiccup isn't remembered for an hour.
 */
export function catalogCache<Args extends unknown[], Result>(key: string, read: (...args: Args) => Promise<Result>) {
  return unstable_cache(read, [key], { tags: [CATALOG_TAG], revalidate: CATALOG_MAX_AGE_SECONDS });
}
