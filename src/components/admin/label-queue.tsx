"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";

export interface LabelRow {
  id: string;
  orderNumber: string;
  name: string;
  place: string;
  courier: string | null;
  tracking: string | null;
  items: number;
  /** When it shipped, or when the label was printed — whichever this tab is about. */
  date: string | null;
}

type Tab = "toPrint" | "notShipped" | "printed";

const TABS: { id: Tab; label: string; empty: string; dateLabel: string }[] = [
  {
    id: "toPrint",
    label: "Ready to print",
    empty: "Nothing to print. Orders show up here once you save their shipment details.",
    dateLabel: "Shipped",
  },
  {
    id: "notShipped",
    label: "Not shipped yet",
    empty: "No paid orders waiting for shipment details.",
    dateLabel: "Ordered",
  },
  { id: "printed", label: "Printed", empty: "No labels printed yet.", dateLabel: "Printed" },
];

/** Pick orders, then print their labels on a page of their own. */
export function LabelQueue({ rows }: { rows: Record<Tab, LabelRow[]> }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("toPrint");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(rows.toPrint.map((r) => r.id)));
  const current = rows[tab];
  const meta = TABS.find((t) => t.id === tab)!;
  const picked = current.filter((r) => selected.has(r.id));
  const allPicked = current.length > 0 && picked.length === current.length;

  // Coming back from the print tab: refresh so printed labels move to "Printed".
  useEffect(() => {
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  function switchTab(next: Tab) {
    setTab(next);
    // a fresh tab starts with everything still to print ticked, nothing else
    setSelected(new Set(next === "toPrint" ? rows.toPrint.map((r) => r.id) : []));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allPicked ? new Set() : new Set(current.map((r) => r.id)));
  }

  function print() {
    if (picked.length === 0) return;
    window.open(`/admin/print-labels?ids=${picked.map((r) => r.id).join(",")}`, "_blank", "noopener");
  }

  return (
    <section>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Labels">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => switchTab(t.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide",
              tab === t.id ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label} <span className="opacity-70">({rows[t.id].length})</span>
          </button>
        ))}
      </div>

      {current.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{meta.empty}</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={allPicked} onChange={toggleAll} className="h-4 w-4 accent-foreground" />
              Select all
            </label>
            <Button size="sm" disabled={picked.length === 0} onClick={print}>
              🏷️ Print {picked.length || ""} label{picked.length === 1 ? "" : "s"}
            </Button>
          </div>
          {tab === "notShipped" && (
            <p className="mt-3 text-xs text-muted-foreground">
              These have no tracking number yet, so their labels have a blank to write it in.
            </p>
          )}
          <ul className="divide-y divide-border">
            {current.map((row) => (
              <li key={row.id}>
                <label className="flex cursor-pointer items-start gap-3 py-3 hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    className="mt-1 h-4 w-4 flex-none accent-foreground"
                    aria-label={`Select ${row.orderNumber}`}
                  />
                  <span className="grid min-w-0 flex-1 gap-x-4 gap-y-0.5 text-sm sm:grid-cols-[9rem_1fr_1fr_auto]">
                    <span>
                      <Link href={`/admin/orders/${row.id}`} className="font-semibold underline-offset-4 hover:underline">
                        {row.orderNumber}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {row.items} item{row.items === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate">{row.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{row.place}</span>
                    </span>
                    <span className="min-w-0 text-xs text-muted-foreground sm:text-sm">
                      {row.tracking ? (
                        <>
                          <span className="block truncate">{row.courier ?? "Courier"}</span>
                          <span className="block truncate font-mono text-foreground">{row.tracking}</span>
                        </>
                      ) : (
                        "No tracking number"
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground sm:text-right">
                      {row.date ? `${meta.dateLabel} ${formatDate(row.date)}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
