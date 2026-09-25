import type { Metadata } from "next";
import { CustomStudio } from "@/components/custom/custom-studio";
import { GarmentMockup } from "@/components/custom/garment-mockup";
import { PrintPlacementGuide } from "@/components/custom/print-placement-guide";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons/social-icons";
import { LinkButton } from "@/components/ui/button";
import { colorLightness, colorPhotosOf, garmentSpec, isLightColor } from "@/lib/custom/mockup";
import { garmentFromPrice, isGarmentReady, optionsForGarment } from "@/lib/custom/pricing";
import { whatsappUrl } from "@/lib/utils/contact-links";
import { getCustomCatalog, getMyUploads, getStudioDesigns } from "@/services/custom-studio";
import { getSettings } from "@/services/settings";

const HERO_PRINTS = {
  a4: { key: "a4", printArea: { width_cm: 21, height_cm: 29.7, front_placement: "center" as const }, label: "A4 · 21 × 29.7 cm" },
  a3: { key: "a3", printArea: { width_cm: 29.7, height_cm: 42, front_placement: "center" as const }, label: "A3 · 29.7 × 42 cm" },
};

export const metadata: Metadata = {
  title: "Custom Studio — Design Your Own Tee",
  description:
    "Design your own custom T-shirt with Custom Drip Chennai. Pick a colour, add prints on the front and back, and use a design from our Design Hub or upload your own.",
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
  const readyGarments =
    status === "ready" ? catalog.garments.filter((g) => isGarmentReady(g, optionsForGarment(catalog, g.id))) : [];
  const garmentPrices = readyGarments
    .map((g) => garmentFromPrice(optionsForGarment(catalog, g.id)))
    .filter((p): p is number => p !== null);
  const studioReady = garmentPrices.length > 0;
  const fromPrice = studioReady ? Math.min(...garmentPrices) : null;

  // ?garment=hoodie opens the studio on that garment (for menu and banner links).
  const garmentSlug = typeof params.garment === "string" ? params.garment : undefined;
  const initialGarmentId = catalog.garments.find((g) => g.slug === garmentSlug)?.id;
  const draft = typeof params.draft === "string" ? params.draft : undefined;

  // The hero shows the first garment in a light colour (A4 on the front) and a rich dark one (A3 on
  // the back) — not black, which would vanish into the dark hero.
  const heroGarment = readyGarments[0];
  const heroSpec = heroGarment ? garmentSpec(heroGarment) : null;
  const heroColors = heroGarment ? optionsForGarment(catalog, heroGarment.id).colors : [];
  const heroLight = heroColors.find((c) => isLightColor(c.hex)) ?? heroColors[0];
  const heroDark =
    heroColors.find((c) => !isLightColor(c.hex) && colorLightness(c.hex) > 0.12) ??
    heroColors.find((c) => !isLightColor(c.hex)) ??
    heroLight;

  const artworkHref = settings.whatsapp_number ? whatsappUrl(settings.whatsapp_number, OWN_ARTWORK_MESSAGE) : null;

  return (
    <div className="pb-24 lg:pb-0">
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
                · printing charges included
              </p>
            )}
          </div>

          {heroSpec && heroLight && heroDark && (
            <div className="relative mx-auto grid w-full max-w-lg grid-cols-2 gap-4" aria-hidden="true">
              <div className="rounded-3xl bg-background/[0.06] p-3">
                <GarmentMockup
                  spec={heroSpec}
                  colorPhotos={colorPhotosOf(heroLight)}
                  colorHex={heroLight.hex}
                  view="front"
                  prints={[HERO_PRINTS.a4]}
                  showGuide
                  className="w-full"
                />
              </div>
              <div className="translate-y-8 rounded-3xl bg-background/[0.06] p-3">
                <GarmentMockup
                  spec={heroSpec}
                  colorPhotos={colorPhotosOf(heroDark)}
                  colorHex={heroDark.hex}
                  view="back"
                  prints={[HERO_PRINTS.a3]}
                  showGuide
                  className="w-full"
                />
              </div>
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
