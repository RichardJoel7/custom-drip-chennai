import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteGarmentButton, GarmentDetailsForm } from "@/components/admin/garment-editor";
import {
  GarmentColorsForm,
  GarmentGsmForm,
  GarmentPrintsForm,
  GarmentSizesForm,
} from "@/components/admin/garment-options-form";
import { MigrationNotice } from "@/components/admin/migration-notice";
import { garmentChecklist } from "@/lib/custom/garment-status";
import { optionsForGarment } from "@/lib/custom/pricing";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getCustomCatalogForAdmin } from "@/services/custom-studio";

export const metadata: Metadata = { title: "Customizer — Edit Garment" };

export default async function GarmentEditorPage({ params }: PageProps<"/admin/customizer/garments/[id]">) {
  await requireAdmin();
  const [{ id }, { catalog, status }] = await Promise.all([params, getCustomCatalogForAdmin()]);
  if (status !== "ready") return <MigrationNotice file={status} />;

  const garment = catalog.garments.find((g) => g.id === id);
  if (!garment) notFound();

  const options = optionsForGarment(catalog, garment.id);
  const allowedIds = catalog.garmentPrintOptionIds[garment.id] ?? [];

  return (
    <div className="max-w-4xl space-y-8">
      <Link href="/admin/customizer" className="text-xs font-semibold uppercase tracking-wide underline underline-offset-4">
        ← All garments
      </Link>

      <GarmentDetailsForm
        garment={garment}
        colors={options.colors}
        printOptions={options.printOptions}
        checklist={garmentChecklist(catalog, garment)}
      />

      <GarmentSizesForm garmentId={garment.id} sizes={options.sizes} />
      <GarmentColorsForm garmentId={garment.id} colors={options.colors} />
      <GarmentGsmForm garmentId={garment.id} gsmOptions={options.gsmOptions} />
      <GarmentPrintsForm
        garmentId={garment.id}
        printOptions={catalog.printOptions}
        allowedPrintOptionIds={allowedIds}
      />

      <DeleteGarmentButton garmentId={garment.id} name={garment.name} />
    </div>
  );
}
