"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGarment, reorderGarments, setGarmentActive } from "@/app/admin/(dashboard)/customizer/actions";
import { IconButton, move } from "@/components/admin/catalog-form-parts";
import { GarmentMockup } from "@/components/custom/garment-mockup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { colorPhotosOf, garmentSpec } from "@/lib/custom/mockup";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import type { CustomGarment, CustomTeeColor, GarmentGender } from "@/types";

export interface GarmentListRow {
  garment: CustomGarment;
  /** What's still needed before customers can buy it, e.g. ["colours", "sizes"]. */
  missing: string[];
  fromPrice: number | null;
  previewColor: CustomTeeColor | undefined;
}

const GENDER_LABEL: Record<GarmentGender, string> = { men: "Men", women: "Women", unisex: "Unisex" };

export function GarmentList({ rows: initialRows }: { rows: GarmentListRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<GarmentGender>("unisex");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await createGarment(name, gender);
    if (result.error || !result.id) {
      setError(result.error ?? "Something went wrong.");
      setBusy(false);
      return;
    }
    router.push(`/admin/customizer/garments/${result.id}`);
  }

  async function reorder(index: number, delta: number) {
    const next = move(rows, index, delta);
    if (next === rows) return;
    setRows(next);
    const result = await reorderGarments(next.map((r) => r.garment.id));
    if (result.error) setError(result.error);
  }

  async function toggleLive(id: string, isActive: boolean) {
    setRows((list) => list.map((r) => (r.garment.id === id ? { ...r, garment: { ...r.garment, is_active: isActive } } : r)));
    const result = await setGarmentActive(id, isActive);
    if (result.error) setError(result.error);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="border border-border p-4 sm:p-6">
        <h2 className="font-display text-xl tracking-wide">ADD A GARMENT</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Polo, waffle tee, crop top, hoodie… You&apos;ll add its photos, sizes and colours next.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            value={name}
            maxLength={60}
            placeholder="e.g. Oversized Hoodie"
            aria-label="Garment name"
            onChange={(e) => setName(e.target.value)}
            className="sm:flex-1"
          />
          <div className="flex gap-2">
            {(Object.keys(GENDER_LABEL) as GarmentGender[]).map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={gender === g}
                onClick={() => setGender(g)}
                className={cn(
                  "h-12 flex-1 border px-3 text-sm font-semibold sm:flex-none",
                  gender === g ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
                )}
              >
                {GENDER_LABEL[g]}
              </button>
            ))}
          </div>
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? "Adding…" : "Add"}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </form>

      <div className="space-y-3">
        {rows.map((row, i) => {
          const { garment } = row;
          const color = row.previewColor;
          const ready = row.missing.length === 0;
          return (
            <div key={garment.id} className={cn("flex items-center gap-4 border border-border p-3", !garment.is_active && "bg-muted/60")}>
              <div className="w-20 flex-none bg-muted p-1.5">
                <GarmentMockup
                  spec={garmentSpec(garment)}
                  colorPhotos={color ? colorPhotosOf(color) : null}
                  colorHex={color?.hex ?? "#d4d4d4"}
                  view="front"
                  imageWidth={256}
                  className="aspect-square w-full"
                  title={garment.name}
                />
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/customizer/garments/${garment.id}`} className="font-semibold hover:underline">
                  {garment.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {GENDER_LABEL[garment.gender]}
                  {row.fromPrice !== null && ` · from ${formatPrice(row.fromPrice)}`}
                </p>
                {!ready && <p className="mt-0.5 text-xs font-semibold text-danger">Needs {row.missing.join(", ")}</p>}
                {ready && garment.is_active && <p className="mt-0.5 text-xs font-semibold text-success">In the studio</p>}
              </div>
              <div className="hidden sm:block">
                <Toggle
                  checked={garment.is_active}
                  onChange={(v) => toggleLive(garment.id, v)}
                  label={garment.is_active ? "Live" : "Hidden"}
                />
              </div>
              <div className="flex flex-none items-center gap-1">
                <IconButton label={`Move ${garment.name} up`} onClick={() => reorder(i, -1)}>
                  ↑
                </IconButton>
                <IconButton label={`Move ${garment.name} down`} onClick={() => reorder(i, 1)}>
                  ↓
                </IconButton>
                <Link
                  href={`/admin/customizer/garments/${garment.id}`}
                  className="ml-2 text-xs font-semibold uppercase tracking-wide underline underline-offset-4"
                >
                  Edit
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
