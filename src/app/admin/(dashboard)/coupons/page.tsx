import type { Metadata } from "next";
import Link from "next/link";
import { CouponsManager } from "@/components/admin/coupons-manager";
import { MigrationNotice } from "@/components/admin/migration-notice";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getCouponsForAdmin } from "@/services/coupons";
import { getInfluencersForAdmin } from "@/services/influencers";

export const metadata: Metadata = { title: "Coupons" };

export default async function AdminCouponsPage() {
  await requireAdmin();
  const [{ ready, coupons, uses }, { influencers }] = await Promise.all([getCouponsForAdmin(), getInfluencersForAdmin()]);
  const owners = Object.fromEntries(influencers.map((i) => [i.id, i.name]));

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide">COUPONS</h1>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        Discount codes customers enter at checkout, e.g. DRIP10 for 10% off. Codes for influencers (with commission) are
        made in{" "}
        <Link href="/admin/influencers" className="font-semibold text-foreground underline underline-offset-4">
          Influencers
        </Link>
        .
      </p>
      <div className="mt-6">{ready ? <CouponsManager coupons={coupons} uses={uses} owners={owners} /> : <MigrationNotice file="0019_coupons.sql" />}</div>
    </div>
  );
}
