"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { useRouter } from "next/navigation";
import {
  deleteGarment,
  saveGarmentEditor,
  type EditorSection,
  type GarmentPhotoInput,
} from "@/app/admin/(dashboard)/customizer/actions";
import { Field, withIds } from "@/components/admin/catalog-form-parts";
import {
  GarmentColorsSection,
  GarmentGsmSection,
  GarmentPrintsSection,
  GarmentSizesSection,
  colorDrafts,
  colorRows,
  gsmDrafts,
  gsmRows,
  sizeDrafts,
  sizeRows,
  type ColorDraft,
} from "@/components/admin/garment-options-form";
import { PrintAreaEditor } from "@/components/admin/print-area-editor";
import { GarmentMockup } from "@/components/custom/garment-mockup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { BACKGROUND_REMOVER_URL } from "@/lib/custom/background-remover";
import { DEFAULT_PRINT_BOX, colorPhotosOf } from "@/lib/custom/mockup";
import { uploadCatalogImage } from "@/lib/storage/upload-catalog-image";
import { cn } from "@/lib/utils/cn";
import type {
  CustomGarment,
  CustomPrintOption,
  CustomTeeColor,
  CustomTeeGsm,
  CustomTeeSize,
  GarmentGender,
  MockupSpec,
  PhotoPoint,
} from "@/types";

type Side = "front" | "back";

const GENDERS: { value: GarmentGender; label: string }[] = [
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "unisex", label: "Unisex" },
];

const SECTION_NAMES: Record<EditorSection, string> = {
  details: "Garment & photos",
  sizes: "Sizes",
  colors: "Colours",
  gsm: "Fabric weight",
  prints: "Print sizes",
};

interface DetailsDraft {
  name: string;
  gender: GarmentGender;
  description: string;
  isActive: boolean;
  photos: Record<Side, GarmentPhotoInput | null>;
  widthCm: string;
  logoSpot: PhotoPoint | null;
}

function photoOf(garment: CustomGarment, side: Side): GarmentPhotoInput | null {
  const url = garment[`${side}_image_url`];
  const path = garment[`${side}_storage_path`];
  const aspect = garment[`${side}_aspect`];
  const area = garment[`${side}_area`];
  return url && path && aspect ? { imageUrl: url, storagePath: path, aspect, area: area ?? DEFAULT_PRINT_BOX } : null;
}

/**
 * Everything about one garment — details, photos, sizes, colours, GSM and print sizes — with
 * one Save for the lot, in a bar that stays at the bottom of the screen.
 */
