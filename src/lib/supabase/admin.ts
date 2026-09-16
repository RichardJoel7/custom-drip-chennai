import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * ONLY use this for the two narrow cases that must work for anonymous guests without
 * exposing customer/order data through RLS:
 *   1. Placing an order (place_order RPC) at checkout.
 *   2. Looking up an order by its secret tracking token on the /track page.
 *
 * The `server-only` import guarantees a build-time error if this module is ever imported
 * from client/browser code. Never send SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
