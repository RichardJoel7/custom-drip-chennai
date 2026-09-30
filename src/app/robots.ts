import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { isStaging } from "@/lib/utils/app-env";

export default function robots(): MetadataRoute.Robots {
  if (isStaging) return { rules: { userAgent: "*", disallow: "/" } };

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // private or per-customer pages: nothing useful for search results
        disallow: [
          "/admin",
          "/api",
          "/auth",
          "/account",
          "/cart",
          "/checkout",
          "/login",
          "/order-success",
          "/track",
          "/wishlist",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
