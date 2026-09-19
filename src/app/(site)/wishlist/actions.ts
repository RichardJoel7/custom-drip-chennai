"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function toggleWishlist(productId: string): Promise<{ error?: string; wishlisted?: boolean }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Please sign in to save favourites." };

  const { data: existing } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    await supabase.from("wishlists").delete().eq("id", existing.id);
    revalidatePath("/wishlist");
    return { wishlisted: false };
  }

  const { error } = await supabase.from("wishlists").insert({ user_id: user.id, product_id: productId });
  if (error) return { error: "Something went wrong. Please try again." };

  revalidatePath("/wishlist");
  return { wishlisted: true };
}
