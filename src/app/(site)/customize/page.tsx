import type { Metadata } from "next";
import { CustomStudio } from "@/components/custom/custom-studio";
import { PrintPlacementGuide } from "@/components/custom/print-placement-guide";
import { StudioHeroGarments } from "@/components/custom/studio-hero";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons/social-icons";
import { JsonLd } from "@/components/seo/json-ld";
import { LinkButton } from "@/components/ui/button";
import { studioHeroData } from "@/lib/custom/studio-hero";
import { breadcrumbSchema, customPrintingSchema } from "@/lib/seo/schema";
import { SHARE_IMAGE } from "@/lib/seo/site";
import { whatsappUrl } from "@/lib/utils/contact-links";
import { getCustomCatalog, getMyUploads, getStudioDesigns } from "@/services/custom-studio";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = {
  title: "Custom T-Shirt Printing in Chennai — Design Your Own Tee Online",
  description:
    "Design your own custom T-shirt online with Custom Drip Chennai. Place a print of any size anywhere on the front or back, add a chest print or logo, and use our designs or upload your own photo. Printed in Chennai, shipped across India.",
  alternates: { canonical: "/customize" },
  openGraph: {
    title: "Custom T-Shirt Printing in Chennai — Design Your Own Tee",
    description: "Design your own tee online — any print size, anywhere on the front or back, with your own artwork.",
    url: "/customize",
    images: [SHARE_IMAGE],
  },
};

const OWN_ARTWORK_MESSAGE =
  "Hi Custom Drip Chennai team!\nI'd like to print my own artwork on a T-shirt. Could you please help me?";

const STEPS = [
  { title: "Build it", description: "Pick a colour, your prints and designs from the hub or your own — see it live." },
  { title: "We print it", description: "Your tee is printed on order in Chennai with premium, wash-tested inks." },
  { title: "It ships", description: "Packed and shipped to your door in 3–7 business days, pan India." },
];

export default async function CustomizePage({ searchParams }: PageProps<"/customize">) {
  const [settings, { catalog, status }, designs, uploads, params] = await Promise.all([
    getSettings(),
    getCustomCatalog(),
    getStudioDesigns(),
    getMyUploads(),
    searchParams,
  ]);

  // Cheapest price across every garment that's fully set up; none set up = studio not ready.
  const { fromPrice, tees } = studioHeroData(catalog, status);
  const studioReady = fromPrice !== null;

  // ?garment=hoodie opens the studio on that garment (for menu and banner links).
  const garmentSlug = typeof params.garment === "string" ? params.garment : undefined;
  const initialGarmentId = catalog.garments.find((g) => g.slug === garmentSlug)?.id;
  const draft = typeof params.draft === "string" ? params.draft : undefined;

  const artworkHref = settings.whatsapp_number ? whatsappUrl(settings.whatsapp_number, OWN_ARTWORK_MESSAGE) : null;

  return (
    <div className="pb-24 lg:pb-0">
      <JsonLd
        data={[
          customPrintingSchema(fromPrice),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Custom T-Shirt Printing", path: "/customize" },
          ]),
        ]}
      />
      {/* HERO */}
      <section className="relative -mt-16 overflow-hidden bg-foreground pt-16 text-background">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="inline-flex rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
              Custom Studio
            </span>
            <h1 className="mt-5 font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              DESIGN YOUR
              <br />
              OWN TEE
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-background/70 sm:text-lg">
              Pick a colour, choose where it prints and drop in a design from our hub or your own — then watch your
              tee come to life before you order.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <LinkButton href="#studio" variant="secondary" size="lg">
                Start Designing
              </LinkButton>
              <LinkButton
                href="#placements"
                variant="outline"
                size="lg"
                className="border-background/40 text-background hover:bg-background hover:text-foreground"
              >
                Print Placements
              </LinkButton>
            </div>
            {fromPrice !== null && (
              <p className="mt-6 text-sm text-background/60">
                Custom tees from <span className="font-semibold text-background">₹{fromPrice.toLocaleString("en-IN")}</span>{" "}
                · front print included
              </p>
            )}
          </div>

          {tees && (
            <div className="relative mx-auto grid w-full max-w-lg grid-cols-2 gap-4" aria-hidden="true">
              <StudioHeroGarments tees={tees} />
            </div>
          )}
        </div>
      </section>

      {/* STUDIO */}
      <section id="studio" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6 sm:py-16">
        {studioReady ? (
          <CustomStudio
            key={initialGarmentId ?? "default"}
            catalog={catalog}
            designs={designs}
            uploads={uploads}
            ownArtworkHref={artworkHref}
            initialGarmentId={initialGarmentId}
            initialDraft={draft}
          />
        ) : (
          <div className="mx-auto max-w-xl rounded-3xl border border-border p-8 text-center">
            <h2 className="font-display text-2xl tracking-wide">THE STUDIO IS BEING SET UP</h2>
            <p className="mt-2 text-muted-foreground">
              Online customization opens soon. Until then, send us your idea and we&apos;ll quote you a price and
              turnaround.
            </p>
          </div>
        )}
      </section>

      <PrintPlacementGuide requestHref={artworkHref} />

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center font-display text-3xl tracking-wide sm:text-4xl">HOW IT WORKS</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="rounded-3xl border border-border p-6">
              <span className="font-display text-3xl text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-3 font-display text-xl tracking-wide">{step.title.toUpperCase()}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* OWN ARTWORK / BULK */}
      <section className="border-t border-border bg-muted">
        <div className="mx-auto max-w-2xl px-4 py-14 text-center sm:px-6">
          <h2 className="font-display text-3xl tracking-wide">GOT YOUR OWN DESIGN?</h2>
          <p className="mt-3 text-muted-foreground">
            A name and number, your own artwork, or a bulk order for your team? Send us your idea and we&apos;ll quote
            you a price and turnaround.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {artworkHref && (
              <LinkButton href={artworkHref} external size="lg">
                <WhatsAppIcon className="h-5 w-5" />
                WhatsApp Us
              </LinkButton>
            )}
            <LinkButton href={settings.instagram_url} external variant="outline" size="lg">
              <InstagramIcon className="h-5 w-5" />
              Message on Instagram
            </LinkButton>
          </div>
        </div>
      </section>
    </div>
  );
}
