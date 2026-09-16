"use client";

import Image from "next/image";
import { useState } from "react";
import { formatPrice } from "@/lib/utils/format";
import type { Settings } from "@/types";

export function UpiPaymentPanel({ settings, amount }: { settings: Settings; amount: number }) {
  const [copied, setCopied] = useState(false);

  async function copyUpiId() {
    if (!settings.upi_id) return;
    try {
      await navigator.clipboard.writeText(settings.upi_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — user can still select and copy manually
    }
  }

  const upiDeepLink = settings.upi_id
    ? `upi://pay?pa=${encodeURIComponent(settings.upi_id)}&pn=${encodeURIComponent(
        settings.upi_display_name || settings.store_name
      )}&am=${amount}&cu=INR`
    : null;

  if (!settings.upi_id) {
    return (
      <div className="border border-danger bg-danger/5 p-4 text-sm text-danger">
        UPI payment details haven&apos;t been set up yet. Please contact us on Instagram before
        placing your order.
      </div>
    );
  }

  return (
    <div className="border border-border bg-muted p-4 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Pay securely using UPI
      </p>
      <p className="mt-1 text-3xl font-bold">{formatPrice(amount)}</p>

      {settings.upi_qr_image_url && (
        <div className="relative mx-auto mt-4 aspect-square w-48 bg-background">
          <Image
            src={settings.upi_qr_image_url}
            alt="UPI QR code"
            fill
            sizes="192px"
            className="object-contain"
          />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border border-border bg-background px-3 py-2.5">
        <div>
          <p className="text-xs text-muted-foreground">UPI ID</p>
          <p className="text-sm font-semibold">{settings.upi_id}</p>
        </div>
        <button
          type="button"
          onClick={copyUpiId}
          className="text-xs font-semibold uppercase tracking-wide underline underline-offset-4"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {upiDeepLink && (
        <a
          href={upiDeepLink}
          className="mt-3 flex h-12 w-full items-center justify-center border border-foreground text-sm font-semibold uppercase tracking-wide sm:hidden"
        >
          Pay with UPI App
        </a>
      )}

      <ol className="mt-4 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
        <li>Scan the QR code or use the UPI ID above.</li>
        <li>Pay the exact amount shown.</li>
        <li>Enter your UPI transaction/reference ID below.</li>
      </ol>
    </div>
  );
}
