import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid } from "@/components/products/product-grid";
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
  searchParams: Promise<{ gender?: string; collection?: string }>;
}) {
  const { gender: rawGender, collection } = await searchParams;
  const gender = isGender(rawGender) ? rawGender : undefined;
  const products = await getActiveProducts({ gender, collection });

  const heading = collection
    ? collection.toUpperCase()
    : gender
      ? `${gender === "men" ? "MEN'S" : "WOMEN'S"}`
      : "SHOP";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-display text-4xl tracking-wide sm:text-5xl">{heading}</h1>
      <div className="mt-2 flex items-center gap-3">
        <p className="text-muted-foreground">{products.length} tees in stock</p>
        {(gender || collection) && (
          <Link href="/shop" className="text-sm font-semibold uppercase tracking-wide underline underline-offset-4">
            Clear filter
          </Link>
        )}
      </div>
      <div className="mt-8">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
