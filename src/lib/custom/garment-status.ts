import { garmentSpec } from "@/lib/custom/mockup";
import { PRINT_SIDE_LIST, optionsForGarment, sidePrice } from "@/lib/custom/pricing";
import type { CustomCatalog, CustomGarment } from "@/types";

/**
 * The admin's checklist for one garment (from the admin catalog, which includes hidden rows):
 * what's in place and what's still needed before customers can buy it.
 */
export function garmentChecklist(catalog: CustomCatalog, garment: CustomGarment) {
  const options = optionsForGarment(catalog, garment.id);
  const photosReady = garmentSpec(garment) !== null;

  return [
    {
      key: "photos",
      label: "Front & back photos with print areas",
      done: photosReady,
      note: photosReady ? undefined : "upload both photos and save",
    },
    { key: "colours", label: "At least one live colour", done: options.colors.some((c) => c.is_active) },
    { key: "sizes", label: "At least one live size", done: options.sizes.some((s) => s.is_active) },
    {
      key: "prints",
      label: "At least one print size offered",
      done: options.printOptions.some((o) => o.is_active && PRINT_SIDE_LIST.some((s) => sidePrice(o, s) !== null)),
    },
  ];
}

const MISSING_LABEL: Record<string, string> = {
  photos: "both photos",
  colours: "a colour",
  sizes: "a size",
  prints: "a print size",
};

export function garmentMissing(catalog: CustomCatalog, garment: CustomGarment) {
  return garmentChecklist(catalog, garment)
    .filter((item) => !item.done)
    .map((item) => MISSING_LABEL[item.key]);
}
