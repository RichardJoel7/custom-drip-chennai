"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearBuyNowItem, useBuyNowItem } from "@/components/cart/buy-now";
import { useCart } from "@/components/cart/cart-context";
import { FreeShippingNudge } from "@/components/cart/free-shipping-nudge";
import { usePricedCart } from "@/components/cart/use-priced-cart";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { QuickAddRow } from "@/components/products/quick-add-row";
import { StateCityFields } from "@/components/checkout/state-city-fields";
import { UpiPaymentPanel } from "@/components/checkout/upi-payment-panel";
import { checkCoupon, saveCheckoutDetails, type AppliedCoupon } from "@/app/(site)/checkout/actions";
import { describePrints, printDisplayName } from "@/lib/custom/pricing";
import { canonicalLocation } from "@/lib/data/india-locations";
import { openCashfreeCheckout } from "@/lib/payments/cashfree-checkout";
import { formatPrice } from "@/lib/utils/format";
import { calculateShipping } from "@/lib/utils/shipping";
import {
  checkoutFormSchema,
  savedDetailsSchema,
  type CheckoutFormValues,
  type SavedCheckoutDetails,
} from "@/lib/validations/checkout";
import type { CartItem, CustomCatalog, ProductWithDetails, Settings } from "@/types";

const EMPTY_FORM: CheckoutFormValues = {
  fullName: "",
  mobileNumber: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  area: "",
  city: "",
  state: "",
  pincode: "",
  instagramUsername: "",
  orderNotes: "",
};

type Step = "details" | "payment";
type FieldErrors = Partial<Record<keyof CheckoutFormValues, string>>;

// Required fields in the order they appear, so a failed check can jump to the first one.
const REQUIRED_FIELDS: (keyof CheckoutFormValues)[] = [
  "fullName",
  "mobileNumber",
  "email",
  "addressLine1",
  "state",
  "city",
  "pincode",
];

function validate(form: CheckoutFormValues) {
  const result = checkoutFormSchema.safeParse(form);
  const errors: FieldErrors = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof CheckoutFormValues;
      if (!errors[key]) errors[key] = issue.message;
    }
  }
  return { result, errors };
}

function toOrderPayload(item: CartItem) {
  if (item.kind === "custom") {
    return { type: "custom" as const, ...item.config, quantity: item.quantity };
  }
  return { type: "product" as const, productId: item.productId, variantId: item.variantId, quantity: item.quantity };
}

function summaryLabel(item: CartItem) {
  if (item.kind !== "custom") return `${item.name} (${item.color}/${item.size}) x${item.quantity}`;
  const prints = describePrints(
    (item.prints ?? []).map((p) => ({ side: p.side, name: printDisplayName({ kind: p.kind, rect: p.rect, name: p.printOption.name }) }))
  );
  const details = [`${item.colorName}/${item.sizeLabel}`, item.gsmLabel, prints].filter(Boolean).join(", ");
  return `${item.name} (${details}) x${item.quantity}`;
}

function initialForm(savedDetails: SavedCheckoutDetails | null, accountEmail: string | null): CheckoutFormValues {
  if (!savedDetails) return { ...EMPTY_FORM, email: accountEmail ?? "" };
  return { ...EMPTY_FORM, ...savedDetails, ...canonicalLocation(savedDetails) };
}

