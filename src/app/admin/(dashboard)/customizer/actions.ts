"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { slugify } from "@/lib/utils/slug";
import type { FrontPlacement, GarmentGender, PhotoPoint, PrintBox } from "@/types";

type Result = { error?: string };
/** A saved list: `ids` holds each submitted row's id (new rows included), in order. */
type ListResult = Result & { ids?: string[] };

const GENERIC_ERROR = "Something went wrong while saving. Please try again.";
const BUCKET = "product-images";

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
  /** Optional real photos of this colour (same framing as the garment photos). */
  frontImageUrl: string | null;
  frontStoragePath: string | null;
  backImageUrl: string | null;
  backStoragePath: string | null;
  isActive: boolean;
}

export interface GsmRowInput {
  id?: string;
  gsm: number;
  description: string;
  price: number;
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

export interface GarmentPhotoInput {
  imageUrl: string;
  storagePath: string;
  aspect: number;
  area: PrintBox;
}

export interface GarmentInput {
  name: string;
  gender: GarmentGender;
  description: string;
  isActive: boolean;
  front: GarmentPhotoInput | null;
  back: GarmentPhotoInput | null;
  areaWidthCm: number | null;
  logoSpot: PhotoPoint | null;
}

type PriceTable = "custom_tee_sizes" | "custom_tee_colors" | "custom_tee_gsm_options" | "custom_print_options";

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

const isFraction = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;

function isPrintBox(box: PrintBox | null | undefined): box is PrintBox {
  return (
    !!box &&
    [box.x, box.y, box.w, box.h].every(isFraction) &&
    box.w >= 0.02 &&
    box.h >= 0.02 &&
    box.x + box.w <= 1.0001 &&
    box.y + box.h <= 1.0001
  );
}

function revalidateStudio(garmentId?: string) {
  revalidatePath("/customize");
  revalidatePath("/admin/customizer");
  if (garmentId) revalidatePath(`/admin/customizer/garments/${garmentId}`);
}

async function removeFiles(paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => !!p);
  if (list.length === 0) return;
  const { supabase } = await requireAdmin();
  await supabase.storage.from(BUCKET).remove(list);
}

/**
 * Replaces a price-list table with the submitted rows: updates kept ids, inserts new, deletes
 * removed. With a garmentId, only that garment's rows are read, changed or deleted.
 */
async function syncTable<Row extends { id?: string }>(
  table: PriceTable,
  rows: Row[],
  toRecord: (row: Row, index: number) => Record<string, unknown>,
  garmentId?: string
): Promise<Result & { ids: string[]; insertedIds: string[] }> {
  const { supabase } = await requireAdmin();
  const ids: string[] = [];
  const insertedIds: string[] = [];

  let existingQuery = supabase.from(table).select("id");
  if (garmentId) existingQuery = existingQuery.eq("garment_id", garmentId);
  const { data: existing, error: readError } = await existingQuery;
  if (readError) {
    console.error(`${table} read failed:`, readError);
    return { error: GENERIC_ERROR, ids, insertedIds };
  }

  const keepIds = new Set(rows.filter((r) => r.id).map((r) => r.id));
  const removeIds = (existing ?? []).map((r) => r.id as string).filter((id) => !keepIds.has(id));

  if (removeIds.length > 0) {
    const { error } = await supabase.from(table).delete().in("id", removeIds);
    if (error) {
      console.error(`${table} delete failed:`, error);
      return { error: GENERIC_ERROR, ids, insertedIds };
    }
  }

  for (const [index, row] of rows.entries()) {
    const record = { ...toRecord(row, index), ...(garmentId ? { garment_id: garmentId } : {}) };
    if (row.id) {
      let update = supabase.from(table).update(record).eq("id", row.id);
      if (garmentId) update = update.eq("garment_id", garmentId);
      const { error } = await update;
      if (error) {
        console.error(`${table} save failed:`, error);
        return { error: GENERIC_ERROR, ids, insertedIds };
      }
      ids.push(row.id);
    } else {
      const { data, error } = await supabase.from(table).insert(record).select("id").single();
      if (error || !data) {
        console.error(`${table} insert failed:`, error);
        return { error: GENERIC_ERROR, ids, insertedIds };
      }
      ids.push(data.id as string);
      insertedIds.push(data.id as string);
    }
  }

  revalidateStudio(garmentId);
  return { ids, insertedIds };
}