export function GarmentEditor({
  garment,
  sizes: initialSizes,
  colors: initialColors,
  gsmOptions: initialGsm,
  printOptions,
  allowedPrintOptionIds,
  checklist,
}: {
  garment: CustomGarment;
  sizes: CustomTeeSize[];
  colors: CustomTeeColor[];
  gsmOptions: CustomTeeGsm[];
  /** Every shared print size; the garment ticks the ones it offers. */
  printOptions: CustomPrintOption[];
  allowedPrintOptionIds: string[];
  checklist: { label: string; done: boolean; note?: string }[];
}) {
  const router = useRouter();
  const [details, setDetails] = useState<DetailsDraft>(() => ({
    name: garment.name,
    gender: garment.gender,
    description: garment.description ?? "",
    isActive: garment.is_active,
    photos: { front: photoOf(garment, "front"), back: photoOf(garment, "back") },
    widthCm: garment.area_width_cm ? String(garment.area_width_cm) : "30",
    logoSpot: garment.logo_spot,
  }));
  const [sizes, setSizes] = useState(() => sizeDrafts(initialSizes));
  const [colors, setColors] = useState(() => colorDrafts(initialColors));
  const [gsms, setGsms] = useState(() => gsmDrafts(initialGsm));
  const [allowed, setAllowed] = useState(allowedPrintOptionIds);

  const snapshot = JSON.stringify({ details, sizes, colors, gsms, allowed: [...allowed].sort() });
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot);
  const dirty = snapshot !== savedSnapshot;

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [invalid, setInvalid] = useState<EditorSection | null>(null);
  const detailsRef = useRef<HTMLElement>(null);
  const sizesRef = useRef<HTMLElement>(null);
  const colorsRef = useRef<HTMLElement>(null);
  const gsmRef = useRef<HTMLElement>(null);
  const printsRef = useRef<HTMLElement>(null);

  // Leaving the page with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    setInvalid(null);
    const width = Number(details.widthCm);
    const result = await saveGarmentEditor(garment.id, {
      details: {
        name: details.name,
        gender: details.gender,
        description: details.description,
        isActive: details.isActive,
        front: details.photos.front,
        back: details.photos.back,
        areaWidthCm: Number.isFinite(width) ? width : null,
        logoSpot: details.logoSpot,
      },
      sizes: sizeRows(sizes),
      colors: colorRows(colors),
      gsm: gsmRows(gsms),
      printOptionIds: allowed,
    });
    setSaving(false);

    // Lists that did save get their ids, so the next save updates them instead of adding them again.
    const nextSizes = withIds(sizes, result.sizeIds);
    const nextColors = withIds(colors, result.colorIds);
    const nextGsms = withIds(gsms, result.gsmIds);
    setSizes(nextSizes);
    setColors(nextColors);
    setGsms(nextGsms);

    if (result.error) {
      const section = result.section ?? "details";
      setInvalid(section);
      setStatus({ ok: false, message: `${SECTION_NAMES[section]}: ${result.error}` });
      const sectionRefs = { details: detailsRef, sizes: sizesRef, colors: colorsRef, gsm: gsmRef, prints: printsRef };
      sectionRefs[section].current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setSavedSnapshot(
      JSON.stringify({ details, sizes: nextSizes, colors: nextColors, gsms: nextGsms, allowed: [...allowed].sort() })
    );
    setStatus({ ok: true, message: "Saved — the studio is updated." });
    router.refresh();
  }

  const allowedOptions = printOptions.filter((o) => allowed.includes(o.id));

  return (
    <div className="space-y-8">
      <GarmentDetailsSection
        garmentId={garment.id}
        draft={details}
        onChange={(patch) => setDetails((d) => ({ ...d, ...patch }))}
        colors={colors.filter((c) => /^#[0-9a-fA-F]{6}$/.test(c.hex))}
        printOptions={allowedOptions}
        checklist={checklist}
        onUploading={setUploading}
        invalid={invalid === "details"}
        sectionRef={detailsRef}
      />
      <GarmentSizesSection rows={sizes} onChange={setSizes} invalid={invalid === "sizes"} sectionRef={sizesRef} />
      <GarmentColorsSection
        garmentId={garment.id}
        rows={colors}
        onChange={setColors}
        invalid={invalid === "colors"}
        sectionRef={colorsRef}
      />
      <GarmentGsmSection rows={gsms} onChange={setGsms} invalid={invalid === "gsm"} sectionRef={gsmRef} />
      <GarmentPrintsSection
        printOptions={printOptions}
        allowed={allowed}
        onChange={setAllowed}
        invalid={invalid === "prints"}
        sectionRef={printsRef}
      />

      {/* One save for everything, kept in view above the phone's bottom menu. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border border-border bg-background/95 p-3 shadow-lg backdrop-blur sm:p-4 lg:bottom-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <Toggle
            checked={details.isActive}
            onChange={(isActive) => setDetails((d) => ({ ...d, isActive }))}
            label={details.isActive ? "Live" : "Hidden"}
          />
          <p
            className={cn(
              "order-last w-full text-xs sm:order-none sm:w-auto sm:min-w-0 sm:flex-1 sm:text-sm",
              status ? (status.ok ? "text-success" : "text-danger") : dirty ? "font-semibold" : "text-muted-foreground"
            )}
            role="status"
          >
            {status && !(status.ok && dirty)
              ? status.message
              : uploading
                ? "Uploading photo…"
                : dirty
                  ? "Unsaved changes"
                  : "All changes saved"}
          </p>
          <Button onClick={handleSave} disabled={saving || uploading || !dirty} className="ml-auto">
            {saving ? (
              "Saving…"
            ) : (
              <>
                <span className="sm:hidden">Save</span>
                <span className="hidden sm:inline">Save changes</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Details, photos and print area — the part that decides how the garment looks. */
function GarmentDetailsSection({
  garmentId,
  draft,
  onChange,
  colors,
  printOptions,
  checklist,
  onUploading,
  invalid,
  sectionRef,
}: {
  garmentId: string;
  draft: DetailsDraft;
  onChange: (patch: Partial<DetailsDraft>) => void;
  /** The editor's colours (unsaved ones too), for the preview. */
  colors: ColorDraft[];
  /** Print sizes this garment offers, for the preview. */
  printOptions: CustomPrintOption[];
  checklist: { label: string; done: boolean; note?: string }[];
  onUploading: (uploading: boolean) => void;
  invalid: boolean;
  sectionRef: Ref<HTMLElement>;
}) {
  const [side, setSide] = useState<Side>("front");
  const [uploading, setUploadingSide] = useState<Side | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [previewPrint, setPreviewPrint] = useState<string | null>(null);
  const inputs = { front: useRef<HTMLInputElement>(null), back: useRef<HTMLInputElement>(null) };

  const { photos } = draft;
  const current = photos[side];
  const width = Number(draft.widthCm);
  const color = colors.find((c) => c.key === previewColor) ?? colors[0];
  const print = printOptions.find((o) => o.id === previewPrint) ?? printOptions[0];
  // Preview works as soon as one photo is in: the other side borrows it until uploaded.
  const anyPhoto = photos.front ?? photos.back;
  const previewSpec: MockupSpec | null =
    anyPhoto && width > 0
      ? {
          front: sideSpec(photos.front ?? anyPhoto),
          back: sideSpec(photos.back ?? anyPhoto),
          areaWidthCm: width,
          logoSpot: draft.logoSpot,
        }
      : null;

  function setPhoto(target: Side, photo: GarmentPhotoInput | null) {
    onChange({ photos: { ...photos, [target]: photo } });
  }

  async function handleUpload(target: Side, file: File | undefined) {
    if (!file) return;
    setUploadingSide(target);
    onUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadCatalogImage(file, `garments/${garmentId}`, "garment");
      setPhoto(target, {
        imageUrl: uploaded.url,
        storagePath: uploaded.storagePath,
        aspect: uploaded.aspect,
        area: photos[target]?.area ?? DEFAULT_PRINT_BOX,
      });
      setSide(target);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadingSide(null);
      onUploading(false);
      const input = inputs[target].current;
      if (input) input.value = "";
    }
  }

  return (
    <section
      ref={sectionRef}
      className={cn("scroll-mt-6 border p-4 sm:p-6", invalid ? "border-danger ring-1 ring-danger" : "border-border")}
    >
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
          <Input value={draft.name} maxLength={60} placeholder="Oversized Hoodie" onChange={(e) => onChange({ name: e.target.value })} />
        </Field>
        <Field label="For">
          <div className="flex gap-2">
            {GENDERS.map((g) => (
              <button
                key={g.value}
                type="button"
                aria-pressed={draft.gender === g.value}
                onClick={() => onChange({ gender: g.value })}
                className={cn(
                  "h-12 flex-1 border px-3 text-sm font-semibold",
                  draft.gender === g.value ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
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
              value={draft.description}
              maxLength={200}
              placeholder="Heavyweight fleece, relaxed fit"
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </Field>
        </div>
      </div>

      {/* PHOTOS */}
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide">Photos</p>
        <p className="mt-1 text-xs text-muted-foreground">
          A white or light-grey garment on a transparent background (PNG), shot straight on, 1500–2500 px, with the same
          framing front and back. Cut the background out first — for example with{" "}
          <a href={BACKGROUND_REMOVER_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline underline-offset-2">
            Photoroom&apos;s free background remover ↗
          </a>
          . The studio colours the garment automatically.
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
                        onClick={() => setPhoto(target, null)}
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
                  onAreaChange={(area) => setPhoto(side, { ...current, area })}
                  logoSpot={side === "front" ? draft.logoSpot : undefined}
                  onLogoSpotChange={side === "front" ? (logoSpot) => onChange({ logoSpot }) : undefined}
                />
              ) : (
                <p className="border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Upload the {side} photo to mark its print area.
                </p>
              )}
            </div>
            <div className="mt-3 max-w-xs">
              <Field label="Real width of the box (cm)">
                <Input inputMode="decimal" value={draft.widthCm} placeholder="30" onChange={(e) => onChange({ widthCm: e.target.value })} />
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
                colorPhotos={color ? colorPhotosOf({ front_image_url: color.frontImageUrl, back_image_url: color.backImageUrl }) : null}
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
                    key={c.key}
                    type="button"
                    title={c.name}
                    aria-label={`Preview in ${c.name}`}
                    aria-pressed={c.key === color?.key}
                    onClick={() => setPreviewColor(c.key)}
                    className={cn(
                      "h-8 w-8 rounded-full border",
                      c.key === color?.key ? "ring-2 ring-foreground ring-offset-2" : "border-black/15"
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
                    aria-pressed={o.id === print?.id}
                    onClick={() => setPreviewPrint(o.id)}
                    className={cn(
                      "h-9 border px-3 text-xs font-semibold",
                      o.id === print?.id ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
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

      {uploadError && (
        <p className="mt-4 text-sm text-danger" role="alert">
          {uploadError}
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