export function CheckoutFlow({
  settings,
  catalog,
  savedDetails,
  accountEmail,
  onlinePayment,
  buyNow,
  products,
}: {
  settings: Settings;
  catalog: CustomCatalog | null;
  savedDetails: SavedCheckoutDetails | null;
  accountEmail: string | null;
  /** Set when Cashfree is: customers pay online instead of typing a UPI transaction ID. */
  onlinePayment: { mode: "sandbox" | "production" } | null;
  /** Came from a Buy Now button: check out that one item, not the cart. */
  buyNow: boolean;
  /** The shop's live tees, for "You may also like". */
  products: ProductWithDetails[];
}) {
  const { clearCart } = useCart();
  const buyNowItem = useBuyNowItem();
  // without the item (e.g. a Buy Now link opened in a new tab), it's the cart as usual
  const single = useMemo(() => (buyNow && buyNowItem ? [buyNowItem] : null), [buyNow, buyNowItem]);
  const { items, subtotal, hasUnavailable, isHydrated } = usePricedCart(catalog, single);
  const router = useRouter();

  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState<CheckoutFormValues>(() => initialForm(savedDetails, accountEmail));
  // Bumped when the form is cleared, so the state/city dropdowns reset their "Other" mode too.
  const [formVersion, setFormVersion] = useState(0);
  const [usingSaved, setUsingSaved] = useState(savedDetails !== null);
  const [saveForLater, setSaveForLater] = useState(true);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  // After a first try, errors update as the customer types, so fixed fields clear straight away.
  const [attempted, setAttempted] = useState(false);
  const [upiTransactionId, setUpiTransactionId] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  // Each step starts at the top: the details form is long and the payment step short, so
  // staying at the same scroll position would leave the Pay button off-screen above.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  // Shipping is worked out before the coupon, as the database does: a coupon never takes free
  // shipping away. The discount is recalculated here so it follows the subtotal.
  const shipping = calculateShipping(subtotal, settings);
  const discount = coupon ? Math.round((subtotal * coupon.percentOff) / 100) : 0;
  const total = subtotal - discount + shipping;
  const inOrder = items.flatMap((item) => (item.kind === "custom" ? [] : [item.productId]));

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
    setCouponError(null);
    try {
      const result = await checkCoupon({ code: couponInput, subtotal, email: form.email });
      if (result.coupon) {
        setCoupon(result.coupon);
        setCouponInput("");
      } else {
        setCouponError(result.error ?? "That coupon code isn't valid or has expired.");
      }
    } catch {
      setCouponError("Coupons can't be checked right now. Please try again.");
    } finally {
      setCheckingCoupon(false);
    }
  }

  /** The server turned the coupon down while placing the order: drop it so the total is right. */
  function dropRefusedCoupon(data: { couponError?: boolean; error?: string }) {
    if (!data.couponError) return;
    setCoupon(null);
    setCouponError(data.error ?? null);
  }

  const orderSummary = useMemo(() => items.map(summaryLabel).join(", "), [items]);

  function changeForm(patch: Partial<CheckoutFormValues>) {
    const next = { ...form, ...patch };
    setForm(next);
    if (attempted) setErrors(validate(next).errors);
  }

  function updateField<K extends keyof CheckoutFormValues>(key: K, value: CheckoutFormValues[K]) {
    changeForm({ [key]: value } as Partial<CheckoutFormValues>);
  }

  function clearForm() {
    setForm(initialForm(null, accountEmail));
    setFormVersion((v) => v + 1);
    setErrors({});
    setAttempted(false);
    setUsingSaved(false);
  }

  function handleContinueToPayment() {
    const { result, errors: fieldErrors } = validate(form);
    if (!result.success) {
      setAttempted(true);
      setErrors(fieldErrors);
      const first = REQUIRED_FIELDS.find((key) => fieldErrors[key]);
      const field = first ? document.getElementById(first) : null;
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field?.focus({ preventScroll: true });
      return;
    }
    setErrors({});
    setStep("payment");

    // Saving is a convenience — it never blocks paying.
    if (saveForLater) {
      setDetailsSaved(false);
      saveCheckoutDetails(savedDetailsSchema.parse(result.data))
        .then((saved) => setDetailsSaved(!saved.error))
        .catch(() => setDetailsSaved(false));
    }
  }

  // Online: create the order, then hand over to Cashfree. The cart is kept until the payment
  // is confirmed, so an abandoned payment can simply be tried again.
  async function handlePayOnline() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          paymentMethod: "cashfree",
          source: single ? "buy_now" : "cart",
          couponCode: coupon?.code,
          items: items.map(toOrderPayload),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.payment) {
        dropRefusedCoupon(data);
        setSubmitError(data.error ?? "We couldn't start the payment. Please try again.");
        setSubmitting(false);
        return;
      }
      await openCashfreeCheckout(data.payment);
      // the page is now on its way to Cashfree; stay in the "submitting" state
    } catch {
      setSubmitError("We couldn't open the payment page. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  async function handlePlaceOrder() {
    if (!upiTransactionId.trim()) {
      setSubmitError("Please enter your UPI transaction/reference ID.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          upiTransactionId,
          couponCode: coupon?.code,
          items: items.map(toOrderPayload),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        dropRefusedCoupon(data);
        setSubmitError(data.error ?? "Something went wrong while placing your order. Please try again.");
        setSubmitting(false);
        return;
      }

      if (single) clearBuyNowItem();
      else clearCart();
      router.push(`/order-success/${data.orderNumber}?t=${data.trackingToken}`);
    } catch {
      setSubmitError("Something went wrong while placing your order. Please try again.");
      setSubmitting(false);
    }
  }

  // Not on a Buy Now checkout: that pays for the one tee only, so an added tee wouldn't be in it.
  const suggestions = (className?: string) =>
    single ? null : (
      <QuickAddRow
        products={products}
        basisProductIds={inOrder}
        freeShippingShortfall={
          Number(settings.standard_shipping_fee) > 0 ? Math.max(0, Number(settings.free_shipping_threshold) - subtotal) : 0
        }
        title="Add to your order"
        limit={6}
        className={className}
      />
    );

  if (!isHydrated) return null;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl tracking-wide">YOUR CART IS EMPTY</h1>
        <p className="mt-2 text-muted-foreground">Add something to your cart before checking out.</p>
      </div>
    );
  }

  if (hasUnavailable) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl tracking-wide">UPDATE YOUR CART</h1>
        <p className="mt-2 text-muted-foreground">
          One of your custom tees uses an option that&apos;s no longer available.
        </p>
        <LinkButton href="/cart" size="lg" className="mt-6">
          Review Cart
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl tracking-wide sm:text-4xl">CHECKOUT</h1>
      <p className="mt-1 text-sm text-muted-foreground" title={orderSummary}>
        {items.length} item{items.length > 1 ? "s" : ""} · {formatPrice(total)}
      </p>

      {step === "details" && <FreeShippingNudge subtotal={subtotal} settings={settings} className="mt-5" />}

      {step === "details" && (
        <div className="mt-6 space-y-4">
          {usingSaved && (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl bg-muted px-4 py-3 text-sm">
              <span className="font-semibold">✓ We&apos;ve filled in your saved details</span>
              <button
                type="button"
                onClick={clearForm}
                className="text-xs font-semibold uppercase tracking-wide underline underline-offset-4"
              >
                Use different details
              </button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Fields marked <span className="font-semibold text-danger">*</span> are required.
          </p>

          <div>
            <Label htmlFor="fullName" required>
              Full Name
            </Label>
            <Input
              id="fullName"
              required
              aria-invalid={!!errors.fullName}
              autoComplete="name"
              value={form.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
            />
            <FieldError>{errors.fullName}</FieldError>
          </div>

          <div>
            <Label htmlFor="mobileNumber" required>
              Mobile Number
            </Label>
            <Input
              id="mobileNumber"
              required
              aria-invalid={!!errors.mobileNumber}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={form.mobileNumber}
              onChange={(e) => updateField("mobileNumber", e.target.value)}
            />
            <FieldError>{errors.mobileNumber}</FieldError>
          </div>

          <div>
            <Label htmlFor="email" required>
              Email
            </Label>
            <Input
              id="email"
              required
              aria-invalid={!!errors.email}
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
            <FieldError>{errors.email}</FieldError>
          </div>

          <div>
            <Label htmlFor="addressLine1" required>
              Address
            </Label>
            <Input
              id="addressLine1"
              required
              aria-invalid={!!errors.addressLine1}
              autoComplete="address-line1"
              value={form.addressLine1}
              onChange={(e) => updateField("addressLine1", e.target.value)}
            />
            <FieldError>{errors.addressLine1}</FieldError>
          </div>

          <div>
            <Label htmlFor="addressLine2">Apartment / House (optional)</Label>
            <Input
              id="addressLine2"
              autoComplete="address-line2"
              value={form.addressLine2}
              onChange={(e) => updateField("addressLine2", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="area">Area (optional)</Label>
            <Input
              id="area"
              autoComplete="address-line3"
              value={form.area}
              onChange={(e) => updateField("area", e.target.value)}
            />
          </div>

          <StateCityFields
            key={formVersion}
            state={form.state}
            city={form.city}
            errors={{ state: errors.state, city: errors.city }}
            onChange={(location) => changeForm(location)}
          />

          <div>
            <Label htmlFor="pincode" required>
              Pincode
            </Label>
            <Input
              id="pincode"
              required
              aria-invalid={!!errors.pincode}
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              value={form.pincode}
              onChange={(e) => updateField("pincode", e.target.value)}
            />
            <FieldError>{errors.pincode}</FieldError>
          </div>

          <div>
            <Label htmlFor="instagramUsername">Instagram Username (optional)</Label>
            <Input
              id="instagramUsername"
              value={form.instagramUsername}
              onChange={(e) => updateField("instagramUsername", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="orderNotes">Order Notes (optional)</Label>
            <Textarea
              id="orderNotes"
              value={form.orderNotes}
              onChange={(e) => updateField("orderNotes", e.target.value)}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4 transition-colors hover:border-foreground">
            <input
              type="checkbox"
              checked={saveForLater}
              onChange={(e) => setSaveForLater(e.target.checked)}
              className="mt-0.5 h-5 w-5 flex-none cursor-pointer accent-foreground"
            />
            <span>
              <span className="block text-sm font-semibold">Save these details for future orders</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                We&apos;ll fill them in for you next time. Remove them anytime from My Profile.
              </span>
            </span>
          </label>

          <Button size="lg" className="w-full" onClick={handleContinueToPayment}>
            Continue to Payment
          </Button>
        </div>
      )}

      {step === "payment" && (
        <div className="mt-6 space-y-5">
          {detailsSaved && (
            <p className="text-sm font-semibold text-success" role="status">
              ✓ Your details are saved for next time
            </p>
          )}

          <OrderSummary
            subtotal={subtotal}
            discount={discount}
            shipping={shipping}
            total={total}
            coupon={coupon}
            couponInput={couponInput}
            onCouponInput={(value) => {
              setCouponInput(value);
              setCouponError(null);
            }}
            onApply={applyCoupon}
            onRemove={() => {
              setCoupon(null);
              setCouponError(null);
            }}
            checking={checkingCoupon}
            error={couponError}
          />

          {/* Right under the totals, so an added tee shows up in them straight away. */}
          {suggestions()}

          {onlinePayment ? (
            <OnlinePaymentPanel amount={total} testMode={onlinePayment.mode === "sandbox"} />
          ) : (
            <>
              <UpiPaymentPanel settings={settings} amount={total} />

              <div>
                <Label htmlFor="upiTransactionId" required>
                  UPI Transaction ID
                </Label>
                <Input
                  id="upiTransactionId"
                  required
                  value={upiTransactionId}
                  onChange={(e) => setUpiTransactionId(e.target.value)}
                  placeholder="e.g. 123456789012"
                />
              </div>
            </>
          )}

          {submitError && <p className="text-sm text-danger">{submitError}</p>}

          <div className="space-y-2">
            {onlinePayment ? (
              <Button size="lg" className="w-full" disabled={submitting} onClick={handlePayOnline}>
                {submitting ? "Opening secure payment…" : `Pay ${formatPrice(total)}`}
              </Button>
            ) : (
              <Button size="lg" className="w-full" disabled={submitting} onClick={handlePlaceOrder}>
                {submitting ? "Placing Order…" : "I Have Paid — Place Order"}
              </Button>
            )}
            <button
              type="button"
              className="w-full text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground underline underline-offset-4"
              onClick={() => setStep("details")}
            >
              Back to details
            </button>
          </div>
        </div>
      )}

      {/* Below the form on the details step, so it doesn't get in the way of typing an address. */}
      {step === "details" && suggestions("mt-10")}
    </div>
  );
}

/** Subtotal, coupon, shipping and total, with the box to enter a coupon code. */
function OrderSummary({
  subtotal,
  discount,
  shipping,
  total,
  coupon,
  couponInput,
  onCouponInput,
  onApply,
  onRemove,
  checking,
  error,
}: {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon: AppliedCoupon | null;
  couponInput: string;
  onCouponInput: (value: string) => void;
  onApply: () => void;
  onRemove: () => void;
  checking: boolean;
  error: string | null;
}) {
  return (
    <div className="rounded-2xl border border-border p-5 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order summary</p>
      <div className="mt-3 space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-semibold">{formatPrice(subtotal)}</span>
        </div>
        {coupon && (
          <div className="flex items-center justify-between gap-3 text-success">
            <span>
              Coupon <span className="font-semibold">{coupon.code}</span> ({coupon.percentOff}% off)
              <button
                type="button"
                onClick={onRemove}
                className="ml-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground underline underline-offset-2"
              >
                Remove
              </button>
            </span>
            <span className="font-semibold">−{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span className="font-semibold">{shipping === 0 ? "FREE" : formatPrice(shipping)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-base">
          <span className="font-semibold">Total</span>
          <span className="font-bold">{formatPrice(total)}</span>
        </div>
      </div>

      {!coupon && (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onApply();
          }}
        >
          <Label htmlFor="couponCode" className="sr-only">
            Coupon code
          </Label>
          <Input
            id="couponCode"
            value={couponInput}
            onChange={(e) => onCouponInput(e.target.value.toUpperCase())}
            placeholder="Coupon code"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={30}
            className="py-2.5 uppercase"
          />
          <Button type="submit" variant="outline" size="md" className="flex-none rounded-none" disabled={checking || !couponInput.trim()}>
            {checking ? "Checking…" : "Apply"}
          </Button>
        </form>
      )}
      {error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** What paying online looks like before the customer taps Pay. */
function OnlinePaymentPanel({ amount, testMode }: { amount: number; testMode: boolean }) {
  return (
    <div className="rounded-2xl border border-border p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount to pay</p>
        <p className="font-display text-2xl tracking-wide">{formatPrice(amount)}</p>
      </div>
      <p className="mt-3 text-sm font-semibold">Pay with any UPI app, card, net banking or wallet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        You&apos;ll pay on Cashfree&apos;s secure page and come straight back here. Your order is confirmed the moment
        the payment goes through.
      </p>
      <p className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
        {["UPI", "Cards", "Net banking", "Wallets"].map((method) => (
          <span key={method} className="rounded-full bg-muted px-2.5 py-1">
            {method}
          </span>
        ))}
      </p>
      {testMode && (
        <p className="mt-3 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground">
          Test mode — no real money moves. Use Cashfree&apos;s test UPI ID or test card.
        </p>
      )}
    </div>
  );
}
