"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { slugify } from "@/lib/utils/slug";
import { extractStoragePath } from "@/lib/utils/storage-path";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SaveProductImage {
  id?: string;
  imageUrl: string;
  isMain: boolean;
}

export interface SaveProductVariant {
  color: string;
  size: string;
  stock: number;
}

export interface SaveProductInput {
  id?: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  category: string;
  gender: string;
  collection: string;
  fabric: string;
  fit: string;
  gsm: string;
  printType: string;
  careInstructions: string;
  isFeatured: boolean;
  isActive: boolean;
  images: SaveProductImage[];
  variants: SaveProductVariant[];
}

const GENERIC_ERROR = "Something went wrong while saving. Please try again.";

async function generateUniqueSlug(
  supabase: SupabaseClient,
  name: string,
  excludeId?: string
): Promise<string> {
  const base = slugify(name) || "tee";
  let candidate = base;
  let suffix = 2;

  for (;;) {
    let query = supabase.from("products").select("id").eq("slug", candidate);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

export async function saveProduct(
  input: SaveProductInput
): Promise<{ error: string } | never> {
  const { supabase } = await requireAdmin();

  if (!input.name.trim()) return { error: "Enter a T-shirt name." };
  if (!(input.price > 0)) return { error: "Enter a valid price." };
  if (input.images.length === 0) return { error: "Upload at least one product photo." };
  if (input.variants.length === 0) return { error: "Select at least one size and colour." };

  const productPayload = {
    name: input.name.trim(),
    description: input.description.trim() || null,
    price: input.price,
    compare_at_price: input.compareAtPrice,
    category: input.category.trim() || null,
    gender: input.gender || null,
    collection: input.gender ? input.collection.trim() || null : null,
    fabric: input.fabric.trim() || null,
    fit: input.fit.trim() || null,
    gsm: input.gsm.trim() || null,
    print_type: input.printType.trim() || null,
    care_instructions: input.careInstructions.trim() || null,
    is_featured: input.isFeatured,
    is_active: input.isActive,
  };

  let productId = input.id;
  let slug: string;

  if (productId) {
    const { data: existing } = await supabase
      .from("products")
      .select("slug")
      .eq("id", productId)
      .maybeSingle();
    slug = existing?.slug ?? (await generateUniqueSlug(supabase, input.name, productId));

    const { error } = await supabase.from("products").update(productPayload).eq("id", productId);
    if (error) {
      console.error("updateProduct failed:", error);
      return { error: GENERIC_ERROR };
    }
  } else {
    slug = await generateUniqueSlug(supabase, input.name);
    const { data, error } = await supabase
      .from("products")
      .insert({ ...productPayload, slug })
      .select("id")
      .single();

    if (error || !data) {
      console.error("createProduct failed:", error);
      return { error: GENERIC_ERROR };
    }
    productId = data.id;
  }

  // --- Images: diff existing vs. desired ---
  const { data: existingImages } = await supabase
    .from("product_images")
    .select("id, image_url")
    .eq("product_id", productId);

  const keepIds = new Set(input.images.filter((i) => i.id).map((i) => i.id));
  const imagesToDelete = (existingImages ?? []).filter((img) => !keepIds.has(img.id));

  if (imagesToDelete.length > 0) {
    await supabase
      .from("product_images")
      .delete()
      .in("id", imagesToDelete.map((i) => i.id));

    const paths = imagesToDelete
      .map((i) => extractStoragePath(i.image_url))
      .filter((p): p is string => !!p);
    if (paths.length > 0) {
      await supabase.storage.from("product-images").remove(paths);
    }
  }

  for (const [index, image] of input.images.entries()) {
    if (image.id) {
      await supabase
        .from("product_images")
        .update({ sort_order: index, is_main: image.isMain })
        .eq("id", image.id);
    } else {
      await supabase.from("product_images").insert({
        product_id: productId,
        image_url: image.imageUrl,
        sort_order: index,
        is_main: image.isMain,
      });
    }
  }

  // --- Variants: diff existing vs. desired (never hard-fail on FK; order_items.variant_id is nullable) ---
  const { data: existingVariants } = await supabase
    .from("product_variants")
    .select("id, size, color")
    .eq("product_id", productId);

  const desiredKeys = new Set(input.variants.map((v) => `${v.size}|${v.color}`));
  const variantsToRemove = (existingVariants ?? []).filter(
    (v) => !desiredKeys.has(`${v.size}|${v.color}`)
  );

  if (variantsToRemove.length > 0) {
    await supabase
      .from("product_variants")
      .delete()
      .in("id", variantsToRemove.map((v) => v.id));
  }

  const { error: variantError } = await supabase.from("product_variants").upsert(
    input.variants.map((v) => ({
      product_id: productId,
      size: v.size,
      color: v.color,
      stock_quantity: v.stock,
    })),
    { onConflict: "product_id,size,color" }
  );

  if (variantError) {
    console.error("saveProduct variants failed:", variantError);
    return { error: "Product saved, but there was a problem saving stock. Please try again." };
  }

  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath(`/product/${slug}`);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function duplicateProduct(productId: string): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();

  const { data: product } = await supabase
    .from("products")
    .select("*, product_images(*), product_variants(*)")
    .eq("id", productId)
    .maybeSingle();

  if (!product) return { error: "Product not found." };

  const newSlug = await generateUniqueSlug(supabase, `${product.name} copy`);

  const { data: newProduct, error } = await supabase
    .from("products")
    .insert({
      name: `${product.name} (Copy)`,
      slug: newSlug,
      description: product.description,
      price: product.price,
      compare_at_price: product.compare_at_price,
      category: product.category,
      gender: product.gender,
      collection: product.collection,
      fabric: product.fabric,
      fit: product.fit,
      gsm: product.gsm,
      print_type: product.print_type,
      care_instructions: product.care_instructions,
      is_featured: false,
      is_active: false,
      is_demo: product.is_demo,
    })
    .select("id")
    .single();

  if (error || !newProduct) return { error: GENERIC_ERROR };

  interface ProductImageRow {
    image_url: string;
    sort_order: number;
    is_main: boolean;
  }
  interface ProductVariantRow {
    size: string;
    color: string;
    stock_quantity: number;
  }

  const images = (product.product_images as ProductImageRow[]) ?? [];
  const variants = (product.product_variants as ProductVariantRow[]) ?? [];

  if (images.length > 0) {
    await supabase.from("product_images").insert(
      images.map((img) => ({
        product_id: newProduct.id,
        image_url: img.image_url,
        sort_order: img.sort_order,
        is_main: img.is_main,
      }))
    );
  }

  if (variants.length > 0) {
    await supabase.from("product_variants").insert(
      variants.map((v) => ({
        product_id: newProduct.id,
        size: v.size,
        color: v.color,
        stock_quantity: v.stock_quantity,
      }))
    );
  }

  revalidatePath("/admin/products");
  return {};
}

export async function setProductActive(productId: string, isActive: boolean): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", productId);

  if (error) return { error: GENERIC_ERROR };

  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath("/admin/products");
  return {};
}

export async function deleteProduct(productId: string): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();

  const { data: images } = await supabase
    .from("product_images")
    .select("image_url")
    .eq("product_id", productId);

  const { error } = await supabase.from("products").delete().eq("id", productId);

  if (error) {
    if (error.code === "23503") {
      return {
        error: "This product has existing orders and can't be deleted. Deactivate it instead.",
      };
    }
    console.error("deleteProduct failed:", error);
    return { error: GENERIC_ERROR };
  }

  const paths = (images ?? [])
    .map((i) => extractStoragePath(i.image_url))
    .filter((p): p is string => !!p);
  if (paths.length > 0) {
    await supabase.storage.from("product-images").remove(paths);
  }

  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath("/admin/products");
  return {};
}
