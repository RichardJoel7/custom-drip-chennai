import type { Metadata } from "next";
import { Mona_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-context";
import { StagingBanner } from "@/components/layout/staging-banner";
import { isStaging } from "@/lib/utils/app-env";

const monaSans = Mona_Sans({
  variable: "--font-mona-sans",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Custom Drip Chennai | Original Graphic T-Shirts",
    template: "%s | Custom Drip Chennai",
  },
  description:
    "Custom Drip Chennai — original graphic T-shirts and streetwear. Shop our latest drops online.",
  openGraph: {
    title: "Custom Drip Chennai | Original Graphic T-Shirts",
    description:
      "Custom Drip Chennai — original graphic T-shirts and streetwear. Shop our latest drops online.",
    url: siteUrl,
    siteName: "Custom Drip Chennai",
    locale: "en_IN",
    type: "website",
  },
  // keep the staging copy of the site out of search results
  robots: isStaging ? { index: false, follow: false } : undefined,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${monaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        {isStaging && <StagingBanner />}
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
