import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo/site";
import type { ProductWithDetails, Settings } from "@/types";

// schema.org descriptions of the business and its pages, rendered with <JsonLd>.

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

function sameAs(settings: Settings) {
  return [settings.instagram_url].filter((url): url is string => !!url && /^https?:/i.test(url));
}

/** The brand (logo, social profiles) and the store itself: a clothing store in Chennai serving all of India. */
export function businessSchema(settings: Settings) {
  const telephone = settings.contact_number ?? settings.whatsapp_number ?? undefined;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl("/images/logo.png"),
      sameAs: sameAs(settings),
    },
    {
      "@context": "https://schema.org",
      "@type": "ClothingStore",
      "@id": `${SITE_URL}/#store`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      image: absoluteUrl("/opengraph-image.jpg"),
      logo: absoluteUrl("/images/logo.png"),
      ...(telephone ? { telephone } : {}),
      priceRange: "₹₹",
      currenciesAccepted: "INR",
      paymentAccepted: "UPI",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Chennai",
        addressRegion: "Tamil Nadu",
        addressCountry: "IN",
      },
      areaServed: [
        { "@type": "City", name: "Chennai" },
        { "@type": "Country", name: "India" },
      ],
      parentOrganization: { "@id": ORGANIZATION_ID },
      sameAs: sameAs(settings),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: "en-IN",
      publisher: { "@id": ORGANIZATION_ID },
    },
  ];
}

/** Home › Shop › Product style trail shown under the result in Google. */
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** A product with its price and stock, for price/availability in search results. */
export function productSchema(product: ProductWithDetails) {
  const url = absoluteUrl(`/product/${product.slug}`);
  const images = [...product.product_images]
    .sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.sort_order - b.sort_order)
    .map((image) => image.image_url);
  const inStock = product.product_variants.some((v) => v.stock_quantity > 0);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? `${product.name} — original graphic T-shirt by ${SITE_NAME}.`,
    image: images,
    sku: product.id,
    url,
    brand: { "@type": "Brand", name: SITE_NAME },
    ...(product.category ? { category: product.category } : {}),
    ...(product.fabric ? { material: product.fabric } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      price: Number(product.price).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": ORGANIZATION_ID },
    },
  };
}

/** The Custom Studio as a service: custom T-shirt printing in Chennai, from a starting price. */
export function customPrintingSchema(fromPrice: number | null) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Custom T-shirt printing",
    serviceType: "Custom T-shirt printing",
    url: absoluteUrl("/customize"),
    description:
      "Design your own T-shirt online: pick a garment and colour, place a custom-size print anywhere on the front or back, add a chest print or logo, and use our designs or upload your own. Printed on order in Chennai and shipped across India.",
    provider: { "@id": ORGANIZATION_ID },
    areaServed: [
      { "@type": "City", name: "Chennai" },
      { "@type": "Country", name: "India" },
    ],
    ...(fromPrice !== null
      ? { offers: { "@type": "Offer", priceCurrency: "INR", price: fromPrice.toFixed(2), url: absoluteUrl("/customize") } }
      : {}),
  };
}
