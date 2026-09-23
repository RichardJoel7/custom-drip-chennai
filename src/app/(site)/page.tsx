import { LinkButton } from "@/components/ui/button";
import { InstagramIcon } from "@/components/icons/social-icons";
import { HeroCarousel, type HeroSlide } from "@/components/home/hero-carousel";
import { ProductGrid } from "@/components/products/product-grid";
import { getFeaturedProducts } from "@/services/products";
import { getSettings } from "@/services/settings";
// Static imports get content-hashed URLs, so replacing a file never serves a stale cached copy.
import heroMain from "../../../public/images/hero.jpg";
import heroMen from "../../../public/images/hero-2.png";
import heroWomen from "../../../public/images/hero-3.png";
import heroMenMobile from "../../../public/images/mobile-hero-men.jpeg";
import heroWomenMobile from "../../../public/images/mobile-hero-women.jpeg";

const HERO_SLIDES: HeroSlide[] = [
  { desktopSrc: heroMain, href: "/shop", label: "Shop", showHeading: true },
  { desktopSrc: heroMen, mobileSrc: heroMenMobile, href: "/shop?gender=men", label: "Shop Men's" },
  { desktopSrc: heroWomen, mobileSrc: heroWomenMobile, href: "/shop?gender=women", label: "Shop Women's" },
];

export default async function HomePage() {
  const [products, settings] = await Promise.all([getFeaturedProducts(8), getSettings()]);

  return (
    <div>
      <HeroCarousel
        slides={HERO_SLIDES}
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
