"use client";

import { useId, useRef } from "react";
import {
  MIN_PRINT_SCALE,
  PHOTO_VIEW_WIDTH,
  defaultPrintRect,
  isLightColor,
  optimizedImage,
  printRect,
  transformFor,
  type PrintArea,
  type Rect,
} from "@/lib/custom/mockup";
import type { ColorPhotos, MockupSpec, PrintSide, PrintTransform } from "@/types";

/** One print drawn on the mockup. */
export interface MockupPrint {
  key: string;
  printArea: PrintArea;
  transform?: PrintTransform | null;
  designUrl?: string | null;
  /** Shown under the guide box, e.g. "A4 Print · 21 × 29.7 cm". */
  label?: string;
}

/** Lets the customer tap a print to adjust it, then drag it around and resize it. */
export interface MockupEditor {
  /** The print being adjusted; null = none (tapping a print starts adjusting it). */
  activeKey: string | null;
  onSelect: (key: string) => void;
  onChange: (key: string, transform: PrintTransform) => void;
}

export interface GarmentMockupProps {
  /** The garment's photos and print area; null draws a plain placeholder. */
  spec: MockupSpec | null | undefined;
  /** Real photos of the chosen colour, used instead of auto-colouring. */
  colorPhotos?: ColorPhotos | null;
  colorHex: string;
  view: PrintSide;
  prints?: MockupPrint[];
  showGuide?: boolean;
  /** Width the design images are requested at; small values also fetch a smaller photo. */
  imageWidth?: number;
  className?: string;
  title?: string;
  editor?: MockupEditor;
}

export function GarmentMockup({ spec, colorPhotos, ...props }: GarmentMockupProps) {
  if (!spec) return <GarmentPlaceholder {...props} />;
  return <PhotoMockup spec={spec} colorPhoto={colorPhotos?.[props.view] ?? null} {...props} />;
}

type DragState = {
  key: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  start: Rect;
  unitsPerPx: number;
  print: MockupPrint;
};

/**
 * Photo mockup, in layers: the colour fill cut to the garment's shape (the photo's
 * transparency), the designs, then the photo itself on "multiply" so its folds and shadows
 * fall over both. Dark colours get a highlights pass so the fabric doesn't go flat. A real
 * colour photo skips the tinting and is shown as-is under the designs.
 */
