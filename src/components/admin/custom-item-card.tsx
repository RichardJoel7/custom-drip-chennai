import Image from "next/image";
import { TeeMockup } from "@/components/custom/tee-mockup";
import { SIDE_LABELS, gsmLabel, sidesNeedBack, sidesNeedFront } from "@/lib/custom/pricing";
import { formatPrice } from "@/lib/utils/format";
import type { CustomItemDetails, OrderItem } from "@/types";

/** Everything needed to print a custom tee: previews, the artwork files, and the spec. */
export function CustomItemCard({ item, details }: { item: OrderItem; details: CustomItemDetails }) {
  const sides = (["front", "back"] as const).filter((side) =>
    side === "front" ? sidesNeedFront(details.sides) : sidesNeedBack(details.sides)
  );
  const printSize = `${details.print_option.width_cm} × ${details.print_option.height_cm} cm`;

  return (
    <div className="border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            Custom Tee <span className="text-muted-foreground">× {item.quantity}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm">
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border border-black/20"
              style={{ backgroundColor: details.color_hex }}
            />
            {item.color} · Size {item.size}
            {details.gsm && <span className="font-semibold">· {gsmLabel(details.gsm.gsm)}</span>}
          </p>
          <p className="text-sm">
            {details.print_option.name} ({printSize}) · {SIDE_LABELS[details.sides]}
          </p>
        </div>
        <span className="font-semibold">{formatPrice(item.line_total)}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {sides.map((side) => {
          const design = side === "front" ? details.front_design : details.back_design;
          return (
            <div key={side} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {side} {side === "front" && details.print_option.front_placement === "left_chest" ? "· left chest" : ""}
              </p>
              <div className="bg-muted p-1">
                <TeeMockup
                  colorHex={details.color_hex}
                  view={side}
                  printArea={details.print_option}
                  designUrl={design?.image_url}
                  imageWidth={256}
                  className="w-full"
                />
              </div>
              {design && (
                <a
                  href={design.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 border border-border p-1.5 hover:border-foreground"
                >
                  <span className="checkerboard relative h-10 w-10 flex-none">
                    <Image src={design.image_url} alt="" fill sizes="40px" className="object-contain p-0.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">{design.name}</span>
                    <span className="block text-[11px] text-muted-foreground underline underline-offset-2">
                      Open full-size artwork ↗
                    </span>
                  </span>
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
