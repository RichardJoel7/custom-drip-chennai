"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteGarment, saveGarment, type GarmentPhotoInput } from "@/app/admin/(dashboard)/customizer/actions";
import { GarmentMockup } from "@/components/custom/garment-mockup";
import { PrintAreaEditor } from "@/components/admin/print-area-editor";
import { Field } from "@/components/admin/catalog-form-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { DEFAULT_PRINT_BOX, colorPhotosOf } from "@/lib/custom/mockup";
import { uploadCatalogImage } from "@/lib/storage/upload-catalog-image";
import { cn } from "@/lib/utils/cn";
import type { CustomGarment, CustomPrintOption, CustomTeeColor, GarmentGender, MockupSpec, PhotoPoint } from "@/types";

type Side = "front" | "back";

const GENDERS: { value: GarmentGender; label: string }[] = [
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "unisex", label: "Unisex" },
];

function photoOf(garment: CustomGarment, side: Side): GarmentPhotoInput | null {
  const url = garment[`${side}_image_url`];
  const path = garment[`${side}_storage_path`];
  const aspect = garment[`${side}_aspect`];
  const area = garment[`${side}_area`];
  return url && path && aspect ? { imageUrl: url, storagePath: path, aspect, area: area ?? DEFAULT_PRINT_BOX } : null;
}

