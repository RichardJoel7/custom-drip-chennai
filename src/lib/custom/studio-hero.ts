import { colorLightness, garmentSpec, isLightColor } from "@/lib/custom/mockup";
import { garmentFromPrice, isGarmentReady, optionsForGarment } from "@/lib/custom/pricing";
import type { CatalogStatus } from "@/services/custom-studio";
import type { CustomCatalog, CustomTeeColor, MockupSpec } from "@/types";

export interface StudioHeroTees {
  spec: MockupSpec;
  light: CustomTeeColor;
  dark: CustomTeeColor;
}

/**
 * What the Custom Studio banner shows (on /customize and as the home page's first slide): the
 * cheapest price across ready garments, and the first garment in a light colour and a rich dark
 * one (not black, which would vanish into the dark banner).
 */
export function studioHeroData(catalog: CustomCatalog, status: CatalogStatus) {
  const ready =
    status === "ready" ? catalog.garments.filter((g) => isGarmentReady(g, optionsForGarment(catalog, g.id))) : [];
  const prices = ready
    .map((g) => garmentFromPrice(optionsForGarment(catalog, g.id)))
    .filter((p): p is number => p !== null);

  const garment = ready[0];
  const spec = garment ? garmentSpec(garment) : null;
  const colors = garment ? optionsForGarment(catalog, garment.id).colors : [];
  const light = colors.find((c) => isLightColor(c.hex)) ?? colors[0];
  const dark =
    colors.find((c) => !isLightColor(c.hex) && colorLightness(c.hex) > 0.12) ??
    colors.find((c) => !isLightColor(c.hex)) ??
    light;

  return {
    fromPrice: prices.length > 0 ? Math.min(...prices) : null,
    tees: spec && light && dark ? ({ spec, light, dark } satisfies StudioHeroTees) : null,
  };
}
