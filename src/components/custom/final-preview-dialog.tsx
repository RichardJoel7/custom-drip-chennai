"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PRINT_SIDE_LIST } from "@/lib/custom/pricing";
import { cn } from "@/lib/utils/cn";
import type { PrintSide } from "@/types";

/**
 * The finished piece, as it will look: the garment with the customer's prints and nothing else
 * (no print-area lines, nothing to drag), front and back. Tap the garment or swipe to turn it.
 */
export function FinalPreviewDialog({
  initialSide,
  render,
  details,
  onClose,
}: {
  initialSide: PrintSide;
  /** The mockup for one side, without guides or editing. */
  render: (side: PrintSide) => ReactNode;
  /** Short facts shown under the preview (garment, colour, size…). */
  details: string[];
  onClose: () => void;
}) {
  const [side, setSide] = useState<PrintSide>(initialSide);
  const closeRef = useRef<HTMLButtonElement>(null);
  const swipe = useRef<number | null>(null);
  const swiped = useRef(false);
  const turn = () => setSide((s) => (s === "front" ? "back" : "front"));

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft" || event.key === "ArrowRight") turn();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="final-preview-title">
      <button type="button" aria-label="Close preview" tabIndex={-1} className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-3xl">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 id="final-preview-title" className="font-display text-2xl tracking-wide">
              PREVIEW
            </h2>
            <p className="text-sm text-muted-foreground">How your piece will look</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-border hover:border-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-5 py-5">
          <div className="flex rounded-full border border-border bg-background p-1" role="tablist" aria-label="Preview side">
            {PRINT_SIDE_LIST.map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={side === s}
                onClick={() => setSide(s)}
                className={cn(
                  "h-9 rounded-full px-5 text-xs font-semibold uppercase tracking-wide transition-colors",
                  side === s ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* tap or swipe the garment to turn it over */}
          <button
            type="button"
            onClick={() => {
              if (swiped.current) swiped.current = false;
              else turn();
            }}
            onPointerDown={(e) => (swipe.current = e.clientX)}
            onPointerUp={(e) => {
              const start = swipe.current;
              swipe.current = null;
              if (start !== null && Math.abs(e.clientX - start) > 40) {
                swiped.current = true;
                turn();
              }
            }}
            aria-label={`Showing the ${side}. Show the ${side === "front" ? "back" : "front"}`}
            className="w-full touch-pan-y rounded-[2rem] bg-[radial-gradient(circle_at_50%_32%,#ffffff_0%,#f1f1ee_55%,#e6e6e2_100%)] p-4 perspective-[1600px]"
          >
            {/* as big as fits, so the whole garment shows without scrolling */}
            <div
              className={cn(
                "mx-auto grid max-w-[max(220px,calc((100dvh-22rem)*0.8))] transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] transform-3d",
                side === "back" && "rotate-y-180"
              )}
            >
              {PRINT_SIDE_LIST.map((s) => (
                <div key={s} className={cn("pointer-events-none backface-hidden [grid-area:1/1]", s === "back" && "rotate-y-180")}>
                  {render(s)}
                </div>
              ))}
            </div>
          </button>
          <p className="text-xs text-muted-foreground">Tap or swipe to see the {side === "front" ? "back" : "front"}</p>

          {details.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 text-xs font-semibold">
              {details.map((d) => (
                <span key={d} className="rounded-full bg-muted px-3 py-1.5">
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border px-5 py-4">
          <Button type="button" onClick={onClose} className="w-full">
            Back to editing
          </Button>
        </div>
      </div>
    </div>
  );
}
