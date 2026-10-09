#!/usr/bin/env node
// Moves uploaded files from Supabase Storage to Cloudflare R2 and points the database at them.
//
//   1. Copies every file in the product-images and customer-designs buckets to R2 as
//      "<bucket>/<path>" (files already there with the same size are skipped, so re-runs are safe).
//   2. In every table, replaces "<source project>/storage/v1/object/public/" links in text and
//      JSON columns with "<FILES_URL>/".
//   3. Checks no old link is left and every new link's file exists in R2.
//
// Settings come from environment variables:
//   SOURCE_SUPABASE_URL, SOURCE_SERVICE_ROLE_KEY   the project the files are in now
//   TARGET_SUPABASE_URL, TARGET_SERVICE_ROLE_KEY   the database to update (defaults to the source)
//   R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, FILES_URL
//
// Usage: node scripts/move-files-to-r2.mjs [--dry-run]   (--dry-run only reports)

import { AwsClient } from "aws4fetch";

const DRY_RUN = process.argv.includes("--dry-run");
const BUCKETS = ["product-images", "customer-designs"];
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const CONCURRENCY = 6;
const PAGE = 1000;

function setting(name, fallback) {
  const value = (process.env[name] ?? fallback ?? "").trim().replace(/\/+$/, "");
  if (!value) throw new Error(`Missing setting ${name}`);
  return value;
}

const source = { url: setting("SOURCE_SUPABASE_URL"), key: setting("SOURCE_SERVICE_ROLE_KEY") };
const target = {
  url: setting("TARGET_SUPABASE_URL", source.url),
  key: setting("TARGET_SERVICE_ROLE_KEY", process.env.TARGET_SUPABASE_URL ? undefined : source.key),
};
const r2 = {
  endpoint: setting("R2_ENDPOINT"),
  bucket: setting("R2_BUCKET"),
  client: new AwsClient({
    accessKeyId: setting("R2_ACCESS_KEY_ID"),
    secretAccessKey: setting("R2_SECRET_ACCESS_KEY"),
    service: "s3",
    region: "auto",
  }),
};
const FILES_URL = setting("FILES_URL");
const OLD_PREFIX = `${source.url}/storage/v1/object/public/`;
const NEW_PREFIX = `${FILES_URL}/`;

const auth = (project) => ({ apikey: project.key, Authorization: `Bearer ${project.key}` });
const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");
const r2Url = (key) => `${r2.endpoint}/${r2.bucket}/${encodePath(key)}`;

async function withRetry(what, fn) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= 3) throw new Error(`${what}: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function pool(items, worker) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) await worker(item);
    })
  );
}

// --- 1. files -------------------------------------------------------------------------------

async function listFiles(bucket, prefix = "") {
  const files = [];
  for (let offset = 0; ; offset += PAGE) {
    const response = await fetch(`${source.url}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: { ...auth(source), "content-type": "application/json" },
      body: JSON.stringify({ prefix, limit: PAGE, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (!response.ok) throw new Error(`listing ${bucket}/${prefix}: ${response.status} ${await response.text()}`);
    const items = await response.json();
    for (const item of items) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) files.push(...(await listFiles(bucket, path)));
      else files.push({ bucket, path, size: item.metadata?.size ?? null, type: item.metadata?.mimetype ?? null });
    }
    if (items.length < PAGE) return files;
  }
}

async function r2Size(key) {
  const response = await r2.client.fetch(r2Url(key), { method: "HEAD" });
  return response.ok ? Number(response.headers.get("content-length")) : null;
}

async function copyFiles() {
  const existing = await fetch(`${source.url}/storage/v1/bucket`, { headers: auth(source) }).then((r) => r.json());
  const names = new Set(Array.isArray(existing) ? existing.map((b) => b.name) : []);
  const files = [];
  for (const bucket of BUCKETS) if (names.has(bucket)) files.push(...(await listFiles(bucket)));

  const stats = { files: files.length, bytes: 0, copied: 0, alreadyThere: 0, failed: [] };
  await pool(files, async (file) => {
    const key = `${file.bucket}/${file.path}`;
    try {
      const have = await r2Size(key);
      if (have !== null && (file.size === null || have === file.size)) {
        stats.alreadyThere++;
        stats.bytes += have;
        return;
      }
      if (DRY_RUN) return;
      await withRetry(key, async () => {
        const download = await fetch(`${source.url}/storage/v1/object/${file.bucket}/${encodePath(file.path)}`, { headers: auth(source) });
        if (!download.ok) throw new Error(`download ${download.status}`);
        const body = new Uint8Array(await download.arrayBuffer());
        const upload = await r2.client.fetch(r2Url(key), {
          method: "PUT",
          body,
          headers: {
            "content-type": file.type ?? download.headers.get("content-type") ?? "application/octet-stream",
            "cache-control": CACHE_CONTROL,
          },
        });
        if (!upload.ok) throw new Error(`upload ${upload.status} ${await upload.text()}`);
        stats.bytes += body.length;
      });
      stats.copied++;
    } catch (error) {
      stats.failed.push(`${key}: ${error.message}`);
    }
  });
  return stats;
}

// --- 2. links in the database ---------------------------------------------------------------

