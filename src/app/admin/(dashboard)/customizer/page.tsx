import type { Metadata } from "next";
import { GarmentList } from "@/components/admin/garment-list";
import { MigrationNotice } from "@/components/admin/migration-notice";
import { garmentMissing } from "@/lib/custom/garment-status";
import { garmentFromPrice, optionsForGarment } from "@/lib/custom/pricing";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getCustomCatalogForAdmin } from "@/services/custom-studio";

export const metadata: Metadata = { title: "Customizer — Garments" };

export default async function CustomizerGarmentsPage() {
  await requireAdmin();
  const { catalog, status } = await getCustomCatalogForAdmin();
  if (status !== "ready") return <MigrationNotice file={status} />;

  const rows = catalog.garments.map((garment) => {
    const options = optionsForGarment(catalog, garment.id);
    return {
      garment,
      missing: garmentMissing(catalog, garment),
      fromPrice: garmentFromPrice(options),
      previewColor: options.colors.find((c) => c.is_active) ?? options.colors[0],
    };
  });

  return (
    <div className="max-w-3xl">
      <GarmentList rows={rows} />
    </div>
  );
}