/** Details, photos and print area for one garment — the part that decides how it looks. */
export function GarmentDetailsForm({
  garment,
  colors,
  printOptions,
  checklist,
}: {
  garment: CustomGarment;
  colors: CustomTeeColor[];
  /** Print sizes this garment allows, for the preview. */
  printOptions: CustomPrintOption[];
  checklist: { label: string; done: boolean; note?: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState(garment.name);
  const [gender, setGender] = useState<GarmentGender>(garment.gender);
  const [description, setDescription] = useState(garment.description ?? "");
  const [isActive, setIsActive] = useState(garment.is_active);
  const [photos, setPhotos] = useState<Record<Side, GarmentPhotoInput | null>>({
    front: photoOf(garment, "front"),
    back: photoOf(garment, "back"),
  });
  const [widthCm, setWidthCm] = useState(garment.area_width_cm ? String(garment.area_width_cm) : "30");
  const [logoSpot, setLogoSpot] = useState<PhotoPoint | null>(garment.logo_spot);
  const [side, setSide] = useState<Side>("front");
  const [uploading, setUploading] = useState<Side | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [previewColor, setPreviewColor] = useState(colors[0]?.id ?? "");
  const [previewPrint, setPreviewPrint] = useState(printOptions[0]?.id ?? "");
  const inputs = { front: useRef<HTMLInputElement>(null), back: useRef<HTMLInputElement>(null) };

  const current = photos[side];
  const width = Number(widthCm);
  const color = colors.find((c) => c.id === previewColor);
  const print = printOptions.find((o) => o.id === previewPrint);
  // Preview works as soon as one photo is in: the other side borrows it until uploaded.
  const anyPhoto = photos.front ?? photos.back;
  const previewSpec: MockupSpec | null =
    anyPhoto && width > 0
      ? {
          front: sideSpec(photos.front ?? anyPhoto),
          back: sideSpec(photos.back ?? anyPhoto),
          areaWidthCm: width,
          logoSpot,
        }
      : null;

  async function handleUpload(target: Side, file: File | undefined) {
    if (!file) return;
    setUploading(target);
    setStatus(null);
    try {
      const uploaded = await uploadCatalogImage(file, `garments/${garment.id}`, "garment");
      setPhotos((prev) => ({
        ...prev,
        [target]: {
          imageUrl: uploaded.url,
          storagePath: uploaded.storagePath,
          aspect: uploaded.aspect,
          area: prev[target]?.area ?? DEFAULT_PRINT_BOX,
        },
      }));
      setSide(target);
    } catch (error) {
      setStatus({ ok: false, message: error instanceof Error ? error.message : "Upload failed." });
    } finally {
      setUploading(null);
      const input = inputs[target].current;
      if (input) input.value = "";
    }
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    const result = await saveGarment(garment.id, {
      name,
      gender,
      description,
      isActive,
      front: photos.front,
      back: photos.back,
      areaWidthCm: Number.isFinite(width) ? width : null,
      logoSpot,
    });
    setSaving(false);
    if (result.error) {
      setStatus({ ok: false, message: result.error });
      return;
    }
    setStatus({ ok: true, message: "Saved — the studio is updated." });
    router.refresh();
  }

  return (
    <section className="border border-border p-4 sm:p-6">
      <h2 className="font-display text-xl tracking-wide">GARMENT & PHOTOS</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        How this garment looks in the studio. It goes live once both photos, a colour, a size and a print size are in.
      </p>

      <ul className="mt-4 grid gap-1.5 text-sm sm:grid-cols-2">
        {checklist.map((item) => (
          <li key={item.label} className={cn("flex gap-2", item.done ? "text-success" : "text-muted-foreground")}>
            <span aria-hidden="true">{item.done ? "✓" : "○"}</span>
            <span>
              {item.label}
              {item.note && <span className="text-muted-foreground"> — {item.note}</span>}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <Input value={name} maxLength={60} placeholder="Oversized Hoodie" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="For">
          <div className="flex gap-2">
            {GENDERS.map((g) => (
              <button
                key={g.value}
                type="button"
                aria-pressed={gender === g.value}
                onClick={() => setGender(g.value)}
                className={cn(
                  "h-12 flex-1 border px-3 text-sm font-semibold",
                  gender === g.value ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Short description (optional)">
            <Input
              value={description}
              maxLength={200}
              placeholder="Heavyweight fleece, relaxed fit"
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* PHOTOS */}
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide">Photos</p>
        <p className="mt-1 text-xs text-muted-foreground">
          A white or light-grey garment on a transparent background (PNG), shot straight on, 1500–2500 px, with the same
          framing front and back. Cut the background out with a background remover such as Photoroom or Canva. The
          studio colours the garment automatically.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(["front", "back"] as const).map((target) => {
            const photo = photos[target];
            return (
              <div key={target} className={cn("border p-2", side === target && photo ? "border-foreground" : "border-border")}>
                <input
                  ref={inputs[target]}
                  type="file"
                  accept="image/png,image/webp,image/jpeg"
                  className="hidden"
                  onChange={(e) => handleUpload(target, e.target.files?.[0])}
                />
                {photo ? (
                  <button type="button" onClick={() => setSide(target)} className="block w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of a just-uploaded file */}
                    <img src={photo.imageUrl} alt={`${target} photo`} className="checkerboard mx-auto h-32 w-full object-contain" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={uploading !== null}
                    onClick={() => inputs[target].current?.click()}
                    className="flex h-32 w-full flex-col items-center justify-center border-2 border-dashed border-border text-sm font-semibold hover:border-foreground disabled:opacity-50"
                  >
                    {uploading === target ? "Uploading…" : `+ Upload ${target}`}
                  </button>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-wide">
                  <span>{target}</span>
                  {photo && (
                    <span className="flex gap-3">
                      <button
                        type="button"
                        disabled={uploading !== null}
                        onClick={() => inputs[target].current?.click()}
                        className="underline underline-offset-4 disabled:opacity-50"
                      >
                        {uploading === target ? "Uploading…" : "Replace"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => ({ ...prev, [target]: null }))}
                        className="text-danger underline underline-offset-4"
                      >
                        Remove
                      </button>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PRINT AREA + PREVIEW */}
      {anyPhoto && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide">Print area — {side}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Drag the box over the biggest area you can print on{side === "front" ? ", and the logo dot onto the left chest" : ""}.
            </p>
            <div className="mt-3">
              {current ? (
                <PrintAreaEditor
                  imageUrl={current.imageUrl}
                  area={current.area}
                  onAreaChange={(area) => setPhotos((prev) => ({ ...prev, [side]: prev[side] && { ...prev[side], area } }))}
                  logoSpot={side === "front" ? logoSpot : undefined}
                  onLogoSpotChange={side === "front" ? setLogoSpot : undefined}
                />
              ) : (
                <p className="border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Upload the {side} photo to mark its print area.
                </p>
              )}
            </div>
            <div className="mt-3 max-w-xs">
              <Field label="Real width of the box (cm)">
                <Input inputMode="decimal" value={widthCm} placeholder="30" onChange={(e) => setWidthCm(e.target.value)} />
              </Field>
              <p className="mt-1 text-xs text-muted-foreground">
                Measure the garment: this makes A4 and A3 prints show at their true size.
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide">Preview</p>
              <div className="flex border border-border" role="tablist" aria-label="Preview side">
                {(["front", "back"] as const).map((target) => (
                  <button
                    key={target}
                    type="button"
                    role="tab"
                    aria-selected={side === target}
                    onClick={() => setSide(target)}
                    className={cn(
                      "h-8 px-3 text-xs font-semibold uppercase tracking-wide",
                      side === target ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {target}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-muted p-3">
              <GarmentMockup
                spec={previewSpec}
                colorPhotos={color ? colorPhotosOf(color) : null}
                colorHex={color?.hex ?? "#1d2b4a"}
                view={side}
                prints={
                  print
                    ? [{ key: print.id, printArea: print, label: `${print.name} · ${print.width_cm} × ${print.height_cm} cm` }]
                    : []
                }
                showGuide
                className="mx-auto w-full max-w-sm"
              />
            </div>
            {colors.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2" aria-label="Preview colour">
                {colors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.name}
                    aria-label={`Preview in ${c.name}`}
                    aria-pressed={c.id === previewColor}
                    onClick={() => setPreviewColor(c.id)}
                    className={cn(
                      "h-8 w-8 rounded-full border",
                      c.id === previewColor ? "ring-2 ring-foreground ring-offset-2" : "border-black/15"
                    )}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            )}
            {printOptions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {printOptions.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={o.id === previewPrint}
                    onClick={() => setPreviewPrint(o.id)}
                    className={cn(
                      "h-9 border px-3 text-xs font-semibold",
                      o.id === previewPrint ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
                    )}
                  >
                    {o.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Toggle checked={isActive} onChange={setIsActive} label={isActive ? "Live in the studio" : "Hidden"} />
        <Button onClick={handleSave} disabled={saving || uploading !== null} className="ml-auto">
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      {status && (
        <p className={cn("mt-3 text-sm", status.ok ? "text-success" : "text-danger")} role="status">
          {status.message}
        </p>
      )}
    </section>
  );
}

function sideSpec(photo: GarmentPhotoInput) {
  return { imageUrl: photo.imageUrl, aspect: photo.aspect, area: photo.area };
}

export function DeleteGarmentButton({ garmentId, name }: { garmentId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(`Delete "${name}" with its sizes, colours and photos? Past orders are not affected.`)) return;
    setBusy(true);
    const result = await deleteGarment(garmentId);
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push("/admin/customizer");
    router.refresh();
  }

  return (
    <div className="border border-danger/30 p-4 sm:p-6">
      <p className="font-semibold">Delete this garment</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Removes it from the studio with its sizes, colours and photos. Orders already placed keep their details.
      </p>
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="mt-3 h-11 border border-danger px-4 text-sm font-semibold text-danger hover:bg-danger hover:text-background disabled:opacity-50"
      >
        {busy ? "Deleting…" : "Delete garment"}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
