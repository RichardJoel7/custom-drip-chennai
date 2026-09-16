import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = { title: "Your Cart" };

export default async function CartPage() {
  const settings = await getSettings();
  return <CartView settings={settings} />;
}
