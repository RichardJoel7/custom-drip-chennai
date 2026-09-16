import type { NextConfig } from "next";

function supabaseRemotePattern(): { protocol: "http" | "https"; hostname: string; port?: string } | null {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return {
      protocol: url.protocol === "http:" ? "http" : "https",
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
    };
  } catch {
    return null;
  }
}

const supabasePattern = supabaseRemotePattern();

// The local Supabase CLI serves storage from a private IP (127.0.0.1), which Next.js's
// image optimizer blocks by default as an SSRF precaution. That protection only matters
// for a real, publicly reachable Supabase project (always a public https hostname in
// production) — so it's safe to relax purely for local development against 127.0.0.1.
const isLocalSupabase = supabasePattern?.hostname === "127.0.0.1" || supabasePattern?.hostname === "localhost";

const nextConfig: NextConfig = {
  images: {
    ...(isLocalSupabase ? { dangerouslyAllowLocalIP: true } : {}),
    remotePatterns: [
      // Covers both a hosted Supabase project (https) and the local Supabase CLI (http,
      // 127.0.0.1) used during local development.
      ...(supabasePattern ? [{ ...supabasePattern, pathname: "/storage/v1/object/public/**" as const }] : []),
      // Demo/placeholder product images only — safe to remove once real products are uploaded.
      { protocol: "https" as const, hostname: "placehold.co" },
    ],
  },
};

export default nextConfig;
