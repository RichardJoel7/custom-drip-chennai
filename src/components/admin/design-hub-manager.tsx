"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { deleteDesigns, updateDesigns } from "@/app/admin/(dashboard)/customizer/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { DESIGN_FILE_TYPES, designNameFromFile, prepareDesignFile } from "@/lib/utils/image";
import type { Design } from "@/types";

const UPLOAD_CONCURRENCY = 4;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const PAGE_SIZE = 120;

type Status = "all" | "live" | "hidden";
interface FailedUpload {
  file: File;
  reason: string;
}

export function DesignHubManager({ initialDesigns }: { initialDesigns: Design[] }) {
  const [designs, setDesigns] = useState(initialDesigns);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");

  const [uploadCategory, setUploadCategory] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failed, setFailed] = useState<FailedUpload[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(
    () => [...new Set(designs.map((d) => d.category).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b)),
    [designs]
  );
  const liveCount = designs.filter((d) => d.is_active).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return designs.filter(
      (d) =>
        (status === "all" || (status === "live" ? d.is_active : !d.is_active)) &&
        (!categoryFilter || d.category === categoryFilter) &&
        (!q || d.name.toLowerCase().includes(q) || d.category?.toLowerCase().includes(q))
    );
  }, [designs, query, categoryFilter, status]);

  const visible = filtered.slice(0, limit);
  const allVisibleSelected = visible.length > 0 && visible.every((d) => selected.has(d.id));

  // --- upload ---------------------------------------------------------------------------

  async function uploadOne(file: File, category: string | null): Promise<Design> {
    if (!DESIGN_FILE_TYPES.includes(file.type)) throw new Error("Use PNG, JPG or WebP");
    if (file.size > MAX_FILE_BYTES) throw new Error("File is over 20 MB");

    const supabase = createClient();
    // Not crypto.randomUUID(): it's undefined on plain-http LAN addresses used for phone testing.
    const fileKey = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const { blob, extension, contentType } = await prepareDesignFile(file);
    const storagePath = `designs/${fileKey}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(storagePath, blob, { contentType, upsert: false });
    if (uploadError) throw new Error("Upload failed");

    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(storagePath);
    const { data, error } = await supabase
      .from("designs")
      .insert({
        name: designNameFromFile(file.name),
        category,
        image_url: urlData.publicUrl,
        storage_path: storagePath,
      })
      .select("*")
      .single();

    if (error || !data) {
      await supabase.storage.from("product-images").remove([storagePath]);
      throw new Error("Couldn't save design");
    }
    return data as Design;
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0 || progress) return;
    const category = uploadCategory.trim() || null;
    const queue = [...files];
    const failures: FailedUpload[] = [];
    let done = 0;

    setNotice(null);
    setFailed([]);
    setProgress({ done: 0, total: files.length });

    async function worker() {
      for (let file = queue.shift(); file; file = queue.shift()) {
        try {
          const design = await uploadOne(file, category);
          setDesigns((list) => [design, ...list]);
        } catch (error) {
          failures.push({ file, reason: error instanceof Error ? error.message : "Upload failed" });
        }
        done += 1;
        setProgress({ done, total: files.length });
      }
    }

    await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, worker));

    setProgress(null);
    setFailed(failures);
    const uploaded = files.length - failures.length;
    setNotice({
      ok: failures.length === 0,
      message:
        failures.length === 0
          ? `${uploaded} design${uploaded === 1 ? "" : "s"} uploaded and live in the studio.`
          : `${uploaded} uploaded, ${failures.length} failed — see below.`,
    });
  }

  // --- edits ------------------------------------------------------------------------------

  async function applyUpdate(ids: string[], patch: { name?: string; category?: string | null; isActive?: boolean }) {
    setBusy(true);
    const result = await updateDesigns(ids, patch);
    setBusy(false);
    if (result.error) {
      setNotice({ ok: false, message: result.error });
      return false;
    }
    setDesigns((list) =>
      list.map((d) =>
        ids.includes(d.id)
          ? {
              ...d,
              ...(patch.name !== undefined && { name: patch.name.trim() }),
              ...(patch.category !== undefined && { category: patch.category?.trim() || null }),
              ...(patch.isActive !== undefined && { is_active: patch.isActive }),
            }
          : d
      )
    );
    return true;
  }

  async function handleDelete(ids: string[]) {
    const count = ids.length;
    if (!window.confirm(`Delete ${count} design${count === 1 ? "" : "s"}? This can't be undone.`)) return;

    setBusy(true);
    const result = await deleteDesigns(ids);
    setBusy(false);

    const deleted = new Set(result.deleted);
    const hidden = new Set(result.hidden);
    setDesigns((list) =>
      list.filter((d) => !deleted.has(d.id)).map((d) => (hidden.has(d.id) ? { ...d, is_active: false } : d))
    );
    setSelected(new Set());

    if (result.error) {
      setNotice({ ok: false, message: result.error });
    } else {
      setNotice({
        ok: true,
        message: [
          result.deleted.length > 0 && `${result.deleted.length} deleted`,
          result.hidden.length > 0 && `${result.hidden.length} hidden instead (already on customer orders)`,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    }
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedIds = [...selected];

  return (
    <div className="space-y-6">
      <datalist id="design-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Designs" value={designs.length} />
        <Stat label="Live in studio" value={liveCount} />
        <Stat label="Hidden" value={designs.length - liveCount} />
      </div>

      {/* UPLOAD */}
      <section className="border border-border p-4 sm:p-6">
        <h2 className="font-display text-xl tracking-wide">BULK UPLOAD</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Drop in as many designs as you like — 100+ at once is fine. Transparent PNGs look best on the tee.
        </p>

        <div className="mt-4 max-w-sm">
          <label htmlFor="upload-category" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
            Category for this upload (optional)
          </label>
          <Input
            id="upload-category"
            list="design-categories"
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            placeholder="e.g. Football, Anime, Quotes"
            disabled={!!progress}
          />
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => !progress && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !progress) inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            uploadFiles(Array.from(e.dataTransfer.files));
          }}
          className={cn(
            "mt-4 flex cursor-pointer flex-col items-center justify-center border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragOver ? "border-foreground bg-muted" : "border-border hover:border-foreground",
            progress && "cursor-wait opacity-70"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={DESIGN_FILE_TYPES.join(",")}
            multiple
            className="hidden"
            onChange={(e) => {
              uploadFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <p className="font-semibold">{progress ? "Uploading…" : "+ Select or drop design files"}</p>
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPG or WebP · up to 20 MB each</p>
        </div>

        {progress && (
          <div className="mt-4" role="status">
            <div className="flex justify-between text-sm font-semibold">
              <span>Uploading designs</span>
              <span>
                {progress.done} / {progress.total}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground transition-[width] duration-300"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {failed.length > 0 && !progress && (
          <div className="mt-4 border border-danger/30 bg-danger/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-danger">{failed.length} file(s) didn&apos;t upload</p>
              <Button size="sm" variant="outline" onClick={() => uploadFiles(failed.map((f) => f.file))}>
                Retry
              </Button>
            </div>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
              {failed.map((f, i) => (
                <li key={`${f.file.name}-${i}`}>
                  {f.file.name} — {f.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {notice && (
        <p className={cn("text-sm font-semibold", notice.ok ? "text-success" : "text-danger")} role="status">
          {notice.message}
        </p>
      )}

      {/* LIBRARY */}
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder="Search designs"
            aria-label="Search designs"
            className="sm:max-w-xs"
          />
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setLimit(PAGE_SIZE);
            }}
            aria-label="Filter by category"
            className="h-[50px] border border-border bg-background px-3 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="flex border border-border">
            {(["all", "live", "hidden"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "h-[48px] px-4 text-xs font-semibold uppercase tracking-wide",
                  status === s ? "bg-foreground text-background" : "hover:bg-muted"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2 font-semibold">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={() =>
                setSelected((current) => {
                  const next = new Set(current);
                  if (allVisibleSelected) visible.forEach((d) => next.delete(d.id));
                  else visible.forEach((d) => next.add(d.id));
                  return next;
                })
              }
              className="h-4 w-4"
            />
            Select shown
          </label>
          <span className="text-muted-foreground">
            Showing {visible.length} of {filtered.length}
          </span>
        </div>

        {selectedIds.length > 0 && (
          <div className="sticky top-2 z-10 mt-3 flex flex-wrap items-center gap-2 border border-foreground bg-background p-3 shadow-lg">
            <span className="mr-2 text-sm font-semibold">{selectedIds.length} selected</span>
            <Input
              list="design-categories"
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              placeholder="Category"
              aria-label="Category for selected designs"
              className="h-10 w-40 py-2 text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={async () => {
                if (await applyUpdate(selectedIds, { category: bulkCategory })) {
                  setNotice({ ok: true, message: `Category updated on ${selectedIds.length} design(s).` });
                }
              }}
            >
              Set category
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => applyUpdate(selectedIds, { isActive: true })}>
              Show
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => applyUpdate(selectedIds, { isActive: false })}>
              Hide
            </Button>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => handleDelete(selectedIds)}>
              Delete
            </Button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-auto text-xs font-semibold uppercase tracking-wide underline underline-offset-4"
            >
              Clear
            </button>
          </div>
        )}

        {designs.length === 0 ? (
          <p className="mt-8 text-muted-foreground">No designs yet. Upload your first batch above.</p>
        ) : filtered.length === 0 ? (
          <p className="mt-8 text-muted-foreground">No designs match these filters.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((design) => (
              <DesignCard
                // Remount when a bulk action changes the saved values, so the inline inputs refresh.
                key={`${design.id}:${design.name}:${design.category ?? ""}`}
                design={design}
                selected={selected.has(design.id)}
                onToggleSelected={() => toggleSelected(design.id)}
                onSave={(patch) => applyUpdate([design.id], patch)}
                onDelete={() => handleDelete([design.id])}
              />
            ))}
          </div>
        )}

        {filtered.length > limit && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              Show more ({filtered.length - limit} left)
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function DesignCard({
  design,
  selected,
  onToggleSelected,
  onSave,
  onDelete,
}: {
  design: Design;
  selected: boolean;
  onToggleSelected: () => void;
  onSave: (patch: { name?: string; category?: string | null; isActive?: boolean }) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(design.name);
  const [category, setCategory] = useState(design.category ?? "");

  return (
    <div className={cn("flex flex-col border", selected ? "border-foreground ring-1 ring-foreground" : "border-border")}>
      <div className="checkerboard relative aspect-square">
        <Image src={design.image_url} alt={design.name} fill sizes="(max-width: 640px) 45vw, 220px" className="object-contain p-3" />
        <label className="absolute left-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded bg-background/90 shadow">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelected}
            aria-label={`Select ${design.name}`}
            className="h-4 w-4"
          />
        </label>
        <span
          className={cn(
            "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            design.is_active ? "bg-success text-white" : "bg-foreground/70 text-background"
          )}
        >
          {design.is_active ? "Live" : "Hidden"}
        </span>
      </div>
      <div className="space-y-1.5 p-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() && name.trim() !== design.name) onSave({ name });
            else setName(design.name);
          }}
          aria-label="Design name"
          className="w-full border border-transparent px-1 py-0.5 text-sm font-semibold hover:border-border focus:border-foreground focus:outline-none"
        />
        <input
          value={category}
          list="design-categories"
          onChange={(e) => setCategory(e.target.value)}
          onBlur={() => {
            if (category.trim() !== (design.category ?? "")) onSave({ category });
          }}
          placeholder="Add category"
          aria-label="Design category"
          className="w-full border border-transparent px-1 py-0.5 text-xs text-muted-foreground hover:border-border focus:border-foreground focus:outline-none"
        />
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => onSave({ isActive: !design.is_active })}
            className="text-xs font-semibold uppercase tracking-wide underline underline-offset-4"
          >
            {design.is_active ? "Hide" : "Show"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-xs font-semibold uppercase tracking-wide text-danger underline underline-offset-4"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border p-3 sm:p-4">
      <p className="font-display text-2xl tracking-wide sm:text-3xl">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
