import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — uses the public anon key only.
 * Row Level Security (see supabase/migrations/0003_rls.sql) governs exactly what this
 * client can read/write. Never import the service-role key here.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
