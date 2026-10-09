import "server-only";
import { randomBytes } from "node:crypto";
import { AwsClient, AwsV4Signer } from "aws4fetch";
import { UPLOAD_CONTENT_TYPES, fileUrl, type StorageBucket, type UploadTicket } from "@/lib/storage/files";

const UPLOAD_LINK_SECONDS = 10 * 60;
// Every upload gets a new name, so browsers and Cloudflare may keep a file for good.
const FILE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const DELETE_CONCURRENCY = 8;

function r2() {
  const endpoint = process.env.R2_ENDPOINT?.trim().replace(/\/+$/, "");
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !process.env.NEXT_PUBLIC_FILES_URL) return null;
  return { endpoint, bucket, credentials: { accessKeyId, secretAccessKey, service: "s3", region: "auto" } };
}

type R2 = NonNullable<ReturnType<typeof r2>>;

function objectUrl(config: R2, bucket: StorageBucket, path: string) {
  const key = `${bucket}/${path}`.split("/").map(encodeURIComponent).join("/");
  return `${config.endpoint}/${config.bucket}/${key}`;
}

/** "1760000000000-9f2c4e1a" — a fresh, unguessable file name (without extension). */
export function newFileKey() {
  return `${Date.now()}-${randomBytes(4).toString("hex")}`;
}

/**
 * A short-lived link for the browser to PUT one file straight to R2. The type, exact size and
 * cache header are part of the signature, so R2 refuses anything else sent to it.
 * Null when storage isn't configured or the type isn't an allowed image.
 */
export async function createUploadTicket(
  bucket: StorageBucket,
  folder: string,
  contentType: string,
  size: number
): Promise<UploadTicket | null> {
  const config = r2();
  const extension = UPLOAD_CONTENT_TYPES[contentType];
  if (!config || !extension || !Number.isInteger(size) || size <= 0) return null;

  const storagePath = `${folder}/${newFileKey()}.${extension}`;
  const url = new URL(objectUrl(config, bucket, storagePath));
  url.searchParams.set("X-Amz-Expires", String(UPLOAD_LINK_SECONDS));
  const headers = { "content-type": contentType, "cache-control": FILE_CACHE_CONTROL };
  const signed = await new AwsV4Signer({
    ...config.credentials,
    method: "PUT",
    url: url.toString(),
    headers: { ...headers, "content-length": String(size) },
    signQuery: true,
    allHeaders: true,
  }).sign();

  return { uploadUrl: signed.url.toString(), headers, url: fileUrl(bucket, storagePath), storagePath };
}

/** The stored file's size in bytes, or null when it isn't there (or storage isn't configured). */
export async function storedFileSize(bucket: StorageBucket, path: string): Promise<number | null> {
  const config = r2();
  if (!config) return null;
  const response = await new AwsClient(config.credentials).fetch(objectUrl(config, bucket, path), { method: "HEAD" });
  if (!response.ok) return null;
  return Number(response.headers.get("content-length") ?? 0);
}

/** Deletes files; ones already gone are fine. Failures are logged, never thrown. */
export async function deleteStoredFiles(bucket: StorageBucket, paths: (string | null | undefined)[]) {
  const config = r2();
  const queue = [...new Set(paths.filter((p): p is string => !!p))];
  if (!config || queue.length === 0) return;

  const ready: R2 = config;
  const client = new AwsClient(ready.credentials);
  async function worker() {
    for (let path = queue.shift(); path; path = queue.shift()) {
      try {
        const response = await client.fetch(objectUrl(ready, bucket, path), { method: "DELETE" });
        if (!response.ok && response.status !== 404) console.error(`R2 delete ${bucket}/${path} failed:`, response.status);
      } catch (error) {
        console.error(`R2 delete ${bucket}/${path} failed:`, error);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(DELETE_CONCURRENCY, queue.length) }, worker));
}
