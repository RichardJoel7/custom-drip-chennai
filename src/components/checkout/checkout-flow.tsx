"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { usePricedCart } from "@/components/cart/use-priced-cart";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { StateCityFields } from "@/components/checkout/state-city-fields";
import { UpiPaymentPanel } from "@/components/checkout/upi-payment-panel";
import { saveCheckoutDetails } from "@/app/(site)/checkout/actions";
import { SIDE_LABELS } from "@/lib/custom/pricing";
import { canonicalLocation } from "@/lib/data/india-locations";
import { formatPrice } from "@/lib/utils/format";
import { calculateShipping } from "@/lib/utils/shipping";
import {
  checkoutFormSchema,
  savedDetailsSchema,
  type CheckoutFormValues,
  type SavedCheckoutDetails,
} from "@/lib/validations/checkout";
import type { CartItem, CustomCatalog, Settings } from "@/types";

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

function toOrderPayload(item: CartItem) {
  if (item.kind === "custom") {
    return { type: "custom" as const, ...item.config, quantity: item.quantity };
  }
  return { type: "product" as const, productId: item.productId, variantId: item.variantId, quantity: item.quantity };
}

function summaryLabel(item: CartItem) {
  return item.kind === "custom"
    ? `${item.name} (${item.colorName}/${item.sizeLabel}${item.gsmLabel ? `, ${item.gsmLabel}` : ""}, ${item.printOption.name} ${SIDE_LABELS[item.config.sides]}) x${item.quantity}`
    : `${item.name} (${item.color}/${item.size}) x${item.quantity}`;
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
}: {
  settings: Settings;
  catalog: CustomCatalog | null;
  savedDetails: SavedCheckoutDetails | null;
  accountEmail: string | null;
}) {
  const { clearCart } = useCart();
  const { items, subtotal, hasUnavailable, isHydrated } = usePricedCart(catalog);
  const router = useRouter();

  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState<CheckoutFormValues>(() => initialForm(savedDetails, accountEmail));
  // Bumped when the form is cleared, so the state/city dropdowns reset their "Other" mode too.
  const [formVersion, setFormVersion] = useState(0);
  const [usingSaved, setUsingSaved] = useState(savedDetails !== null);
  const [saveForLater, setSaveForLater] = useState(true);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormValues, string>>>({});
  const [upiTransactionId, setUpiTransactionId] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const shipping = calculateShipping(subtotal, settings);
  const total = subtotal + shipping;

  const orderSummary = useMemo(() => items.map(summaryLabel).join(", "), [items]);

  function updateField<K extends keyof CheckoutFormValues>(key: K, value: CheckoutFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function clearForm() {
    setForm(initialForm(null, accountEmail));
    setFormVersion((v) => v + 1);
    setErrors({});
    setUsingSaved(false);
  }

  function handleContinueToPayment() {
    const result = checkoutFormSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof CheckoutFormValues, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof CheckoutFormValues;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
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
          items: items.map(toOrderPayload),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSubmitError(data.error ?? "Something went wrong while placing your order. Please try again.");
        setSubmitting(false);
        return;
      }

      clearCart();
      router.push(`/order-success/${data.orderNumber}?t=${data.trackingToken}`);
    } catch {
      setSubmitError("Something went wrong while placing your order. Please try again.");
      setSubmitting(false);
    }
  }

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

          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              autoComplete="name"
              value={form.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
            />
            <FieldError>{errors.fullName}</FieldError>
          </div>

          <div>
            <Label htmlFor="mobileNumber">Mobile Number</Label>
            <Input
              id="mobileNumber"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={form.mobileNumber}
              onChange={(e) => updateField("mobileNumber", e.target.value)}
            />
            <FieldError>{errors.mobileNumber}</FieldError>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
            <FieldError>{errors.email}</FieldError>
          </div>

          <div>
            <Label htmlFor="addressLine1">Address</Label>
            <Input
              id="addressLine1"
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
            onChange={(location) => setForm((prev) => ({ ...prev, ...location }))}
          />

          <div>
            <Label htmlFor="pincode">Pincode</Label>
            <Input
              id="pincode"
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

          <UpiPaymentPanel settings={settings} amount={total} />

          <div>
            <Label htmlFor="upiTransactionId">UPI Transaction ID *</Label>
            <Input
              id="upiTransactionId"
              value={upiTransactionId}
              onChange={(e) => setUpiTransactionId(e.target.value)}
              placeholder="e.g. 123456789012"
            />
          </div>

          {submitError && <p className="text-sm text-danger">{submitError}</p>}

          <div className="space-y-2">
            <Button size="lg" className="w-full" disabled={submitting} onClick={handlePlaceOrder}>
              {submitting ? "Placing Order…" : "I Have Paid — Place Order"}
            </Button>
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
    </div>
  );
}
