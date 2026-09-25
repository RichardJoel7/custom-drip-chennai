import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteGarmentButton, GarmentEditor } from "@/components/admin/garment-editor";
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

  return (
    <div className="max-w-4xl space-y-8">
      <Link href="/admin/customizer" className="text-xs font-semibold uppercase tracking-wide underline underline-offset-4">
        ← All garments
      </Link>

      <GarmentEditor
        garment={garment}
        sizes={options.sizes}
        colors={options.colors}
        gsmOptions={options.gsmOptions}
        printOptions={catalog.printOptions}
        allowedPrintOptionIds={catalog.garmentPrintOptionIds[garment.id] ?? []}
        checklist={garmentChecklist(catalog, garment)}
      />

      <DeleteGarmentButton garmentId={garment.id} name={garment.name} />
    </div>
  );
}
