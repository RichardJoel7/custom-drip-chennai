import type {
  ColorPhotos,
  CustomGarment,
  CustomPrintOption,
  CustomTeeColor,
  GarmentSnapshot,
  MockupSpec,
  PhotoPoint,
  PrintBox,
  PrintSide,
  PrintTransform,
} from "@/types";

export type PrintArea = Pick<CustomPrintOption, "width_cm" | "height_cm" | "front_placement">;
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type GarmentPhotos = Pick<
  CustomGarment,
  "front_image_url" | "front_aspect" | "back_image_url" | "back_aspect" | "front_area" | "back_area" | "area_width_cm" | "logo_spot"
>;

/** Mockups are drawn in a viewBox this many units wide; the height follows the photo. */
export const PHOTO_VIEW_WIDTH = 1000;

/** A fresh photo's starting print area: centred on the chest. */
export const DEFAULT_PRINT_BOX: PrintBox = { x: 0.32, y: 0.24, w: 0.36, h: 0.46 };

/** The smallest a customer can shrink a print to, as a share of its print size. */
export const MIN_PRINT_SCALE = 0.2;

/**
 * Null unless the garment has both photos with print areas and a real-life width, so a
 * half-set-up garment never shows a broken mockup (and isn't offered in the studio).
 */
export function garmentSpec(garment: GarmentPhotos): MockupSpec | null {
  const { front_image_url, front_aspect, back_image_url, back_aspect, front_area, back_area, area_width_cm } = garment;
  if (!front_image_url || !back_image_url || !front_aspect || !back_aspect || !front_area || !back_area || !area_width_cm) {
    return null;
  }
  return {
    front: { imageUrl: front_image_url, aspect: Number(front_aspect), area: front_area },
    back: { imageUrl: back_image_url, aspect: Number(back_aspect), area: back_area },
    areaWidthCm: Number(area_width_cm),
    logoSpot: garment.logo_spot,
  };
}

export function colorPhotosOf(color: Pick<CustomTeeColor, "front_image_url" | "back_image_url">): ColorPhotos | null {
  return color.front_image_url || color.back_image_url
    ? { front: color.front_image_url, back: color.back_image_url }
    : null;
}

export function mockupFromSnapshot(snapshot: GarmentSnapshot | null | undefined): {
  spec: MockupSpec | null;
  colorPhotos: ColorPhotos | null;
} {
  const spec = snapshot ? garmentSpec(snapshot) : null;
  return {
    spec,
    colorPhotos:
      spec && snapshot && (snapshot.color_front_image_url || snapshot.color_back_image_url)
        ? { front: snapshot.color_front_image_url, back: snapshot.color_back_image_url }
        : null,
  };
}

