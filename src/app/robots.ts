import type { MetadataRoute } from "next";
import { isStaging } from "@/lib/utils/app-env";

export default function robots(): MetadataRoute.Robots {
  if (isStaging) return { rules: { userAgent: "*", disallow: "/" } };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/order-success", "/track"] },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
