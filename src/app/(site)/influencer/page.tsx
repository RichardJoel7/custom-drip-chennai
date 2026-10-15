import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CommissionBalance, InfluencerDashboard, formatMoney } from "@/components/influencers/influencer-dashboard";
import { CopyText } from "@/components/influencers/copy-text";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { commissionTerms, resolvePeriod, summarize } from "@/lib/influencers/periods";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getMyInfluencer,
  getMyInfluencerOrders,
  getMyInfluencerPayouts,
  getMyInfluencerTotals,
} from "@/services/influencers";

export const metadata: Metadata = { title: "Influencer Dashboard", robots: { index: false } };

export default async function InfluencerPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Finfluencer");

  const me = await getMyInfluencer();
  if (!me) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl tracking-wide">INFLUENCER DASHBOARD</h1>
        <p className="mt-3 text-muted-foreground">
          This page is for Custom Drip creator partners. You&apos;re signed in as <b>{user.email}</b>, which isn&apos;t on
          our partner list. If you&apos;re a partner, sign in with the email you gave us, or message us on Instagram.
        </p>
        <LinkButton href="/shop" size="lg" className="mt-6">
          Back to the Shop
        </LinkButton>
      </div>
    );
  }

  const period = resolvePeriod(await searchParams);
  const [orders, totals, payouts] = await Promise.all([getMyInfluencerOrders(period), getMyInfluencerTotals(), getMyInfluencerPayouts()]);
  const summary = summarize(orders, period);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Influencer dashboard</p>
      <h1 className="mt-1 font-display text-4xl tracking-wide sm:text-5xl">HI, {me.name.toUpperCase()}</h1>
      {!me.is_active && (
        <p className="mt-3 rounded-2xl bg-muted px-4 py-3 text-sm">
          Your partnership is paused, so new orders don&apos;t earn commission right now. Your past numbers are below.
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your code{me.codes.length > 1 ? "s" : ""}
          </p>
          <ul className="mt-2 space-y-2">
            {me.codes.length === 0 && <li className="text-sm text-muted-foreground">Your code is being set up.</li>}
            {me.codes.map((c) => (
              <li key={c.code} className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xl font-bold tracking-wider">{c.code}</span>
                <span className="text-sm">{c.percent_off}% off for your followers</span>
                {!c.is_active && <Badge tone="neutral">Paused</Badge>}
                <CopyText text={c.code} label="Copy" />
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your commission</p>
          <p className="mt-2 text-lg font-semibold">{commissionTerms(me.commission_percent, me.commission_fixed)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Order value means what your follower paid for the items after the discount, without shipping. Commission is
            payable once the order is delivered.
          </p>
        </div>
      </div>

      <div className="mt-10">
        <InfluencerDashboard basePath="/influencer" period={period} summary={summary} orders={orders} />
      </div>

      <section className="mt-12" aria-labelledby="payouts-title">
        <h2 id="payouts-title" className="font-display text-2xl tracking-wide">
          PAYOUTS
        </h2>
        <div className="mt-3">
          <CommissionBalance totals={totals} />
        </div>
        {payouts.length > 0 && (
          <ul className="mt-5 divide-y divide-border border-y border-border text-sm">
            {payouts.map((p, i) => (
              <li key={`${p.paid_on}-${i}`} className="flex items-center justify-between gap-4 py-3">
                <span>
                  {new Date(`${p.paid_on}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
                  {p.note && <span className="text-muted-foreground"> · {p.note}</span>}
                </span>
                <span className="font-semibold tabular-nums">{formatMoney(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
