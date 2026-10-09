import { isStoredFileUrl } from "@/lib/storage/files";
import { requireAdmin } from "@/lib/supabase/require-admin";

/**
 * Admin: sends a stored artwork file as a download with a readable name. Files on R2 are on
 * another domain, so a plain `download` link would just open them.
 */
export async function GET(request: Request) {
  await requireAdmin();

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url") ?? "";
  const name = (searchParams.get("name") ?? "").replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 100) || "artwork";
  if (!isStoredFileUrl(url) || url.includes("..")) return new Response("Not found", { status: 404 });

  const file = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!file?.ok || !file.body) return new Response("Not found", { status: 404 });

  const length = file.headers.get("content-length");
  return new Response(file.body, {
    headers: {
      "content-type": file.headers.get("content-type") ?? "application/octet-stream",
      ...(length ? { "content-length": length } : {}),
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "private, no-store",
    },
  });
}