async function tablesWithText() {
  const response = await fetch(`${target.url}/rest/v1/`, { headers: { ...auth(target), Accept: "application/openapi+json" } });
  if (!response.ok) throw new Error(`reading the table list: ${response.status}`);
  const spec = await response.json();
  const tables = [];
  for (const [name, definition] of Object.entries(spec.definitions ?? {})) {
    const props = Object.entries(definition.properties ?? {});
    const keys = props.filter(([, p]) => (p.description ?? "").includes("<pk/>")).map(([c]) => c);
    const columns = props.filter(([, p]) => ["text", "jsonb", "json", "character varying"].includes(p.format)).map(([c]) => c);
    if (keys.length > 0 && columns.length > 0) tables.push({ name, keys, columns });
  }
  return tables;
}

async function* rowsOf(table) {
  const select = [...new Set([...table.keys, ...table.columns])].join(",");
  const order = table.keys.map((k) => `${k}.asc`).join(",");
  for (let offset = 0; ; offset += PAGE) {
    const response = await fetch(
      `${target.url}/rest/v1/${table.name}?select=${select}&order=${order}&limit=${PAGE}&offset=${offset}`,
      { headers: auth(target) }
    );
    if (!response.ok) throw new Error(`reading ${table.name}: ${response.status} ${await response.text()}`);
    const rows = await response.json();
    yield* rows;
    if (rows.length < PAGE) return;
  }
}

function replaceLinks(value) {
  if (typeof value === "string") return value.split(OLD_PREFIX).join(NEW_PREFIX);
  if (Array.isArray(value)) return value.map(replaceLinks);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceLinks(v)]));
  return value;
}

const mentions = (value, text) => value !== null && value !== undefined && JSON.stringify(value).includes(text);

async function rewriteLinks(tables) {
  const changed = {};
  const failed = [];
  for (const table of tables) {
    for await (const row of rowsOf(table)) {
      const patch = {};
      for (const column of table.columns) if (mentions(row[column], OLD_PREFIX)) patch[column] = replaceLinks(row[column]);
      if (Object.keys(patch).length === 0) continue;
      for (const column of Object.keys(patch)) changed[`${table.name}.${column}`] = (changed[`${table.name}.${column}`] ?? 0) + 1;
      if (DRY_RUN) continue;

      const where = table.keys.map((k) => `${k}=eq.${encodeURIComponent(row[k])}`).join("&");
      const response = await fetch(`${target.url}/rest/v1/${table.name}?${where}`, {
        method: "PATCH",
        headers: { ...auth(target), "content-type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) failed.push(`${table.name} ${where}: ${response.status} ${await response.text()}`);
    }
  }
  return { changed, failed };
}

// --- 3. checks ------------------------------------------------------------------------------

function collectLinks(value, into) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/https?:\/\/[^\s"'<>)]+/g)) into.add(match[0]);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectLinks(v, into);
  }
}

async function verify(tables) {
  let oldLinksLeft = 0;
  const links = new Set();
  for (const table of tables) {
    for await (const row of rowsOf(table)) {
      for (const column of table.columns) {
        if (mentions(row[column], "/storage/v1/object/public/")) oldLinksLeft++;
        collectLinks(row[column], links);
      }
    }
  }
  const ours = [...links].filter((link) => link.startsWith(NEW_PREFIX));
  const missing = [];
  await pool(ours, async (link) => {
    const key = decodeURIComponent(link.slice(NEW_PREFIX.length).split("?")[0]);
    if ((await r2Size(key)) === null) missing.push(link);
  });
  return { oldLinksLeft, links: ours.length, missing };
}

// --------------------------------------------------------------------------------------------

console.log(`${DRY_RUN ? "DRY RUN — nothing will be changed\n" : ""}files:  ${source.url} → R2 bucket ${r2.bucket}`);
console.log(`links:  ${OLD_PREFIX} → ${NEW_PREFIX}   (in ${target.url})\n`);

const files = await copyFiles();
console.log(
  `1. files: ${files.files} found, ${files.copied} copied, ${files.alreadyThere} already in R2, ` +
    `${(files.bytes / 1048576).toFixed(1)} MB, ${files.failed.length} failed`
);
for (const failure of files.failed) console.log(`   FAILED ${failure}`);
if (files.failed.length > 0) {
  console.log("\nStopped before changing any links, so nothing points at a missing file. Run it again.");
  process.exit(1);
}

const tables = await tablesWithText();
const links = await rewriteLinks(tables);
const total = Object.values(links.changed).reduce((n, c) => n + c, 0);
console.log(`2. links: ${total} values ${DRY_RUN ? "to update" : "updated"} in ${tables.length} tables`);
for (const [column, count] of Object.entries(links.changed)) console.log(`   ${column}: ${count}`);
for (const failure of links.failed) console.log(`   FAILED ${failure}`);

if (!DRY_RUN) {
  const check = await verify(tables);
  console.log(`3. check: ${check.oldLinksLeft} old Supabase links left, ${check.links} R2 links, ${check.missing.length} missing in R2`);
  for (const link of check.missing) console.log(`   MISSING ${link}`);
  const ok = files.failed.length === 0 && links.failed.length === 0 && check.oldLinksLeft === 0 && check.missing.length === 0;
  console.log(ok ? "\nALL GOOD" : "\nPROBLEMS FOUND — see above");
  process.exitCode = ok ? 0 : 1;
}
