import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

/**
 * Claims any pre-existing guest `customers` row (from an order placed before this account
 * existed) for the signed-in user, so their past orders show up under "My Orders" the
 * moment they sign in with the same email — not just orders placed after creating an
 * account. Matches by the user's own verified auth email; only ever links an unclaimed row,
 * never re-links one already tied to a different account. Safe to call on every page load —
 * a no-op once already linked.
 */
export async function linkCustomerAccount(user: User): Promise<void> {
  if (!user.email) return;

  const supabase = createAdminClient();
  await supabase
    .from("customers")
    .update({ auth_user_id: user.id })
    .eq("email", user.email.toLowerCase())
    .is("auth_user_id", null);
}