// --- Garments ------------------------------------------------------------------------

const GENDERS: GarmentGender[] = ["men", "women", "unisex"];

export async function createGarment(name: string, gender: GarmentGender): Promise<{ error?: string; id?: string }> {
  const { supabase } = await requireAdmin();
  const cleanName = name.trim().slice(0, 60);
  if (!cleanName) return { error: "Give the garment a name, e.g. Oversized Hoodie." };
  if (!GENDERS.includes(gender)) return { error: "Choose men, women or unisex." };

  const { data: existing, error: readError } = await supabase.from("custom_garments").select("slug, sort_order");
  if (readError) return { error: GENERIC_ERROR };

  const taken = new Set((existing ?? []).map((g) => g.slug as string));
  const base = slugify(cleanName) || "garment";
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  const sortOrder = Math.max(0, ...(existing ?? []).map((g) => Number(g.sort_order) || 0)) + 1;

  // Hidden until the admin has added photos, colours and sizes.
  const { data, error } = await supabase
    .from("custom_garments")
    .insert({ name: cleanName, slug, gender, sort_order: sortOrder, is_active: false })
    .select("id")
    .single();
  if (error || !data) {
    console.error("createGarment failed:", error);
    return { error: GENERIC_ERROR };
  }

  // Every print size is allowed to start with; the admin unticks the ones that don't fit.
  const { data: prints } = await supabase.from("custom_print_options").select("id");
  if (prints && prints.length > 0) {
    await supabase
      .from("custom_garment_print_options")
      .insert(prints.map((p) => ({ garment_id: data.id, print_option_id: p.id })));
  }

  revalidateStudio();
  return { id: data.id as string };
}

export async function saveGarment(id: string, input: GarmentInput): Promise<Result> {
  const { supabase } = await requireAdmin();
  const name = input.name.trim().slice(0, 60);
  if (!name) return { error: "Give the garment a name." };
  if (!GENDERS.includes(input.gender)) return { error: "Choose men, women or unisex." };
  if (input.isActive && (!input.front || !input.back)) {
    return { error: "Upload both a front and a back photo before putting this garment live." };
  }

  const photos = [input.front, input.back].filter((p): p is GarmentPhotoInput => !!p);
  for (const photo of photos) {
    if (!photo.imageUrl || !photo.storagePath || !(photo.aspect > 0.2 && photo.aspect < 5)) {
      return { error: "One of the photos didn't upload properly. Please upload it again." };
    }
    if (!isPrintBox(photo.area)) return { error: "Mark a print area on both photos." };
  }
  if (photos.length > 0 && !(input.areaWidthCm !== null && input.areaWidthCm >= 5 && input.areaWidthCm <= 80)) {
    return { error: "Enter the print area's real width in cm (between 5 and 80)." };
  }
  if (input.logoSpot && !(isFraction(input.logoSpot.x) && isFraction(input.logoSpot.y))) {
    return { error: "Place the logo spot on the front photo." };
  }

  const { data: before, error: readError } = await supabase
    .from("custom_garments")
    .select("front_storage_path, back_storage_path")
    .eq("id", id)
    .single();
  if (readError || !before) return { error: GENERIC_ERROR };

  const { error } = await supabase
    .from("custom_garments")
    .update({
      name,
      gender: input.gender,
      description: input.description.trim().slice(0, 200) || null,
      is_active: input.isActive,
      front_image_url: input.front?.imageUrl ?? null,
      front_storage_path: input.front?.storagePath ?? null,
      front_aspect: input.front?.aspect ?? null,
      front_area: input.front?.area ?? null,
      back_image_url: input.back?.imageUrl ?? null,
      back_storage_path: input.back?.storagePath ?? null,
      back_aspect: input.back?.aspect ?? null,
      back_area: input.back?.area ?? null,
      area_width_cm: photos.length > 0 ? input.areaWidthCm : null,
      logo_spot: photos.length > 0 ? input.logoSpot : null,
    })
    .eq("id", id);
  if (error) {
    console.error("saveGarment failed:", error);
    return { error: GENERIC_ERROR };
  }

  // Photos that were replaced or removed are deleted from storage.
  const kept = new Set([input.front?.storagePath, input.back?.storagePath]);
  await removeFiles([before.front_storage_path, before.back_storage_path].filter((p) => p && !kept.has(p)));

  revalidateStudio(id);
  return {};
}

