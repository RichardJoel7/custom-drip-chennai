import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * ONLY use this for the narrow cases that must work without exposing customer/order data
 * through RLS to anyone but its owner:
 *   1. Placing an order (place_order RPC) at checkout.
 *   2. Looking up an order by its secret tracking token on the /track page.
 *   3. Linking a signed-in customer's own row by their already-verified auth email
 *      (linkCustomerAccount) — RLS has no customer self-UPDATE policy, so this is the one
 *      write customers ever get, and it's scoped to their own email by the caller.
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
