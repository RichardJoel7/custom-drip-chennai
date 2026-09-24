"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { StudioDesign } from "@/types";

const PAGE_SIZE = 60;

export function DesignHubDialog({
  designs,
  sideLabel,
  selectedId,
  onSelect,
  onClose,
}: {
  designs: StudioDesign[];
  sideLabel: string;
  selectedId: string | null;
  onSelect: (design: StudioDesign) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const searchRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const design of designs) {
      if (design.category) counts.set(design.category, (counts.get(design.category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [designs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return designs.filter(
      (d) =>
        (!category || d.category === category) &&
        (!q || d.name.toLowerCase().includes(q) || d.category?.toLowerCase().includes(q))
    );
  }, [designs, query, category]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    // Only autofocus with a mouse — on phones it would pop the keyboard over the grid.
    if (window.matchMedia("(pointer: fine)").matches) searchRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="design-hub-title"
    >
      <button
        type="button"
        aria-label="Close design hub"
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl sm:h-[86vh] sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 pb-4 pt-5 sm:px-7">
          <div>
            <h2 id="design-hub-title" className="font-display text-2xl tracking-wide">
              DESIGN HUB
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Pick a design for the <span className="font-semibold text-foreground">{sideLabel}</span> ·{" "}
              {designs.length} design{designs.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
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

        <div className="space-y-3 px-5 pt-4 sm:px-7">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE_SIZE);
              }}
              placeholder="Search designs — e.g. football, anime, quotes"
              aria-label="Search designs"
              className="h-12 w-full rounded-full border border-border bg-muted pl-11 pr-4 text-base outline-none focus:border-foreground"
            />
          </div>

          {categories.length > 0 && (
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-7 sm:px-7">
              <CategoryChip
                label="All"
                count={designs.length}
                active={category === null}
                onClick={() => {
                  setCategory(null);
                  setLimit(PAGE_SIZE);
                }}
              />
              {categories.map(([name, count]) => (
                <CategoryChip
                  key={name}
                  label={name}
                  count={count}
                  active={category === name}
                  onClick={() => {
                    setCategory(name);
                    setLimit(PAGE_SIZE);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4 sm:px-7">
          {filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center">
              <p className="font-semibold">No designs match that search.</p>
              <p className="mt-1 text-sm text-muted-foreground">Try another word or pick a different category.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
                {filtered.slice(0, limit).map((design) => {
                  const selected = design.id === selectedId;
                  return (
                    <button
                      key={design.id}
                      type="button"
                      onClick={() => onSelect(design)}
                      aria-pressed={selected}
                      className={cn(
                        "group overflow-hidden rounded-2xl border text-left transition-all",
                        selected
                          ? "border-foreground ring-2 ring-foreground"
                          : "border-border hover:-translate-y-0.5 hover:border-foreground hover:shadow-lg"
                      )}
                    >
                      <div className="checkerboard relative aspect-square">
                        <Image
                          src={design.image_url}
                          alt={design.name}
                          fill
                          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
                          className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                        />
                        {selected && (
                          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <div className="px-3 py-2.5">
                        <p className="truncate text-sm font-semibold">{design.name}</p>
                        {design.category && (
                          <p className="truncate text-xs text-muted-foreground">{design.category}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {filtered.length > limit && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setLimit((l) => l + PAGE_SIZE)}
                    className="h-11 rounded-full border border-foreground px-6 text-sm font-semibold uppercase tracking-wide hover:bg-foreground hover:text-background"
                  >
                    Show more ({filtered.length - limit} left)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 flex-none whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors",
        active ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
      )}
    >
      {label} <span className={active ? "text-background/60" : "text-muted-foreground"}>{count}</span>
    </button>
  );
}
