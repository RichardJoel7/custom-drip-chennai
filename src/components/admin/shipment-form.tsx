"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateShipment } from "@/app/admin/(dashboard)/orders/actions";

export function ShipmentForm({
  orderId,
  courierName,
  courierTrackingNumber,
  packageWeightG,
  labelsReady,
}: {
  orderId: string;
  courierName: string | null;
  courierTrackingNumber: string | null;
  packageWeightG: number | null;
  /** 0017_shipping_labels.sql has been run, so there's a weight to save and a label to print. */
  labelsReady: boolean;
}) {
  const router = useRouter();
  const [courier, setCourier] = useState(courierName ?? "");
  const [tracking, setTracking] = useState(courierTrackingNumber ?? "");
  const [weight, setWeight] = useState(packageWeightG ? String(packageWeightG) : "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setError(null);
    setSaved(false);
    const grams = weight.trim() ? Number(weight.trim()) : null;
    startTransition(async () => {
      const result = await updateShipment(orderId, courier, tracking, grams);
      if (result.error) setError(result.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="border border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Shipment Details
      </p>
      <div className="mt-3 space-y-3">
        <div>
          <Label htmlFor="courier">Courier Name</Label>
          <Input id="courier" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="e.g. Delhivery" />
        </div>
        <div>
          <Label htmlFor="tracking">Tracking Number</Label>
          <Input id="tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} />
        </div>
        {labelsReady && (
          <div>
            <Label htmlFor="weight">Package Weight (grams, optional)</Label>
            <Input
              id="weight"
              inputMode="numeric"
              value={weight}
              onChange={(e) => setWeight(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="e.g. 250"
            />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="md" disabled={isPending} onClick={handleSave}>
            {isPending ? "Saving…" : "Save & Mark Shipped"}
          </Button>
          {labelsReady && (
            <LinkButton href={`/admin/print-labels?ids=${orderId}`} external variant="outline">
              🏷️ Print Label
            </LinkButton>
          )}
        </div>
        {saved && <p className="text-sm text-success">Saved.</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
