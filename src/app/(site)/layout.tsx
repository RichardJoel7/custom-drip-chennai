import { AnalyticsTags } from "@/components/analytics/analytics-tags";
import { AuthProvider } from "@/components/auth/auth-context";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ContactFloaters } from "@/components/layout/contact-floaters";
import { analyticsIds } from "@/lib/analytics/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSettings } from "@/services/settings";
import { getShopMenu } from "@/services/products";
import { getWishlistProductIds } from "@/services/wishlist";
import { isInfluencer } from "@/services/influencers";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [settings, shopMenu, wishlistIds, influencer] = await Promise.all([
    getSettings(),
    getShopMenu(),
    user ? getWishlistProductIds(user.id) : Promise.resolve([]),
    user ? isInfluencer() : Promise.resolve(false),
  ]);

  return (
    <AuthProvider initialUser={user}>
      <AnalyticsTags {...analyticsIds()} />
      <SiteHeader
        instagramUrl={settings.instagram_url}
        shopMenu={shopMenu}
        wishlistCount={wishlistIds.length}
        isInfluencer={influencer}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
      <ContactFloaters whatsappNumber={settings.whatsapp_number} callNumber={settings.contact_number} />
    </AuthProvider>
  );
}
