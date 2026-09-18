import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { LinkButton } from "@/components/ui/button";
import { InstagramIcon } from "@/components/icons/social-icons";
import { ProductGrid } from "@/components/products/product-grid";
import { getFeaturedProducts } from "@/services/products";
import { getSettings } from "@/services/settings";

export default async function HomePage() {
  const [products, settings] = await Promise.all([getFeaturedProducts(8), getSettings()]);
  const fallbackHeroImage = products[0]?.product_images.find((i) => i.is_main) ?? products[0]?.product_images[0];

  // Prefer a brand hero photo dropped at public/images/hero.jpg; fall back to the first
  // featured product's photo, then to a flat background if neither exists yet.
  const hasCustomHero = existsSync(path.join(process.cwd(), "public", "images", "hero.jpg"));
  const heroSrc = hasCustomHero ? "/images/hero.jpg" : fallbackHeroImage?.image_url;

  return (
    <div>
      {/* HERO */}
      <section className="relative -mt-16 flex min-h-[90vh] items-end overflow-hidden bg-foreground text-white sm:min-h-screen">
        {heroSrc && <Image src={heroSrc} alt="" fill priority className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/50" />

        <div className="relative z-10 w-full px-4 pb-10 text-center sm:px-6 sm:pb-16">
          <div className="relative">
            <span
              aria-hidden="true"
              className="text-outline-white font-sans pointer-events-none absolute inset-0 flex translate-y-2 select-none items-center justify-center text-[clamp(3.25rem,14vw,10.5rem)] font-black leading-[0.9] tracking-tight [font-stretch:85%] sm:translate-y-3"
            >
              DRIPPIN&apos;
            </span>
            <h1 className="relative font-sans text-[clamp(3.25rem,14vw,10.5rem)] font-black leading-[0.9] tracking-tight [font-stretch:85%]">
              DRIPPIN&apos;
            </h1>
          </div>
          <p className="mx-auto mt-4 max-w-md text-base text-white/85 sm:text-lg">
            Original graphic tees from Custom Drip Chennai.
          </p>
          <LinkButton href="/shop" variant="glass" size="sm" className="mt-6">
            Shop
          </LinkButton>
        </div>
      </section>

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
