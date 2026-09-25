"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { PhotoPoint, PrintBox } from "@/types";

type Drag =
  | { mode: "move" | "resize"; startX: number; startY: number; start: PrintBox }
  | { mode: "spot"; startX: number; startY: number; start: PhotoPoint };

const MIN_SIZE = 0.05;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * The admin marks the biggest printable box on a garment photo: drag the box to move it,
 * drag its corner to resize. On the front photo there's also a logo spot to drag.
 * Everything is stored as 0–1 fractions of the photo, so it works at any display size.
 */
export function PrintAreaEditor({
  imageUrl,
  area,
  onAreaChange,
  logoSpot,
  onLogoSpotChange,
}: {
  imageUrl: string;
  area: PrintBox;
  onAreaChange: (area: PrintBox) => void;
  /** Pass both to show the draggable left-chest logo spot. */
  logoSpot?: PhotoPoint | null;
  onLogoSpotChange?: (spot: PhotoPoint) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);

  function begin(event: ReactPointerEvent, drag: Drag) {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragRef.current = drag;
  }

  function handleMove(event: ReactPointerEvent) {
    const drag = dragRef.current;
    const frame = frameRef.current?.getBoundingClientRect();
    if (!drag || !frame) return;
    const dx = (event.clientX - drag.startX) / frame.width;
    const dy = (event.clientY - drag.startY) / frame.height;

    if (drag.mode === "move") {
      onAreaChange({
        ...drag.start,
        x: clamp(drag.start.x + dx, 0, 1 - drag.start.w),
        y: clamp(drag.start.y + dy, 0, 1 - drag.start.h),
      });
    } else if (drag.mode === "resize") {
      onAreaChange({
        ...drag.start,
        w: clamp(drag.start.w + dx, MIN_SIZE, 1 - drag.start.x),
        h: clamp(drag.start.h + dy, MIN_SIZE, 1 - drag.start.y),
      });
    } else {
      onLogoSpotChange?.({ x: clamp(drag.start.x + dx, 0, 1), y: clamp(drag.start.y + dy, 0, 1) });
    }
  }

  function end() {
    dragRef.current = null;
  }

  const spot = logoSpot ?? { x: area.x + area.w * 0.75, y: area.y + 0.05 };

  return (
    <div
      ref={frameRef}
      className="checkerboard relative w-full touch-none select-none overflow-hidden rounded-xl border border-border"
      onPointerMove={handleMove}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- raw photo; the editor needs its exact pixels */}
      <img src={imageUrl} alt="" draggable={false} className="block h-auto w-full" />

      <div
        role="slider"
        aria-label="Print area — drag to move"
        aria-valuetext={`${Math.round(area.w * 100)}% wide`}
        aria-valuenow={Math.round(area.x * 100)}
        tabIndex={0}
        onPointerDown={(e) => begin(e, { mode: "move", startX: e.clientX, startY: e.clientY, start: area })}
        className="absolute cursor-move border-2 border-dashed border-accent bg-accent/15 shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
        style={{
          left: `${area.x * 100}%`,
          top: `${area.y * 100}%`,
          width: `${area.w * 100}%`,
          height: `${area.h * 100}%`,
        }}
      >
        <span className="pointer-events-none absolute bottom-1 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
          Print area
        </span>
        <span
          role="slider"
          aria-label="Print area — drag to resize"
          aria-valuenow={Math.round(area.w * 100)}
          tabIndex={0}
          onPointerDown={(e) => begin(e, { mode: "resize", startX: e.clientX, startY: e.clientY, start: area })}
          className="absolute -bottom-2.5 -right-2.5 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-black bg-accent"
        />
      </div>

      {onLogoSpotChange && (
        <span
          role="slider"
          aria-label="Left-chest logo spot — drag to move"
          aria-valuenow={Math.round(spot.x * 100)}
          tabIndex={0}
          onPointerDown={(e) => begin(e, { mode: "spot", startX: e.clientX, startY: e.clientY, start: spot })}
          className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-move items-center justify-center rounded-full border-2 border-black bg-white text-[9px] font-black text-black shadow"
          style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%` }}
        >
          LOGO
        </span>
      )}
    </div>
  );
}
