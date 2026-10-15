import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditInfluencerForm, InfluencerCodes, InviteMessage, PayoutsPanel } from "@/components/admin/influencer-forms";
import { CommissionBalance, InfluencerDashboard } from "@/components/influencers/influencer-dashboard";
import { Badge } from "@/components/ui/badge";
import { commissionTerms, resolvePeriod, summarize } from "@/lib/influencers/periods";
import { SITE_URL } from "@/lib/seo/site";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getInfluencerForAdmin, getInfluencerOrdersForAdmin } from "@/services/influencers";

export const metadata: Metadata = { title: "Influencer" };

export default async function AdminInfluencerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const detail = await getInfluencerForAdmin(id);
  if (!detail) notFound();

  const { influencer, payouts, freeCoupons } = detail;
  const period = resolvePeriod(await searchParams);
  const orders = await getInfluencerOrdersForAdmin(id, period);
  const summary = summarize(orders, period);

  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin/influencers" className="text-xs font-semibold uppercase tracking-wide underline underline-offset-4">
          ← All influencers
        </Link>
        <h1 className="mt-3 flex flex-wrap items-center gap-3 font-display text-3xl tracking-wide">
          {influencer.name.toUpperCase()}
          {influencer.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="warning">Paused</Badge>}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {influencer.email}
          {influencer.instagram && (
            <>
              {" · "}
              <a href={`https://instagram.com/${influencer.instagram}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                @{influencer.instagram}
              </a>
            </>
          )}
          {" · "}
          {commissionTerms(influencer.commission_percent, influencer.commission_fixed)}
        </p>
      </div>

      <section aria-labelledby="balance-title">
        <h2 id="balance-title" className="font-display text-xl tracking-wide">
          COMMISSION &amp; PAYOUTS
        </h2>
        <div className="mt-3">
          <CommissionBalance totals={influencer.totals} />
        </div>
        <div className="mt-4">
          <PayoutsPanel influencerId={influencer.id} due={influencer.totals.due} payouts={payouts} />
        </div>
      </section>

      <InfluencerDashboard basePath={`/admin/influencers/${influencer.id}`} period={period} summary={summary} orders={orders} admin />

      <div className="grid gap-6 lg:grid-cols-2">
        <InfluencerCodes influencerId={influencer.id} codes={influencer.codes} freeCoupons={freeCoupons} />
        <div className="space-y-4">
          <InviteMessage name={influencer.name} email={influencer.email} codes={influencer.codes.map((c) => c.code)} siteUrl={SITE_URL} />
        </div>
      </div>

      <EditInfluencerForm influencer={influencer} />
    </div>
  );
}
