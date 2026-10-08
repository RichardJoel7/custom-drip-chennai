// One place for the site's address and search-engine wording.

function siteUrlFromEnv() {
  // NEXT_PUBLIC_SITE_URL is set per environment (e.g. https://customdripchennai.com on live).
  // Vercel's own production-domain variable is the fallback, then local dev.
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = explicit || (vercel ? `https://${vercel}` : "http://localhost:3000");
  return url.replace(/\/+$/, "");
}

export const SITE_URL = siteUrlFromEnv();

/**
 * The address the shopper is browsing, for links handed back to their browser (e.g. the page
 * Cashfree returns to). Not `request.url`: behind Hostinger's proxy Next builds that from the
 * address the server listens on (https://0.0.0.0:3000). Browsers send the real one as the Origin
 * header on every POST; SITE_URL covers requests without it.
 */
export function browserOrigin(request: Request): string {
  const origin = request.headers.get("origin");
  return origin && /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(origin) ? origin : SITE_URL;
}
export const SITE_NAME = "Custom Drip Chennai";

export const SITE_TITLE = "Custom T-Shirt Printing in Chennai | Custom Drip Chennai";
export const SITE_DESCRIPTION =
  "Custom T-shirt printing in Chennai — design your own tee online with any print size, upload your own artwork, or shop original graphic streetwear. Bulk and team orders, delivered across India.";

export const SITE_KEYWORDS = [
  "custom t-shirt printing Chennai",
  "custom t shirt Chennai",
  "personalised t-shirts Chennai",
  "design your own t-shirt",
  "t-shirt printing near me",
  "customised t-shirts",
  "photo print t-shirt",
  "bulk t-shirt printing Chennai",
  "company t-shirts Chennai",
  "college t-shirts Chennai",
  "graphic tees",
  "streetwear Chennai",
  "oversized t-shirts",
  "Custom Drip Chennai",
];

/** The picture shown when a page is shared (WhatsApp, Instagram, Google…): app/opengraph-image.jpg. */
export const SHARE_IMAGE = { url: "/opengraph-image.jpg", width: 1200, height: 630, alt: "Custom Drip Chennai — custom T-shirt printing in Chennai" };

/** "/shop" → "https://customdripchennai.com/shop" */
export function absoluteUrl(path = "/") {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