/** Deletes the garment with its sizes, colours and photos. Past orders keep their own copy. */
export async function deleteGarment(id: string): Promise<Result> {
  const { supabase } = await requireAdmin();

  const [{ data: garment }, { data: colors }] = await Promise.all([
    supabase.from("custom_garments").select("front_storage_path, back_storage_path").eq("id", id).single(),
    supabase.from("custom_tee_colors").select("front_storage_path, back_storage_path").eq("garment_id", id),
  ]);

  const { error } = await supabase.from("custom_garments").delete().eq("id", id);
  if (error) {
    console.error("deleteGarment failed:", error);
    return { error: GENERIC_ERROR };
  }

  await removeFiles([
    garment?.front_storage_path,
    garment?.back_storage_path,
    ...(colors ?? []).flatMap((c) => [c.front_storage_path, c.back_storage_path]),
  ]);

  revalidateStudio();
  return {};
}

export async function reorderGarments(ids: string[]): Promise<Result> {
  const { supabase } = await requireAdmin();
  for (const [index, id] of ids.entries()) {
    const { error } = await supabase.from("custom_garments").update({ sort_order: index }).eq("id", id);
    if (error) return { error: GENERIC_ERROR };
  }
  revalidateStudio();
  return {};
}

export async function setGarmentActive(id: string, isActive: boolean): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("custom_garments").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: GENERIC_ERROR };
  revalidateStudio(id);
  return {};
}

/** Which print sizes this garment offers. */
export async function saveGarmentPrintOptions(garmentId: string, printOptionIds: string[]): Promise<Result> {
  const { supabase } = await requireAdmin();
  const wanted = [...new Set(printOptionIds)];

  if (wanted.length > 0) {
    const { error } = await supabase
      .from("custom_garment_print_options")
      .upsert(
        wanted.map((printOptionId) => ({ garment_id: garmentId, print_option_id: printOptionId })),
        { onConflict: "garment_id,print_option_id", ignoreDuplicates: true }
      );
    if (error) {
      console.error("saveGarmentPrintOptions insert failed:", error);
      return { error: GENERIC_ERROR };
    }
  }

  let removal = supabase.from("custom_garment_print_options").delete().eq("garment_id", garmentId);
  if (wanted.length > 0) removal = removal.not("print_option_id", "in", `(${wanted.join(",")})`);
  const { error } = await removal;
  if (error) {
    console.error("saveGarmentPrintOptions delete failed:", error);
    return { error: GENERIC_ERROR };
  }

  revalidateStudio(garmentId);
  return {};
}

// --- Per-garment price lists ------------------------------------------------------------

export async function saveTeeSizes(garmentId: string, rows: SizeRowInput[]): Promise<ListResult> {
  if (rows.some((r) => !r.label.trim())) return { error: "Every size needs a label, e.g. M or XL." };
  if (rows.some((r) => !isPrice(r.price))) return { error: "Enter a valid price for every size." };
  const duplicate = findDuplicate(rows.map((r) => r.label));
  if (duplicate) return { error: `Size "${duplicate}" is listed twice.` };

  const { error, ids } = await syncTable(
    "custom_tee_sizes",
    rows,
    (r, index) => ({ label: r.label.trim(), price: r.price, is_active: r.isActive, sort_order: index }),
    garmentId
  );
  return error ? { error } : { ids };
}

