import type { Metadata } from "next";
import Link from "next/link";
import { NewInfluencerForm } from "@/components/admin/influencer-forms";
import { MigrationNotice } from "@/components/admin/migration-notice";
import { formatMoney } from "@/components/influencers/influencer-dashboard";
import { Badge } from "@/components/ui/badge";
import { commissionTerms } from "@/lib/influencers/periods";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getInfluencersForAdmin } from "@/services/influencers";

export const metadata: Metadata = { title: "Influencers" };

export default async function AdminInfluencersPage() {
  await requireAdmin();
  const { ready, influencers } = await getInfluencersForAdmin();

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide">INFLUENCERS</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Give each influencer their own code and terms. Orders with their code earn them commission — pending once paid,
        payable once delivered — and they can see their numbers by signing in with their email.
      </p>

      {!ready ? (
        <div className="mt-6">
          <MigrationNotice file="0020_influencers.sql" />
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          <section>
            <h2 className="font-display text-xl tracking-wide">YOUR INFLUENCERS</h2>
            {influencers.length === 0 ? (
              <p className="mt-3 text-muted-foreground">No influencers yet. Add the first one below.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[46rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3 font-semibold">Influencer</th>
                      <th className="py-2 pr-3 font-semibold">Codes</th>
                      <th className="py-2 pr-3 text-right font-semibold">Orders</th>
                      <th className="py-2 pr-3 text-right font-semibold">Sales</th>
                      <th className="py-2 pr-3 text-right font-semibold">Pending</th>
                      <th className="py-2 pr-3 text-right font-semibold">Balance due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {influencers.map((inf) => (
                      <tr key={inf.id} className="border-b border-border align-top">
                        <td className="py-3 pr-3">
                          <Link href={`/admin/influencers/${inf.id}`} className="font-semibold underline underline-offset-4">
                            {inf.name}
                          </Link>
                          {!inf.is_active && (
                            <span className="ml-2">
                              <Badge tone="warning">Paused</Badge>
                            </span>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {inf.instagram ? `@${inf.instagram} · ` : ""}
                            {commissionTerms(inf.commission_percent, inf.commission_fixed)}
                          </p>
                        </td>
                        <td className="py-3 pr-3 font-mono text-xs">{inf.codes.map((c) => c.code).join(", ") || "—"}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{inf.totals.orders}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatMoney(inf.totals.sales)}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{formatMoney(inf.totals.pending)}</td>
                        <td className="py-3 pr-3 text-right font-semibold tabular-nums">{formatMoney(inf.totals.due)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <NewInfluencerForm />
        </div>
      )}
    </div>
  );
}
