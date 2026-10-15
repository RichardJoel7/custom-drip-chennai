"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addInfluencerCode,
  createInfluencer,
  deletePayout,
  recordPayout,
  removeInfluencerCode,
  updateInfluencer,
} from "@/app/admin/(dashboard)/influencers/actions";
import { CopyText } from "@/components/influencers/copy-text";
import { formatMoney } from "@/components/influencers/influencer-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { commissionTerms } from "@/lib/influencers/periods";
import type { Coupon, Influencer, InfluencerPayout } from "@/types";

type Notice = { ok: boolean; message: string } | null;

function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p className={notice.ok ? "text-sm text-success" : "text-sm text-danger"} role="status">
      {notice.message}
    </p>
  );
}

const todayInIndia = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

/** Name, sign-in email, Instagram and commission terms — shared by the add and edit forms. */
function TermsFields({
  idPrefix,
  form,
  onChange,
}: {
  idPrefix: string;
  form: { name: string; email: string; instagram: string; percent: string; fixed: string };
  onChange: (patch: Partial<{ name: string; email: string; instagram: string; percent: string; fixed: string }>) => void;
}) {
  const preview = commissionTerms(Number(form.percent) || 0, Number(form.fixed) || 0);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${idPrefix}-name`} required>
            Name
          </Label>
          <Input id={`${idPrefix}-name`} value={form.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Wilson" maxLength={80} />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-instagram`}>Instagram username</Label>
          <Input id={`${idPrefix}-instagram`} value={form.instagram} onChange={(e) => onChange({ instagram: e.target.value })} placeholder="wils.styles" autoComplete="off" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor={`${idPrefix}-email`} required>
            Email they&apos;ll sign in with
          </Label>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            value={form.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="wilson@gmail.com"
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            When they sign in to the website with this email (and have confirmed it), they see their dashboard.
          </p>
        </div>
      </div>

      <fieldset className="rounded-2xl border border-border p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide">Their commission</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${idPrefix}-percent`}>% of order value</Label>
            <Input
              id={`${idPrefix}-percent`}
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.5"
              value={form.percent}
              onChange={(e) => onChange({ percent: e.target.value })}
              placeholder="e.g. 10"
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-fixed`}>₹ per order</Label>
            <Input
              id={`${idPrefix}-fixed`}
              type="number"
              inputMode="decimal"
              min={0}
              value={form.fixed}
              onChange={(e) => onChange({ fixed: e.target.value })}
              placeholder="e.g. 50"
            />
          </div>
        </div>
        <p className="mt-3 text-sm">
          <span className="font-semibold">{preview}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Use either or both. Order value = what the customer paid for the items after the discount, without shipping.
        </p>
      </fieldset>
    </>
  );
}

export function NewInfluencerForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", instagram: "", percent: "", fixed: "", code: "", percentOff: "10" });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    const result = await createInfluencer({
      name: form.name,
      email: form.email,
      instagram: form.instagram,
      commissionPercent: Number(form.percent) || 0,
      commissionFixed: Number(form.fixed) || 0,
      code: { code: form.code, percentOff: Number(form.percentOff) },
    });
    setSaving(false);
    if (result.id && !result.error) {
      router.push(`/admin/influencers/${result.id}`);
      return;
    }
    setNotice({ ok: false, message: result.error ?? "Something went wrong." });
    if (result.id) router.push(`/admin/influencers/${result.id}`);
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5 rounded-2xl border border-border p-5">
      <h2 className="font-display text-xl tracking-wide">NEW INFLUENCER</h2>
      <TermsFields idPrefix="new" form={form} onChange={(patch) => setForm({ ...form, ...patch })} />
      <fieldset className="rounded-2xl border border-border p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide">Their code</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="new-code" required>
              Code
            </Label>
            <Input
              id="new-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="WILS10"
              maxLength={30}
              autoComplete="off"
              className="uppercase"
            />
          </div>
          <div>
            <Label htmlFor="new-off" required>
              Discount for their followers (%)
            </Label>
            <Input
              id="new-off"
              type="number"
              inputMode="numeric"
              min={1}
              max={90}
              value={form.percentOff}
              onChange={(e) => setForm({ ...form, percentOff: e.target.value })}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          A code that already exists in Coupons (and isn&apos;t anyone else&apos;s) is given to them as it is, with its
          past orders.
        </p>
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={saving || !form.name.trim() || !form.email.trim() || !form.code.trim()}>
          {saving ? "Saving…" : "Add influencer"}
        </Button>
        <NoticeLine notice={notice} />
      </div>
    </form>
  );
}

export function EditInfluencerForm({ influencer }: { influencer: Influencer }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: influencer.name,
    email: influencer.email,
    instagram: influencer.instagram ?? "",
    percent: influencer.commission_percent ? String(influencer.commission_percent) : "",
    fixed: influencer.commission_fixed ? String(influencer.commission_fixed) : "",
  });
  const [active, setActive] = useState(influencer.is_active);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  async function save(isActive = active) {
    setSaving(true);
    setNotice(null);
    const result = await updateInfluencer(influencer.id, {
      name: form.name,
      email: form.email,
      instagram: form.instagram,
      commissionPercent: Number(form.percent) || 0,
      commissionFixed: Number(form.fixed) || 0,
      isActive,
    });
    setSaving(false);
    setNotice(result.error ? { ok: false, message: result.error } : { ok: true, message: "Saved." });
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-5 rounded-2xl border border-border p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl tracking-wide">DETAILS &amp; TERMS</h2>
        <Toggle
          checked={active}
          onChange={(next) => {
            setActive(next);
            save(next);
          }}
          label={active ? "Active" : "Paused"}
        />
      </div>
      <TermsFields idPrefix="edit" form={form} onChange={(patch) => setForm({ ...form, ...patch })} />
      <p className="text-xs text-muted-foreground">
        New terms apply to orders from now on; past orders keep the commission they were placed with. Paused: their code
        still gives the discount, but new orders earn no commission.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <NoticeLine notice={notice} />
      </div>
    </form>
  );
}

