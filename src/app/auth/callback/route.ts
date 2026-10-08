import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Completes Google/OAuth sign-in: exchanges the redirect code for a session cookie. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  // Only paths on this site: "//host" or "/\host" would send the shopper elsewhere.
  const nextParam = searchParams.get("next") ?? "/";
  const next = /^\/(?![/\\])/.test(nextParam) ? nextParam : "/";

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // A relative Location keeps the shopper on the address they signed in from. request.url can't
  // be used to build it: behind Hostinger's proxy it carries the server's own https://0.0.0.0:3000.
  return new NextResponse(null, { status: 307, headers: { Location: next } });
}