function PhotoMockup({
  spec,
  colorPhoto,
  colorHex,
  view,
  prints = [],
  showGuide = false,
  imageWidth = 640,
  className,
  title,
  editor,
}: Omit<GarmentMockupProps, "colorPhotos" | "spec"> & { spec: MockupSpec; colorPhoto: string | null }) {
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `${name}-${uid}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<DragState | null>(null);
  const frame = useRef<number | null>(null);

  const side = spec[view];
  const width = PHOTO_VIEW_WIDTH;
  const height = width / side.aspect;
  const photo = optimizedImage(colorPhoto ?? side.imageUrl, imageWidth <= 256 ? 384 : 1080);
  const light = isLightColor(colorHex);
  const guideStroke = light ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.8)";
  const fill = { width, height, preserveAspectRatio: "xMidYMid meet" } as const;
  const drawn = prints.map((print) => ({ print, rect: printRect(spec, view, print.printArea, print.transform) }));
  const editing = !!editor?.activeKey;
  const active = drawn.find((d) => d.print.key === editor?.activeKey);

  function startDrag(event: React.PointerEvent, print: MockupPrint, rect: Rect, mode: DragState["mode"]) {
    if (!editor || !svgRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    editor.onSelect(print.key);
    const box = svgRef.current.getBoundingClientRect();
    drag.current = {
      key: print.key,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      start: rect,
      unitsPerPx: width / box.width,
      print,
    };
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
  }

  function handleMove(event: React.PointerEvent) {
    const d = drag.current;
    if (!d || !editor) return;
    const dx = (event.clientX - d.startX) * d.unitsPerPx;
    const dy = (event.clientY - d.startY) * d.unitsPerPx;
    let target: Rect;
    if (d.mode === "move") {
      target = { ...d.start, x: d.start.x + dx, y: d.start.y + dy };
    } else {
      // Resize from the bottom-right corner, keeping the top-left corner and the shape.
      const ratio = d.start.height / d.start.width;
      const base = defaultPrintRect(spec, view, d.print.printArea);
      const grow = Math.abs(dx) >= Math.abs(dy / ratio) ? dx : dy / ratio;
      const w = Math.min(Math.max(d.start.width + grow, base.width * MIN_PRINT_SCALE), base.width);
      target = { x: d.start.x, y: d.start.y, width: w, height: w * ratio };
    }
    const next = transformFor(spec, view, d.print.printArea, target);
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => editor.onChange(d.key, next));
  }

  function endDrag() {
    drag.current = null;
  }

  // Arrow keys nudge the print being adjusted by half a centimetre.
  function handleKey(event: React.KeyboardEvent) {
    if (!editor || !active) return;
    const step = { ArrowLeft: [-0.5, 0], ArrowRight: [0.5, 0], ArrowUp: [0, -0.5], ArrowDown: [0, 0.5] }[event.key];
    if (!step) return;
    event.preventDefault();
    const current = active.print.transform ?? { scale: 1, dx: 0, dy: 0 };
    const moved = printRect(spec, view, active.print.printArea, {
      ...current,
      dx: current.dx + step[0],
      dy: current.dy + step[1],
    });
    editor.onChange(active.print.key, transformFor(spec, view, active.print.printArea, moved));
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={title ?? `${view === "front" ? "Front" : "Back"} of the garment`}
      style={editing ? { touchAction: "none" } : undefined}
      tabIndex={editing ? 0 : undefined}
      onKeyDown={editing ? handleKey : undefined}
      onPointerMove={editor ? handleMove : undefined}
      onPointerUp={editor ? endDrag : undefined}
      onPointerCancel={editor ? endDrag : undefined}
    >
      <defs>
        <mask id={id("shape")} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height} style={{ maskType: "alpha" }}>
          <image href={photo} {...fill} />
        </mask>
        <filter id={id("shadow")} x="-10%" y="-10%" width="120%" height="125%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" floodColor="#000" floodOpacity="0.18" />
        </filter>
        {/* keeps only the photo's brightest spots (above ~93%): the sheen on the fabric, not
            the flat white of the blank garment, which would wash dark colours out */}
        <filter id={id("highlights")} colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="10" intercept="-9.3" />
            <feFuncG type="linear" slope="10" intercept="-9.3" />
            <feFuncB type="linear" slope="10" intercept="-9.3" />
          </feComponentTransfer>
        </filter>
      </defs>

      {title && <title>{title}</title>}

      {colorPhoto ? (
        <image href={photo} {...fill} filter={`url(#${id("shadow")})`} />
      ) : (
        <g filter={`url(#${id("shadow")})`}>
          <rect width={width} height={height} fill={colorHex} mask={`url(#${id("shape")})`} />
        </g>
      )}

      {drawn.map(
        ({ print, rect }) =>
          print.designUrl && (
            <image
              key={print.key}
              href={optimizedImage(print.designUrl, imageWidth)}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              preserveAspectRatio="xMidYMin meet"
              mask={`url(#${id("shape")})`}
            />
          )
      )}

      {!colorPhoto && (
        <g pointerEvents="none">
          <image href={photo} {...fill} style={{ mixBlendMode: "multiply" }} />
          {!light && (
            <image
              href={photo}
              {...fill}
              filter={`url(#${id("highlights")})`}
              opacity={0.35}
              style={{ mixBlendMode: "screen" }}
            />
          )}
        </g>
      )}

      {showGuide &&
        drawn.map(({ print, rect }) => {
          const small = rect.width < 170;
          return (
            <g key={print.key} pointerEvents="none">
              <rect
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                rx="6"
                fill="none"
                stroke={guideStroke}
                strokeWidth="2.5"
                strokeDasharray="12 10"
              />
              {!print.designUrl && (
                <text
                  x={rect.x + rect.width / 2}
                  y={rect.y + rect.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={guideStroke}
                  fontSize={small ? 15 : 23}
                  fontWeight="600"
                  letterSpacing="0.06em"
                >
                  {small ? "LOGO" : "YOUR DESIGN"}
                </text>
              )}
              {print.label && !small && (
                <text
                  x={rect.x + rect.width / 2}
                  y={rect.y + rect.height + 28}
                  textAnchor="middle"
                  fill={guideStroke}
                  fontSize="20"
                  fontWeight="600"
                  letterSpacing="0.04em"
                >
                  {print.label}
                </text>
              )}
            </g>
          );
        })}

      {editor &&
        drawn.map(({ print, rect }) => (
          <rect
            key={print.key}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            fill="transparent"
            className={editing ? "cursor-move" : "cursor-pointer"}
            onPointerDown={editing ? (e) => startDrag(e, print, rect, "move") : undefined}
            onClick={editing ? undefined : () => editor.onSelect(print.key)}
          />
        ))}

      {editor && active && (
        <g>
          <rect
            x={active.rect.x}
            y={active.rect.y}
            width={active.rect.width}
            height={active.rect.height}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3.5"
            pointerEvents="none"
          />
          <g
            className="cursor-nwse-resize"
            onPointerDown={(e) => startDrag(e, active.print, active.rect, "resize")}
          >
            <circle cx={active.rect.x + active.rect.width} cy={active.rect.y + active.rect.height} r="44" fill="transparent" />
            <circle
              cx={active.rect.x + active.rect.width}
              cy={active.rect.y + active.rect.height}
              r="17"
              fill="#fff"
              stroke="#2563eb"
              strokeWidth="5"
            />
          </g>
        </g>
      )}
    </svg>
  );
}

/**
 * Shown where a garment has no photos yet (admin lists) and on orders placed before garment
 * photos: the colour as a swatch with the first design on it.
 */
function GarmentPlaceholder({
  colorHex,
  prints = [],
  imageWidth = 640,
  className,
  title,
}: Omit<GarmentMockupProps, "colorPhotos" | "spec">) {
  const design = prints.find((p) => p.designUrl)?.designUrl;
  return (
    <svg viewBox="0 0 1000 1000" className={className} role="img" aria-label={title ?? "Garment preview"}>
      {title && <title>{title}</title>}
      <rect x="120" y="120" width="760" height="760" rx="90" fill={colorHex} stroke="rgba(0,0,0,0.12)" strokeWidth="4" />
      {design ? (
        <image
          href={optimizedImage(design, imageWidth)}
          x="260"
          y="260"
          width="480"
          height="480"
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <text
          x="500"
          y="505"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="54"
          fontWeight="600"
          fill={isLightColor(colorHex) ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.75)"}
        >
          No photo yet
        </text>
      )}
    </svg>
  );
}
