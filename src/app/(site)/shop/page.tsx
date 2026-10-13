import type { Metadata } from "next";
import { ShopBrowser } from "@/components/products/shop-browser";
import { filtersFromParams, shopQueryString } from "@/lib/products/shop-filters";
import { getActiveProducts } from "@/services/products";

export const revalidate = 60;

function isGender(value: string | undefined): value is "men" | "women" {
  return value === "men" || value === "women";
}

// Men's and women's pages get their own title and address in search; collections point back to them.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ gender?: string; collection?: string }>;
}): Promise<Metadata> {
  const { gender: rawGender } = await searchParams;
  const gender = isGender(rawGender) ? rawGender : undefined;
  if (!gender) {
    return {
      title: "Shop Graphic T-Shirts",
      description:
        "Shop original graphic T-shirts and oversized streetwear tees from Custom Drip Chennai. Printed in Chennai, delivered across India.",
      alternates: { canonical: "/shop" },
    };
  }
  const who = gender === "men" ? "Men's" : "Women's";
  return {
    title: `${who} Graphic T-Shirts`,
    description: `${who} graphic and oversized T-shirts from Custom Drip Chennai — original prints, made in Chennai, shipped across India.`,
    alternates: { canonical: `/shop?gender=${gender}` },
  };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Every live tee: search, filters and sort narrow them down in the browser (ShopBrowser).
  const products = await getActiveProducts();
  const initial = filtersFromParams(params);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* A new address from the menu (e.g. Men's → THALA) starts over from its filters. */}
      <ShopBrowser key={shopQueryString(initial)} products={products} initial={initial} />
    </div>
  );
}
