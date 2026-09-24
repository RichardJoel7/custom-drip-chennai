import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/button";
import { InstagramIcon, MailIcon, WhatsAppIcon } from "@/components/icons/social-icons";
import { STORE_EMAIL, mailtoUrl, whatsappUrl } from "@/lib/utils/contact-links";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = {
  title: "Bulk & Corporate Orders",
  description: "Bulk and corporate T-shirt orders from Custom Drip Chennai.",
};

const BULK_EMAIL_SUBJECT = "Bulk order enquiry";

const BULK_EMAIL_BODY = `Hi Custom Drip Chennai team,

I'd like a quote for a bulk order.

Quantity:
Sizes needed:
T-shirt colour:
Design / logo: (please attach if you have it)
Needed by (date):

Thanks,
`;

export default async function BulkOrdersPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="font-display text-4xl tracking-wide sm:text-5xl">BULK &amp; CORPORATE ORDERS</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        Ordering for a team, an event, or your company? We do bulk printing with better pricing
        per piece the more you order. Tell us the quantity, sizes, and design (or your logo) on
        Instagram, WhatsApp or email and we&apos;ll get back to you with a quote.
      </p>
      <div className="mt-8 space-y-3">
        <LinkButton href={settings.instagram_url} external size="lg" className="w-full">
          <InstagramIcon className="h-5 w-5" />
          Message Us on Instagram
        </LinkButton>
        {settings.whatsapp_number && (
          <LinkButton
            href={whatsappUrl(settings.whatsapp_number)}
            external
            variant="outline"
            size="lg"
            className="w-full"
          >
            <WhatsAppIcon className="h-5 w-5" />
            WhatsApp Us
          </LinkButton>
        )}
        <LinkButton
          href={mailtoUrl(STORE_EMAIL, BULK_EMAIL_SUBJECT, BULK_EMAIL_BODY)}
          variant="outline"
          size="lg"
          className="w-full"
        >
          <MailIcon className="h-5 w-5" />
          Email Us
        </LinkButton>
        <p className="pt-1 text-center text-sm text-muted-foreground">
          or write to{" "}
          <a href={`mailto:${STORE_EMAIL}`} className="font-semibold text-foreground underline underline-offset-4">
            {STORE_EMAIL}
          </a>
        </p>
      </div>
    </div>
  );
}
