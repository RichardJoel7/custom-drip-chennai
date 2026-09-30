import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage, PolicySection } from "@/components/legal/policy-page";
import { STORE_EMAIL } from "@/lib/utils/contact-links";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Custom Drip Chennai collects, uses and protects your personal information.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage title="PRIVACY POLICY" updated="30 September 2026">
      <p>
        Custom Drip Chennai (&ldquo;we&rdquo;, &ldquo;us&rdquo;) runs this website to sell T-shirts and custom-printed
        garments. This policy explains what personal information we collect, why, and the choices you have. It is
        written to follow India&apos;s Digital Personal Data Protection Act, 2023.
      </p>

      <PolicySection title="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-semibold text-foreground">Account details:</span> your email address, and your
            password (stored only in encrypted form) or your Google account name and email if you sign in with Google.
          </li>
          <li>
            <span className="font-semibold text-foreground">Order details:</span> your name, mobile number, email,
            shipping address, optional Instagram username and order notes, what you ordered, and the UPI transaction
            ID you enter to confirm payment.
          </li>
          <li>
            <span className="font-semibold text-foreground">Saved details:</span> if you tick &ldquo;Save these
            details for future orders&rdquo;, we keep your checkout details to fill them in next time.
          </li>
          <li>
            <span className="font-semibold text-foreground">Designs you upload:</span> artwork you upload in the
            Custom Studio, and where you placed it on the garment.
          </li>
          <li>
            <span className="font-semibold text-foreground">On your device:</span> a sign-in cookie that keeps you
            logged in, and your cart and wishlist choices saved in your browser.
          </li>
        </ul>
        <p>We don&apos;t collect card or bank details — payments are made directly from your UPI app.</p>
      </PolicySection>

      <PolicySection title="How we use it">
        <ul className="list-disc space-y-1 pl-5">
          <li>To make, print, pack and ship your order, and to send you order and shipping updates.</li>
          <li>To confirm your payment, answer your questions and handle returns or exchanges.</li>
          <li>To send the sign-up and password codes that protect your account.</li>
          <li>To prevent fraud and keep the website secure.</li>
          <li>To keep the records Indian tax and accounting laws require.</li>
        </ul>
        <p>We don&apos;t sell your information, and we don&apos;t use your uploaded designs for anything but your order.</p>
      </PolicySection>

      <PolicySection title="Who we share it with">
        <p>Only the services we need to run the store, and only what each one needs:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Our hosting and database providers (Vercel and Supabase), which store the website and your data.</li>
          <li>Google, if you choose to sign in with Google, and our email provider for order emails.</li>
          <li>Courier partners, who receive your name, phone number and address to deliver your parcel.</li>
          <li>Government authorities, if the law requires it.</li>
        </ul>
      </PolicySection>

      <PolicySection title="Your designs">
        <p>
          When you upload artwork, you confirm that you own it or have permission to print it. We use it only to
          print your order and keep it with your order record. We may refuse to print designs that copy someone
          else&apos;s trademark or artwork, or that are offensive or unlawful.
        </p>
      </PolicySection>

      <PolicySection title="How long we keep it">
        <p>
          We keep your account while it&apos;s open, and order records for as long as the law requires for tax and
          accounting. Saved checkout details can be removed any time from My Profile.
        </p>
      </PolicySection>

      <PolicySection title="Your rights">
        <p>
          You can ask to see the personal information we hold about you, correct it, or have it erased (except
          records we must keep by law). You can also withdraw consent, for example by removing your saved details.
          Email us at{" "}
          <a href={`mailto:${STORE_EMAIL}`} className="font-semibold text-foreground underline underline-offset-4">
            {STORE_EMAIL}
          </a>{" "}
          and we&apos;ll reply within 30 days.
        </p>
      </PolicySection>

      <PolicySection title="Children">
        <p>
          The store is meant for people aged 18 and over. If you&apos;re under 18, please order with a parent or
          guardian.
        </p>
      </PolicySection>

      <PolicySection title="Security">
        <p>
          Your data travels over encrypted connections (HTTPS), passwords are stored encrypted, and only our team can
          see order details.
        </p>
      </PolicySection>

      <PolicySection title="Changes and contact">
        <p>
          If we change this policy, we&apos;ll update the date above. For questions or complaints about your data,
          write to{" "}
          <a href={`mailto:${STORE_EMAIL}`} className="font-semibold text-foreground underline underline-offset-4">
            {STORE_EMAIL}
          </a>
          . See also our{" "}
          <Link href="/terms" className="font-semibold text-foreground underline underline-offset-4">
            Terms &amp; Conditions
          </Link>
          .
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
