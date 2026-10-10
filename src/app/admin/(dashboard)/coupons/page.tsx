import type { Metadata } from "next";
import { CouponsManager } from "@/components/admin/coupons-manager";
import { MigrationNotice } from "@/components/admin/migration-notice";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getCouponsForAdmin } from "@/services/coupons";

export const metadata: Metadata = { title: "Coupons" };

export default async function AdminCouponsPage() {
  await requireAdmin();
  const { ready, coupons, uses } = await getCouponsForAdmin();

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide">COUPONS</h1>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        Discount codes customers enter at checkout, e.g. DRIP10 for 10% off.
      </p>
      <div className="mt-6">{ready ? <CouponsManager coupons={coupons} uses={uses} /> : <MigrationNotice file="0019_coupons.sql" />}</div>
    </div>
  );
}
