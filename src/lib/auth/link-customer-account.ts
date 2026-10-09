import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Claims any pre-existing guest `customers` row (from an order placed before this account
 * existed) for the signed-in user, so their past orders show up under "My Orders" the
 * moment they sign in with the same email — not just orders placed after creating an
 * account. Matches by the user's own verified auth email; only ever links an unclaimed row,
 * never re-links one already tied to a different account. A no-op once already linked; the proxy
 * runs it once per signed-in user per browser.
 */
export async function linkCustomerAccount(user: { id: string; email?: string | null }): Promise<void> {
  if (!user.email) return;

  const supabase = createAdminClient();
  await supabase
    .from("customers")
    .update({ auth_user_id: user.id })
    .eq("email", user.email.toLowerCase())
    .is("auth_user_id", null);
}