/** 0 (black) to 1 (white), as the eye sees it. */
export function colorLightness(hex: string) {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function isLightColor(hex: string) {
  return colorLightness(hex) > 0.6;
}

/**
 * Next's image optimizer, so a 2000px design downloads as a ~640px WebP for the preview (and
 * same-origin, which the mockup's mask needs). Local blob:/data: previews are used as-is.
 */
export function optimizedImage(url: string, width = 640) {
  if (!/^https?:/i.test(url)) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75`;
}

/** One side's print area in viewBox units, and how many units make a centimetre. */
function sideLayout(spec: MockupSpec, view: PrintSide) {
  const side = spec[view];
  const viewHeight = PHOTO_VIEW_WIDTH / side.aspect;
  const area: Rect = {
    x: side.area.x * PHOTO_VIEW_WIDTH,
    y: side.area.y * viewHeight,
    width: side.area.w * PHOTO_VIEW_WIDTH,
    height: side.area.h * viewHeight,
  };
  return { viewHeight, area, unitsPerCm: area.width / spec.areaWidthCm };
}

/**
 * Where a print size normally sits, in viewBox units: at true scale from the area's real-life
 * width, centred and top-aligned in the area (capped to fit it). A left-chest print sits on
 * the logo spot, or in the area's top-right (wearer's left) corner.
 */
export function defaultPrintRect(spec: MockupSpec, view: PrintSide, print: PrintArea): Rect {
  const { viewHeight, area, unitsPerCm } = sideLayout(spec, view);
  const width = Math.min(print.width_cm * unitsPerCm, area.width);
  const height = Math.min(print.height_cm * unitsPerCm, area.height);

  if (view === "front" && print.front_placement === "left_chest") {
    const side = spec.front;
    const spot: PhotoPoint = spec.logoSpot ?? { x: side.area.x + side.area.w * 0.75, y: side.area.y + 0.05 };
    return { x: spot.x * PHOTO_VIEW_WIDTH - width / 2, y: spot.y * viewHeight - height / 2, width, height };
  }

  return { x: area.x + (area.width - width) / 2, y: area.y, width, height };
}

/** The print area, grown to take in the print's normal spot (a logo spot can sit outside it). */
function printBounds(area: Rect, base: Rect): Rect {
  const x = Math.min(area.x, base.x);
  const y = Math.min(area.y, base.y);
  return {
    x,
    y,
    width: Math.max(area.x + area.width, base.x + base.width) - x,
    height: Math.max(area.y + area.height, base.y + base.height) - y,
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function clampCentre(centre: number, size: number, start: number, length: number) {
  return size >= length ? start + length / 2 : clamp(centre, start + size / 2, start + length - size / 2);
}

/** Where a print is drawn: its normal spot, then the customer's resize and move, kept inside the print area. */
export function printRect(spec: MockupSpec, view: PrintSide, print: PrintArea, transform?: PrintTransform | null): Rect {
  const base = defaultPrintRect(spec, view, print);
  if (!transform) return base;

  const { area, unitsPerCm } = sideLayout(spec, view);
  const bounds = printBounds(area, base);
  const scale = clamp(transform.scale, MIN_PRINT_SCALE, 1);
  const width = base.width * scale;
  const height = base.height * scale;
  const cx = clampCentre(base.x + base.width / 2 + transform.dx * unitsPerCm, width, bounds.x, bounds.width);
  const cy = clampCentre(base.y + base.height / 2 + transform.dy * unitsPerCm, height, bounds.y, bounds.height);
  return { x: cx - width / 2, y: cy - height / 2, width, height };
}

/**
 * The transform that draws a print at `target` (a rect the customer dragged to), resized
 * around its centre and kept inside the print area.
 */
export function transformFor(spec: MockupSpec, view: PrintSide, print: PrintArea, target: Rect): PrintTransform {
  const base = defaultPrintRect(spec, view, print);
  const { unitsPerCm } = sideLayout(spec, view);
  const scale = clamp(target.width / base.width, MIN_PRINT_SCALE, 1);
  const draft = {
    scale,
    dx: (target.x + target.width / 2 - (base.x + base.width / 2)) / unitsPerCm,
    dy: (target.y + target.height / 2 - (base.y + base.height / 2)) / unitsPerCm,
  };
  // Re-read the clamped rect, so the stored numbers match what's drawn.
  const drawn = printRect(spec, view, print, draft);
  return {
    scale: Math.round(scale * 1000) / 1000,
    dx: Math.round(((drawn.x + drawn.width / 2 - (base.x + base.width / 2)) / unitsPerCm) * 100) / 100,
    dy: Math.round(((drawn.y + drawn.height / 2 - (base.y + base.height / 2)) / unitsPerCm) * 100) / 100,
  };
}

/** A print's real size and how far it sits from its normal spot, in cm, for the print team. */
export function printMeasurements(spec: MockupSpec, view: PrintSide, print: PrintArea, transform?: PrintTransform | null) {
  const { unitsPerCm } = sideLayout(spec, view);
  const base = defaultPrintRect(spec, view, print);
  const drawn = printRect(spec, view, print, transform);
  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    widthCm: round(drawn.width / unitsPerCm),
    heightCm: round(drawn.height / unitsPerCm),
    rightCm: round((drawn.x + drawn.width / 2 - (base.x + base.width / 2)) / unitsPerCm),
    downCm: round((drawn.y + drawn.height / 2 - (base.y + base.height / 2)) / unitsPerCm),
    scale: drawn.width / base.width,
  };
}

export function rectsOverlap(a: Rect, b: Rect) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** How sharp an upload will print at a given size: pixels per inch across the printed artwork. */
export function printDpi(pixels: { width?: number | null; height?: number | null }, boxCm: { width: number; height: number }) {
  if (!pixels.width || !pixels.height) return null;
  // The artwork is fitted inside the print box, keeping its shape.
  const fit = Math.min(boxCm.width / pixels.width, boxCm.height / pixels.height);
  const printedWidthInches = (pixels.width * fit) / 2.54;
  return Math.round(pixels.width / printedWidthInches);
}
