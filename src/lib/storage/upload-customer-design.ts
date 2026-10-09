import { saveCustomerDesign } from "@/app/(site)/customize/actions";
import { uploadDesignFile } from "@/lib/storage/upload";
import { DESIGN_FILE_TYPES, designNameFromFile } from "@/lib/utils/image";
import type { StudioDesign } from "@/types";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
// Plenty for an A3 print at 300 DPI (3508 × 4961 px); bigger files are scaled down to this.
const MAX_DIMENSION = 5000;

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
      reject(new Error("We couldn't read that image. Try a PNG or JPG."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Keeps the file as it is (print quality first), only scaling down images over 5000 px. */
async function prepare(file: File, img: HTMLImageElement) {
  const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : "png";
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
  if (scale === 1) {
    return { blob: file as Blob, extension, contentType: file.type, width: img.naturalWidth, height: img.naturalHeight };
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("That image is too big. Please use one under 5000 px.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // JPEGs stay JPEG; anything that may be transparent becomes PNG so the transparency is kept.
  const jpeg = file.type === "image/jpeg";
  const blob = await canvasToBlob(canvas, jpeg ? "image/jpeg" : "image/png", jpeg ? 0.95 : undefined);
  if (!blob) throw new Error("That image is too big. Please use one under 5000 px.");
  return {
    blob,
    extension: jpeg ? "jpg" : "png",
    contentType: jpeg ? "image/jpeg" : "image/png",
    width: canvas.width,
    height: canvas.height,
  };
}

/** Uploads a customer's own artwork into their folder and records it for printing. */
export async function uploadCustomerDesign(file: File): Promise<StudioDesign> {
  if (!DESIGN_FILE_TYPES.includes(file.type)) throw new Error("Use a PNG, JPG or WebP image.");
  if (file.size > MAX_FILE_BYTES) throw new Error("That file is over 25 MB. Please use a smaller one.");

  const img = await loadImage(file);
  const prepared = await prepare(file, img);
  if (prepared.blob.size > MAX_FILE_BYTES) throw new Error("That file is over 25 MB. Please use a smaller one.");

  const { storagePath } = await uploadDesignFile(prepared.blob, prepared.contentType);

  const result = await saveCustomerDesign({
    storagePath,
    name: designNameFromFile(file.name),
    width: prepared.width,
    height: prepared.height,
  });
  if (result.error || !result.design) throw new Error(result.error ?? "Upload failed. Please try again.");
  return result.design;
}
