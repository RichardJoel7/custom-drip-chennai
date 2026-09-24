import type { Metadata } from "next";
import { DesignHubManager } from "@/components/admin/design-hub-manager";
import { MigrationNotice } from "@/components/admin/migration-notice";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getDesignsForAdmin } from "@/services/custom-studio";

export const metadata: Metadata = { title: "Customizer — Design Hub" };

export default async function DesignHubPage() {
  await requireAdmin();
  const designs = await getDesignsForAdmin();

  return designs ? <DesignHubManager initialDesigns={designs} /> : <MigrationNotice />;
}
