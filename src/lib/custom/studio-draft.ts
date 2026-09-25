import type { DesignSource, PrintSide, PrintTransform } from "@/types";

/**
 * The studio's choices, carried in the URL (?draft=) through sign-in, so a customer who signs
 * in to upload their own design comes back to exactly what they'd built.
 */
export interface StudioDraft {
  garmentId: string;
  colorId: string;
  sizeId: string;
  gsmId: string | null;
  quantity: number;
  prints: {
    side: PrintSide;
    printOptionId: string;
    designId: string | null;
    designSource: DesignSource | null;
    transform: PrintTransform | null;
  }[];
  /** The print whose design was being chosen, so the upload tab opens again. */
  choosingFor: string | null;
}

const toBase64Url = (text: string) => btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromBase64Url = (text: string) => atob(text.replace(/-/g, "+").replace(/_/g, "/"));

// Everything in a draft is ids, sides and numbers, so it's plain ASCII for btoa/atob.
export function encodeStudioDraft(draft: StudioDraft) {
  return toBase64Url(JSON.stringify(draft));
}

const isString = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length < 80;
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function decodeStudioDraft(encoded: string): StudioDraft | null {
  try {
    const raw = JSON.parse(fromBase64Url(encoded)) as Partial<StudioDraft>;
    if (!isString(raw.garmentId) || !isString(raw.colorId) || !isString(raw.sizeId) || !Array.isArray(raw.prints)) {
      return null;
    }
    const prints = raw.prints.slice(0, 8).flatMap((p) => {
      if (!p || (p.side !== "front" && p.side !== "back") || !isString(p.printOptionId)) return [];
      const t = p.transform;
      return [
        {
          side: p.side,
          printOptionId: p.printOptionId,
          designId: isString(p.designId) ? p.designId : null,
          designSource: p.designSource === "upload" || p.designSource === "hub" ? p.designSource : null,
          transform: t && isNumber(t.scale) && isNumber(t.dx) && isNumber(t.dy) ? { scale: t.scale, dx: t.dx, dy: t.dy } : null,
        },
      ];
    });
    return {
      garmentId: raw.garmentId,
      colorId: raw.colorId,
      sizeId: raw.sizeId,
      gsmId: isString(raw.gsmId) ? raw.gsmId : null,
      quantity: isNumber(raw.quantity) ? raw.quantity : 1,
      prints,
      choosingFor: isString(raw.choosingFor) ? raw.choosingFor : null,
    };
  } catch {
    return null;
  }
}
