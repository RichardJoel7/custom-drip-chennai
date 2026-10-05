import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { cashfreeConfig } from "@/lib/payments/cashfree";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrderableCatalog } from "@/services/custom-studio";
import { getSavedCheckoutDetails } from "@/services/saved-details";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  // ?buy=now: checking out the one item from a Buy Now button, not the cart
  const buyNow = (await searchParams).buy === "now";
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent(buyNow ? "/checkout?buy=now" : "/checkout")}`);

  const [settings, catalog, savedDetails] = await Promise.all([
    getSettings(),
    getOrderableCatalog(),
    getSavedCheckoutDetails(user.id),
  ]);
  const cashfree = cashfreeConfig();
  return (
    <CheckoutFlow
      settings={settings}
      catalog={catalog}
      savedDetails={savedDetails}
      accountEmail={user.email ?? null}
      onlinePayment={cashfree ? { mode: cashfree.mode } : null}
      buyNow={buyNow}
    />
  );
}
