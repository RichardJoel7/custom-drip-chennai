import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { getOrderableCatalog } from "@/services/custom-studio";
import { getActiveProducts } from "@/services/products";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = { title: "Your Cart" };

export default async function CartPage() {
  const [settings, catalog, products] = await Promise.all([getSettings(), getOrderableCatalog(), getActiveProducts()]);
  return <CartView settings={settings} catalog={catalog} products={products} />;
}
