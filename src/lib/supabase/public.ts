import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Anon-key client with no visitor session, for public catalogue reads that are cached and
 * shared across visitors (see lib/cache.ts). RLS shows it exactly what any visitor may see.
 */
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
