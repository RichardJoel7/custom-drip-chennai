import { LinkButton } from "@/components/ui/button";
import { InstagramIcon } from "@/components/icons/social-icons";
import type { Metadata } from "next";
import Link from "next/link";
import { StudioBannerSlide } from "@/components/custom/studio-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { HeroCarousel, type HeroSlide } from "@/components/home/hero-carousel";
import { ProductGrid } from "@/components/products/product-grid";
import { studioHeroData } from "@/lib/custom/studio-hero";
import { businessSchema } from "@/lib/seo/schema";
import { getCustomCatalog } from "@/services/custom-studio";
import { getFeaturedProducts } from "@/services/products";
import { getSettings } from "@/services/settings";
// Static imports get content-hashed URLs, so replacing a file never serves a stale cached copy.
import heroShop from "../../../public/images/hero-1.jpeg";
import heroShopMobile from "../../../public/images/mobile-hero-shop.jpeg";
import heroMen from "../../../public/images/hero-2.png";
import heroWomen from "../../../public/images/hero-3.png";
import heroMenMobile from "../../../public/images/mobile-hero-men.jpeg";
import heroWomenMobile from "../../../public/images/mobile-hero-women.jpeg";
import heroCustomize from "../../../public/images/hero-4.jpg";
import heroCustomizeMobile from "../../../public/images/mobile-hero-customize.jpg";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const HERO_SLIDES: HeroSlide[] = [
  { desktopSrc: heroCustomize, mobileSrc: heroCustomizeMobile, href: "/customize", label: "Customize Yourself" },
  { desktopSrc: heroShop, mobileSrc: heroShopMobile, href: "/shop", label: "Shop" },
  { desktopSrc: heroMen, mobileSrc: heroMenMobile, href: "/shop?gender=men", label: "Shop Men's" },
  { desktopSrc: heroWomen, mobileSrc: heroWomenMobile, href: "/shop?gender=women", label: "Shop Women's" },
];

export default async function HomePage() {
  const [products, settings, { catalog, status }] = await Promise.all([
    getFeaturedProducts(8),
    getSettings(),
    getCustomCatalog(),
  ]);

  // The Custom Studio banner closes the carousel whenever the studio is open for orders.
  const studio = studioHeroData(catalog, status);
  const slides: HeroSlide[] =
    studio.fromPrice !== null
      ? [
          ...HERO_SLIDES,
          {
            content: <StudioBannerSlide tees={studio.tees} fromPrice={studio.fromPrice} />,
            href: "/customize",
            label: "Design your own tee in the Custom Studio",
          },
        ]
      : HERO_SLIDES;

  return (
    <div>
      <JsonLd data={businessSchema(settings)} />
      <h1 className="sr-only">Custom Drip Chennai — Custom T-Shirt Printing in Chennai and Original Graphic Tees</h1>
      <HeroCarousel
        slides={slides}
        desktopAspect={heroMen.width / heroMen.height}
        mobileAspect={heroMenMobile.width / heroMenMobile.height}
      />

      {/* FEATURED / LATEST DROP */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-3xl tracking-wide sm:text-4xl">LATEST DROP</h2>
          <a href="/shop" className="text-sm font-semibold uppercase tracking-wide underline underline-offset-4">
            View all
          </a>
        </div>
        <ProductGrid products={products} />
      </section>

      {/* WHY CUSTOM DRIP CHENNAI */}
      <section className="border-y border-border bg-muted">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-3xl tracking-wide sm:text-4xl">
            WHY CUSTOM DRIP CHENNAI
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {WHY_US.map((item) => (
              <div key={item.title}>
                <p className="font-display text-lg tracking-wide">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CUSTOM PRINTING IN CHENNAI — what people search for */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <h2 className="font-display text-3xl tracking-wide sm:text-4xl">CUSTOM T-SHIRT PRINTING IN CHENNAI</h2>
            <p className="mt-4 text-muted-foreground">
              Design your own T-shirt online in minutes. Pick your tee and colour, place a custom-size print anywhere
              on the front or back, add a chest print or logo, and use one of our designs or upload your own photo or
              artwork. Every order is printed in Chennai and shipped across India.
            </p>
            <p className="mt-3 text-muted-foreground">
              Need tees for your company, college, event or team? We do bulk and corporate T-shirt printing too.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <LinkButton href="/customize" size="lg">
              Design Your Tee
            </LinkButton>
            <LinkButton href="/bulk-orders" variant="outline" size="lg">
              Bulk Orders
            </LinkButton>
          </div>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Prefer something ready-made?{" "}
          <Link href="/shop" className="font-semibold text-foreground underline underline-offset-4">
            Shop our original graphic tees
          </Link>
          .
        </p>
      </section>

      {/* INSTAGRAM */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <h2 className="font-display text-3xl tracking-wide sm:text-4xl">FOLLOW THE DRIP</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          New drops, behind-the-scenes prints, and customer fits — first on Instagram.
        </p>
        <LinkButton href={settings.instagram_url} variant="primary" size="lg" className="mt-6">
          <InstagramIcon className="h-5 w-5" />
          Follow Us on Instagram
        </LinkButton>
      </section>
    </div>
  );
}

const WHY_US = [
  { title: "Original Designs", description: "Every print is designed in-house." },
  { title: "Quality Prints", description: "Durable, wash-tested prints." },
  { title: "Made to Order", description: "Printed fresh for every drop." },
  { title: "Chennai Based", description: "Small brand, big drip." },
  { title: "Pan India Shipping", description: "Delivered to your doorstep." },
];
