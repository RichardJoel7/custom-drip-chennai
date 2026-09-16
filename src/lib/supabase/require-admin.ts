import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Call at the top of every admin Server Component / Server Action.
 * Redirects to /admin/login unless the current session belongs to a user listed in the
 * `admins` table. This is the real authorization check — the proxy (middleware) only
 * keeps out logged-out visitors, it does not know who is an admin.
 */
export async function requireAdmin() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("id, email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!admin) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=not_admin");
  }

  return { supabase, admin };
}
