"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { UpiPaymentPanel } from "@/components/checkout/upi-payment-panel";
import { formatPrice } from "@/lib/utils/format";
import { calculateShipping } from "@/lib/utils/shipping";
import { checkoutFormSchema, type CheckoutFormValues } from "@/lib/validations/checkout";
import type { Settings } from "@/types";

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

export function CheckoutFlow({ settings }: { settings: Settings }) {
  const { items, subtotal, clearCart, isHydrated } = useCart();
  const router = useRouter();

  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState<CheckoutFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormValues, string>>>({});
  const [upiTransactionId, setUpiTransactionId] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const shipping = calculateShipping(subtotal, settings);
  const total = subtotal + shipping;

  const orderSummary = useMemo(
    () => items.map((i) => `${i.name} (${i.color}/${i.size}) x${i.quantity}`).join(", "),
    [items]
  );

  function updateField<K extends keyof CheckoutFormValues>(key: K, value: CheckoutFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
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

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl tracking-wide sm:text-4xl">CHECKOUT</h1>
      <p className="mt-1 text-sm text-muted-foreground" title={orderSummary}>
        {items.length} item{items.length > 1 ? "s" : ""} · {formatPrice(total)}
      </p>

      {step === "details" && (
        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
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
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
            <FieldError>{errors.email}</FieldError>
          </div>

          <div>
            <Label htmlFor="addressLine1">Address</Label>
            <Input
              id="addressLine1"
              value={form.addressLine1}
              onChange={(e) => updateField("addressLine1", e.target.value)}
            />
            <FieldError>{errors.addressLine1}</FieldError>
          </div>

          <div>
            <Label htmlFor="addressLine2">Apartment / House (optional)</Label>
            <Input
              id="addressLine2"
              value={form.addressLine2}
              onChange={(e) => updateField("addressLine2", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="area">Area (optional)</Label>
            <Input id="area" value={form.area} onChange={(e) => updateField("area", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => updateField("city", e.target.value)} />
              <FieldError>{errors.city}</FieldError>
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={form.state}
                onChange={(e) => updateField("state", e.target.value)}
              />
              <FieldError>{errors.state}</FieldError>
            </div>
          </div>

          <div>
            <Label htmlFor="pincode">Pincode</Label>
            <Input
              id="pincode"
              inputMode="numeric"
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

          <Button size="lg" className="w-full" onClick={handleContinueToPayment}>
            Continue to Payment
          </Button>
        </div>
      )}

      {step === "payment" && (
        <div className="mt-6 space-y-5">
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
