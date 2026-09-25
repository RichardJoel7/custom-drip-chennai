import { createClient } from "@/lib/supabase/client";
import { DESIGN_FILE_TYPES, prepareDesignFile } from "@/lib/utils/image";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const SAMPLE_SIZE = 160;

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image file."));
    };
    img.src = url;
  });
}

/**
 * Looks at a small copy of the photo: how much of its outer edge is see-through (a real
 * cut-out is transparent all round; a "transparent PNG" with the checkerboard painted in is
 * not), and how light the garment itself is (auto-colouring needs a white or light-grey one).
 */
function inspectPhoto(img: HTMLImageElement) {
  const scale = SAMPLE_SIZE / Math.max(img.naturalWidth, img.naturalHeight);
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  const alphaAt = (x: number, y: number) => data[(y * width + x) * 4 + 3];

  let edge = 0;
  let clearEdge = 0;
  for (let x = 0; x < width; x++) {
    for (const y of [0, height - 1]) {
      edge++;
      if (alphaAt(x, y) < 16) clearEdge++;
    }
  }
  for (let y = 1; y < height - 1; y++) {
    for (const x of [0, width - 1]) {
      edge++;
      if (alphaAt(x, y) < 16) clearEdge++;
    }
  }

  let solid = 0;
  let lightness = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    solid++;
    lightness += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
  }

  return { clearEdgeRatio: clearEdge / edge, lightness: solid ? lightness / solid : 0 };
}

/**
 * Uploads a garment or colour photo to product-images/<folder>/, keeping its transparency
 * (see prepareDesignFile). Returns the public URL, the storage path, and width ÷ height.
 * "garment" photos must be a light garment (the studio colours them); "color" photos are a
 * real photo of one colour, so they only need the transparent background.
 */
export async function uploadCatalogImage(
  file: File,
  folder: string,
  kind: "garment" | "color"
): Promise<{ url: string; storagePath: string; aspect: number }> {
  if (!DESIGN_FILE_TYPES.includes(file.type)) throw new Error("Use a PNG, JPG or WebP image.");
  if (file.size > MAX_FILE_BYTES) throw new Error("That file is over 20 MB.");

  const { blob, extension, contentType } = await prepareDesignFile(file, 2000);
  const img = await loadImage(blob);

  const check = inspectPhoto(img);
  if (check && check.clearEdgeRatio < 0.6) {
    throw new Error(
      "This photo's background isn't transparent — the checkerboard (or white) is part of the image. Remove the background with Photoroom's free background remover (photoroom.com/tools/background-remover) and upload the PNG it gives you."
    );
  }
  if (check && kind === "garment" && check.lightness < 0.55) {
    throw new Error(
      "The garment in this photo is too dark for the studio to colour. Use a photo of a white or light-grey garment — a real photo of a dark colour can be added under Colours."
    );
  }

  // Not crypto.randomUUID(): it's undefined on plain-http LAN addresses used for phone testing.
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const storagePath = `${folder}/${key}.${extension}`;

  const supabase = createClient();
  const { error } = await supabase.storage.from("product-images").upload(storagePath, blob, { contentType, upsert: false });
  if (error) throw new Error("Upload failed. Please try again.");

  const { data } = supabase.storage.from("product-images").getPublicUrl(storagePath);
  return { url: data.publicUrl, storagePath, aspect: img.naturalWidth / img.naturalHeight };
}
