import { LinkButton } from "@/components/ui/button";
import { InstagramIcon } from "@/components/icons/social-icons";
import type { Metadata } from "next";
import Link from "next/link";
import { StudioBannerSlide } from "@/components/custom/studio-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { HeroCarousel, type HeroSlide } from "@/components/home/hero-carousel";
import { ReviewGallery } from "@/components/home/review-gallery";
import { Tee360Story } from "@/components/home/tee-360-story";
import { ProductGrid } from "@/components/products/product-grid";
import { studioHeroData } from "@/lib/custom/studio-hero";
import { businessSchema } from "@/lib/seo/schema";
import { getCustomCatalog } from "@/services/custom-studio";
import { getFeaturedProducts } from "@/services/products";
import { getSettings } from "@/services/settings";
// Prepared from review-screenshots/ by scripts/build-reviews.mjs (runs before `npm run dev` / `build`).
import reviewGallery from "@/lib/reviews/reviews.json";
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

      {/* REVIEWS — customers' messages and photos as a fan of cards; tap one to open it */}
      <ReviewGallery reviews={reviewGallery.reviews} />

      {/* WHY CUSTOM DRIP CHENNAI — the tee turns 360° as you scroll */}
      <Tee360Story />

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
