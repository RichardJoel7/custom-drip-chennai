import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/checkout");

  const settings = await getSettings();
  return <CheckoutFlow settings={settings} />;
}
