"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateShipment } from "@/app/admin/(dashboard)/orders/actions";

export function ShipmentForm({
  orderId,
  courierName,
  courierTrackingNumber,
}: {
  orderId: string;
  courierName: string | null;
  courierTrackingNumber: string | null;
}) {
  const router = useRouter();
  const [courier, setCourier] = useState(courierName ?? "");
  const [tracking, setTracking] = useState(courierTrackingNumber ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateShipment(orderId, courier, tracking);
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
        <Button size="md" disabled={isPending} onClick={handleSave}>
          {isPending ? "Saving…" : "Save & Mark Shipped"}
        </Button>
        {saved && <p className="text-sm text-success">Saved.</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
