import Image from "next/image";
import { LinkButton } from "@/components/ui/button";
import { ProductGrid } from "@/components/products/product-grid";
import { getFeaturedProducts } from "@/services/products";
import { getSettings } from "@/services/settings";

export default async function HomePage() {
  const [products, settings] = await Promise.all([getFeaturedProducts(8), getSettings()]);
  const heroImage = products[0]?.product_images.find((i) => i.is_main) ?? products[0]?.product_images[0];

  return (
    <div>
      {/* HERO */}
      <section className="relative flex min-h-[85vh] items-end overflow-hidden bg-foreground text-background sm:min-h-[90vh]">
        {heroImage && (
          <Image
            src={heroImage.image_url}
            alt=""
            fill
            priority
            className="object-cover opacity-70"
          />
        )}
        <div className="relative z-10 w-full px-4 pb-12 sm:px-6 sm:pb-20">
          <h1 className="font-display text-5xl leading-[0.95] tracking-wide sm:text-7xl lg:text-8xl">
            WEAR YOUR
            <br />
            DRIP.
          </h1>
          <p className="mt-4 max-w-md text-base text-background/85 sm:text-lg">
            Original graphic tees from Custom Drip Chennai.
          </p>
          <LinkButton href="/shop" variant="secondary" size="lg" className="mt-6">
            Shop the Drop
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
