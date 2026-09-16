import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Supabase client bound to the current request's auth cookies.
 * Uses the anon key — RLS + is_admin() decide what an authenticated admin can do.
 * Use this for all admin-panel reads/writes (Server Components, Server Actions, Route Handlers).
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component without a response to write to.
            // Safe to ignore when middleware is refreshing the session on every request.
          }
        },
      },
    }
  );
}
