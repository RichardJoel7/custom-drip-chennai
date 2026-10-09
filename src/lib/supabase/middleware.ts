import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { linkCustomerAccount } from "@/lib/auth/link-customer-account";
import { SITE_URL } from "@/lib/seo/site";

// Remembers (per browser) which signed-in user already had their guest orders linked.
const LINKED_COOKIE = "cdc_linked";

/**
 * Visitors on the bare domain go to the www address, so everyone shares one set of sign-in
 * cookies. Only applies when the site's address is a www one (the live site). The Host header
 * is used because request.url carries the server's own address behind Hostinger's proxy.
 */
function wwwRedirect(request: NextRequest) {
  const site = new URL(SITE_URL);
  if (!site.hostname.startsWith("www.")) return null;
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (host !== site.hostname.slice(4)) return null;
  return NextResponse.redirect(`${site.origin}${request.nextUrl.pathname}${request.nextUrl.search}`, 308);
}

/**
 * Sign-in cookies of a different Supabase project (e.g. the Tokyo one the live site used before
 * October 2026). They're dead weight, and Hostinger rejects requests whose Cookie header passes
 * ~8 KB with a 400 — two projects' sessions together can get there.
 */
function otherProjectAuthCookies(request: NextRequest) {
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  return request.cookies
    .getAll()
    .map((cookie) => cookie.name)
    .filter((name) => {
      const match = name.match(/^sb-(.+?)-auth-token/);
      return !!match && match[1] !== ref;
    });
}

/**
 * Refreshes the Supabase auth session on every request and blocks unauthenticated
 * access to /admin (except /admin/login). The actual "is this user an admin"
 * check happens again server-side (via is_admin() / the admins table) on every
 * admin page and Server Action — this middleware only keeps out logged-out visitors.
 */
export async function updateSession(request: NextRequest) {
  const redirect = wwwRedirect(request);
  if (redirect) return redirect;

  const staleCookies = otherProjectAuthCookies(request);
  staleCookies.forEach((name) => request.cookies.delete(name));
  const dropStale = (res: NextResponse) => {
    staleCookies.forEach((name) => res.cookies.delete(name));
    return res;
  };

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Checks the sign-in token's signature here, without a call to Supabase (the project signs
  // tokens with an asymmetric key); it only goes to Supabase when the token needs refreshing.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const isAdminPath = request.nextUrl.pathname.startsWith("/admin");
  const isLoginPath = request.nextUrl.pathname.startsWith("/admin/login");

  if (isAdminPath && !isLoginPath && !claims) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return dropStale(NextResponse.redirect(loginUrl));
  }

  // Once per user per browser, rather than on every page.
  if (claims?.sub && claims.email && request.cookies.get(LINKED_COOKIE)?.value !== claims.sub) {
    await linkCustomerAccount({ id: claims.sub, email: claims.email });
    response.cookies.set(LINKED_COOKIE, claims.sub, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.headers.get("x-forwarded-proto") === "https" || request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return dropStale(response);
}
