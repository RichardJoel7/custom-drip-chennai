import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CustomCatalog,
  CustomPrintOption,
  CustomTeeColor,
  CustomTeeSize,
  Design,
  StudioDesign,
} from "@/types";

type ServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

const EMPTY_CATALOG: CustomCatalog = { sizes: [], colors: [], printOptions: [] };
const PAGE_SIZE = 1000; // PostgREST's default max rows per request

// Every read tolerates the tables not existing yet (0009_custom_studio.sql not run), so the
// storefront keeps working — the studio just shows its "being set up" state.
async function fetchCatalog(supabase: ServerClient, activeOnly: boolean): Promise<CustomCatalog> {
  const table = (name: string) => {
    let query = supabase.from(name).select("*").order("sort_order").order("id");
    if (activeOnly) query = query.eq("is_active", true);
    return query;
  };

  const [sizes, colors, printOptions] = await Promise.all([
    table("custom_tee_sizes"),
    table("custom_tee_colors"),
    table("custom_print_options"),
  ]);

  if (sizes.error || colors.error || printOptions.error) return EMPTY_CATALOG;

  return {
    sizes: ((sizes.data ?? []) as CustomTeeSize[]).map((s) => ({ ...s, price: Number(s.price) })),
    colors: (colors.data ?? []) as CustomTeeColor[],
    printOptions: ((printOptions.data ?? []) as CustomPrintOption[]).map((o) => ({
      ...o,
      width_cm: Number(o.width_cm),
      height_cm: Number(o.height_cm),
      price_front: o.price_front === null ? null : Number(o.price_front),
      price_back: o.price_back === null ? null : Number(o.price_back),
      price_both: o.price_both === null ? null : Number(o.price_both),
    })),
  };
}

export async function getCustomCatalog(): Promise<CustomCatalog> {
  return fetchCatalog(await createServerSupabaseClient(), true);
}

/** Admin-only: includes inactive rows (RLS lets admins see them). */
export async function getCustomCatalogForAdmin(): Promise<CustomCatalog | null> {
  const supabase = await createServerSupabaseClient();
  const probe = await supabase.from("custom_tee_sizes").select("id").limit(1);
  if (probe.error) return null;
  return fetchCatalog(supabase, false);
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

/** Admin-only. Null means the designs table doesn't exist yet. */
export async function getDesignsForAdmin(): Promise<Design[] | null> {
  const supabase = await createServerSupabaseClient();
  return fetchAllDesigns<Design>(supabase, "*", false);
}
