"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import type { FrontPlacement } from "@/types";

type Result = { error?: string };

const GENERIC_ERROR = "Something went wrong while saving. Please try again.";

export interface SizeRowInput {
  id?: string;
  label: string;
  price: number;
  isActive: boolean;
}

export interface ColorRowInput {
  id?: string;
  name: string;
  hex: string;
  isActive: boolean;
}

export interface PrintOptionRowInput {
  id?: string;
  name: string;
  description: string;
  widthCm: number;
  heightCm: number;
  frontPlacement: FrontPlacement;
  priceFront: number | null;
  priceBack: number | null;
  priceBoth: number | null;
  isActive: boolean;
}

function isPrice(value: number | null) {
  return value === null || (Number.isFinite(value) && value >= 0 && value <= 100000);
}

function findDuplicate(values: string[]) {
  const seen = new Set<string>();
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (seen.has(key)) return value.trim();
    seen.add(key);
  }
  return null;
}

/** Replaces a price-list table with the submitted rows: updates kept ids, inserts new, deletes removed. */
async function syncTable<Row extends { id?: string }>(
  table: "custom_tee_sizes" | "custom_tee_colors" | "custom_print_options",
  rows: Row[],
  toRecord: (row: Row, index: number) => Record<string, unknown>
): Promise<Result> {
  const { supabase } = await requireAdmin();

  const { data: existing, error: readError } = await supabase.from(table).select("id");
  if (readError) {
    console.error(`${table} read failed:`, readError);
    return { error: GENERIC_ERROR };
  }

  const keepIds = new Set(rows.filter((r) => r.id).map((r) => r.id));
  const removeIds = (existing ?? []).map((r) => r.id as string).filter((id) => !keepIds.has(id));

  if (removeIds.length > 0) {
    const { error } = await supabase.from(table).delete().in("id", removeIds);
    if (error) {
      console.error(`${table} delete failed:`, error);
      return { error: GENERIC_ERROR };
    }
  }

  for (const [index, row] of rows.entries()) {
    const record = toRecord(row, index);
    const { error } = row.id
      ? await supabase.from(table).update(record).eq("id", row.id)
      : await supabase.from(table).insert(record);
    if (error) {
      console.error(`${table} save failed:`, error);
      return { error: GENERIC_ERROR };
    }
  }

  revalidatePath("/customize");
  revalidatePath("/admin/customizer");
  return {};
}

export async function saveTeeSizes(rows: SizeRowInput[]): Promise<Result> {
  if (rows.some((r) => !r.label.trim())) return { error: "Every size needs a label, e.g. M or XL." };
  if (rows.some((r) => !isPrice(r.price))) return { error: "Enter a valid price for every size." };
  const duplicate = findDuplicate(rows.map((r) => r.label));
  if (duplicate) return { error: `Size "${duplicate}" is listed twice.` };

  return syncTable("custom_tee_sizes", rows, (r, index) => ({
    label: r.label.trim(),
    price: r.price,
    is_active: r.isActive,
    sort_order: index,
  }));
}

