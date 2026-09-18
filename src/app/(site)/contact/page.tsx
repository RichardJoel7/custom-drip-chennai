import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/button";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons/social-icons";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Custom Drip Chennai.",
};

export default async function ContactPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-16">
      <h1 className="font-display text-4xl tracking-wide sm:text-5xl">CONTACT US</h1>
      <p className="mt-4 text-muted-foreground">
        Questions about an order, sizing, or a custom request? Reach out — we&apos;re quickest to
        respond on Instagram.
      </p>

      <div className="mt-8 space-y-4">
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

      <div className="mt-10 space-y-1 text-sm text-muted-foreground">
        {settings.contact_number && <p>Call: {settings.contact_number}</p>}
        <p>Chennai, Tamil Nadu, India</p>
      </div>
    </div>
  );
}
