"use client";

import { useRef, useState, type Ref } from "react";
import type { ColorRowInput, GsmRowInput, SizeRowInput } from "@/app/admin/(dashboard)/customizer/actions";
import { Field, Row, Section, move, newKey, toNumber } from "@/components/admin/catalog-form-parts";
import { Input } from "@/components/ui/input";
import { PRINT_SIDE_LIST, SIDE_NAMES, sidePrice } from "@/lib/custom/pricing";
import { uploadCatalogImage } from "@/lib/storage/upload-catalog-image";
import { formatPrice } from "@/lib/utils/format";
import type { CustomPrintOption, CustomTeeColor, CustomTeeGsm, CustomTeeSize } from "@/types";

// The garment editor's list sections. They hold no state of their own: the editor keeps every
// section's rows and saves them all with one button (see garment-editor.tsx).

export type SizeDraft = { key: string; id?: string; label: string; price: string; isActive: boolean };
export type GsmDraft = { key: string; id?: string; gsm: string; description: string; price: string; isActive: boolean };
export type ColorDraft = ColorRowInput & { key: string };

export const sizeDrafts = (sizes: CustomTeeSize[]): SizeDraft[] =>
  sizes.map((s) => ({ key: s.id, id: s.id, label: s.label, price: String(s.price), isActive: s.is_active }));

export const colorDrafts = (colors: CustomTeeColor[]): ColorDraft[] =>
  colors.map((c) => ({
    key: c.id,
    id: c.id,
    name: c.name,
    hex: c.hex,
    frontImageUrl: c.front_image_url,
    frontStoragePath: c.front_storage_path,
    backImageUrl: c.back_image_url,
    backStoragePath: c.back_storage_path,
    isActive: c.is_active,
  }));

export const gsmDrafts = (gsmOptions: CustomTeeGsm[]): GsmDraft[] =>
  gsmOptions.map((g) => ({
    key: g.id,
    id: g.id,
    gsm: String(g.gsm),
    description: g.description ?? "",
    price: String(g.price),
    isActive: g.is_active,
  }));

export const sizeRows = (sizes: SizeDraft[]): SizeRowInput[] =>
  sizes.map((s) => ({ id: s.id, label: s.label, price: toNumber(s.price), isActive: s.isActive }));

export const colorRows = (colors: ColorDraft[]): ColorRowInput[] =>
  colors.map((c) => ({
    id: c.id,
    name: c.name,
    hex: c.hex,
    frontImageUrl: c.frontImageUrl,
    frontStoragePath: c.frontStoragePath,
    backImageUrl: c.backImageUrl,
    backStoragePath: c.backStoragePath,
    isActive: c.isActive,
  }));

export const gsmRows = (gsms: GsmDraft[]): GsmRowInput[] =>
  gsms.map((g) => ({ id: g.id, gsm: toNumber(g.gsm), description: g.description, price: toNumber(g.price), isActive: g.isActive }));

type ListProps<T> = {
  rows: T[];
  onChange: (rows: T[]) => void;
  invalid?: boolean;
  sectionRef?: Ref<HTMLElement>;
};

function patchRow<T extends { key: string }>(rows: T[], key: string, patch: Partial<T>) {
  return rows.map((x) => (x.key === key ? { ...x, ...patch } : x));
}

export function GarmentSizesSection({ rows: sizes, onChange, invalid, sectionRef }: ListProps<SizeDraft>) {
  const set = (key: string, patch: Partial<SizeDraft>) => onChange(patchRow(sizes, key, patch));

  return (
    <Section
      title="SIZES & BASE PRICE"
      description="The price of the blank garment in each size."
      invalid={invalid}
      sectionRef={sectionRef}
      onAdd={() => onChange([...sizes, { key: newKey(), label: "", price: "", isActive: true }])}
      addLabel="+ Add size"
    >
      {sizes.map((s, i) => (
        <Row
          key={s.key}
          onUp={() => onChange(move(sizes, i, -1))}
          onDown={() => onChange(move(sizes, i, 1))}
          onRemove={() => onChange(sizes.filter((x) => x.key !== s.key))}
          isActive={s.isActive}
          onActive={(v) => set(s.key, { isActive: v })}
        >
          <Field label="Size">
            <Input value={s.label} placeholder="M" onChange={(e) => set(s.key, { label: e.target.value })} />
          </Field>
          <Field label="Price (₹)">
            <Input inputMode="decimal" value={s.price} placeholder="399" onChange={(e) => set(s.key, { price: e.target.value })} />
          </Field>
        </Row>
      ))}
    </Section>
  );
}