export async function saveTeeColors(rows: ColorRowInput[]): Promise<Result> {
  if (rows.some((r) => !r.name.trim())) return { error: "Every colour needs a name." };
  if (rows.some((r) => !/^#[0-9a-fA-F]{6}$/.test(r.hex))) return { error: "Colours must be a hex code like #111111." };
  const duplicate = findDuplicate(rows.map((r) => r.name));
  if (duplicate) return { error: `Colour "${duplicate}" is listed twice.` };

  return syncTable("custom_tee_colors", rows, (r, index) => ({
    name: r.name.trim(),
    hex: r.hex.toLowerCase(),
    is_active: r.isActive,
    sort_order: index,
  }));
}

export async function savePrintOptions(rows: PrintOptionRowInput[]): Promise<Result> {
  if (rows.some((r) => !r.name.trim())) return { error: "Every print size needs a name, e.g. A4 Print." };
  if (rows.some((r) => !(r.widthCm > 0 && r.widthCm <= 60 && r.heightCm > 0 && r.heightCm <= 70))) {
    return { error: "Print width and height must be between 1 and 60–70 cm." };
  }
  if (rows.some((r) => r.frontPlacement !== "center" && r.frontPlacement !== "left_chest")) {
    return { error: "Choose a front placement for every print size." };
  }
  if (rows.some((r) => ![r.priceFront, r.priceBack, r.priceBoth].every(isPrice))) {
    return { error: "Enter valid prices (or leave blank when a side isn't offered)." };
  }
  const noPrice = rows.find((r) => r.priceFront === null && r.priceBack === null && r.priceBoth === null);
  if (noPrice) return { error: `"${noPrice.name}" needs at least one price.` };
  const duplicate = findDuplicate(rows.map((r) => r.name));
  if (duplicate) return { error: `Print size "${duplicate}" is listed twice.` };

  return syncTable("custom_print_options", rows, (r, index) => ({
    name: r.name.trim(),
    description: r.description.trim() || null,
    width_cm: r.widthCm,
    height_cm: r.heightCm,
    front_placement: r.frontPlacement,
    price_front: r.priceFront,
    price_back: r.priceBack,
    price_both: r.priceBoth,
    is_active: r.isActive,
    sort_order: index,
  }));
}

// --- Design Hub ---------------------------------------------------------------------

// Id filters travel in the request URL, so bulk actions on hundreds of designs go in chunks.
function chunk<T>(items: T[], size = 100): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

export async function updateDesigns(
  ids: string[],
  patch: { name?: string; category?: string | null; isActive?: boolean }
): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (ids.length === 0) return {};

  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    if (!patch.name.trim()) return { error: "Design name can't be empty." };
    update.name = patch.name.trim().slice(0, 120);
  }
  if (patch.category !== undefined) update.category = patch.category?.trim().slice(0, 60) || null;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;

  for (const batch of chunk(ids)) {
    const { error } = await supabase.from("designs").update(update).in("id", batch);
    if (error) {
      console.error("updateDesigns failed:", error);
      return { error: GENERIC_ERROR };
    }
  }

  revalidatePath("/customize");
  return {};
}

/**
 * Designs that already appear on an order are hidden instead of deleted, so the order keeps
 * its artwork for printing. Everything else is removed along with its image file.
 */
export async function deleteDesigns(
  ids: string[]
): Promise<{ error?: string; deleted: string[]; hidden: string[] }> {
  const { supabase } = await requireAdmin();
  const deleted: string[] = [];
  const hidden: string[] = [];

  for (const batch of chunk(ids)) {
    const [front, back] = await Promise.all([
      supabase.from("order_items").select("front_design_id").in("front_design_id", batch),
      supabase.from("order_items").select("back_design_id").in("back_design_id", batch),
    ]);
    if (front.error || back.error) {
      console.error("deleteDesigns reference check failed:", front.error ?? back.error);
      return { error: GENERIC_ERROR, deleted, hidden };
    }

    const ordered = new Set([
      ...(front.data ?? []).map((r) => r.front_design_id as string),
      ...(back.data ?? []).map((r) => r.back_design_id as string),
    ]);
    const toHide = batch.filter((id) => ordered.has(id));
    const toDelete = batch.filter((id) => !ordered.has(id));

    if (toHide.length > 0) {
      const { error } = await supabase.from("designs").update({ is_active: false }).in("id", toHide);
      if (error) return { error: GENERIC_ERROR, deleted, hidden };
      hidden.push(...toHide);
    }

    if (toDelete.length > 0) {
      const { data: rows } = await supabase.from("designs").select("storage_path").in("id", toDelete);
      const { error } = await supabase.from("designs").delete().in("id", toDelete);
      if (error) {
        console.error("deleteDesigns failed:", error);
        return { error: GENERIC_ERROR, deleted, hidden };
      }
      const paths = (rows ?? []).map((r) => r.storage_path as string).filter(Boolean);
      if (paths.length > 0) await supabase.storage.from("product-images").remove(paths);
      deleted.push(...toDelete);
    }
  }

  revalidatePath("/customize");
  return { deleted, hidden };
}
