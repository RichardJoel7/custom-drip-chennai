import { ORDER_STATUS_SEQUENCE } from "@/types";
import type { OrderStatus, PaymentStatus } from "@/types";

const TIMELINE_STEPS: { key: OrderStatus; label: string }[] = [
  { key: "new", label: "Order Placed" },
  { key: "payment_confirmed", label: "Payment Confirmed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

export function OrderTimeline({
  orderStatus,
  paymentStatus,
}: {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
}) {
  if (orderStatus === "cancelled") {
    return (
      <div className="border border-danger bg-danger/5 p-4 text-sm font-semibold uppercase tracking-wide text-danger">
        This order was cancelled.
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_SEQUENCE.indexOf(orderStatus);

  return (
    <ol className="space-y-0">
      {TIMELINE_STEPS.map((step, i) => {
        const stepIndex = ORDER_STATUS_SEQUENCE.indexOf(step.key);
        const reachedByStatus = currentIndex >= stepIndex;
        const reached =
          step.key === "payment_confirmed" ? reachedByStatus || paymentStatus === "paid" : reachedByStatus;
        const isLast = i === TIMELINE_STEPS.length - 1;

        return (
          <li key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span
                className={`absolute left-[11px] top-6 h-full w-0.5 ${
                  reached ? "bg-foreground" : "bg-border"
                }`}
              />
            )}
            <span
              className={`z-10 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold ${
                reached ? "bg-foreground text-background" : "bg-border text-muted-foreground"
              }`}
            >
              {reached ? "✓" : ""}
            </span>
            <span className={`pt-0.5 text-sm font-semibold ${reached ? "" : "text-muted-foreground"}`}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
