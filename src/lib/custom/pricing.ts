import { garmentSpec } from "@/lib/custom/mockup";
import type {
  CartItem,
  CmRect,
  CustomCatalog,
  CustomGarment,
  CustomPrintOption,
  CustomTeeColor,
  CustomTeeConfig,
  CustomTeeGsm,
  CustomTeeSize,
  PlacementConfig,
  PrintSide,
  PrintSides,
} from "@/types";

export const PRINT_SIDE_LIST: PrintSide[] = ["front", "back"];

export const SIDE_NAMES: Record<PrintSide, string> = { front: "Front", back: "Back" };

export const MAX_CUSTOM_QUANTITY = 20;

/** Most prints one garment can carry (place_order() allows the same). */
export const MAX_PRINTS = 8;

/** The smallest a custom-size print can be, each way (place_order() allows 2 cm). */
export const MIN_CUSTOM_CM = 3;

export function gsmLabel(gsm: number) {
  return `${gsm} GSM`;
}

/** A4, A3…: a garment with one ticked offers custom prints, which start at the smallest. */
export const isSizeOption = (option: Pick<CustomPrintOption, "kind">) => option.kind === "size";

/** Whether a print can go on a side: custom sizes front or back, fixed prints (chest, logo…) front only. */
export function isOffered(option: Pick<CustomPrintOption, "kind">, side: PrintSide) {
  return isSizeOption(option) || side === "front";
}

/** The garment's sizes (A4, A3…), smallest first. */
export function sizeTiers(printOptions: CustomPrintOption[]) {
  return printOptions
    .filter(isSizeOption)
    .sort((a, b) => a.width_cm * a.height_cm - b.width_cm * b.height_cm || a.sort_order - b.sort_order);
}

/** Fixed prints (chest, logo…), front only. */
export function fixedPrints(printOptions: CustomPrintOption[]) {
  return printOptions.filter((o) => !isSizeOption(o));
}

/** Whether a garment offers custom-size prints: it has at least one size (A4, A3…) ticked. */
export function offersCustomPrints(printOptions: CustomPrintOption[]) {
  return printOptions.some(isSizeOption);
}

/** A custom print's box within the limits place_order() accepts (any size, anywhere on the photo). */
export function isSaneRect(r: CmRect | null | undefined): r is CmRect {
  return !!r && r.w >= 2 && r.h >= 2 && r.w <= 200 && r.h <= 200 && Math.abs(r.x) <= 300 && Math.abs(r.y) <= 300;
}

/** How a custom print is described on the cart and order: its own box. */
export function customPrintSummary(rect: CmRect) {
  return { id: "custom", name: "Custom size", width_cm: rect.w, height_cm: rect.h, front_placement: "center" as const };
}

type PlacementLike = Pick<PlacementConfig, "side" | "kind"> & { printOptionId?: string | null; rect?: CmRect | null };

/**
 * Whether every print can be made: a custom print (one per side) on a garment that offers
 * them, a fixed print (each once) on the front. Mirrors place_order() in 0016.
 */
