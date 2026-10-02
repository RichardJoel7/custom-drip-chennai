"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { saveShipFrom } from "@/app/admin/(dashboard)/shipping/actions";
import type { ShippingSettings } from "@/types";

/** The return address printed at the bottom of every label. */
export function ShipFromForm({ shipFrom }: { shipFrom: ShippingSettings }) {
  const router = useRouter();
  const isSet = !!shipFrom.from_address;
  const [editing, setEditing] = useState(!isSet);
  const [name, setName] = useState(shipFrom.from_name ?? "");
  const [phone, setPhone] = useState(shipFrom.from_phone ?? "");
  const [address, setAddress] = useState(shipFrom.from_address ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveShipFrom({ name, phone, address });
      if (result.error) return setError(result.error);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <section id="ship-from" className="scroll-mt-20 border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ship-from address</p>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold uppercase tracking-wide underline underline-offset-4"
          >
            Edit
          </button>
        )}
      </div>

      {!editing ? (
        <div className="mt-2 text-sm">
          <p className="font-semibold">{shipFrom.from_name}</p>
          <p className="whitespace-pre-line">{shipFrom.from_address}</p>
          {shipFrom.from_phone && <p>Phone: {shipFrom.from_phone}</p>}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {!isSet && (
            <p className="text-sm text-muted-foreground">
              Printed as the return address on every label. Only admins can see it.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="shipFromName" required>
                Name
              </Label>
              <Input id="shipFromName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Custom Drip Chennai" />
            </div>
            <div>
              <Label htmlFor="shipFromPhone">Phone</Label>
              <Input id="shipFromPhone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="shipFromAddress" required>
              Address
            </Label>
            <Textarea
              id="shipFromAddress"
              rows={4}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={"Door no., street\nArea\nChennai, Tamil Nadu 600023"}
            />
            <p className="mt-1 text-xs text-muted-foreground">Each line prints as its own line on the label.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" disabled={isPending} onClick={handleSave}>
              {isPending ? "Saving…" : "Save address"}
            </Button>
            {isSet && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground underline underline-offset-4"
              >
                Cancel
              </button>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
