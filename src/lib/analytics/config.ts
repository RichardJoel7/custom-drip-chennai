import "server-only";

/**
 * The tag IDs, read when the page is served (so adding them in Hostinger needs no rebuild).
 * Anything that doesn't look like a real ID is ignored, since it goes into an inline script.
 *   GA_MEASUREMENT_ID — Google Analytics 4, e.g. G-AB12CD34EF
 *   META_PIXEL_ID     — Meta Pixel (Instagram/Facebook ads), e.g. 1234567890123456
 */
export function analyticsIds() {
  const ga = process.env.GA_MEASUREMENT_ID?.trim().toUpperCase() ?? "";
  const pixel = process.env.META_PIXEL_ID?.trim() ?? "";
  return {
    gaId: /^G-[A-Z0-9]{4,20}$/.test(ga) ? ga : null,
    pixelId: /^\d{10,20}$/.test(pixel) ? pixel : null,
  };
}
