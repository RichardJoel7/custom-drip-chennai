"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { SingleImageUploader } from "@/components/admin/single-image-uploader";
import { updateSettings } from "@/app/admin/(dashboard)/settings/actions";
import type { Settings } from "@/types";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [storeName, setStoreName] = useState(settings.store_name);
  const [instagramUrl, setInstagramUrl] = useState(settings.instagram_url);
  const [contactNumber, setContactNumber] = useState(settings.contact_number ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsapp_number ?? "");
  const [upiId, setUpiId] = useState(settings.upi_id ?? "");
  const [upiDisplayName, setUpiDisplayName] = useState(settings.upi_display_name ?? "");
  const [upiQrImageUrl, setUpiQrImageUrl] = useState(settings.upi_qr_image_url ?? "");
  const [standardShippingFee, setStandardShippingFee] = useState(String(settings.standard_shipping_fee));
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    String(settings.free_shipping_threshold)
  );

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError(null);
    setSaved(false);
    setSaving(true);

    const result = await updateSettings({
      storeName,
      instagramUrl,
      contactNumber,
      whatsappNumber,
      upiId,
      upiDisplayName,
      upiQrImageUrl,
      standardShippingFee: Number(standardShippingFee) || 0,
      freeShippingThreshold: Number(freeShippingThreshold) || 0,
    });

    setSaving(false);
    if (result.error) setError(result.error);
    else setSaved(true);
  }

  return (
    <div className="max-w-xl space-y-10">
      <section>
        <h2 className="font-display text-xl tracking-wide">STORE</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="storeName">Brand Name</Label>
            <Input id="storeName" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="instagramUrl">Instagram URL</Label>
            <Input id="instagramUrl" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input id="contactNumber" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
            <Input id="whatsappNumber" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl tracking-wide">PAYMENT (UPI)</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="upiId">UPI ID</Label>
            <Input id="upiId" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="customdrip@upi" />
          </div>
          <div>
            <Label htmlFor="upiDisplayName">UPI Display Name</Label>
            <Input
              id="upiDisplayName"
              value={upiDisplayName}
              onChange={(e) => setUpiDisplayName(e.target.value)}
              placeholder="Custom Drip Chennai"
            />
          </div>
          <div>
            <Label>UPI QR Code</Label>
            <SingleImageUploader
              storagePath="settings/upi-qr"
              imageUrl={upiQrImageUrl}
              onChange={setUpiQrImageUrl}
              label="QR Code"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl tracking-wide">SHIPPING</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="standardShippingFee">Standard Shipping Fee (₹)</Label>
            <Input
              id="standardShippingFee"
              inputMode="decimal"
              value={standardShippingFee}
              onChange={(e) => setStandardShippingFee(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="freeShippingThreshold">Free Shipping Above (₹)</Label>
            <Input
              id="freeShippingThreshold"
              inputMode="decimal"
              value={freeShippingThreshold}
              onChange={(e) => setFreeShippingThreshold(e.target.value)}
            />
          </div>
        </div>
      </section>

      <FieldError>{error ?? undefined}</FieldError>
      {saved && <p className="text-sm text-success">Settings saved.</p>}

      <Button size="lg" className="w-full" disabled={saving} onClick={handleSave}>
        {saving ? "Saving…" : "Save Settings"}
      </Button>
    </div>
  );
}
