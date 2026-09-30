/**
 * Structured data for search engines (schema.org JSON-LD). `<` is escaped so text from the
 * database can't close the script tag (see Next's JSON-LD guide).
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
