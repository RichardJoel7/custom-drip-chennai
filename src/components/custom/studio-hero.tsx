import { GarmentMockup } from "@/components/custom/garment-mockup";
import { colorPhotosOf } from "@/lib/custom/mockup";
import type { StudioHeroTees } from "@/lib/custom/studio-hero";
import { cn } from "@/lib/utils/cn";

const HERO_PRINTS = {
  a4: { key: "a4", printArea: { width_cm: 21, height_cm: 29.7, front_placement: "center" as const }, label: "A4 · 21 × 29.7 cm" },
  a3: { key: "a3", printArea: { width_cm: 29.7, height_cm: 42, front_placement: "center" as const }, label: "A3 · 29.7 × 42 cm" },
};

/** The two garments on the Custom Studio banner: a light one with A4 on the front, a dark one with A3 on the back. */
export function StudioHeroGarments({
  tees,
  cardClassName,
  offsetClassName = "translate-y-8",
}: {
  tees: StudioHeroTees;
  cardClassName?: string;
  /** Drops the second garment a little, so the pair looks staggered. */
  offsetClassName?: string;
}) {
  return (
    <>
      <div className={cn("rounded-3xl bg-background/[0.06] p-3", cardClassName)}>
        <GarmentMockup
          spec={tees.spec}
          colorPhotos={colorPhotosOf(tees.light)}
          colorHex={tees.light.hex}
          view="front"
          prints={[HERO_PRINTS.a4]}
          showGuide
          className="w-full"
        />
      </div>
      <div className={cn("rounded-3xl bg-background/[0.06] p-3", cardClassName, offsetClassName)}>
        <GarmentMockup
          spec={tees.spec}
          colorPhotos={colorPhotosOf(tees.dark)}
          colorHex={tees.dark.hex}
          view="back"
          prints={[HERO_PRINTS.a3]}
          showGuide
          className="w-full"
        />
      </div>
    </>
  );
}

/**
 * The Custom Studio banner as a home page slide. It fills the carousel's fixed artwork shape
 * (wide on tablets/desktop, tall on phones) and scales with it like the image slides do, so it
 * uses container units (cqw) rather than fixed text sizes. The whole slide is the link, so the
 * "button" here is only styled like one.
 */
export function StudioBannerSlide({ tees, fromPrice }: { tees: StudioHeroTees | null; fromPrice: number | null }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-foreground text-background [container-type:size]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[10cqw] top-1/2 h-[80cqh] w-[60cqw] -translate-y-1/2 rounded-full bg-accent/10 blur-3xl"
      />
      <div className="relative flex h-full flex-col px-[7cqw] pb-[12cqw] pt-24 sm:flex-row sm:items-center sm:gap-[4cqw] sm:pb-[3cqw] sm:pt-16">
        {/* copy */}
        <div className="sm:w-[46cqw] sm:flex-none">
          <span className="inline-flex rounded-full border border-accent/40 bg-accent/10 px-[3.5cqw] py-[1.4cqw] text-[2.6cqw] font-bold uppercase tracking-[0.2em] text-accent sm:px-[1.1cqw] sm:py-[0.45cqw] sm:text-[0.8cqw]">
            Custom Studio
          </span>
          <p className="mt-[4cqw] font-display text-[11cqw] leading-[0.95] tracking-tight sm:mt-[1.4cqw] sm:text-[5.2cqw]">
            DESIGN YOUR
            <br />
            OWN TEE
          </p>
          <p className="mt-[1.4cqw] hidden max-w-[36cqw] text-[1.15cqw] leading-relaxed text-background/70 lg:block">
            Pick a colour, place your prints anywhere and drop in a design from our hub or your own — then watch your
            tee come to life before you order.
          </p>
          <span className="mt-[5cqw] inline-flex items-center rounded-full bg-accent px-[6cqw] py-[3cqw] text-[3.8cqw] font-semibold uppercase tracking-wide text-accent-foreground sm:mt-[2cqw] sm:px-[2.2cqw] sm:py-[1cqw] sm:text-[1.1cqw]">
            Start designing →
          </span>
          {fromPrice !== null && (
            <p className="mt-[3.5cqw] text-[3.3cqw] text-background/60 sm:mt-[1.3cqw] sm:text-[0.95cqw]">
              Custom tees from{" "}
              <span className="font-semibold text-background">₹{fromPrice.toLocaleString("en-IN")}</span> · front
              print included
            </p>
          )}
        </div>

        {/* phones: a few selling points, centred so the carousel arrows sit either side */}
        <ul className="mx-auto mt-[9cqw] w-fit space-y-[2.2cqw] text-[3.7cqw] font-semibold text-background/85 sm:hidden">
          {["Any print size, anywhere", "Upload your own artwork", "Printed in Chennai"].map((point) => (
            <li key={point} className="flex items-center gap-[2.2cqw]">
              <span className="flex h-[5cqw] w-[5cqw] items-center justify-center rounded-full bg-accent text-[3cqw] text-accent-foreground">
                ✓
              </span>
              {point}
            </li>
          ))}
        </ul>

        {/* garments */}
        {tees && (
          <div className="mt-auto grid w-full grid-cols-2 gap-[4cqw] sm:mt-0 sm:w-auto sm:flex-1 sm:gap-[1.6cqw] sm:pb-[2cqw]">
            <StudioHeroGarments
              tees={tees}
              cardClassName="p-[2.5cqw] sm:p-[1cqw]"
              offsetClassName="translate-y-[5cqw] sm:translate-y-[2.4cqw]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
