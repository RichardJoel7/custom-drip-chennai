import Link from "next/link";
import type { Settings } from "@/types";

const FOOTER_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/size-guide", label: "Size Guide" },
  { href: "/shipping-policy", label: "Shipping" },
  { href: "/returns", label: "Returns & Exchange" },
];

export function SiteFooter({ settings }: { settings: Settings }) {
  return (
    <footer className="border-t border-border bg-foreground text-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <p className="font-display text-xl tracking-wide">CUSTOM DRIP CHENNAI</p>
            <p className="mt-3 max-w-xs text-sm text-background/70">
              Original graphic tees, made to order in Chennai. Discovered on Instagram, delivered
              pan-India.
            </p>
            <a
              href={settings.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm font-semibold uppercase tracking-wide underline underline-offset-4"
            >
              Follow us on Instagram
            </a>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-background/60">Shop</p>
            <ul className="mt-3 space-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-background/85 hover:text-background">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-background/60">Contact</p>
            <ul className="mt-3 space-y-2 text-sm text-background/85">
              {settings.contact_number && <li>Call: {settings.contact_number}</li>}
              {settings.whatsapp_number && <li>WhatsApp: {settings.whatsapp_number}</li>}
              <li>Chennai, Tamil Nadu, India</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-background/20 pt-6 text-xs text-background/60">
          © {new Date().getFullYear()} Custom Drip Chennai. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
