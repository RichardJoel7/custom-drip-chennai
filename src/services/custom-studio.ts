import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CustomCatalog,
  CustomGarment,
  CustomPrintOption,
  CustomTeeColor,
  CustomTeeGsm,
  CustomTeeSize,
  CustomerDesign,
  Design,
  StudioDesign,
} from "@/types";

type ServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/** "ready", or the migration that still has to be run for the studio to work. */
export type CatalogStatus =
  | "ready"
  | "0009_custom_studio.sql"
  | "0010_gsm_and_saved_details.sql"
  | "0011_garments.sql"
  | "0012_print_placements.sql";

const EMPTY_CATALOG: CustomCatalog = {
  garments: [],
  sizes: [],
  colors: [],
  gsmOptions: [],
  printOptions: [],
  garmentPrintOptionIds: {},
};
const PAGE_SIZE = 1000; // PostgREST's default max rows per request

const toNumber = (value: unknown) => (value === null || value === undefined ? null : Number(value));

// Every read tolerates the tables not existing yet, so the storefront keeps working while a
// migration is pending — the studio just shows its "being set up" state.
async function fetchCatalog(
  supabase: ServerClient,
  activeOnly: boolean
): Promise<{ catalog: CustomCatalog; status: CatalogStatus }> {
  const table = (name: string) => {
    let query = supabase.from(name).select("*").order("sort_order").order("id");
    if (activeOnly) query = query.eq("is_active", true);
    return query;
  };

  const [garments, sizes, colors, gsmOptions, printOptions, allowed, uploads] = await Promise.all([
    table("custom_garments"),
    table("custom_tee_sizes"),
    table("custom_tee_colors"),
    table("custom_tee_gsm_options"),
    table("custom_print_options"),
    supabase.from("custom_garment_print_options").select("garment_id, print_option_id"),
    // only checks the table exists (0012); RLS hides other people's uploads anyway
    supabase.from("customer_designs").select("id").limit(1),
  ]);

  if (sizes.error || printOptions.error) return { catalog: EMPTY_CATALOG, status: "0009_custom_studio.sql" };
  if (gsmOptions.error) return { catalog: EMPTY_CATALOG, status: "0010_gsm_and_saved_details.sql" };
  if (garments.error || colors.error || allowed.error) return { catalog: EMPTY_CATALOG, status: "0011_garments.sql" };

  const garmentPrintOptionIds: Record<string, string[]> = {};
  for (const row of (allowed.data ?? []) as { garment_id: string; print_option_id: string }[]) {
    (garmentPrintOptionIds[row.garment_id] ??= []).push(row.print_option_id);
  }

  const catalog: CustomCatalog = {
    garments: ((garments.data ?? []) as CustomGarment[]).map((g) => ({
      ...g,
      front_aspect: toNumber(g.front_aspect),
      back_aspect: toNumber(g.back_aspect),
      area_width_cm: toNumber(g.area_width_cm),
    })),
    sizes: ((sizes.data ?? []) as CustomTeeSize[]).map((s) => ({ ...s, price: Number(s.price) })),
    colors: (colors.data ?? []) as CustomTeeColor[],
    gsmOptions: ((gsmOptions.data ?? []) as CustomTeeGsm[]).map((g) => ({ ...g, gsm: Number(g.gsm), price: Number(g.price) })),
    printOptions: ((printOptions.data ?? []) as CustomPrintOption[]).map((o) => ({
      ...o,
      width_cm: Number(o.width_cm),
      height_cm: Number(o.height_cm),
      price_front: o.price_front === null ? null : Number(o.price_front),
      price_back: o.price_back === null ? null : Number(o.price_back),
      price_both: o.price_both === null ? null : Number(o.price_both),
    })),
    garmentPrintOptionIds,
  };
  // Before 0012 orders can't carry several prints, so the studio stays closed until it's run.
  return { catalog, status: uploads.error ? "0012_print_placements.sql" : "ready" };
}

/** The live catalog; the studio only opens when status is "ready". */
export async function getCustomCatalog(): Promise<{ catalog: CustomCatalog; status: CatalogStatus }> {
  return fetchCatalog(await createServerSupabaseClient(), true);
}

/** For re-pricing the cart: empty while a migration is pending, so custom lines can't be ordered. */
export async function getOrderableCatalog(): Promise<CustomCatalog> {
  const { catalog, status } = await getCustomCatalog();
  return status === "ready" ? catalog : EMPTY_CATALOG;
}

/** Admin-only: includes hidden rows (RLS lets admins see them). */
export async function getCustomCatalogForAdmin(): Promise<{ catalog: CustomCatalog; status: CatalogStatus }> {
  return fetchCatalog(await createServerSupabaseClient(), false);
}

async function fetchAllDesigns<T>(supabase: ServerClient, columns: string, activeOnly: boolean): Promise<T[] | null> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from("designs")
      .select(columns)
      .order("sort_order")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (activeOnly) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return null;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function getStudioDesigns(): Promise<StudioDesign[]> {
  const supabase = await createServerSupabaseClient();
  return (await fetchAllDesigns<StudioDesign>(supabase, "id, name, category, image_url", true)) ?? [];
}

/** The signed-in customer's own uploads, newest first (none when signed out). */
export async function getMyUploads(): Promise<StudioDesign[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("customer_designs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) return [];
  return (data as CustomerDesign[]).map(uploadToStudioDesign);
}

export function uploadToStudioDesign(row: Pick<CustomerDesign, "id" | "name" | "image_url" | "width" | "height">): StudioDesign {
  return {
    id: row.id,
    name: row.name,
    category: null,
    image_url: row.image_url,
    source: "upload",
    width: row.width,
    height: row.height,
  };
}

/** Admin-only. Null means the designs table doesn't exist yet. */
export async function getDesignsForAdmin(): Promise<Design[] | null> {
  const supabase = await createServerSupabaseClient();
  return fetchAllDesigns<Design>(supabase, "*", false);
}
