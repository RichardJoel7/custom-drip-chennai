import Image from "next/image";
import { GarmentMockup } from "@/components/custom/garment-mockup";
import { mockupFromSnapshot, printDpi, printMeasurements } from "@/lib/custom/mockup";
import { placementsOf } from "@/lib/custom/order-item";
import { PRINT_SIDE_LIST, SIDE_NAMES, gsmLabel } from "@/lib/custom/pricing";
import { formatPrice } from "@/lib/utils/format";
import type { CustomItemDetails, MockupSpec, OrderItem, PlacementSnapshot } from "@/types";

/** Everything needed to print a custom garment: previews, the artwork files, and each print's size and spot. */
export function CustomItemCard({ item, details }: { item: OrderItem; details: CustomItemDetails }) {
  const placements = placementsOf(details);
  const sides = PRINT_SIDE_LIST.filter((side) => placements.some((p) => p.side === side));
  const { spec, colorPhotos } = mockupFromSnapshot(details.garment);

  return (
    <div className="border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {item.product_name} <span className="text-muted-foreground">× {item.quantity}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm">
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border border-black/20"
              style={{ backgroundColor: details.color_hex }}
            />
            {item.color} · Size {item.size}
            {details.gsm && <span className="font-semibold">· {gsmLabel(details.gsm.gsm)}</span>}
          </p>
          <p className="text-sm text-muted-foreground">
            {placements.length} print{placements.length === 1 ? "" : "s"} · prints {formatPrice(details.print_price)}
          </p>
        </div>
        <span className="font-semibold">{formatPrice(item.line_total)}</span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {sides.map((side) => {
          const onSide = placements.filter((p) => p.side === side);
          return (
            <div key={side} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{SIDE_NAMES[side]}</p>
              <div className="bg-muted p-1">
                <GarmentMockup
                  spec={spec}
                  colorPhotos={colorPhotos}
                  colorHex={details.color_hex}
                  view={side}
                  prints={onSide.map((p, i) => ({
                    key: `${p.print_option.id}-${i}`,
                    printArea: p.print_option,
                    transform: p.transform,
                    designUrl: p.design?.image_url,
                  }))}
                  imageWidth={384}
                  className="w-full"
                />
              </div>
              {onSide.map((p, i) => (
                <PrintSpec key={`${p.print_option.id}-${i}`} placement={p} spec={spec} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** One print's size, where it goes, and a link to its full-size artwork. */
function PrintSpec({ placement, spec }: { placement: PlacementSnapshot; spec: MockupSpec | null }) {
  const { print_option: option, design, transform, side } = placement;
  const measured = spec ? printMeasurements(spec, side, option, transform) : null;
  const moved = measured && (Math.abs(measured.rightCm) >= 0.5 || Math.abs(measured.downCm) >= 0.5);
  const dpi =
    design?.source === "upload" && measured ? printDpi(design, { width: measured.widthCm, height: measured.heightCm }) : null;
  const placementNote = side === "front" && option.front_placement === "left_chest" ? "left chest" : "centred";

  return (
    <div className="border border-border p-2 text-xs">
      <p className="font-semibold">
        {option.name}{" "}
        <span className="font-normal text-muted-foreground">
          · {measured && transform ? `${measured.widthCm} × ${measured.heightCm} cm (${Math.round(measured.scale * 100)}%)` : `${option.width_cm} × ${option.height_cm} cm`}{" "}
          · {placementNote}
        </span>
      </p>
      {moved && measured && (
        <p className="mt-0.5 font-semibold text-amber-700">
          Moved by the customer:{" "}
          {[
            measured.rightCm !== 0 && `${Math.abs(measured.rightCm)} cm ${measured.rightCm > 0 ? "right" : "left"}`,
            measured.downCm !== 0 && `${Math.abs(measured.downCm)} cm ${measured.downCm > 0 ? "lower" : "higher"}`,
          ]
            .filter(Boolean)
            .join(", ")}{" "}
          (as you look at it)
        </p>
      )}
      {design && (
        <a
          href={design.image_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 flex items-center gap-2 border border-border p-1.5 hover:border-foreground"
        >
          <span className="checkerboard relative h-10 w-10 flex-none">
            <Image src={design.image_url} alt="" fill sizes="40px" className="object-contain p-0.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">
              {design.name}
              {design.source === "upload" && <span className="font-normal text-muted-foreground"> · customer upload</span>}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {design.width && design.height ? `${design.width} × ${design.height} px${dpi ? ` · ~${dpi} DPI` : ""} · ` : ""}
              <span className="underline underline-offset-2">Open full-size artwork ↗</span>
            </span>
          </span>
        </a>
      )}
    </div>
  );
}
