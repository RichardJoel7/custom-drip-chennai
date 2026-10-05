"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { recheckOnlinePayment } from "@/app/admin/(dashboard)/orders/actions";
import { paymentMethodLabel } from "@/lib/payments/labels";
import { formatDateTime } from "@/lib/utils/format";
import type { PaymentStatus } from "@/types";

const STATUS_TEXT: Partial<Record<PaymentStatus, string>> = {
  paid: "✓ Paid online — confirmed by Cashfree",
  awaiting_payment: "Waiting for the customer to pay online",
  failed: "✕ Not paid in time — order cancelled, stock put back",
};

/** An order paid through Cashfree: nothing to verify by hand, just what Cashfree reported. */
export function OnlinePaymentPanel({
  orderId,
  paymentStatus,
  method,
  paymentId,
  bankReference,
  paidAt,
}: {
  orderId: string;
  paymentStatus: PaymentStatus;
  method: string | null;
  paymentId: string | null;
  bankReference: string | null;
  paidAt: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function recheck() {
    setError(null);
    startTransition(async () => {
      const result = await recheckOnlinePayment(orderId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="border border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Online payment (Cashfree)</p>
      <p className="mt-1 text-sm font-semibold uppercase">{STATUS_TEXT[paymentStatus] ?? paymentStatus}</p>

      {paymentStatus === "paid" && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {method && (
            <>
              <dt className="text-muted-foreground">Paid with</dt>
              <dd>{paymentMethodLabel(method)}</dd>
            </>
          )}
          {paymentId && (
            <>
              <dt className="text-muted-foreground">Cashfree payment ID</dt>
              <dd className="break-all font-mono">{paymentId}</dd>
            </>
          )}
          {bankReference && (
            <>
              <dt className="text-muted-foreground">Bank reference</dt>
              <dd className="break-all font-mono">{bankReference}</dd>
            </>
          )}
          {paidAt && (
            <>
              <dt className="text-muted-foreground">Paid on</dt>
              <dd>{formatDateTime(paidAt)}</dd>
            </>
          )}
        </dl>
      )}

      {paymentStatus === "awaiting_payment" && (
        <Button size="sm" variant="outline" className="mt-3" disabled={isPending} onClick={recheck}>
          {isPending ? "Checking…" : "Check with Cashfree"}
        </Button>
      )}
      {paymentStatus === "paid" && (
        <p className="mt-3 text-xs text-muted-foreground">Refunds are made from the Cashfree dashboard.</p>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
