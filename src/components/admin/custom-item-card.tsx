import Image from "next/image";
import { GarmentMockup } from "@/components/custom/garment-mockup";
import { customMeasurements, mockupFromSnapshot, printDpi, printMeasurements } from "@/lib/custom/mockup";
import { placementsOf } from "@/lib/custom/order-item";
import { PRINT_SIDE_LIST, SIDE_NAMES, gsmLabel } from "@/lib/custom/pricing";
import { artworkFileName, storageDownloadUrl } from "@/lib/storage/download-url";
import { formatPrice } from "@/lib/utils/format";
import type { CustomItemDetails, MockupSpec, OrderItem, PlacementSnapshot } from "@/types";

/** Everything needed to print a custom garment: previews, the artwork files, and each print's size and spot. */
export function CustomItemCard({
  item,
  details,
  orderNumber,
}: {
  item: OrderItem;
  details: CustomItemDetails;
  /** Starts each downloaded artwork's file name, so files from different orders don't mix up. */
  orderNumber?: string;
}) {
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
                    rectCm: p.kind === "custom" ? p.rect : null,
                    designUrl: p.design?.image_url,
                  }))}
                  imageWidth={384}
                  className="w-full"
                />
              </div>
              {onSide.map((p, i) => (
                <PrintSpec key={`${p.print_option.id}-${i}`} placement={p} spec={spec} orderNumber={orderNumber} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PrintSpecProps {
  placement: PlacementSnapshot;
  spec: MockupSpec | null;
  orderNumber?: string;
}

/** One print's size, where it goes, and its full-size artwork to open or download. */
function PrintSpec({ placement, spec, orderNumber }: PrintSpecProps) {
  if (placement.kind === "custom" && placement.rect) {
    return <CustomPrintSpec placement={placement} spec={spec} orderNumber={orderNumber} />;
  }
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
      {design && <ArtworkLink design={design} dpi={dpi} fileName={[orderNumber, side, option.name, design.name]} />}
    </div>
  );
}

/** A custom-size print: its exact size, and where its centre and top edge go. */
function CustomPrintSpec({ placement, spec, orderNumber }: PrintSpecProps) {
  const rect = placement.rect!;
  const measured = spec ? customMeasurements(spec, placement.side, rect) : null;
  const design = placement.design;
  const dpi = design?.source === "upload" ? printDpi(design, { width: rect.w, height: rect.h }) : null;

  return (
    <div className="border border-border p-2 text-xs">
      <p className="font-semibold">
        Custom size{" "}
        <span className="font-normal text-muted-foreground">
          · {rect.w} × {rect.h} cm
        </span>
      </p>
      {measured && (
        <p className="mt-0.5 font-semibold text-amber-700">
          Centre{" "}
          {measured.rightCm === 0
            ? "on the centre line"
            : `${Math.abs(measured.rightCm)} cm ${measured.rightCm > 0 ? "right" : "left"} of the centre line`}
          , top edge{" "}
          {measured.topCm === 0
            ? "at the top of the print area"
            : `${Math.abs(measured.topCm)} cm ${measured.topCm > 0 ? "below" : "above"} the top of the print area`}{" "}
          (as you look at it)
        </p>
      )}
      {design && (
        <ArtworkLink design={design} dpi={dpi} fileName={[orderNumber, placement.side, `${rect.w}x${rect.h}cm`, design.name]} />
      )}
    </div>
  );
}

/** The artwork as it was uploaded: open it to look, or download the file to print (DTF). */
function ArtworkLink({
  design,
  dpi,
  fileName,
}: {
  design: NonNullable<PlacementSnapshot["design"]>;
  dpi: number | null;
  fileName: (string | null | undefined)[];
}) {
  const name = artworkFileName(design.image_url, fileName);
  const downloadHref = storageDownloadUrl(design.image_url, name);

  const facts = [
    design.source === "upload" && "Customer upload",
    design.width && design.height && `${design.width} × ${design.height} px`,
    dpi && `~${dpi} DPI`,
  ].filter(Boolean);

  return (
    <div className="mt-1.5 flex items-start gap-2 border border-border p-1.5">
      <a
        href={design.image_url}
        target="_blank"
        rel="noopener noreferrer"
        className="checkerboard relative h-12 w-12 flex-none"
        aria-label={`Open ${design.name} full size`}
      >
        <Image src={design.image_url} alt="" fill sizes="48px" className="object-contain p-0.5" />
      </a>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold" title={design.name}>
          {design.name}
        </p>
        {facts.length > 0 && <p className="text-[11px] text-muted-foreground">{facts.join(" · ")}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <a
            href={downloadHref ?? design.image_url}
            download={name}
            className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-background hover:opacity-90"
          >
            ⬇ Download
          </a>
          <a
            href={design.image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Open ↗
          </a>
        </div>
      </div>
    </div>
  );
}
