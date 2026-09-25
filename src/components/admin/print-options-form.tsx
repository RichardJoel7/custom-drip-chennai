"use client";

import { useState } from "react";
import { savePrintOptions, type PrintOptionRowInput } from "@/app/admin/(dashboard)/customizer/actions";
import { Field, Row, Section, fromPrice, move, newKey, toNumber, toPrice, withIds } from "@/components/admin/catalog-form-parts";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { CustomPrintOption, FrontPlacement } from "@/types";

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

/** Print sizes and their rates, shared by every garment. */
export function PrintOptionsForm({ printOptions }: { printOptions: CustomPrintOption[] }) {
  const [prints, setPrints] = useState<PrintDraft[]>(() =>
    printOptions.map((o) => ({
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

  return (
    <Section
      title="PRINT SIZES & RATES"
      description="Shared by every garment — each garment picks which of these it offers. Customers can pick several per side, each charged at its side's rate; leave a rate blank if that side isn't offered. The optional front & back rate is charged instead when the same size is printed on both sides. The first live print size is the studio's default."
      save={async () => {
        const result = await savePrintOptions(
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
            <div className="grid grid-cols-1 items-end gap-3 sm:col-span-2 sm:grid-cols-3 sm:gap-2">
              <Field label="Front (₹)">
                <Input inputMode="decimal" value={p.priceFront} placeholder="—" onChange={(e) => set({ priceFront: e.target.value })} />
              </Field>
              <Field label="Back (₹)">
                <Input inputMode="decimal" value={p.priceBack} placeholder="—" onChange={(e) => set({ priceBack: e.target.value })} />
              </Field>
              <Field label="Front & back rate (₹, optional)">
                <Input inputMode="decimal" value={p.priceBoth} placeholder="—" onChange={(e) => set({ priceBoth: e.target.value })} />
              </Field>
            </div>
          </Row>
        );
      })}
    </Section>
  );
}
