import type { Metadata } from "next";
import { MigrationNotice } from "@/components/admin/migration-notice";
import { PrintOptionsForm } from "@/components/admin/print-options-form";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getCustomCatalogForAdmin } from "@/services/custom-studio";

export const metadata: Metadata = { title: "Customizer — Print Prices" };

export default async function CustomizerPrintsPage() {
  await requireAdmin();
  const { catalog, status } = await getCustomCatalogForAdmin();
  if (status !== "ready") return <MigrationNotice file={status} />;

  return (
    <div className="max-w-3xl">
      <PrintOptionsForm printOptions={catalog.printOptions} />
    </div>
  );
}
