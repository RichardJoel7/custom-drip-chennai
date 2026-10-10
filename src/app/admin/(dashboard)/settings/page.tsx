import type { Metadata } from "next";
import Link from "next/link";
import { SettingsForm } from "@/components/admin/settings-form";
import { TestEmailButton } from "@/components/admin/test-email-button";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getSettings();

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide">SETTINGS</h1>
      <div className="mt-6">
        <SettingsForm settings={settings} />
      </div>
      <div className="mt-10 max-w-xl space-y-6">
        <TestEmailButton />
        <section className="border border-border p-4">
          <h2 className="font-semibold">Coupons</h2>
          <p className="mt-1 text-sm text-muted-foreground">Discount codes customers can enter at checkout.</p>
          <Link href="/admin/coupons" className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">
            Manage coupons →
          </Link>
        </section>
      </div>
    </div>
  );
}
