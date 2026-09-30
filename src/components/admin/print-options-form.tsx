"use client";

import { useState } from "react";
import { saveBackPrintPrice, savePrintOptions, type PrintOptionRowInput } from "@/app/admin/(dashboard)/customizer/actions";
import { Field, Row, Section, fromPrice, move, newKey, toNumber, toPrice, withIds } from "@/components/admin/catalog-form-parts";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { CustomPrintOption, FrontPlacement, PrintKind } from "@/types";

type PrintDraft = {
  key: string;
  id?: string;
  name: string;
  kind: PrintKind;
  description: string;
  widthCm: string;
  heightCm: string;
  frontPlacement: FrontPlacement;
  isActive: boolean;
};

/** The one price for a back print of any size; front prints are included in the garment price. */
export function BackPrintPriceForm({ price: initial }: { price: number | null }) {
  const [price, setPrice] = useState(fromPrice(initial));
  return (
    <Section
      title="PRINT PRICING"
      description="Front prints (custom size, chest print, logo) are included in each garment's price. A back print costs the price below, whatever its size."
      save={() => saveBackPrintPrice(toPrice(price))}
    >
      <div className="max-w-xs">
        <Field label="Back print price (₹)">
          <Input inputMode="decimal" value={price} placeholder="199" onChange={(e) => setPrice(e.target.value)} />
        </Field>
      </div>
    </Section>
  );
}

/** Print sizes (how big a custom print can be) and fixed prints, shared by every garment. */
export function PrintOptionsForm({ printOptions }: { printOptions: CustomPrintOption[] }) {
  const [prints, setPrints] = useState<PrintDraft[]>(() =>
    printOptions.map((o) => ({
      key: o.id,
      id: o.id,
      name: o.name,
      kind: o.kind ?? "placement",
      description: o.description ?? "",
      widthCm: String(o.width_cm),
      heightCm: String(o.height_cm),
      frontPlacement: o.front_placement,
      isActive: o.is_active,
    }))
  );

  return (
    <Section
      title="PRINT SIZES"
      description="Shared by every garment — each garment picks which of these it offers. Sizes (A4, A3…) set how big a customer's custom-size print can be, on the front or back. Fixed prints (chest print, logo…) go on the front only."
      save={async () => {
        const result = await savePrintOptions(
          prints.map<PrintOptionRowInput>((p) => ({
            id: p.id,
            name: p.name,
            kind: p.kind,
            description: p.description,
            widthCm: toNumber(p.widthCm),
            heightCm: toNumber(p.heightCm),
            frontPlacement: p.frontPlacement,
            isActive: p.isActive,
          }))
        );
        if (!result.error) setPrints((list) => withIds(list, result.ids));
        return result;
      }}
      onAdd={() =>
        setPrints((list) => [
          ...list,
          {
            key: newKey(),
            name: "",
            kind: "placement",
            description: "",
            widthCm: "",
            heightCm: "",
            frontPlacement: "center",
            isActive: true,
          },
        ])
      }
      addLabel="+ Add print size"
    >
      {prints.map((p, i) => {
        const set = (patch: Partial<PrintDraft>) => setPrints((l) => l.map((x) => (x.key === p.key ? { ...x, ...patch } : x)));
        return (
          <Row
            key={p.key}
            onUp={() => setPrints((l) => move(l, i, -1))}
            onDown={() => setPrints((l) => move(l, i, 1))}
            onRemove={() => setPrints((l) => l.filter((x) => x.key !== p.key))}
            isActive={p.isActive}
            onActive={(v) => set({ isActive: v })}
          >
            <div className="sm:col-span-2">
              <Field label="Type">
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: "size", label: "Size", hint: "Max size of a custom print (A4, A3…)" },
                      { value: "placement", label: "Fixed print", hint: "Chest print, logo… front only" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={p.kind === option.value}
                      onClick={() => set({ kind: option.value })}
                      className={cn(
                        "border px-3 py-2 text-left",
                        p.kind === option.value ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
                      )}
                    >
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className={cn("block text-xs", p.kind === option.value ? "text-background/70" : "text-muted-foreground")}>
                        {option.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <Field label="Name">
              <Input value={p.name} placeholder={p.kind === "size" ? "A3 Print" : "Chest Print"} onChange={(e) => set({ name: e.target.value })} />
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
            {p.kind === "placement" && (
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
            )}
          </Row>
        );
      })}
    </Section>
  );
}