export function GarmentColorsSection({
  garmentId,
  rows: colors,
  onChange,
  invalid,
  sectionRef,
}: ListProps<ColorDraft> & { garmentId: string }) {
  const set = (key: string, patch: Partial<ColorDraft>) => onChange(patchRow(colors, key, patch));

  return (
    <Section
      title="COLOURS"
      description="Colours customers can pick. The studio auto-colours the garment photo; if a colour doesn't look right (usually black), add a real photo of it with the same framing."
      invalid={invalid}
      sectionRef={sectionRef}
      onAdd={() =>
        onChange([
          ...colors,
          {
            key: newKey(),
            name: "",
            hex: "#111111",
            frontImageUrl: null,
            frontStoragePath: null,
            backImageUrl: null,
            backStoragePath: null,
            isActive: true,
          },
        ])
      }
      addLabel="+ Add colour"
    >
      {colors.map((c, i) => (
        <Row
          key={c.key}
          onUp={() => onChange(move(colors, i, -1))}
          onDown={() => onChange(move(colors, i, 1))}
          onRemove={() => onChange(colors.filter((x) => x.key !== c.key))}
          isActive={c.isActive}
          onActive={(v) => set(c.key, { isActive: v })}
        >
          <Field label="Colour">
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label={`${c.name || "New"} colour swatch`}
                value={/^#[0-9a-fA-F]{6}$/.test(c.hex) ? c.hex : "#111111"}
                onChange={(e) => set(c.key, { hex: e.target.value })}
                className="h-12 w-12 flex-none cursor-pointer rounded border border-border bg-background p-1"
              />
              <Input
                value={c.hex}
                aria-label="Hex code"
                className="font-mono uppercase"
                onChange={(e) => set(c.key, { hex: e.target.value })}
              />
            </div>
          </Field>
          <Field label="Name">
            <Input value={c.name} placeholder="Black" onChange={(e) => set(c.key, { name: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide">Real photos (optional)</p>
            <div className="flex flex-wrap gap-3">
              <ColorPhotoSlot
                label="Front"
                garmentId={garmentId}
                url={c.frontImageUrl}
                onChange={(photo) => set(c.key, { frontImageUrl: photo?.url ?? null, frontStoragePath: photo?.storagePath ?? null })}
              />
              <ColorPhotoSlot
                label="Back"
                garmentId={garmentId}
                url={c.backImageUrl}
                onChange={(photo) => set(c.key, { backImageUrl: photo?.url ?? null, backStoragePath: photo?.storagePath ?? null })}
              />
            </div>
          </div>
        </Row>
      ))}
    </Section>
  );
}

export function GarmentGsmSection({ rows: gsms, onChange, invalid, sectionRef }: ListProps<GsmDraft>) {
  const set = (key: string, patch: Partial<GsmDraft>) => onChange(patchRow(gsms, key, patch));

  return (
    <Section
      title="FABRIC WEIGHT (GSM)"
      description="Heavier fabric can cost more — the extra price is added to the garment price. Leave empty to hide the GSM choice for this garment."
      invalid={invalid}
      sectionRef={sectionRef}
      onAdd={() => onChange([...gsms, { key: newKey(), gsm: "", description: "", price: "0", isActive: true }])}
      addLabel="+ Add GSM"
    >
      {gsms.map((g, i) => (
        <Row
          key={g.key}
          onUp={() => onChange(move(gsms, i, -1))}
          onDown={() => onChange(move(gsms, i, 1))}
          onRemove={() => onChange(gsms.filter((x) => x.key !== g.key))}
          isActive={g.isActive}
          onActive={(v) => set(g.key, { isActive: v })}
        >
          <Field label="GSM">
            <Input inputMode="numeric" value={g.gsm} placeholder="240" onChange={(e) => set(g.key, { gsm: e.target.value })} />
          </Field>
          <Field label="Extra price (₹)">
            <Input inputMode="decimal" value={g.price} placeholder="0" onChange={(e) => set(g.key, { price: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Short description">
              <Input
                value={g.description}
                placeholder="Heavyweight — thick, premium streetwear feel"
                onChange={(e) => set(g.key, { description: e.target.value })}
              />
            </Field>
          </div>
        </Row>
      ))}
    </Section>
  );
}

export function GarmentPrintsSection({
  printOptions,
  allowed,
  onChange,
  invalid,
  sectionRef,
}: {
  printOptions: CustomPrintOption[];
  allowed: string[];
  onChange: (allowed: string[]) => void;
  invalid?: boolean;
  sectionRef?: Ref<HTMLElement>;
}) {
  return (
    <Section
      title="PRINT SIZES OFFERED"
      description="Tick the print sizes that fit this garment. Their prices are shared — edit them under Print Prices."
      invalid={invalid}
      sectionRef={sectionRef}
    >
      {printOptions.length === 0 && (
        <p className="text-sm text-muted-foreground">No print sizes yet — add them under Print Prices.</p>
      )}
      {printOptions.map((o) => {
        const prices = PRINT_SIDE_LIST.flatMap((s) => {
          const price = sidePrice(o, s);
          return price === null ? [] : [`${SIDE_NAMES[s]} ${formatPrice(price)}`];
        });
        if (o.price_both !== null) prices.push(`Front & back ${formatPrice(o.price_both)}`);
        return (
          <label key={o.id} className="flex cursor-pointer items-start gap-3 border border-border p-3 hover:border-foreground">
            <input
              type="checkbox"
              checked={allowed.includes(o.id)}
              onChange={(e) =>
                onChange(e.target.checked ? [...allowed, o.id] : allowed.filter((id) => id !== o.id))
              }
              className="mt-0.5 h-5 w-5 flex-none accent-foreground"
            />
            <span className="text-sm">
              <span className="font-semibold">{o.name}</span>{" "}
              <span className="text-muted-foreground">
                · {o.width_cm} × {o.height_cm} cm{!o.is_active && " · hidden everywhere"}
              </span>
              <span className="block text-xs text-muted-foreground">{prices.join(" · ")}</span>
            </span>
          </label>
        );
      })}
    </Section>
  );
}

function ColorPhotoSlot({
  label,
  garmentId,
  url,
  onChange,
}: {
  label: string;
  garmentId: string;
  url: string | null;
  onChange: (photo: { url: string; storagePath: string } | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadCatalogImage(file, `garments/${garmentId}/colors`, "color");
      onChange({ url: uploaded.url, storagePath: uploaded.storagePath });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="w-28">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/webp,image/jpeg"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {url ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded photo */}
          <img src={url} alt={`${label} photo`} className="checkerboard h-24 w-28 border border-border object-contain" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`Remove ${label.toLowerCase()} photo`}
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex h-24 w-28 items-center justify-center border-2 border-dashed border-border text-xs font-semibold hover:border-foreground disabled:opacity-50"
        >
          {busy ? "Uploading…" : `+ ${label}`}
        </button>
      )}
      <p className="mt-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}
