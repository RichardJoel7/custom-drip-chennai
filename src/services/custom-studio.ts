import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CustomCatalog,
  CustomPrintOption,
  CustomTeeColor,
  CustomTeeGsm,
  CustomTeeSize,
  Design,
  StudioDesign,
} from "@/types";

type ServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

const EMPTY_CATALOG: CustomCatalog = { sizes: [], colors: [], gsmOptions: [], printOptions: [] };
const PAGE_SIZE = 1000; // PostgREST's default max rows per request

// Every read tolerates the tables not existing yet (0009_custom_studio.sql not run), so the
// storefront keeps working — the studio just shows its "being set up" state. GSM options
// (0010) are optional on top of that: without the table the studio simply has no GSM step.
async function fetchCatalog(
  supabase: ServerClient,
  activeOnly: boolean
): Promise<{ catalog: CustomCatalog; gsmReady: boolean }> {
  const table = (name: string) => {
    let query = supabase.from(name).select("*").order("sort_order").order("id");
    if (activeOnly) query = query.eq("is_active", true);
    return query;
  };

  const [sizes, colors, gsmOptions, printOptions] = await Promise.all([
    table("custom_tee_sizes"),
    table("custom_tee_colors"),
    table("custom_tee_gsm_options"),
    table("custom_print_options"),
  ]);

  const gsmReady = !gsmOptions.error;
  if (sizes.error || colors.error || printOptions.error) return { catalog: EMPTY_CATALOG, gsmReady };

  const catalog: CustomCatalog = {
    sizes: ((sizes.data ?? []) as CustomTeeSize[]).map((s) => ({ ...s, price: Number(s.price) })),
    colors: (colors.data ?? []) as CustomTeeColor[],
    gsmOptions: gsmReady
      ? ((gsmOptions.data ?? []) as CustomTeeGsm[]).map((g) => ({ ...g, gsm: Number(g.gsm), price: Number(g.price) }))
      : [],
    printOptions: ((printOptions.data ?? []) as CustomPrintOption[]).map((o) => ({
      ...o,
      width_cm: Number(o.width_cm),
      height_cm: Number(o.height_cm),
      price_front: o.price_front === null ? null : Number(o.price_front),
      price_back: o.price_back === null ? null : Number(o.price_back),
      price_both: o.price_both === null ? null : Number(o.price_both),
    })),
  };
  return { catalog, gsmReady };
}

export async function getCustomCatalog(): Promise<CustomCatalog> {
  return (await fetchCatalog(await createServerSupabaseClient(), true)).catalog;
}

/**
 * Admin-only: includes inactive rows (RLS lets admins see them). Null means 0009 hasn't
 * been run; gsmReady is false until 0010 has been.
 */
export async function getCustomCatalogForAdmin(): Promise<{ catalog: CustomCatalog; gsmReady: boolean } | null> {
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