export async function saveTeeColors(garmentId: string, rows: ColorRowInput[]): Promise<ListResult> {
  if (rows.some((r) => !r.name.trim())) return { error: "Every colour needs a name." };
  if (rows.some((r) => !/^#[0-9a-fA-F]{6}$/.test(r.hex))) return { error: "Colours must be a hex code like #111111." };
  const duplicate = findDuplicate(rows.map((r) => r.name));
  if (duplicate) return { error: `Colour "${duplicate}" is listed twice.` };

  const { supabase } = await requireAdmin();
  const { data: before } = await supabase
    .from("custom_tee_colors")
    .select("front_storage_path, back_storage_path")
    .eq("garment_id", garmentId);

  const { error, ids } = await syncTable(
    "custom_tee_colors",
    rows,
    (r, index) => ({
      name: r.name.trim(),
      hex: r.hex.toLowerCase(),
      front_image_url: r.frontImageUrl,
      front_storage_path: r.frontStoragePath,
      back_image_url: r.backImageUrl,
      back_storage_path: r.backStoragePath,
      is_active: r.isActive,
      sort_order: index,
    }),
    garmentId
  );
  if (error) return { error };

  // Colour photos that were replaced, removed or belonged to removed colours.
  const kept = new Set(rows.flatMap((r) => [r.frontStoragePath, r.backStoragePath]));
  await removeFiles(
    (before ?? []).flatMap((c) => [c.front_storage_path, c.back_storage_path]).filter((p) => p && !kept.has(p))
  );
  return { ids };
}

export async function saveGsmOptions(garmentId: string, rows: GsmRowInput[]): Promise<ListResult> {
  if (rows.some((r) => !(Number.isInteger(r.gsm) && r.gsm >= 100 && r.gsm <= 600))) {
    return { error: "GSM must be a whole number between 100 and 600, e.g. 180." };
  }
  if (rows.some((r) => !isPrice(r.price))) return { error: "Enter a valid extra price for every GSM (0 if none)." };
  const duplicate = findDuplicate(rows.map((r) => String(r.gsm)));
  if (duplicate) return { error: `${duplicate} GSM is listed twice.` };

  const { error, ids } = await syncTable(
    "custom_tee_gsm_options",
    rows,
    (r, index) => ({
      gsm: r.gsm,
      description: r.description.trim() || null,
      price: r.price,
      is_active: r.isActive,
      sort_order: index,
    }),
    garmentId
  );
  return error ? { error } : { ids };
}

// --- Shared print sizes ---------------------------------------------------------------

export async function savePrintOptions(rows: PrintOptionRowInput[]): Promise<ListResult> {
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
  const noPrice = rows.find((r) => r.priceFront === null && r.priceBack === null);
  if (noPrice) return { error: `"${noPrice.name}" needs a front or back price.` };
  const bothOnly = rows.find((r) => r.priceBoth !== null && (r.priceFront === null || r.priceBack === null));
  if (bothOnly) {
    return { error: `"${bothOnly.name}": a front & back rate needs both a front and a back price.` };
  }
  const duplicate = findDuplicate(rows.map((r) => r.name));
  if (duplicate) return { error: `Print size "${duplicate}" is listed twice.` };

  const { error, ids, insertedIds } = await syncTable("custom_print_options", rows, (r, index) => ({
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
  if (error) return { error };

  // A new print size is offered on every garment until the admin unticks it somewhere.
  if (insertedIds.length > 0) {
    const { supabase } = await requireAdmin();
    const { data: garments } = await supabase.from("custom_garments").select("id");
    const links = (garments ?? []).flatMap((g) =>
      insertedIds.map((printOptionId) => ({ garment_id: g.id, print_option_id: printOptionId }))
    );
    if (links.length > 0) await supabase.from("custom_garment_print_options").insert(links);
  }
  return { ids };
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
    // Orders from 0012 on list their designs in order_item_designs; older ones in two columns.
    const [front, back, placed] = await Promise.all([
      supabase.from("order_items").select("front_design_id").in("front_design_id", batch),
      supabase.from("order_items").select("back_design_id").in("back_design_id", batch),
      supabase.from("order_item_designs").select("design_id").in("design_id", batch),
    ]);
    if (front.error || back.error || placed.error) {
      console.error("deleteDesigns reference check failed:", front.error ?? back.error ?? placed.error);
      return { error: GENERIC_ERROR, deleted, hidden };
    }

    const ordered = new Set([
      ...(front.data ?? []).map((r) => r.front_design_id as string),
      ...(back.data ?? []).map((r) => r.back_design_id as string),
      ...(placed.data ?? []).map((r) => r.design_id as string),
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
