/** "CDC-1042", "back", "Ok Kanmani!" → "CDC-1042-back-ok-kanmani.png" (extension from the file's URL). */
export function artworkFileName(url: string, parts: (string | null | undefined)[]) {
  const extension = url.split("?")[0].match(/\.(png|jpe?g|webp)$/i)?.[1].toLowerCase() ?? "png";
  const base = parts
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "artwork"}.${extension}`;
}

/**
 * A link that saves the file instead of opening it. Supabase Storage sends a public file as a
 * download when the URL asks for one (`?download=<name>`); a plain `download` attribute can't,
 * because the file is on another domain. Null for files that aren't in Supabase Storage.
 */
export function storageDownloadUrl(url: string, fileName: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.includes("/storage/v1/object/public/")) return null;
    parsed.searchParams.set("download", fileName);
    return parsed.toString();
  } catch {
    return null;
  }
}
