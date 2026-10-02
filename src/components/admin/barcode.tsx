import { code128 } from "@/lib/shipping/code128";

/** Narrowest bar, in mm: 0.5 mm scans easily from a printed label. */
const MODULE_MM = 0.5;

/** A Code 128 barcode as crisp SVG bars; nothing is drawn for text it can't encode. */
export function Barcode({ value, heightMm = 14 }: { value: string; heightMm?: number }) {
  const code = code128(value);
  if (!code) return null;

  return (
    <svg
      viewBox={`0 0 ${code.width} 10`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Barcode ${value}`}
      className="block max-w-full"
      style={{ width: `${code.width * MODULE_MM}mm`, height: `${heightMm}mm` }}
    >
      {code.bars.map((bar) => (
        <rect key={bar.x} x={bar.x} y={0} width={bar.w} height={10} fill="#000" />
      ))}
    </svg>
  );
}
