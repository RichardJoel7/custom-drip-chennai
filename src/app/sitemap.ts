import type { MetadataRoute } from "next";
import { getActiveProducts } from "@/services/products";

const STATIC_PATHS = [
  "",
  "/shop",
  "/about",
  "/contact",
  "/size-guide",
  "/shipping-policy",
  "/returns",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const products = await getActiveProducts();

  return [
    ...STATIC_PATHS.map((path) => ({
      url: `${siteUrl}${path}`,
      lastModified: new Date(),
    })),
    ...products.map((product) => ({
      url: `${siteUrl}/product/${product.slug}`,
      lastModified: new Date(product.updated_at),
    })),
  ];
}
