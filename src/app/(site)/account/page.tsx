import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SavedDetailsCard } from "@/components/account/saved-details-card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/format";
import { getSavedCheckoutDetails } from "@/services/saved-details";

export const metadata: Metadata = { title: "My Profile", robots: { index: false } };

export default async function AccountPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/account");

  const savedDetails = await getSavedCheckoutDetails(user.id);

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-16">
      <h1 className="font-display text-4xl tracking-wide sm:text-5xl">MY PROFILE</h1>

      <div className="mt-6 space-y-3 rounded-2xl border border-border p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
          <p className="mt-0.5">{user.email}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer since</p>
          <p className="mt-0.5">{formatDate(user.created_at)}</p>
        </div>
      </div>

      {savedDetails && <SavedDetailsCard details={savedDetails} />}

      <div className="mt-6 space-y-3">
        <Link
          href="/account/orders"
          className="block rounded-2xl border border-border px-5 py-4 text-sm font-semibold uppercase tracking-wide hover:border-foreground"
        >
          My Orders →
        </Link>
        <Link
          href="/wishlist"
          className="block rounded-2xl border border-border px-5 py-4 text-sm font-semibold uppercase tracking-wide hover:border-foreground"
        >
          My Wishlist →
        </Link>
      </div>
    </div>
  );
}
