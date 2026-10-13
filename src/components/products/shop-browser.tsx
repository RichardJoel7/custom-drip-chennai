"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProductGrid } from "@/components/products/product-grid";
import { Button, LinkButton } from "@/components/ui/button";
import {
  NO_FILTERS,
  SHOP_SORTS,
  activeFilterCount,
  applyShopFilters,
  sameName,
  shopFacets,
  shopQueryString,
  type ShopFilters,
  type ShopSort,
} from "@/lib/products/shop-filters";
import { cn } from "@/lib/utils/cn";
import { getColorSwatch } from "@/lib/utils/color-swatch";
import type { ProductWithDetails } from "@/types";

type FacetKey = "gender" | "collection" | "colour" | "size";

const GENDERS = [
  { value: null, label: "All" },
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
] as const;

/**
 * The shop grid with search, filters and sort above it. Everything happens in the browser on
 * the tees the page already has; the address bar follows along, so a filtered view can be
 * shared (e.g. /shop?collection=THALA%20T-SHIRT&size=XL).
 */
export function ShopBrowser({ products, initial }: { products: ProductWithDetails[]; initial: ShopFilters }) {
  const [filters, setFilters] = useState(initial);
  const [panelOpen, setPanelOpen] = useState(false);

  const facets = useMemo(() => shopFacets(products), [products]);
  const results = useMemo(() => applyShopFilters(products, filters), [products, filters]);
  const filterCount = activeFilterCount(filters);
  const narrowed = filterCount > 0 || filters.q.trim() !== "";

  // Keep the address in step (without reloading), a moment after the last keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = `${window.location.pathname}${shopQueryString(filters)}`;
      if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", next);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const set = (patch: Partial<ShopFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const clearAll = () => setFilters({ ...NO_FILTERS, sort: filters.sort });

  const heading = filters.collection
    ? filters.collection.replace(/\s+/g, " ").toUpperCase()
    : filters.gender
      ? filters.gender === "men"
        ? "MEN'S"
        : "WOMEN'S"
      : "SHOP";

  const chips: { key: FacetKey; label: string }[] = [
    filters.gender && { key: "gender" as const, label: filters.gender === "men" ? "Men" : "Women" },
    filters.collection && { key: "collection" as const, label: filters.collection },
    filters.colour && { key: "colour" as const, label: filters.colour },
    filters.size && { key: "size" as const, label: `Size ${filters.size}` },
  ].filter((chip): chip is { key: FacetKey; label: string } => !!chip);

  return (
    <>
      <h1 className="font-display text-4xl tracking-wide sm:text-5xl">{heading}</h1>
      <p className="mt-2 text-muted-foreground" aria-live="polite">
        {narrowed ? `${results.length} of ${products.length} tees` : `${products.length} tees in stock`}
      </p>

      {/* Pinned under the header while the grid scrolls. */}
      <div className="sticky top-[76px] z-30 -mx-4 mt-4 bg-background px-4 py-3 shadow-[0_12px_12px_-14px_rgb(0_0_0/0.3)] sm:top-20 sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap gap-2 md:flex-nowrap">
          <div className="relative w-full md:w-auto md:flex-1">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={filters.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Search tees, collections, colours…"
              aria-label="Search tees"
              enterKeyHint="search"
              autoComplete="off"
              // 16px on phones, or iOS zooms the page in when the box is tapped
              className="h-11 w-full rounded-full border border-border bg-background pl-11 pr-11 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground sm:text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            {filters.q && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => set({ q: "" })}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <CloseIcon />
              </button>
            )}
          </div>

          {facets.hasGender && (
            <div className="hidden h-11 flex-none rounded-full border border-border p-1 md:flex" role="group" aria-label="Men or women">
              {GENDERS.map((g) => (
                <button
                  key={g.label}
                  type="button"
                  aria-pressed={filters.gender === g.value}
                  onClick={() => set({ gender: g.value })}
                  className={cn(
                    "rounded-full px-4 text-xs font-semibold uppercase tracking-wide transition-colors",
                    filters.gender === g.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            aria-haspopup="dialog"
            className={cn(
              "flex h-11 flex-1 items-center justify-center gap-2 rounded-full border px-5 text-xs font-semibold uppercase tracking-wide transition-colors md:flex-none",
              filterCount > 0 ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
            )}
          >
            <FilterIcon />
            Filters{filterCount > 0 && ` (${filterCount})`}
          </button>

          {/* A real <select> under a styled label: the phone's own picker, our look. */}
          <div className="relative flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-border px-5 text-xs font-semibold uppercase tracking-wide transition-colors focus-within:border-foreground hover:border-foreground md:flex-none">
            <SortIcon />
            <span className="truncate">
              <span className="text-muted-foreground">Sort: </span>
              {SHOP_SORTS.find((s) => s.value === filters.sort)?.label}
            </span>
            <select
              value={filters.sort}
              onChange={(e) => set({ sort: e.target.value as ShopSort })}
              aria-label="Sort tees"
              className="absolute inset-0 cursor-pointer opacity-0 text-base"
            >
              {SHOP_SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => set({ [chip.key]: null } as Partial<ShopFilters>)}
                aria-label={`Remove ${chip.label}`}
                className="flex h-8 items-center gap-1.5 rounded-full bg-muted pl-3 pr-2 text-xs font-semibold"
              >
                {chip.label}
                <CloseIcon size={12} />
              </button>
            ))}
            <button type="button" onClick={clearAll} className="px-1 text-xs font-semibold uppercase tracking-wide underline underline-offset-4">
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="mt-4">
        {results.length > 0 || products.length === 0 ? (
          <ProductGrid products={results} />
        ) : (
          <div className="mx-auto max-w-md py-14 text-center">
            <p className="font-display text-2xl tracking-wide">NO TEES MATCH</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {filters.q.trim() ? <>Nothing for &ldquo;{filters.q.trim()}&rdquo;{filterCount > 0 && " with these filters"}.</> : "Nothing with these filters."}{" "}
              Try another word, or design exactly what you want.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button variant="outline" onClick={clearAll}>
                Clear search &amp; filters
              </Button>
              <LinkButton href="/customize">Design your own →</LinkButton>
            </div>
          </div>
        )}
      </div>

      {panelOpen && (
        <FilterPanel
          products={products}
          facets={facets}
          filters={filters}
          onChange={set}
          onClear={clearAll}
          onClose={closePanel}
        />
      )}
    </>
  );
}

/** Bottom sheet on phones, a panel from the right on bigger screens. Filters apply as they're tapped. */
function FilterPanel({
  products,
  facets,
  filters,
  onChange,
  onClear,
  onClose,
}: {
  products: ProductWithDetails[];
  facets: ReturnType<typeof shopFacets>;
  filters: ShopFilters;
  onChange: (patch: Partial<ShopFilters>) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const resultCount = applyShopFilters(products, filters).length;
  // How many tees an option would show, with the other filters as they are.
  const countWith = (patch: Partial<ShopFilters>) => applyShopFilters(products, { ...filters, ...patch }).length;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
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
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end" role="dialog" aria-modal="true" aria-labelledby="shop-filters-title">
      <button type="button" aria-label="Close filters" className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[85dvh] w-full flex-col rounded-t-3xl bg-background shadow-2xl md:max-h-none md:w-[24rem] md:rounded-none md:rounded-l-3xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="shop-filters-title" className="font-display text-2xl tracking-wide">
            FILTERS
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-foreground"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5">
          {facets.hasGender && (
            <FacetGroup title="Men or women">
              {GENDERS.map((g) => (
                <Chip key={g.label} selected={filters.gender === g.value} onClick={() => onChange({ gender: g.value })}>
                  {g.label}
                </Chip>
              ))}
            </FacetGroup>
          )}

          {facets.collections.length > 0 && (
            <FacetGroup title="Collection">
              {facets.collections.map((c) => {
                const selected = !!filters.collection && sameName(filters.collection, c);
                const count = countWith({ collection: c });
                return (
                  <Chip
                    key={c}
                    selected={selected}
                    disabled={!selected && count === 0}
                    onClick={() => onChange({ collection: selected ? null : c })}
                  >
                    {c} <span className="opacity-60">({count})</span>
                  </Chip>
                );
              })}
            </FacetGroup>
          )}

          {facets.colours.length > 0 && (
            <FacetGroup title="Colour">
              {facets.colours.map((c) => {
                const selected = !!filters.colour && sameName(filters.colour, c);
                const count = countWith({ colour: c });
                const hex = getColorSwatch(c);
                return (
                  <Chip
                    key={c}
                    selected={selected}
                    disabled={!selected && count === 0}
                    onClick={() => onChange({ colour: selected ? null : c })}
                  >
                    {hex && <span className="h-3.5 w-3.5 rounded-full border border-black/20" style={{ backgroundColor: hex }} />}
                    {c} <span className="opacity-60">({count})</span>
                  </Chip>
                );
              })}
            </FacetGroup>
          )}

          {facets.sizes.length > 0 && (
            <FacetGroup title="Size in stock">
              {facets.sizes.map((s) => {
                const selected = !!filters.size && sameName(filters.size, s);
                const count = countWith({ size: s });
                return (
                  <Chip
                    key={s}
                    selected={selected}
                    disabled={!selected && count === 0}
                    onClick={() => onChange({ size: selected ? null : s })}
                    className="min-w-12 justify-center"
                  >
                    {s}
                  </Chip>
                );
              })}
            </FacetGroup>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <button type="button" onClick={onClear} className="px-2 text-xs font-semibold uppercase tracking-wide underline underline-offset-4">
            Clear all
          </button>
          <Button className="flex-1" onClick={onClose}>
            Show {resultCount} tee{resultCount === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FacetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Chip({
  selected,
  disabled,
  onClick,
  className,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors disabled:opacity-35",
        selected ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="flex-none">
      <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
