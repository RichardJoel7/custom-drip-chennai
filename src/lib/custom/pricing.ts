import type { CartItem, CustomCatalog, CustomPrintOption, CustomTeeConfig, PrintSides } from "@/types";

export const SIDE_LABELS: Record<PrintSides, string> = {
  front: "Front only",
  back: "Back only",
  both: "Front & back",
};

export const MAX_CUSTOM_QUANTITY = 20;

export function gsmLabel(gsm: number) {
  return `${gsm} GSM`;
}

export function printPriceFor(
  option: Pick<CustomPrintOption, "price_front" | "price_back" | "price_both">,
  sides: PrintSides
): number | null {
  const price = sides === "front" ? option.price_front : sides === "back" ? option.price_back : option.price_both;
  return price === null || price === undefined ? null : Number(price);
}

export function sidesNeedFront(sides: PrintSides) {
  return sides !== "back";
}

export function sidesNeedBack(sides: PrintSides) {
  return sides !== "front";
}

/**
 * The GSM's extra price, 0 when the studio offers no GSM choice, or null when the choice is
 * missing or withdrawn. Mirrors place_order(), which requires a GSM whenever any is offered.
 */
export function gsmPriceFor(gsmId: string | null | undefined, catalog: Pick<CustomCatalog, "gsmOptions">) {
  if (!gsmId) return catalog.gsmOptions.length > 0 ? null : 0;
  const gsm = catalog.gsmOptions.find((g) => g.id === gsmId);
  return gsm ? Number(gsm.price) : null;
}

// Mirrors place_order() in 0010_gsm_and_saved_details.sql, which is what's actually charged.
export function customUnitPrice(config: CustomTeeConfig, catalog: CustomCatalog): number | null {
  const size = catalog.sizes.find((s) => s.id === config.sizeId);
  const color = catalog.colors.find((c) => c.id === config.colorId);
  const option = catalog.printOptions.find((o) => o.id === config.printOptionId);
  if (!size || !color || !option) return null;

  const gsmPrice = gsmPriceFor(config.gsmId, catalog);
  const printPrice = printPriceFor(option, config.sides);
  return gsmPrice === null || printPrice === null ? null : Number(size.price) + gsmPrice + printPrice;
}

export function customCartKey(config: CustomTeeConfig) {
  const front = sidesNeedFront(config.sides) ? config.frontDesignId ?? "-" : "-";
  const back = sidesNeedBack(config.sides) ? config.backDesignId ?? "-" : "-";
  const gsm = config.gsmId ?? "-";
  return ["custom", config.colorId, config.sizeId, gsm, config.printOptionId, config.sides, front, back].join(":");
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
  if (!catalog) return item.price;
  return customUnitPrice(item.config, catalog);
}
