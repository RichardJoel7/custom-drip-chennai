"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCoupon, deleteCoupon, setCouponActive } from "@/app/admin/(dashboard)/coupons/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { formatPrice } from "@/lib/utils/format";
import type { AdminCoupon } from "@/services/coupons";

const EMPTY = { code: "", percentOff: "", expiresOn: "", minOrderAmount: "", maxUses: "", oncePerCustomer: false };

function endDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

/** Create coupon codes and switch them on/off. Customers enter them at checkout. */
export function CouponsManager({ coupons, uses }: { coupons: AdminCoupon[]; uses: Record<string, number> }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const numberOrNull = (value: string) => (value.trim() === "" ? null : Number(value));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    const result = await createCoupon({
      code: form.code,
      percentOff: Number(form.percentOff),
      expiresOn: form.expiresOn,
      minOrderAmount: numberOrNull(form.minOrderAmount),
      maxUses: numberOrNull(form.maxUses),
      oncePerCustomer: form.oncePerCustomer,
    });
    setSaving(false);
    if (result.error) {
      setNotice({ ok: false, message: result.error });
      return;
    }
    setNotice({ ok: true, message: `${form.code.trim().toUpperCase()} is live — customers can use it at checkout.` });
    setForm(EMPTY);
    router.refresh();
  }

  async function run(id: string, action: () => Promise<{ error?: string }>) {
    setBusyId(id);
    const result = await action();
    setBusyId(null);
    if (result.error) setNotice({ ok: false, message: result.error });
    router.refresh();
  }

  return (
    <div className="space-y-10">
      <form onSubmit={handleCreate} className="max-w-xl space-y-4 border border-border p-5">
        <h2 className="font-display text-xl tracking-wide">NEW COUPON</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="coupon-code" required>
              Code
            </Label>
            <Input
              id="coupon-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="DRIP10"
              maxLength={30}
              autoComplete="off"
              className="uppercase"
            />
          </div>
          <div>
            <Label htmlFor="coupon-percent" required>
              Discount (%)
            </Label>
            <Input
              id="coupon-percent"
              type="number"
              inputMode="numeric"
              min={1}
              max={90}
              value={form.percentOff}
              onChange={(e) => setForm({ ...form, percentOff: e.target.value })}
              placeholder="10"
            />
          </div>
        </div>

        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold underline underline-offset-4">More options (optional)</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="coupon-until">Valid until</Label>
              <Input id="coupon-until" type="date" value={form.expiresOn} onChange={(e) => setForm({ ...form, expiresOn: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="coupon-min">Minimum order (₹)</Label>
              <Input
                id="coupon-min"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                placeholder="e.g. 999"
              />
            </div>
            <div>
              <Label htmlFor="coupon-max">Total uses allowed</Label>
              <Input
                id="coupon-max"
                type="number"
                inputMode="numeric"
                min={1}
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                placeholder="Unlimited"
              />
            </div>
            <label htmlFor="coupon-once" className="flex items-center gap-2 self-end pb-3 text-sm font-semibold">
              <input
                id="coupon-once"
                type="checkbox"
                checked={form.oncePerCustomer}
                onChange={(e) => setForm({ ...form, oncePerCustomer: e.target.checked })}
                className="h-4 w-4 accent-foreground"
              />
              One use per customer
            </label>
          </div>
        </details>

        <p className="text-xs text-muted-foreground">
          The discount comes off the price of the items. Shipping is worked out before the discount, so a coupon never
          takes free shipping away.
        </p>
        <Button type="submit" size="md" disabled={saving || !form.code.trim() || !form.percentOff}>
          {saving ? "Saving…" : "Create coupon"}
        </Button>
        {notice && (
          <p className={notice.ok ? "text-sm text-success" : "text-sm text-danger"} role="status">
            {notice.message}
          </p>
        )}
      </form>

      <section>
        <h2 className="font-display text-xl tracking-wide">YOUR COUPONS</h2>
        {coupons.length === 0 ? (
          <p className="mt-3 text-muted-foreground">No coupons yet. Create one above.</p>
        ) : (
          <div className="mt-4 divide-y divide-border border-y border-border">
            {coupons.map((coupon) => {
              const used = uses[coupon.code] ?? 0;
              const expired = coupon.expired;
              const usedUp = coupon.max_uses !== null && used >= coupon.max_uses;
              const rules = [
                coupon.min_order_amount !== null && `on orders of ${formatPrice(coupon.min_order_amount)}+`,
                coupon.expires_at && `${expired ? "ended" : "until"} ${endDate(coupon.expires_at)}`,
                coupon.once_per_customer && "once per customer",
              ].filter(Boolean);
              return (
                <div key={coupon.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-bold tracking-wider">{coupon.code}</span>
                      <span className="font-semibold">{coupon.percent_off}% off</span>
                      {expired ? (
                        <Badge tone="neutral">Ended</Badge>
                      ) : usedUp ? (
                        <Badge tone="neutral">Used up</Badge>
                      ) : coupon.is_active ? (
                        <Badge tone="success">Live</Badge>
                      ) : (
                        <Badge tone="warning">Paused</Badge>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Used {used}
                      {coupon.max_uses !== null ? ` of ${coupon.max_uses}` : ""} time{used === 1 && coupon.max_uses === null ? "" : "s"}
                      {rules.length > 0 && ` · ${rules.join(" · ")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Toggle
                      checked={coupon.is_active}
                      onChange={(active) => run(coupon.id, () => setCouponActive(coupon.id, active))}
                      label={coupon.is_active ? "On" : "Off"}
                    />
                    <button
                      type="button"
                      disabled={busyId === coupon.id}
                      onClick={() => {
                        if (window.confirm(`Delete ${coupon.code}? Orders that used it keep their discount.`)) {
                          run(coupon.id, () => deleteCoupon(coupon.id));
                        }
                      }}
                      className="text-xs font-semibold uppercase tracking-wide text-danger underline underline-offset-4 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
