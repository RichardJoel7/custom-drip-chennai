import type { Metadata } from "next";
import { CustomCatalogForm } from "@/components/admin/custom-catalog-form";
import { MigrationNotice } from "@/components/admin/migration-notice";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getCustomCatalogForAdmin } from "@/services/custom-studio";

export const metadata: Metadata = { title: "Customizer — Price List" };

export default async function CustomizerPricePage() {
  await requireAdmin();
  const catalog = await getCustomCatalogForAdmin();

  return <div className="max-w-3xl">{catalog ? <CustomCatalogForm catalog={catalog} /> : <MigrationNotice />}</div>;
}
