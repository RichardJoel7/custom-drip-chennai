"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { confirmPayment, rejectPayment } from "@/app/admin/(dashboard)/orders/actions";
import type { PaymentStatus } from "@/types";

export function PaymentVerificationPanel({
  orderId,
  paymentStatus,
  upiTransactionId,
}: {
  orderId: string;
  paymentStatus: PaymentStatus;
  upiTransactionId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await confirmPayment(orderId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleReject() {
    if (!window.confirm("Reject this payment?")) return;
    setError(null);
    startTransition(async () => {
      const result = await rejectPayment(orderId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="border border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        UPI Transaction ID
      </p>
      <p className="mt-1 font-mono text-sm">{upiTransactionId}</p>

      {paymentStatus === "pending_verification" ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="primary" disabled={isPending} onClick={handleConfirm}>
            ✓ Confirm Payment
          </Button>
          <Button variant="danger" disabled={isPending} onClick={handleReject}>
            ✕ Reject Payment
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-sm font-semibold uppercase">
          {paymentStatus === "paid" ? "✓ Payment Verified" : "✕ Payment Rejected"}
        </p>
      )}

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
