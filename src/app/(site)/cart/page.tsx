import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { getOrderableCatalog } from "@/services/custom-studio";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = { title: "Your Cart" };

export default async function CartPage() {
  const [settings, catalog] = await Promise.all([getSettings(), getOrderableCatalog()]);
  return <CartView settings={settings} catalog={catalog} />;
}
