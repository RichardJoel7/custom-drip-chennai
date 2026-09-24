import Image from "next/image";
import Link from "next/link";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons/social-icons";
import { telUrl, whatsappUrl } from "@/lib/utils/contact-links";
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
        <div className="flex flex-col items-center text-center">
          <Image
            src="/images/logo.png"
            alt="Custom Drip Chennai"
            width={220}
            height={80}
            className="h-16 w-auto object-contain"
          />
          <p className="mt-4 max-w-sm font-display text-lg italic tracking-wide text-background/80">
            &ldquo;Your fit. Your story. Your drip.&rdquo;
          </p>
        </div>

        <div className="mt-10 grid gap-10 sm:grid-cols-3">
          <div>
            <p className="font-display text-xl tracking-wide">CUSTOM DRIP CHENNAI</p>
            <p className="mt-3 max-w-xs text-sm text-background/70">
              Original graphic tees, made to order in Chennai. Discovered on Instagram, delivered
              pan-India.
            </p>
            <div className="mt-4 flex gap-2.5">
              <a
                href={settings.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow us on Instagram"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-background/40 text-background transition-colors hover:bg-background hover:text-foreground"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
              {settings.whatsapp_number && (
                <a
                  href={whatsappUrl(settings.whatsapp_number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Chat with us on WhatsApp"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-background/40 text-background transition-colors hover:bg-background hover:text-foreground"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                </a>
              )}
            </div>
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
              {settings.contact_number && (
                <li>
                  Call:{" "}
                  <a href={telUrl(settings.contact_number)} className="underline-offset-4 hover:underline">
                    {settings.contact_number}
                  </a>
                </li>
              )}
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
