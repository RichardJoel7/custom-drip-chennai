import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProductWithDetails } from "@/types";

const PRODUCT_SELECT = `
  *,
  product_images ( id, product_id, image_url, sort_order, is_main, created_at ),
  product_variants ( id, product_id, size, color, stock_quantity, created_at, updated_at )
`;

function sortProductDetails(product: ProductWithDetails): ProductWithDetails {
  return {
    ...product,
    product_images: [...product.product_images].sort((a, b) => a.sort_order - b.sort_order),
    product_variants: [...product.product_variants].sort((a, b) =>
      a.size === b.size ? a.color.localeCompare(b.color) : a.size.localeCompare(b.size)
    ),
  };
}

export async function getActiveProducts(filters?: {
  gender?: "men" | "women";
  collection?: string;
}): Promise<ProductWithDetails[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("products").select(PRODUCT_SELECT).eq("is_active", true);

  if (filters?.gender) query = query.eq("gender", filters.gender);
  if (filters?.collection) query = query.contains("collections", [filters.collection]);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as ProductWithDetails[]).map(sortProductDetails);
}

/**
 * Powers the Shop menu's Men's/Women's hover flyouts: the distinct, non-empty collections
 * tagged on currently active products, per gender. Purely derived from product data — there
 * is no separate collections table to keep in sync.
 */
export async function getShopMenu(): Promise<{ men: string[]; women: string[] }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("gender, collections")
    .eq("is_active", true)
    .not("gender", "is", null);

  if (error || !data) return { men: [], women: [] };

  const men = new Set<string>();
  const women = new Set<string>();
  for (const row of data as { gender: "men" | "women" | null; collections: string[] | null }[]) {
    for (const collection of row.collections ?? []) {
      if (row.gender === "men") men.add(collection);
      if (row.gender === "women") women.add(collection);
    }
  }

  return { men: Array.from(men).sort(), women: Array.from(women).sort() };
}

/** Admin-only: all products regardless of active status, for the admin product list. */
export async function getAllProductsForAdmin(): Promise<ProductWithDetails[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as ProductWithDetails[]).map(sortProductDetails);
}

export async function getFeaturedProducts(limit = 8): Promise<ProductWithDetails[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as ProductWithDetails[]).map(sortProductDetails);
}

/** Admin-only: fetches a product by id regardless of active status, for the edit form. */
export async function getProductByIdForAdmin(id: string): Promise<ProductWithDetails | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return sortProductDetails(data as ProductWithDetails);
}

export async function getProductBySlug(slug: string): Promise<ProductWithDetails | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return sortProductDetails(data as ProductWithDetails);
}
