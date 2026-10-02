"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { markLabelsPrinted } from "@/app/admin/(dashboard)/shipping/actions";

type Paper = "a4" | "4x6";

const PAPERS: { id: Paper; label: string; hint: string }[] = [
  { id: "a4", label: "A4 sheet", hint: "4 labels per page — cut along the dashed lines" },
  { id: "4x6", label: "4 × 6 in label printer", hint: "One label per page (thermal printers)" },
];

const PAPER_KEY = "cdc-label-paper";

// The paper choice is remembered per browser (like the cart, a tiny store over localStorage).
let chosenPaper: Paper | null = null;
const paperListeners = new Set<() => void>();

function currentPaper(): Paper {
  if (chosenPaper) return chosenPaper;
  try {
    return window.localStorage.getItem(PAPER_KEY) === "4x6" ? "4x6" : "a4";
  } catch {
    return "a4"; // private mode / blocked storage
  }
}

function subscribePaper(listener: () => void) {
  paperListeners.add(listener);
  return () => {
    paperListeners.delete(listener);
  };
}

function choosePaper(next: Paper) {
  chosenPaper = next;
  try {
    window.localStorage.setItem(PAPER_KEY, next);
  } catch {
    // not remembered next time — fine
  }
  paperListeners.forEach((listener) => listener());
}

// The page box for each paper. A hair under the real height, so rounding never spills a
// blank page after each sheet.
const PAGE_CSS: Record<Paper, string> = {
  a4: "@page { size: A4 portrait; margin: 0; } .label-sheet { width: 210mm; height: 296.5mm; grid-template-columns: repeat(2, 105mm); grid-template-rows: repeat(2, 148.25mm); }",
  "4x6": "@page { size: 4in 6in; margin: 0; } .label-sheet { width: 4in; height: 5.99in; grid-template-columns: 1fr; grid-template-rows: 1fr; }",
};

function chunk<T>(list: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** The print preview: labels laid out on the chosen paper, a Print button, and nothing else on paper. */
export function LabelSheets({
  orderIds,
  labels,
  missingShipFrom,
}: {
  orderIds: string[];
  labels: React.ReactNode[];
  missingShipFrom: boolean;
}) {
  const paper = useSyncExternalStore(subscribePaper, currentPaper, () => "a4" as Paper);
  const marked = useRef(false);

  // Printing (the button, or Ctrl+P) moves these orders to "Printed" in the shipping list.
  useEffect(() => {
    function onBeforePrint() {
      if (marked.current || orderIds.length === 0) return;
      marked.current = true;
      void markLabelsPrinted(orderIds);
    }
    window.addEventListener("beforeprint", onBeforePrint);
    return () => window.removeEventListener("beforeprint", onBeforePrint);
  }, [orderIds]);

  const perSheet = paper === "a4" ? 4 : 1;
  const sheets = chunk(labels, perSheet);

  return (
    <div className="min-h-screen bg-muted print:bg-white">
      <style>{`${PAGE_CSS[paper]}
        .label-sheet { display: grid; box-sizing: border-box; overflow: hidden; background: white; }
        .label-sheet + .label-sheet { break-before: page; }
        .label-cell { box-sizing: border-box; padding: 4mm; overflow: hidden; }
        @media print {
          html, body { background: white !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }`}</style>

      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3 print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="/admin/shipping" className="text-sm text-muted-foreground underline underline-offset-4">
            ← Shipping labels
          </Link>
          <p className="font-display text-lg tracking-wide">
            {labels.length} LABEL{labels.length === 1 ? "" : "S"}
          </p>
          <div className="flex rounded-full border border-border p-0.5" role="radiogroup" aria-label="Paper">
            {PAPERS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={paper === p.id}
                title={p.hint}
                onClick={() => choosePaper(p.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                  paper === p.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button size="sm" className="ml-auto" disabled={labels.length === 0} onClick={() => window.print()}>
            Print / Save as PDF
          </Button>
        </div>
        <div className="mx-auto mt-2 max-w-5xl text-xs text-muted-foreground">
          {PAPERS.find((p) => p.id === paper)?.hint}. For a PDF, pick <b>Save as PDF</b> as the printer. Keep the scale
          at 100%.
          {missingShipFrom && (
            <span className="mt-1 block font-semibold text-danger">
              No ship-from address yet — the labels have no return address.{" "}
              <Link href="/admin/shipping#ship-from" className="underline underline-offset-2">
                Add it
              </Link>
            </span>
          )}
        </div>
      </div>

      {labels.length === 0 ? (
        <p className="p-10 text-center text-muted-foreground print:hidden">No orders to print labels for.</p>
      ) : (
        <div className="overflow-x-auto py-6 print:overflow-visible print:p-0">
          <div className="mx-auto flex w-max flex-col items-center gap-6 px-4 print:block print:gap-0 print:p-0">
            {sheets.map((sheet, s) => (
              <div key={s} className="label-sheet shadow-lg print:shadow-none">
                {sheet.map((label, i) => (
                  <div
                    key={i}
                    className={cn(
                      "label-cell",
                      // dashed cutting guides between the labels on an A4 sheet
                      paper === "a4" && i % 2 === 0 && "border-r border-dashed border-neutral-300",
                      paper === "a4" && i < 2 && "border-b border-dashed border-neutral-300"
                    )}
                  >
                    {label}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