export function InfluencerCodes({ influencerId, codes, freeCoupons }: { influencerId: string; codes: Coupon[]; freeCoupons: Coupon[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [percentOff, setPercentOff] = useState("10");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  async function run(action: () => Promise<{ error?: string }>, success: string) {
    setBusy(true);
    setNotice(null);
    const result = await action();
    setBusy(false);
    setNotice(result.error ? { ok: false, message: result.error } : { ok: true, message: success });
    if (!result.error) setCode("");
    router.refresh();
  }

  const existing = freeCoupons.find((c) => c.code === code.trim().toUpperCase());

  return (
    <section className="space-y-4 rounded-2xl border border-border p-5" aria-labelledby="codes-title">
      <h2 id="codes-title" className="font-display text-xl tracking-wide">
        CODES
      </h2>
      {codes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No code yet — give them one below.</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {codes.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-base font-bold tracking-wider">{c.code}</span>
                <span className="text-sm">{c.percent_off}% off</span>
                {c.is_active ? <Badge tone="success">Live</Badge> : <Badge tone="warning">Paused in Coupons</Badge>}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Take ${c.code} away from them? Orders already placed with it stay theirs.`)) {
                    run(() => removeInfluencerCode(influencerId, c.id), `${c.code} is no longer theirs.`);
                  }
                }}
                className="text-xs font-semibold uppercase tracking-wide text-danger underline underline-offset-4 disabled:opacity-40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addInfluencerCode(influencerId, { code, percentOff: Number(percentOff) }), `${code.trim().toUpperCase()} is now theirs.`);
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div>
          <Label htmlFor="add-code">Give another code</Label>
          <Input
            id="add-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="WILS15"
            maxLength={30}
            list="free-coupons"
            autoComplete="off"
            className="w-40 uppercase"
          />
          <datalist id="free-coupons">
            {freeCoupons.map((c) => (
              <option key={c.id} value={c.code}>
                {c.percent_off}% off
              </option>
            ))}
          </datalist>
        </div>
        {!existing && (
          <div>
            <Label htmlFor="add-off">Discount (%)</Label>
            <Input id="add-off" type="number" min={1} max={90} value={percentOff} onChange={(e) => setPercentOff(e.target.value)} className="w-24" />
          </div>
        )}
        <Button type="submit" size="md" variant="outline" disabled={busy || !code.trim()}>
          {existing ? `Give existing ${existing.code}` : "Create & give"}
        </Button>
      </form>
      <NoticeLine notice={notice} />
    </section>
  );
}

export function PayoutsPanel({ influencerId, due, payouts }: { influencerId: string; due: number; payouts: InfluencerPayout[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ amount: due > 0 ? String(due) : "", paidOn: todayInIndia(), note: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  async function run(action: () => Promise<{ error?: string }>, success: string) {
    setBusy(true);
    setNotice(null);
    const result = await action();
    setBusy(false);
    setNotice(result.error ? { ok: false, message: result.error } : { ok: true, message: success });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => recordPayout(influencerId, { amount: Number(form.amount), paidOn: form.paidOn, note: form.note }), "Payout recorded.").then(
            () => setForm({ amount: "", paidOn: todayInIndia(), note: "" })
          );
        }}
        className="grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-[8rem_10rem_1fr_auto] sm:items-end"
      >
        <div>
          <Label htmlFor="payout-amount" required>
            Amount (₹)
          </Label>
          <Input id="payout-amount" type="number" inputMode="decimal" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="payout-date" required>
            Paid on
          </Label>
          <Input id="payout-date" type="date" value={form.paidOn} onChange={(e) => setForm({ ...form, paidOn: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="payout-note">Note</Label>
          <Input id="payout-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. UPI ref 4321… / October" maxLength={200} />
        </div>
        <Button type="submit" size="md" disabled={busy || !form.amount}>
          Record payout
        </Button>
      </form>
      <NoticeLine notice={notice} />

      {payouts.length > 0 && (
        <ul className="divide-y divide-border border-y border-border text-sm">
          {payouts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span>
                {new Date(`${p.paid_on}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
                {p.note && <span className="text-muted-foreground"> · {p.note}</span>}
              </span>
              <span className="flex items-center gap-4">
                <span className="font-semibold tabular-nums">{formatMoney(p.amount)}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("Delete this payout record?")) run(() => deletePayout(influencerId, p.id), "Payout deleted.");
                  }}
                  className="text-xs font-semibold uppercase tracking-wide text-danger underline underline-offset-4 disabled:opacity-40"
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A ready-to-send message for WhatsApp or Instagram DM. */
export function InviteMessage({ name, email, codes, siteUrl }: { name: string; email: string; codes: string[]; siteUrl: string }) {
  const message = [
    `Hi ${name}! Your Custom Drip partner dashboard is ready: ${siteUrl}/influencer`,
    `Sign in (or create an account) with ${email} to see your orders and commission.`,
    codes.length ? `Your code${codes.length > 1 ? "s" : ""} for your followers: ${codes.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <div className="rounded-2xl bg-muted p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invite message</p>
        <CopyText text={message} label="Copy message" />
      </div>
      <p className="mt-2 whitespace-pre-line">{message}</p>
    </div>
  );
}
