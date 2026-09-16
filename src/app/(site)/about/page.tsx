import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/button";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = {
  title: "About",
  description: "The story behind Custom Drip Chennai.",
};

export default async function AboutPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="font-display text-4xl tracking-wide sm:text-5xl">ABOUT CUSTOM DRIP CHENNAI</h1>
      <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
        <p>
          Custom Drip Chennai started the way most good things do — with a design, a blank tee,
          and no plan beyond making something we&apos;d actually wear.
        </p>
        <p>
          We&apos;re a small, independent T-shirt brand based in Chennai. Every graphic is designed
          in-house, printed to order, and checked by hand before it ships. No mass production, no
          filler drops — just original designs made properly.
        </p>
        <p>
          We started on Instagram, taking orders one DM at a time. This website exists to make
          that same experience faster — browse, pick your size, pay by UPI, and we&apos;ll take it
          from there.
        </p>
      </div>
      <LinkButton href={settings.instagram_url} external size="lg" className="mt-8">
        Follow Us on Instagram
      </LinkButton>
    </div>
  );
}
