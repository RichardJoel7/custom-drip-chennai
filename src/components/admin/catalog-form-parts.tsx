"use client";

import { useState, type ReactNode, type Ref } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils/cn";

// Shared building blocks for the Customizer's price-list forms. Numeric fields are kept as
// strings while typing so "" and "12." stay editable.

let draftCounter = 0;
export const newKey = () => `new-${++draftCounter}`;

export const toNumber = (value: string) => (value.trim() === "" ? Number.NaN : Number(value));
export const toPrice = (value: string) => (value.trim() === "" ? null : Number(value));
export const fromPrice = (value: number | null) => (value === null ? "" : String(value));

/** After a list saves, gives each draft its database id, so the next save updates it instead of adding it again. */
export function withIds<T extends { id?: string }>(drafts: T[], ids: string[] | undefined): T[] {
  return ids && ids.length === drafts.length ? drafts.map((d, i) => ({ ...d, id: ids[i] })) : drafts;
}

export function move<T>(list: T[], index: number, delta: number) {
  const next = [...list];
  const target = index + delta;
  if (target < 0 || target >= next.length) return list;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * A titled card. With `save` it has its own Save button; without, a page-wide save handles it
 * (the garment editor). `onAdd` adds an "+ Add …" button.
 */
export function Section({
  title,
  description,
  save,
  onAdd,
  addLabel,
  invalid,
  sectionRef,
  children,
}: {
  title: string;
  description: string;
  save?: () => Promise<{ error?: string }>;
  onAdd?: () => void;
  addLabel?: string;
  /** Outlined in red when the page-wide save found a problem here. */
  invalid?: boolean;
  sectionRef?: Ref<HTMLElement>;
  children: ReactNode;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSave() {
    if (!save) return;
    setSaving(true);
    setStatus(null);
    const result = await save();
    setSaving(false);
    if (result.error) {
      setStatus({ ok: false, message: result.error });
    } else {
      setStatus({ ok: true, message: "Saved — the studio is updated." });
      router.refresh();
    }
  }

  return (
    <section
      ref={sectionRef}
      className={cn("scroll-mt-6 border p-4 sm:p-6", invalid ? "border-danger ring-1 ring-danger" : "border-border")}
    >
      <h2 className="font-display text-xl tracking-wide">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5 space-y-3">{children}</div>
      {(onAdd || save) && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="h-11 border border-dashed border-border px-4 text-sm font-semibold hover:border-foreground"
            >
              {addLabel}
            </button>
          )}
          {save && (
            <Button onClick={handleSave} disabled={saving} className="ml-auto">
              {saving ? "Saving…" : "Save"}
            </Button>
          )}
        </div>
      )}
      {status && (
        <p className={cn("mt-3 text-sm", status.ok ? "text-success" : "text-danger")} role="status">
          {status.message}
        </p>
      )}
    </section>
  );
}

/** One editable row: fields on top, then Live toggle, reorder and remove. */
export function Row({
  children,
  isActive,
  onActive,
  onUp,
  onDown,
  onRemove,
}: {
  children: ReactNode;
  isActive: boolean;
  onActive: (value: boolean) => void;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={cn("border border-border p-3 sm:p-4", !isActive && "bg-muted/60")}>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        <Toggle checked={isActive} onChange={onActive} label={isActive ? "Live" : "Hidden"} />
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Move up" onClick={onUp}>
            ↑
          </IconButton>
          <IconButton label="Move down" onClick={onDown}>
            ↓
          </IconButton>
          <button
            type="button"
            onClick={onRemove}
            className="ml-2 text-xs font-semibold uppercase tracking-wide text-danger underline underline-offset-4"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center border border-border text-sm hover:border-foreground"
    >
      {children}
    </button>
  );
}