export function placementsValid(placements: PlacementLike[], printOptions: CustomPrintOption[]) {
  const seen = new Set<string>();
  for (const p of placements) {
    let ok: boolean;
    let key: string;
    if (p.kind === "custom") {
      ok = isSaneRect(p.rect) && offersCustomPrints(printOptions);
      key = `${p.side}:custom`;
    } else {
      const option = printOptions.find((o) => o.id === p.printOptionId);
      ok = !!option && !isSizeOption(option) && isOffered(option, p.side);
      key = `${p.side}:${p.printOptionId}`;
    }
    if (!ok || seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

/**
 * What the prints cost: front prints are included in the garment price, and anything on the
 * back is one flat price the admin sets. Null if there's a back print but no price is set.
 */
export function printsPrice(placements: { side: PrintSide }[], backPrintPrice: number | null): number | null {
  if (!placements.some((p) => p.side === "back")) return 0;
  return backPrintPrice;
}

export function sidesOf(placements: { side: PrintSide }[]): PrintSides | null {
  const front = placements.some((p) => p.side === "front");
  const back = placements.some((p) => p.side === "back");
  return front && back ? "both" : front ? "front" : back ? "back" : null;
}

/** "Brand Logo", or "Custom 20 × 28 cm" for a custom-size print. */
export function printDisplayName(print: { kind?: string; rect?: CmRect | null; name: string }) {
  return print.kind === "custom" && print.rect ? `Custom ${print.rect.w} × ${print.rect.h} cm` : print.name;
}

/** "Front: Chest Print + Brand Logo · Back: A3 Print" */
export function describePrints(prints: { side: PrintSide; name: string }[]) {
  return PRINT_SIDE_LIST.flatMap((side) => {
    const names = prints.filter((p) => p.side === side).map((p) => p.name);
    return names.length > 0 ? [`${SIDE_NAMES[side]}: ${names.join(" + ")}`] : [];
  }).join(" · ");
}

export interface GarmentOptions {
  sizes: CustomTeeSize[];
  colors: CustomTeeColor[];
  gsmOptions: CustomTeeGsm[];
  printOptions: CustomPrintOption[];
}

/** The sizes, colours, GSM and print sizes one garment offers. */
export function optionsForGarment(catalog: CustomCatalog, garmentId: string | undefined): GarmentOptions {
  const allowed = new Set(garmentId ? catalog.garmentPrintOptionIds[garmentId] ?? [] : []);
  return {
    sizes: catalog.sizes.filter((s) => s.garment_id === garmentId),
    colors: catalog.colors.filter((c) => c.garment_id === garmentId),
    gsmOptions: catalog.gsmOptions.filter((g) => g.garment_id === garmentId),
    printOptions: catalog.printOptions.filter((o) => allowed.has(o.id)),
  };
}

/** A garment can be sold once it has both photos, a colour, a size and a print size. */
export function isGarmentReady(garment: CustomGarment, options: GarmentOptions) {
  return (
    garmentSpec(garment) !== null &&
    options.colors.length > 0 &&
    options.sizes.length > 0 &&
    options.printOptions.length > 0
  );
}

/** The cheapest this garment can be: smallest size price + GSM extra (a front print is included). */
export function garmentFromPrice(options: GarmentOptions): number | null {
  if (options.sizes.length === 0 || options.printOptions.length === 0) return null;
  const gsm = options.gsmOptions.length > 0 ? Math.min(...options.gsmOptions.map((g) => g.price)) : 0;
  return Math.min(...options.sizes.map((s) => s.price)) + gsm;
}

/**
 * The GSM's extra price, 0 when the garment offers no GSM choice, or null when the choice is
 * missing or withdrawn. Mirrors place_order(), which requires a GSM whenever any is offered.
 */
export function gsmPriceFor(gsmId: string | null | undefined, gsmOptions: CustomTeeGsm[]) {
  if (!gsmId) return gsmOptions.length > 0 ? null : 0;
  const gsm = gsmOptions.find((g) => g.id === gsmId);
  return gsm ? Number(gsm.price) : null;
}

// Mirrors place_order() in 0016_free_size_custom_prints.sql, which is what's actually charged:
// every option must belong to the chosen garment, one custom print per side, each fixed print
// once; front prints are included and a back print is the flat back price.
export function customUnitPrice(config: CustomTeeConfig, catalog: CustomCatalog): number | null {
  const placements = config.placements;
  if (!config.garmentId || !catalog.garments.some((g) => g.id === config.garmentId)) return null;
  if (!placements || placements.length === 0 || placements.length > MAX_PRINTS) return null;
  if (placements.some((p) => !p.designId)) return null;
  const options = optionsForGarment(catalog, config.garmentId);

  const size = options.sizes.find((s) => s.id === config.sizeId);
  const color = options.colors.find((c) => c.id === config.colorId);
  if (!size || !color) return null;

  const gsmPrice = gsmPriceFor(config.gsmId, options.gsmOptions);
  const printPrice = placementsValid(placements, options.printOptions)
    ? printsPrice(placements, catalog.backPrintPrice)
    : null;
  return gsmPrice === null || printPrice === null ? null : Number(size.price) + gsmPrice + printPrice;
}

export function customCartKey(config: CustomTeeConfig) {
  const prints = (config.placements ?? []).map((p) => {
    const where =
      p.kind === "custom"
        ? `custom~${p.rect.x}/${p.rect.y}/${p.rect.w}/${p.rect.h}`
        : `${p.printOptionId}~${p.transform ? `${p.transform.scale}/${p.transform.dx}/${p.transform.dy}` : "-"}`;
    return `${p.side}~${where}~${p.designSource}~${p.designId}`;
  });
  return ["custom", config.garmentId ?? "-", config.colorId, config.sizeId, config.gsmId ?? "-", prints.join("|")].join(":");
}

export function cartLineKey(item: CartItem) {
  return item.kind === "custom" ? item.key : item.variantId;
}

/**
 * The current unit price for a cart line. Custom tees are re-priced from today's price list
 * (a cart can sit in localStorage for days); null means the option was since withdrawn.
 */
export function currentUnitPrice(item: CartItem, catalog: CustomCatalog | null): number | null {
  if (item.kind !== "custom") return item.price;
  if (!item.config.placements) return null;
  if (!catalog) return item.price;
  return customUnitPrice(item.config, catalog);
}
