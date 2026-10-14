// The shop's search, filters and sort. Pure and client-safe: the shop page loads every live tee
// once and narrows it down in the browser, so typing and tapping filters cost no database reads.
import { sortSizes } from "@/lib/utils/product-helpers";
import type { ProductWithDetails } from "@/types";

export type ShopSort = "featured" | "newest" | "price-asc" | "price-desc";

/** `short` fits the Sort button on a phone; the menu shows `label`. */
export const SHOP_SORTS: { value: ShopSort; label: string; short: string }[] = [
  { value: "featured", label: "Featured", short: "Featured" },
  { value: "newest", label: "Newest", short: "Newest" },
  { value: "price-asc", label: "Price: low to high", short: "Price ↑" },
  { value: "price-desc", label: "Price: high to low", short: "Price ↓" },
];

export interface ShopFilters {
  q: string;
  gender: "men" | "women" | null;
  collection: string | null;
  colour: string | null;
  size: string | null;
  sort: ShopSort;
}

export const NO_FILTERS: ShopFilters = { q: "", gender: null, collection: null, colour: null, size: null, sort: "featured" };

/** Collections are typed by hand in the admin, so "SUPER  ⭐️" and "super ⭐️" are the same one. */
export const sameName = (a: string, b: string) =>
  a.replace(/\s+/g, " ").trim().toLowerCase() === b.replace(/\s+/g, " ").trim().toLowerCase();

const tidy = (name: string) => name.replace(/\s+/g, " ").trim();

/** The filters in a shop address, e.g. /shop?gender=men&collection=THALA&size=XL&q=rajini&sort=price-asc. */
export function filtersFromParams(params: Record<string, string | string[] | undefined>): ShopFilters {
  const one = (key: string) => {
    const value = params[key];
    const text = (Array.isArray(value) ? value[0] : value)?.trim();
    return text ? text.slice(0, 80) : null;
  };
  const gender = one("gender");
  const sort = one("sort");
  return {
    q: one("q") ?? "",
    gender: gender === "men" || gender === "women" ? gender : null,
    collection: one("collection"),
    colour: one("colour"),
    size: one("size"),
    sort: SHOP_SORTS.some((s) => s.value === sort) ? (sort as ShopSort) : "featured",
  };
}

/** The address for a set of filters (defaults left out, so a plain shop stays /shop). */
export function shopQueryString(filters: ShopFilters) {
  const params = new URLSearchParams();
  if (filters.gender) params.set("gender", filters.gender);
  if (filters.collection) params.set("collection", filters.collection);
  if (filters.colour) params.set("colour", filters.colour);
  if (filters.size) params.set("size", filters.size);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.sort !== "featured") params.set("sort", filters.sort);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function activeFilterCount(filters: ShopFilters) {
  return [filters.gender, filters.collection, filters.colour, filters.size].filter(Boolean).length;
}

/** What the filter panel offers: only collections, colours and sizes some live tee actually has. */
export function shopFacets(products: ProductWithDetails[]) {
  const collections = new Map<string, string>();
  const colours = new Map<string, string>();
  const sizes = new Set<string>();
  for (const product of products) {
    for (const c of product.collections ?? []) {
      const key = tidy(c).toLowerCase();
      if (key && !collections.has(key)) collections.set(key, tidy(c));
    }
    for (const v of product.product_variants) {
      if (v.stock_quantity <= 0) continue;
      const key = tidy(v.color).toLowerCase();
      if (key && !colours.has(key)) colours.set(key, tidy(v.color));
      sizes.add(tidy(v.size));
    }
  }
  return {
    collections: [...collections.values()].sort((a, b) => a.localeCompare(b)),
    colours: [...colours.values()].sort((a, b) => a.localeCompare(b)),
    sizes: sortSizes([...sizes]),
    hasGender: products.some((p) => p.gender),
  };
}

/** The tees that match, in the chosen order. */
export function applyShopFilters(products: ProductWithDetails[], filters: ShopFilters) {
  const terms = searchTerms(filters.q);
  const matched = products.filter((product) => {
    if (filters.gender && product.gender !== filters.gender) return false;
    if (filters.collection && !(product.collections ?? []).some((c) => sameName(c, filters.collection!))) return false;
    if (filters.colour || filters.size) {
      // in stock in that colour and size, together when both are picked
      const fits = product.product_variants.some(
        (v) =>
          v.stock_quantity > 0 &&
          (!filters.colour || sameName(v.color, filters.colour)) &&
          (!filters.size || sameName(v.size, filters.size))
      );
      if (!fits) return false;
    }
    return terms.length === 0 || matchesSearch(product, terms);
  });

  const newest = (a: ProductWithDetails, b: ProductWithDetails) => b.created_at.localeCompare(a.created_at);
  const order: Record<ShopSort, (a: ProductWithDetails, b: ProductWithDetails) => number> = {
    // With a search, tees whose name matches come before ones that matched on colour or description.
    featured: (a, b) =>
      (terms.length > 0 ? nameRank(a, terms) - nameRank(b, terms) : 0) ||
      Number(b.is_featured) - Number(a.is_featured) ||
      newest(a, b),
    newest,
    "price-asc": (a, b) => a.price - b.price || newest(a, b),
    "price-desc": (a, b) => b.price - a.price || newest(a, b),
  };
  return matched.sort(order[filters.sort]);
}

// --- search ---------------------------------------------------------------------------------

/** Lower case, letters and digits only; accents and emoji dropped. */
const fold = (text: string) =>
  text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Spelling-forgiving form of a word, for names written in English letters several ways:
 * "thalapathy" / "thalapathi" / "thalapathee", "rajini" / "rajjini", "vijay" / "vijai".
 */
const loose = (word: string) =>
  word
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/y/g, "i")
    .replace(/(.)\1+/g, "$1");

const searchTerms = (q: string) => fold(q).split(" ").filter(Boolean).map(loose);

function editDistance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

/** A typed word matches a word on the tee: the start of it ("thal"), or one or two typos off. */
function wordMatches(term: string, word: string) {
  if (word.startsWith(term)) return true;
  if (term.length < 4) return false;
  const allowed = term.length >= 7 ? 2 : 1;
  return editDistance(term, word) <= allowed || editDistance(term, word.slice(0, term.length)) <= allowed;
}

function nameWords(product: ProductWithDetails) {
  return fold([product.name, ...(product.collections ?? [])].join(" ")).split(" ").filter(Boolean).map(loose);
}

function searchWords(product: ProductWithDetails) {
  const genderWords = product.gender === "men" ? "men mens man" : product.gender === "women" ? "women womens woman ladies" : "";
  const colours = product.product_variants.map((v) => v.color).join(" ");
  const details = [product.fit, product.category, product.print_type, genderWords, colours].filter(Boolean).join(" ");
  return [...nameWords(product), ...fold(details).split(" ").filter(Boolean).map(loose)];
}

function matchesSearch(product: ProductWithDetails, terms: string[]) {
  const words = searchWords(product);
  const description = loose(fold(product.description ?? ""));
  // every typed word has to match something, so "black thala" narrows rather than widens
  return terms.every((term) => words.some((word) => wordMatches(term, word)) || (term.length >= 3 && description.includes(term)));
}

function nameRank(product: ProductWithDetails, terms: string[]) {
  const words = nameWords(product);
  return terms.every((term) => words.some((word) => wordMatches(term, word))) ? 0 : 1;
}
