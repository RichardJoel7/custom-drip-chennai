import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/button";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons/social-icons";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = {
  title: "Bulk & Corporate Orders",
  description: "Bulk and corporate T-shirt orders from Custom Drip Chennai.",
};

export default async function BulkOrdersPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="font-display text-4xl tracking-wide sm:text-5xl">BULK &amp; CORPORATE ORDERS</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Ordering for a team, an event, or your company? We do bulk printing with better pricing
        per piece the more you order. Tell us the quantity, sizes, and design (or your logo) on
        Instagram or WhatsApp and we&apos;ll get back to you with a quote.
      </p>
      <div className="mt-8 space-y-3">
        <LinkButton href={settings.instagram_url} external size="lg" className="w-full">
          <InstagramIcon className="h-5 w-5" />
          Message Us on Instagram
        </LinkButton>
        {settings.whatsapp_number && (
          <LinkButton
            href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, "")}`}
            external
            variant="outline"
            size="lg"
            className="w-full"
          >
            <WhatsAppIcon className="h-5 w-5" />
            WhatsApp Us
          </LinkButton>
        )}
      </div>
    </div>
  );
}
