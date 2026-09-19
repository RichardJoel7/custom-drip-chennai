import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProductWithDetails } from "@/types";

const PRODUCT_SELECT = `
  *,
  product_images ( id, product_id, image_url, sort_order, is_main, created_at ),
  product_variants ( id, product_id, size, color, stock_quantity, created_at, updated_at )
`;

export async function getWishlistProductIds(userId: string): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("wishlists").select("product_id").eq("user_id", userId);

  if (error || !data) return [];
  return data.map((row) => row.product_id);
}

export async function isProductWishlisted(userId: string, productId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();

  return !!data;
}

export async function getWishlistProducts(userId: string): Promise<ProductWithDetails[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("wishlists")
    .select(`product:products!inner ( ${PRODUCT_SELECT} )`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as { product: ProductWithDetails }[])
    .map((row) => row.product)
    .filter((p) => p.is_active);
}
