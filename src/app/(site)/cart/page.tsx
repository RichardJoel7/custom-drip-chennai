import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { getCustomCatalog } from "@/services/custom-studio";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = { title: "Your Cart" };

export default async function CartPage() {
  const [settings, catalog] = await Promise.all([getSettings(), getCustomCatalog()]);
  return <CartView settings={settings} catalog={catalog} />;
}
