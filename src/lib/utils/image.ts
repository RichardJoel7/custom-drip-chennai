export const DESIGN_FILE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const DESIGN_MAX_UNTOUCHED_BYTES = 1.5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
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

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Prepares design artwork for the Design Hub. Unlike product photos, designs keep their
 * transparency (PNG/WebP, never JPEG unless they came in as JPEG). Files that are already
 * small are uploaded untouched so artwork is never recompressed without need.
 */
export async function prepareDesignFile(
  file: File,
  maxDimension = 2000
): Promise<{ blob: Blob; extension: string; contentType: string }> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));

  if (scale === 1 && file.size <= DESIGN_MAX_UNTOUCHED_BYTES) {
    return { blob: file, extension: EXTENSIONS[file.type] ?? "png", contentType: file.type };
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return { blob: file, extension: EXTENSIONS[file.type] ?? "png", contentType: file.type };
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  if (file.type === "image/jpeg") {
    const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.92);
    if (jpeg) return { blob: jpeg, extension: "jpg", contentType: "image/jpeg" };
  }

  // Older Safari can't encode WebP and silently returns PNG instead — both keep transparency.
  const webp = await canvasToBlob(canvas, "image/webp", 0.92);
  if (webp && webp.type === "image/webp") return { blob: webp, extension: "webp", contentType: "image/webp" };

  const png = await canvasToBlob(canvas, "image/png", 1);
  if (png) return { blob: png, extension: "png", contentType: "image/png" };

  return { blob: file, extension: EXTENSIONS[file.type] ?? "png", contentType: file.type };
}

/** "messi_goat-final.png" → "Messi Goat Final" */
export function designNameFromFile(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return (base || "Untitled design")
    .split(" ")
    .map((word) => (word === word.toLowerCase() ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * Resizes and re-encodes an image file in the browser before upload, so a phone's
 * multi-megabyte photo becomes a small, web-ready JPEG without needing a server-side
 * image-processing service.
 */
export function compressImageFile(
  file: File,
  { maxDimension = 1600, quality = 0.82 }: { maxDimension?: number; quality?: number } = {}
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          resolve(blob ?? file);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image file."));
    };

    img.src = objectUrl;
  });
}
