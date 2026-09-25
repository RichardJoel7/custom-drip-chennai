import { garmentSpec } from "@/lib/custom/mockup";
import type {
  CartItem,
  CustomCatalog,
  CustomGarment,
  CustomPrintOption,
  CustomTeeColor,
  CustomTeeConfig,
  CustomTeeGsm,
  CustomTeeSize,
  PrintSide,
  PrintSides,
} from "@/types";

export const PRINT_SIDE_LIST: PrintSide[] = ["front", "back"];

export const SIDE_NAMES: Record<PrintSide, string> = { front: "Front", back: "Back" };

export const MAX_CUSTOM_QUANTITY = 20;

/** Most prints one garment can carry (place_order() allows the same). */
export const MAX_PRINTS = 8;

export function gsmLabel(gsm: number) {
  return `${gsm} GSM`;
}

/** A print size's rate on one side; null = not offered there. */
export function sidePrice(option: Pick<CustomPrintOption, "price_front" | "price_back">, side: PrintSide): number | null {
  const price = side === "front" ? option.price_front : option.price_back;
  return price === null || price === undefined ? null : Number(price);
}

type PlacedSize = { side: PrintSide; printOptionId: string };

export interface PrintCharge {
  option: CustomPrintOption;
  sides: PrintSide[];
  price: number;
  /** What front + back would have cost, when the front & back rate is cheaper. */
  fullPrice?: number;
}

/**
 * What the prints cost, one line per print size: each at its side's rate, and a size used on
 * both sides at the front & back rate when the admin set one. Mirrors place_order() in
 * 0012_print_placements.sql. Null if a print isn't offered on its side.
 */
export function printCharges(placements: PlacedSize[], printOptions: CustomPrintOption[]): PrintCharge[] | null {
  const bySize = new Map<string, Set<PrintSide>>();
  for (const p of placements) {
    const sides = bySize.get(p.printOptionId) ?? new Set<PrintSide>();
    sides.add(p.side);
    bySize.set(p.printOptionId, sides);
  }

  const charges: PrintCharge[] = [];
  for (const [id, sideSet] of bySize) {
    const option = printOptions.find((o) => o.id === id);
    if (!option) return null;
    const sides = PRINT_SIDE_LIST.filter((s) => sideSet.has(s));
    const prices = sides.map((s) => sidePrice(option, s));
    if (prices.some((p) => p === null)) return null;
    const sum = (prices as number[]).reduce((a, b) => a + b, 0);
    const both = sides.length === 2 && option.price_both !== null ? Number(option.price_both) : null;
    charges.push(
      both !== null
        ? { option, sides, price: both, ...(both < sum ? { fullPrice: sum } : {}) }
        : { option, sides, price: sum }
    );
  }
  return charges.sort((a, b) => printOptions.indexOf(a.option) - printOptions.indexOf(b.option));
}

export function printsPrice(placements: PlacedSize[], printOptions: CustomPrintOption[]): number | null {
  const charges = printCharges(placements, printOptions);
  return charges ? charges.reduce((total, c) => total + c.price, 0) : null;
}

export function sidesOf(placements: { side: PrintSide }[]): PrintSides | null {
  const front = placements.some((p) => p.side === "front");
  const back = placements.some((p) => p.side === "back");
  return front && back ? "both" : front ? "front" : back ? "back" : null;
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

function offersAPrint(options: GarmentOptions) {
  return options.printOptions.some((o) => PRINT_SIDE_LIST.some((s) => sidePrice(o, s) !== null));
}

/** A garment can be sold once it has both photos, a colour, a size and a priced print size. */
export function isGarmentReady(garment: CustomGarment, options: GarmentOptions) {
  return garmentSpec(garment) !== null && options.colors.length > 0 && options.sizes.length > 0 && offersAPrint(options);
}

/** The cheapest this garment can be: smallest size price + GSM extra + one print. */
export function garmentFromPrice(options: GarmentOptions): number | null {
  if (options.sizes.length === 0 || !offersAPrint(options)) return null;
  const prints = options.printOptions.flatMap((o) =>
    PRINT_SIDE_LIST.map((s) => sidePrice(o, s)).filter((p): p is number => p !== null)
  );
  const gsm = options.gsmOptions.length > 0 ? Math.min(...options.gsmOptions.map((g) => g.price)) : 0;
  return Math.min(...options.sizes.map((s) => s.price)) + gsm + Math.min(...prints);
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

// Mirrors place_order() in 0012_print_placements.sql, which is what's actually charged: every
// option must belong to the chosen garment, and each print size appears once per side.
export function customUnitPrice(config: CustomTeeConfig, catalog: CustomCatalog): number | null {
  const placements = config.placements;
  if (!config.garmentId || !catalog.garments.some((g) => g.id === config.garmentId)) return null;
  if (!placements || placements.length === 0 || placements.length > MAX_PRINTS) return null;
  if (new Set(placements.map((p) => `${p.side}:${p.printOptionId}`)).size !== placements.length) return null;
  if (placements.some((p) => !p.designId)) return null;
  const options = optionsForGarment(catalog, config.garmentId);

  const size = options.sizes.find((s) => s.id === config.sizeId);
  const color = options.colors.find((c) => c.id === config.colorId);
  if (!size || !color) return null;

  const gsmPrice = gsmPriceFor(config.gsmId, options.gsmOptions);
  const printPrice = printsPrice(placements, options.printOptions);
  return gsmPrice === null || printPrice === null ? null : Number(size.price) + gsmPrice + printPrice;
}

export function customCartKey(config: CustomTeeConfig) {
  const prints = (config.placements ?? []).map((p) => {
    const t = p.transform ? `${p.transform.scale}/${p.transform.dx}/${p.transform.dy}` : "-";
    return `${p.side}~${p.printOptionId}~${p.designSource}~${p.designId}~${t}`;
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
