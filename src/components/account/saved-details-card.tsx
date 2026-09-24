"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { forgetCheckoutDetails } from "@/app/(site)/checkout/actions";
import type { SavedCheckoutDetails } from "@/lib/validations/checkout";

export function SavedDetailsCard({ details }: { details: SavedCheckoutDetails }) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    setRemoving(true);
    setError(null);
    const result = await forgetCheckoutDetails();
    if (result.error) {
      setError(result.error);
      setRemoving(false);
      return;
    }
    router.refresh();
  }

  const address = [details.addressLine1, details.addressLine2, details.area, details.city, details.state]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mt-6 rounded-2xl border border-border p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saved delivery details</p>
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          className="text-xs font-semibold uppercase tracking-wide text-danger underline underline-offset-4 disabled:opacity-50"
        >
          {removing ? "Removing…" : "Remove"}
        </button>
      </div>
      <p className="mt-2 font-semibold">{details.fullName}</p>
      <p className="text-sm text-muted-foreground">
        {details.mobileNumber} · {details.email}
      </p>
      <p className="mt-1 text-sm">
        {address} — {details.pincode}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">Used to fill in checkout for you. Update them at your next checkout.</p>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
