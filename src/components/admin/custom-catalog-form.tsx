"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import {
  savePrintOptions,
  saveTeeColors,
  saveTeeSizes,
  type ColorRowInput,
  type PrintOptionRowInput,
  type SizeRowInput,
} from "@/app/admin/(dashboard)/customizer/actions";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import type { CustomCatalog, FrontPlacement } from "@/types";

// Numeric fields are kept as strings while typing so "" and "12." stay editable.
type SizeDraft = { key: string; id?: string; label: string; price: string; isActive: boolean };
type ColorDraft = { key: string; id?: string; name: string; hex: string; isActive: boolean };
type PrintDraft = {
  key: string;
  id?: string;
  name: string;
  description: string;
  widthCm: string;
  heightCm: string;
  frontPlacement: FrontPlacement;
  priceFront: string;
  priceBack: string;
  priceBoth: string;
  isActive: boolean;
};

let draftCounter = 0;
const newKey = () => `new-${++draftCounter}`;

const toNumber = (value: string) => (value.trim() === "" ? Number.NaN : Number(value));
const toPrice = (value: string) => (value.trim() === "" ? null : Number(value));
const fromPrice = (value: number | null) => (value === null ? "" : String(value));

function move<T>(list: T[], index: number, delta: number) {
  const next = [...list];
  const target = index + delta;
  if (target < 0 || target >= next.length) return list;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function CustomCatalogForm({ catalog }: { catalog: CustomCatalog }) {
  const [sizes, setSizes] = useState<SizeDraft[]>(() =>
    catalog.sizes.map((s) => ({ key: s.id, id: s.id, label: s.label, price: String(s.price), isActive: s.is_active }))
  );
  const [colors, setColors] = useState<ColorDraft[]>(() =>
    catalog.colors.map((c) => ({ key: c.id, id: c.id, name: c.name, hex: c.hex, isActive: c.is_active }))
  );
  const [prints, setPrints] = useState<PrintDraft[]>(() =>
    catalog.printOptions.map((o) => ({
      key: o.id,
      id: o.id,
      name: o.name,
      description: o.description ?? "",
      widthCm: String(o.width_cm),
      heightCm: String(o.height_cm),
      frontPlacement: o.front_placement,
      priceFront: fromPrice(o.price_front),
      priceBack: fromPrice(o.price_back),
      priceBoth: fromPrice(o.price_both),
      isActive: o.is_active,
    }))
  );

  const exampleSize = sizes.find((s) => s.isActive && s.label.toUpperCase() === "L") ?? sizes.find((s) => s.isActive);
  const examplePrint = prints.find((p) => p.isActive && toPrice(p.priceBoth) !== null);
  const example =
    exampleSize && examplePrint
      ? `Size ${exampleSize.label} + ${examplePrint.name} front & back = ${formatPrice(
          (Number(exampleSize.price) || 0) + (Number(examplePrint.priceBoth) || 0)
        )} per tee`
      : null;

  return (
    <div className="space-y-8">
      {example && (
        <p className="rounded-2xl bg-muted px-4 py-3 text-sm">
          <span className="font-semibold">Example price:</span> {example}. The customer pays tee price + print price.
        </p>
      )}

      <Section
        title="TEE SIZES & BASE PRICE"
        description="The price of the blank tee in each size."
        save={() =>
          saveTeeSizes(
            sizes.map<SizeRowInput>((s) => ({ id: s.id, label: s.label, price: toNumber(s.price), isActive: s.isActive }))
          )
        }
        onAdd={() => setSizes((list) => [...list, { key: newKey(), label: "", price: "", isActive: true }])}
        addLabel="+ Add size"
      >
        {sizes.map((s, i) => (
          <Row
            key={s.key}
            onUp={() => setSizes((l) => move(l, i, -1))}
            onDown={() => setSizes((l) => move(l, i, 1))}
            onRemove={() => setSizes((l) => l.filter((x) => x.key !== s.key))}
            isActive={s.isActive}
            onActive={(v) => setSizes((l) => l.map((x) => (x.key === s.key ? { ...x, isActive: v } : x)))}
          >
            <Field label="Size">
              <Input
                value={s.label}
                placeholder="M"
                onChange={(e) => setSizes((l) => l.map((x) => (x.key === s.key ? { ...x, label: e.target.value } : x)))}
              />
            </Field>
            <Field label="Tee price (₹)">
              <Input
                inputMode="decimal"
                value={s.price}
                placeholder="399"
                onChange={(e) => setSizes((l) => l.map((x) => (x.key === s.key ? { ...x, price: e.target.value } : x)))}
              />
            </Field>
          </Row>
        ))}
      </Section>

      <Section
        title="TEE COLOURS"
        description="Colours customers can pick in the studio."
        save={() =>
          saveTeeColors(
            colors.map<ColorRowInput>((c) => ({ id: c.id, name: c.name, hex: c.hex, isActive: c.isActive }))
          )
        }
        onAdd={() => setColors((list) => [...list, { key: newKey(), name: "", hex: "#111111", isActive: true }])}
        addLabel="+ Add colour"
      >
        {colors.map((c, i) => (
          <Row
            key={c.key}
            onUp={() => setColors((l) => move(l, i, -1))}
            onDown={() => setColors((l) => move(l, i, 1))}
            onRemove={() => setColors((l) => l.filter((x) => x.key !== c.key))}
            isActive={c.isActive}
            onActive={(v) => setColors((l) => l.map((x) => (x.key === c.key ? { ...x, isActive: v } : x)))}
          >
            <Field label="Colour">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`${c.name || "New"} colour swatch`}
                  value={/^#[0-9a-fA-F]{6}$/.test(c.hex) ? c.hex : "#111111"}
                  onChange={(e) => setColors((l) => l.map((x) => (x.key === c.key ? { ...x, hex: e.target.value } : x)))}
                  className="h-12 w-12 flex-none cursor-pointer rounded border border-border bg-background p-1"
                />
                <Input
                  value={c.hex}
                  aria-label="Hex code"
                  className="font-mono uppercase"
                  onChange={(e) => setColors((l) => l.map((x) => (x.key === c.key ? { ...x, hex: e.target.value } : x)))}
                />
              </div>
            </Field>
            <Field label="Name">
              <Input
                value={c.name}
                placeholder="Black"
                onChange={(e) => setColors((l) => l.map((x) => (x.key === c.key ? { ...x, name: e.target.value } : x)))}
              />
            </Field>
          </Row>
        ))}
      </Section>

      <Section
        title="PRINT SIZES & RATES"
        description="Leave a rate blank if that side isn't offered for a print size. The first live print size is the studio's default."
        save={() =>
          savePrintOptions(
            prints.map<PrintOptionRowInput>((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              widthCm: toNumber(p.widthCm),
              heightCm: toNumber(p.heightCm),
              frontPlacement: p.frontPlacement,
              priceFront: toPrice(p.priceFront),
              priceBack: toPrice(p.priceBack),
              priceBoth: toPrice(p.priceBoth),
              isActive: p.isActive,
            }))
          )
        }
        onAdd={() =>
          setPrints((list) => [
            ...list,
            {
              key: newKey(),
              name: "",
              description: "",
              widthCm: "",
              heightCm: "",
              frontPlacement: "center",
              priceFront: "",
              priceBack: "",
              priceBoth: "",
              isActive: true,
            },
          ])
        }
        addLabel="+ Add print size"
      >
        {prints.map((p, i) => {
          const set = (patch: Partial<PrintDraft>) =>
            setPrints((l) => l.map((x) => (x.key === p.key ? { ...x, ...patch } : x)));
          return (
            <Row
              key={p.key}
              onUp={() => setPrints((l) => move(l, i, -1))}
              onDown={() => setPrints((l) => move(l, i, 1))}
              onRemove={() => setPrints((l) => l.filter((x) => x.key !== p.key))}
              isActive={p.isActive}
              onActive={(v) => set({ isActive: v })}
            >
              <Field label="Name">
                <Input value={p.name} placeholder="A4 Print" onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <Field label="Short description">
                <Input
                  value={p.description}
                  placeholder="Great for detailed designs"
                  onChange={(e) => set({ description: e.target.value })}
                />
              </Field>
              <Field label="Width (cm)">
                <Input inputMode="decimal" value={p.widthCm} placeholder="21" onChange={(e) => set({ widthCm: e.target.value })} />
              </Field>
              <Field label="Height (cm)">
                <Input inputMode="decimal" value={p.heightCm} placeholder="29.7" onChange={(e) => set({ heightCm: e.target.value })} />
              </Field>
              <Field label="Front placement">
                <div className="flex gap-2">
                  {(["center", "left_chest"] as const).map((placement) => (
                    <button
                      key={placement}
                      type="button"
                      onClick={() => set({ frontPlacement: placement })}
                      className={cn(
                        "h-12 flex-1 border px-3 text-sm font-semibold",
                        p.frontPlacement === placement
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:border-foreground"
                      )}
                    >
                      {placement === "center" ? "Centre" : "Left chest"}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                <Field label="Front only (₹)">
                  <Input inputMode="decimal" value={p.priceFront} placeholder="—" onChange={(e) => set({ priceFront: e.target.value })} />
                </Field>
                <Field label="Back only (₹)">
                  <Input inputMode="decimal" value={p.priceBack} placeholder="—" onChange={(e) => set({ priceBack: e.target.value })} />
                </Field>
                <Field label="Front & back (₹)">
                  <Input inputMode="decimal" value={p.priceBoth} placeholder="—" onChange={(e) => set({ priceBoth: e.target.value })} />
                </Field>
              </div>
            </Row>
          );
        })}
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  save,
  onAdd,
  addLabel,
  children,
}: {
  title: string;
  description: string;
  save: () => Promise<{ error?: string }>;
  onAdd: () => void;
  addLabel: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    const result = await save();
    setSaving(false);
    if (result.error) {
      setStatus({ ok: false, message: result.error });
    } else {
      setStatus({ ok: true, message: "Saved — the studio is updated." });
      router.refresh();
    }
  }

  return (
    <section className="border border-border p-4 sm:p-6">
      <h2 className="font-display text-xl tracking-wide">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5 space-y-3">{children}</div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onAdd}
          className="h-11 border border-dashed border-border px-4 text-sm font-semibold hover:border-foreground"
        >
          {addLabel}
        </button>
        <Button onClick={handleSave} disabled={saving} className="ml-auto">
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

function Row({
  children,
  isActive,
  onActive,
  onUp,
  onDown,
  onRemove,
}: {
  children: ReactNode;
  isActive: boolean;
  onActive: (value: boolean) => void;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={cn("border border-border p-3 sm:p-4", !isActive && "bg-muted/60")}>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        <Toggle checked={isActive} onChange={onActive} label={isActive ? "Live" : "Hidden"} />
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Move up" onClick={onUp}>
            ↑
          </IconButton>
          <IconButton label="Move down" onClick={onDown}>
            ↓
          </IconButton>
          <button
            type="button"
            onClick={onRemove}
            className="ml-2 text-xs font-semibold uppercase tracking-wide text-danger underline underline-offset-4"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center border border-border text-sm hover:border-foreground"
    >
      {children}
    </button>
  );
}
