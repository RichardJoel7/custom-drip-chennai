import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getSettings } from "@/services/settings";
import { getShopMenu } from "@/services/products";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [settings, shopMenu] = await Promise.all([getSettings(), getShopMenu()]);

  return (
    <>
      <SiteHeader instagramUrl={settings.instagram_url} shopMenu={shopMenu} />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
    </>
  );
}
