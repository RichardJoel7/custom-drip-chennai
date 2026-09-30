import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage, PolicySection } from "@/components/legal/policy-page";
import { STORE_EMAIL } from "@/lib/utils/contact-links";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms for buying from Custom Drip Chennai and using our Custom Studio.",
  alternates: { canonical: "/terms" },
};

const link = "font-semibold text-foreground underline underline-offset-4";

export default function TermsPage() {
  return (
    <PolicyPage title="TERMS & CONDITIONS" updated="30 September 2026">
      <p>
        These terms apply when you use this website or buy from Custom Drip Chennai. By placing an order you agree to
        them.
      </p>

      <PolicySection title="Orders and prices">
        <p>
          Prices are in Indian Rupees and include printing. Shipping is shown at checkout. An order is confirmed once
          we&apos;ve verified your UPI payment; if we can&apos;t verify it, or can&apos;t make the item, we&apos;ll
          contact you and refund any amount paid.
        </p>
      </PolicySection>

      <PolicySection title="Custom-printed items">
        <p>
          Custom Studio items are made to your design, size and placement. Please check your preview before ordering —
          the preview shows roughly how your print will look; small differences in colour, size and position can happen
          in printing. Because every custom item is made just for you, it can&apos;t be cancelled once printing has
          started.
        </p>
      </PolicySection>

      <PolicySection title="Your designs">
        <p>
          You confirm that you own, or have permission to use, any artwork you upload, and that it doesn&apos;t break
          any law or anyone else&apos;s rights. We may refuse or cancel (with a full refund) orders with designs that
          copy trademarks or others&apos; work, or that are offensive or unlawful. Our own designs and branding
          belong to Custom Drip Chennai and can&apos;t be copied.
        </p>
      </PolicySection>

      <PolicySection title="Shipping, returns and exchanges">
        <p>
          See our{" "}
          <Link href="/shipping-policy" className={link}>
            Shipping Policy
          </Link>{" "}
          and{" "}
          <Link href="/returns" className={link}>
            Returns &amp; Exchange
          </Link>{" "}
          page. Damaged, defective or wrong items reported within 48 hours of delivery are replaced or refunded.
        </p>
      </PolicySection>

      <PolicySection title="Your account">
        <p>Keep your sign-in details private; you&apos;re responsible for orders placed from your account.</p>
      </PolicySection>

      <PolicySection title="Liability">
        <p>
          We&apos;re responsible for the items we sell, up to the amount you paid for them. We aren&apos;t responsible
          for delays caused by couriers or events outside our control.
        </p>
      </PolicySection>

      <PolicySection title="Law and contact">
        <p>
          These terms are governed by the laws of India, and the courts of Chennai have jurisdiction. Questions? Email{" "}
          <a href={`mailto:${STORE_EMAIL}`} className={link}>
            {STORE_EMAIL}
          </a>
          . How we handle your data is explained in our{" "}
          <Link href="/privacy-policy" className={link}>
            Privacy Policy
          </Link>
          .
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
