import type { Metadata } from "next";
import { Mona_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-context";
import { StagingBanner } from "@/components/layout/staging-banner";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/seo/site";
import { isStaging } from "@/lib/utils/app-env";

const monaSans = Mona_Sans({
  variable: "--font-mona-sans",
  subsets: ["latin"],
});

// Google Search Console's "HTML tag" check: paste only the content="…" value into this
// environment variable on Hostinger (a DNS TXT record at Cloudflare works too).
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | Custom Drip Chennai",
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  category: "shopping",
  // Canonical URLs are set per page: one here would be inherited by every page.
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
  // keep the staging copy of the site out of search results
  robots: isStaging
    ? { index: false, follow: false }
    : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
};

// Every page is rendered per request and sent as "don't store" (Cache-Control: no-store), so
// Hostinger's CDN never keeps a copy of a page. A page it kept would point at the previous
// deploy's CSS/JS files, which are gone after the next deploy (unstyled pages, Oct 2026).
// The CDN still caches /_next/static files: their names change with every build.
export const dynamic = "force-dynamic";

// If the stylesheet didn't arrive (a dropped mobile connection, or a page opened mid-deploy that
// asks for the previous build's file), the page shows as bare text. globals.css sets --background
// on :root, so it's empty only then: reload once, never more than once a minute.
const RELOAD_IF_UNSTYLED = `(function () {
  function check() {
    if (getComputedStyle(document.documentElement).getPropertyValue("--background").trim()) return;
    try {
      var last = Number(sessionStorage.getItem("cdc-style-retry") || 0);
      if (Date.now() - last < 60000) return;
      sessionStorage.setItem("cdc-style-retry", String(Date.now()));
    } catch (e) {
      return;
    }
    // a fresh address, so no cache along the way can hand back the same broken page
    var url = new URL(location.href);
    url.searchParams.set("_r", String(Date.now()));
    location.replace(url.toString());
  }
  if (document.readyState === "complete") check();
  else window.addEventListener("load", check);
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${monaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        {isStaging && <StagingBanner />}
        <CartProvider>{children}</CartProvider>
        <script dangerouslySetInnerHTML={{ __html: RELOAD_IF_UNSTYLED }} />
      </body>
    </html>
  );
}
