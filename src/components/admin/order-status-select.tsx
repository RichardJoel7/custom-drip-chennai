"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatus } from "@/app/admin/(dashboard)/orders/actions";
import { ORDER_STATUS_LABELS } from "@/types";
import type { OrderStatus } from "@/types";

const STATUS_OPTIONS: OrderStatus[] = ["new", "payment_confirmed", "shipped", "delivered", "cancelled"];

export function OrderStatusSelect({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as OrderStatus;
    setError(null);
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, status);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">Status</label>
      <select
        value={currentStatus}
        onChange={handleChange}
        disabled={isPending}
        className="h-12 w-full border border-border bg-background px-3 text-base font-semibold focus:border-foreground focus:outline-none"
      >
        {STATUS_OPTIONS.map((status) => (
          <option
            key={status}
            value={status}
            disabled={status === "shipped" && currentStatus !== "shipped"}
          >
            {ORDER_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-xs text-muted-foreground">
        To mark an order shipped, use Shipment Details below — that also emails the customer.
      </p>
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}
