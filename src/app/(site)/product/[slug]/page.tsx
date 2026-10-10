import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/products/product-gallery";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema, productSchema } from "@/lib/seo/schema";
import { ProductPurchasePanel } from "@/components/products/product-purchase-panel";
import {
  ProductDetailsAccordion,
  SizeGuideLink,
} from "@/components/products/product-details-accordion";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProductBySlug } from "@/services/products";
import { isProductWishlisted } from "@/services/wishlist";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };

  const mainImage = product.product_images.find((i) => i.is_main) ?? product.product_images[0];

  const description =
    product.description?.slice(0, 160) ??
    `${product.name} — original graphic T-shirt by Custom Drip Chennai. Printed in Chennai, shipped across India.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      url: `/product/${product.slug}`,
      ...(mainImage ? { images: [{ url: mainImage.image_url, alt: product.name }] } : {}),
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialIsFavorited = user ? await isProductWishlisted(user.id, product.id) : false;

  const details = [
    {
      title: "Product Details",
      content: (
        <ul className="space-y-1">
          {product.fabric && <li>Fabric: {product.fabric}</li>}
          {product.fit && <li>Fit: {product.fit}</li>}
          {product.gsm && <li>Fabric weight: {product.gsm}</li>}
          {product.print_type && <li>Print: {product.print_type}</li>}
          {!product.fabric && !product.fit && !product.gsm && !product.print_type && (
            <li>Premium quality cotton tee.</li>
          )}
        </ul>
      ),
    },
    {
      title: "Size Guide",
      content: (
        <p>
          Not sure of your size? <SizeGuideLink />
        </p>
      ),
    },
    {
      title: "Shipping",
      content: <p>Made to order and shipped pan-India. See our shipping policy for timelines.</p>,
    },
    {
      title: "Care Instructions",
      content: <p>{product.care_instructions ?? "Machine wash cold, inside out. Do not bleach."}</p>,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <JsonLd
        data={[
          productSchema(product),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Shop", path: "/shop" },
            { name: product.name, path: `/product/${product.slug}` },
          ]),
        ]}
      />
      <div className="grid gap-8 md:grid-cols-2 lg:gap-16">
        <ProductGallery images={product.product_images} productName={product.name} />
        <div>
          <ProductPurchasePanel product={product} initialIsFavorited={initialIsFavorited} />
          <div className="mt-8">
            <ProductDetailsAccordion sections={details} />
          </div>
        </div>
      </div>
    </div>
  );
}
