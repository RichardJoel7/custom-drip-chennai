"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Whether this email already has a confirmed account (password or Google), so sign-up can
 * send them to sign in instead. If the check can't run (e.g. 0013 not applied yet), sign-up
 * carries on as normal.
 */
export async function emailHasAccount(email: string): Promise<boolean> {
  const clean = email.trim().toLowerCase();
  if (!clean || clean.length > 320) return false;
  const { data, error } = await createAdminClient().rpc("email_has_account", { p_email: clean });
  if (error) {
    console.error("email_has_account failed:", error.message);
    return false;
  }
  return data === true;
}
