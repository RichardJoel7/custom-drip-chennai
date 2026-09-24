import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCustomCatalog } from "@/services/custom-studio";
import { getSavedCheckoutDetails } from "@/services/saved-details";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/checkout");

  const [settings, catalog, savedDetails] = await Promise.all([
    getSettings(),
    getCustomCatalog(),
    getSavedCheckoutDetails(user.id),
  ]);
  return (
    <CheckoutFlow settings={settings} catalog={catalog} savedDetails={savedDetails} accountEmail={user.email ?? null} />
  );
}
