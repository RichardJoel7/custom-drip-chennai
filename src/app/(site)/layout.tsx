import { AuthProvider } from "@/components/auth/auth-context";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ContactFloaters } from "@/components/layout/contact-floaters";
import { linkCustomerAccount } from "@/lib/auth/link-customer-account";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSettings } from "@/services/settings";
import { getShopMenu } from "@/services/products";
import { getWishlistProductIds } from "@/services/wishlist";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) await linkCustomerAccount(user);

  const [settings, shopMenu, wishlistIds] = await Promise.all([
    getSettings(),
    getShopMenu(),
    user ? getWishlistProductIds(user.id) : Promise.resolve([]),
  ]);

  return (
    <AuthProvider initialUser={user}>
      <SiteHeader instagramUrl={settings.instagram_url} shopMenu={shopMenu} wishlistCount={wishlistIds.length} />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
      <ContactFloaters whatsappNumber={settings.whatsapp_number} callNumber={settings.contact_number} />
    </AuthProvider>
  );
}
