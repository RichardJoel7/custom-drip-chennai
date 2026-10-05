import type { Metadata } from "next";
import Link from "next/link";
import { ClearOrderedItems, RefreshWhilePending, RetryPaymentButton } from "@/components/checkout/payment-return";
import { LinkButton } from "@/components/ui/button";
import { cashfreeConfig, PAYMENT_WINDOW_MINUTES } from "@/lib/payments/cashfree";
import { paymentMethodLabel } from "@/lib/payments/labels";
import { formatPrice } from "@/lib/utils/format";
import { getOrderByTrackingToken } from "@/services/orders";
import { syncOnlinePayment, type OnlinePaymentState } from "@/services/payments";
import { getSettings } from "@/services/settings";
import type { OrderWithItems } from "@/types";

export const metadata: Metadata = { title: "Your Order", robots: { index: false } };

export default async function OrderSuccessPage({
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ t?: string; from?: string }>;
}) {
  const { t, from } = await searchParams;
  // paid with Buy Now: the cart wasn't part of this order, so it's left alone
  const buyNow = from === "buy-now";
  const back = buyNow
    ? { href: "/checkout?buy=now", label: "Back to Checkout" }
    : { href: "/cart", label: "Back to Cart" };
  const [found, settings] = await Promise.all([
    t ? getOrderByTrackingToken(t) : Promise.resolve(null),
    getSettings(),
  ]);

  if (!found || !t) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl tracking-wide">ORDER NOT FOUND</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn&apos;t find that order. If you just placed an order, check your order
          confirmation link.
        </p>
        <LinkButton href="/shop" size="lg" className="mt-6">
          Continue Shopping
        </LinkButton>
      </div>
    );
  }

  // Coming back from Cashfree: ask Cashfree how the payment went before showing anything.
  // (`order` isn't re-read afterwards: within one page load that would return the same copy.)
  const order: OrderWithItems = found;
  const online: OnlinePaymentState | null = found.payment_method === "cashfree" ? await syncOnlinePayment(found.id) : null;

  if (online?.state === "failed") {
    return (
      <Notice heading="PAYMENT NOT RECEIVED" icon="✕">
        <p>
          Order {order.order_number} was cancelled because its payment didn&apos;t go through in time. You can place it
          again in a minute.
        </p>
        <p className="mt-3 text-sm">
          If any money left your account, your bank returns it automatically, usually within 5–7 working days.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <LinkButton href={back.href} size="lg">
            {back.label}
          </LinkButton>
          <LinkButton href={settings.instagram_url} external variant="outline" size="lg">
            Contact Us on Instagram
          </LinkButton>
        </div>
      </Notice>
    );
  }

  if (online?.state === "awaiting") {
    const processing = online.lastAttempt === "PENDING";
    const cashfree = cashfreeConfig();
    return (
      <Notice heading={processing ? "CONFIRMING YOUR PAYMENT" : "PAYMENT NOT COMPLETED"} icon={processing ? "⏳" : "!"}>
        {processing ? (
          <>
            <RefreshWhilePending />
            {/* it's almost certainly going through, so nothing is left in the cart to pay for twice */}
            <ClearOrderedItems buyNow={buyNow} />
            <p>
              Your bank is still confirming the payment of <b>{formatPrice(order.total)}</b> for order{" "}
              {order.order_number}. This page updates by itself — please don&apos;t pay again. We&apos;ll email you
              as soon as it&apos;s confirmed.
            </p>
          </>
        ) : (
          <p>
            Order {order.order_number} is saved, but the payment of <b>{formatPrice(order.total)}</b> wasn&apos;t completed.
            You can try again within {PAYMENT_WINDOW_MINUTES} minutes of placing it. If money left your account for a
            failed try, your bank returns it automatically.
          </p>
        )}
        {processing ? (
          <div className="mt-8 flex flex-col gap-3">
            <LinkButton href={`/track/${order.tracking_token}`} variant="outline" size="lg">
              Track Your Order
            </LinkButton>
            <LinkButton href="/shop" size="lg">
              Continue Shopping
            </LinkButton>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {online.sessionId && cashfree && <RetryPaymentButton sessionId={online.sessionId} mode={cashfree.mode} />}
            <LinkButton href={back.href} variant="outline" size="lg">
              {back.label}
            </LinkButton>
          </div>
        )}
      </Notice>
    );
  }

  const paidOnline = online?.state === "paid";
  const method = paymentMethodLabel(online?.state === "paid" ? online.method : null);

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-16">
      {paidOnline && <ClearOrderedItems buyNow={buyNow} />}
      <div className="text-center">
        <p className="text-4xl">🎉</p>
        <h1 className="mt-2 font-display text-3xl tracking-wide sm:text-4xl">
          {paidOnline ? "ORDER CONFIRMED" : "ORDER PLACED SUCCESSFULLY"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {paidOnline
            ? "We've received your payment. We'll start on your order and email you as soon as it ships."
            : "We've received your order. Your payment will be verified and we'll begin processing your order shortly."}
        </p>
      </div>

      <div className="mt-8 space-y-4 border border-border p-5">
        <Row label="Order Number" value={order.order_number} />
        <Row label="Total" value={formatPrice(order.total)} />
        <Row
          label="Payment"
          value={paidOnline ? `Paid${method ? ` · ${method}` : ""}` : "Payment submitted for verification"}
        />
      </div>

      <div className="mt-6 space-y-1 border border-border p-5 text-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Shipping To
        </p>
        <p className="font-semibold">{order.full_name}</p>
        <p>{order.mobile_number}</p>
        <p>
          {order.address_line1}
          {order.address_line2 ? `, ${order.address_line2}` : ""}
        </p>
        {order.area && <p>{order.area}</p>}
        <p>
          {order.city}, {order.state} {order.pincode}
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <LinkButton href={`/track/${order.tracking_token}`} variant="outline" size="lg">
          Track Your Order
        </LinkButton>
        <LinkButton href={settings.instagram_url} external size="lg">
          Contact Us on Instagram
        </LinkButton>
        <Link href="/shop" className="text-center text-sm font-semibold uppercase tracking-wide underline underline-offset-4">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

function Notice({ heading, icon, children }: { heading: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center sm:py-16">
      <p className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-xl font-bold">{icon}</p>
      <h1 className="mt-3 font-display text-3xl tracking-wide sm:text-4xl">{heading}</h1>
      <div className="mt-3 text-muted-foreground">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex-none text-sm text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
