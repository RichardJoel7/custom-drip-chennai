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

export async function getActiveProducts(): Promise<ProductWithDetails[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as ProductWithDetails[]).map(sortProductDetails);
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
