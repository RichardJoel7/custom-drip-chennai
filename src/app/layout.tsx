import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Anton } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${anton.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
