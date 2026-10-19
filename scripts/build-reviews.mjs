// Prepares the home page's review gallery from the screenshots and photos in review-screenshots/
// (that folder is kept out of git and off the website: the originals show customers' names and
// phone numbers). Runs by itself before `npm run dev` and `npm run build`, or on its own:
//
//   node scripts/build-reviews.mjs
//
//  - Order: by the date and time in WhatsApp's file names ("WhatsApp Image 2026-10-19 at 2.11.04 PM"),
//    so newer ones go at the end; files named any other way follow, A→Z.
//  - Exact duplicates are skipped.
//  - Privacy: on chat screenshots, the bar at the top (the customer's name, photo and number) and
//    WhatsApp quoted replies (which show the sender's number and name) are blurred.
//  - Writes compressed copies to public/images/reviews/ and the list to src/lib/reviews/reviews.json;
//    commit both. Nothing changes if the screenshots haven't (and on a server without the folder).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE = join(ROOT, "review-screenshots");
const OUTPUT = join(ROOT, "public/images/reviews");
const MANIFEST = join(ROOT, "src/lib/reviews/reviews.json");
const PUBLIC_PATH = "/images/reviews";

/** Blur the chat's top bar and quoted replies on screenshots (set false only with customers' consent). */
const HIDE_CUSTOMER_DETAILS = true;
/**
 * More to blur, for things only a person can spot (a name or handle inside a message, an address on
 * a parcel): the first 12 characters of the file's SHA-1 (shown when the script runs with --list),
 * then boxes as fractions of the picture: [left, top, right, bottom].
 */
const ALSO_HIDE = {
  dc3340c583c7: [[0.1, 0.825, 0.92, 0.9], [0.6, 0.165, 1, 0.286]], // Instagram handle; India Post SMS
  "9f0b2b5a584a": [[0.1, 0, 0.53, 0.445]], // address on the parcel
  e3d1ff7bd352: [[0.1, 0.852, 0.72, 0.902]], // customer's name in a message
  e444af87ea2d: [[0.04, 0.43, 0.7, 0.65]], // address on the parcel
};
/** The longest side of the saved copies, and their WebP quality. */
const MAX_SIDE = 1600;
const QUALITY = 82;
/** Bump to redo every image after changing how they're prepared. */
const RECIPE = 2;

const IMAGE = /\.(jpe?g|png|webp|avif|gif|tiff?)$/i;
const WHATSAPP = /(\d{4}-\d{2}-\d{2}) at (\d{1,2})\.(\d{2})\.(\d{2})\s*(AM|PM)(?:\s*\((\d+)\))?/i;

/** Sort key: WhatsApp's date and time when the name has them, otherwise the name (after those). */
function orderKey(name) {
  const m = name.match(WHATSAPP);
  if (!m) return `~${name.toLowerCase()}`;
  let hour = Number(m[2]) % 12;
  if (m[5].toUpperCase() === "PM") hour += 12;
  return `${m[1]}T${String(hour).padStart(2, "0")}:${m[3]}:${m[4]}#${String(Number(m[6] ?? 0)).padStart(3, "0")}`;
}

function sha1(data) {
  return createHash("sha1").update(data).digest("hex");
}

const luma = (d, o) => 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];

/**
 * A phone screenshot: tall, with a status bar along the top (an even background with the time on
 * the left and the battery on the right).
 */
function isChatScreenshot(data, w, h) {
  if (h < w * 1.55) return false;
  const band = Math.round(h * 0.04);
  const values = [];
  for (let y = 0; y < band; y += 2) for (let x = 0; x < w; x += 2) values.push(luma(data, (y * w + x) * 3));
  values.sort((a, b) => a - b);
  const median = values[values.length >> 1];
  const even = values.filter((v) => Math.abs(v - median) < 18).length / values.length;
  let left = 0;
  let right = 0;
  for (let y = 0; y < band; y++) {
    for (let x = 0; x < w; x++) {
      if (Math.abs(luma(data, (y * w + x) * 3) - median) < 70) continue;
      if (x < w * 0.35) left++;
      else if (x > w * 0.7) right++;
    }
  }
  return even > 0.8 && left > 20 && right > 20;
}

/**
 * Instagram's pinned-message strip right under the top bar (it shows the pinned message's first
 * line — often the customer's name): an even band, lighter than the chat, down the left edge.
 * Returns where it ends, or `from` if there's none.
 */
function pinnedStripEnd(data, w, h, from) {
  const edge = (y) => {
    let sum = 0;
    for (let x = Math.round(w * 0.008); x <= Math.round(w * 0.02); x++) sum += luma(data, (y * w + x) * 3);
    return sum / (Math.round(w * 0.02) - Math.round(w * 0.008) + 1);
  };
  const chat = edge(Math.round(h * 0.2));
  let start = -1;
  for (let y = from; y < Math.round(h * 0.13); y++) {
    if (Math.abs(edge(y) - chat) >= 8) {
      start = y;
      break;
    }
  }
  if (start < 0) return from;
  let end = start;
  while (end < Math.round(h * 0.24) && Math.abs(edge(end) - chat) >= 8) end++;
  return end - start >= h * 0.025 ? end + Math.round(h * 0.004) : from;
}

/**
 * WhatsApp quoted replies: a thin coloured bar down the left of the quote, next to the sender's
 * number and name. Returns the boxes to blur.
 */
function quotedReplies(data, w, h) {
  const coloured = (x, y) => {
    const o = (y * w + x) * 3;
    const max = Math.max(data[o], data[o + 1], data[o + 2]);
    const min = Math.min(data[o], data[o + 1], data[o + 2]);
    return max > 110 && max - min > 80;
  };
  // thin coloured runs (2–9px wide) with plain pixels either side
  const thin = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      if (!coloured(x, y)) {
        x++;
        continue;
      }
      const start = x;
      while (x < w && coloured(x, y)) x++;
      const width = x - start;
      if (width >= 2 && width <= 9 && start >= 3 && x + 3 < w && !coloured(start - 3, y) && !coloured(x + 2, y)) {
        for (let i = start; i < x; i++) thin[y * w + i] = 1;
      }
    }
  }
  // …stacked into a bar 3–15% of the screen tall
  const boxes = [];
  const minRun = Math.round(h * 0.03);
  const maxRun = Math.round(h * 0.15);
  for (let x = 0; x < w * 0.7; x++) {
    let y = 0;
    while (y < h) {
      if (!thin[y * w + x]) {
        y++;
        continue;
      }
      const top = y;
      let gap = 0;
      while (y < h && gap <= 2) {
        gap = thin[y * w + x] ? 0 : gap + 1;
        y++;
      }
      const bottom = y - gap;
      const run = bottom - top;
      if (run >= minRun && run <= maxRun && !boxes.some((b) => Math.abs(b.x - x) < 12 && b.top < bottom && b.bottom > top)) {
        boxes.push({ x, top, bottom });
      }
    }
  }
  return boxes.map((b) => ({
    left: Math.max(0, b.x - 6),
    top: Math.max(0, b.top - 4),
    width: Math.min(w, Math.round(b.x + w * 0.8)) - Math.max(0, b.x - 6),
    height: Math.min(h, b.bottom + 4) - Math.max(0, b.top - 4),
  }));
}

/** Smears a box beyond reading: shrunk to a few pixels, then stretched back smoothly. */
async function smear(sharp, image, box) {
  const small = await image
    .clone()
    .extract(box)
    .resize(Math.max(1, Math.round(box.width / 28)), Math.max(1, Math.round(box.height / 28)), { kernel: "cubic" })
    .toBuffer();
  return sharp(small).resize(box.width, box.height, { kernel: "cubic" }).blur(4).toBuffer();
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.log("reviews: no review-screenshots folder here — keeping the prepared gallery as it is");
    return;
  }
  const names = readdirSync(SOURCE).filter((n) => IMAGE.test(n));
  if (names.length === 0) {
    console.log("reviews: review-screenshots is empty — keeping the prepared gallery as it is");
    return;
  }
  const files = names
    .map((name) => {
      const bytes = readFileSync(join(SOURCE, name));
      return { name, bytes, hash: sha1(bytes) };
    })
    .sort((a, b) => (orderKey(a.name) < orderKey(b.name) ? -1 : orderKey(a.name) > orderKey(b.name) ? 1 : 0));

  const seen = new Set();
  const unique = files.filter((f) => !seen.has(f.hash) && seen.add(f.hash));
  if (process.argv.includes("--list")) {
    unique.forEach((f, i) => console.log(`${String(i + 1).padStart(3)}  ${f.hash.slice(0, 12)}  ${f.name}`));
    return;
  }
  const key = sha1(`${RECIPE}|${HIDE_CUSTOMER_DETAILS}|${MAX_SIDE}|${QUALITY}|${unique.map((f) => f.hash).join(",")}`);

  const previous = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : null;
  if (previous?.key === key && previous.reviews.every((r) => existsSync(join(ROOT, "public", r.src)))) {
    console.log(`reviews: ${unique.length} up to date`);
    return;
  }

  const { default: sharp } = await import("sharp");
  rmSync(OUTPUT, { recursive: true, force: true });
  mkdirSync(OUTPUT, { recursive: true });
  const reviews = [];
  let hidden = 0;
  for (const file of unique) {
    const image = sharp(file.bytes).rotate();
    const { data, info } = await image.clone().removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    const patches = [];
    if (HIDE_CUSTOMER_DETAILS && isChatScreenshot(data, w, h)) {
      const top = Math.round(h * 0.042);
      const bottom = pinnedStripEnd(data, w, h, Math.round(h * 0.106));
      patches.push({ left: 0, top, width: w, height: bottom - top });
      patches.push(...quotedReplies(data, w, h));
    }
    for (const [x0, y0, x1, y1] of HIDE_CUSTOMER_DETAILS ? (ALSO_HIDE[file.hash.slice(0, 12)] ?? []) : []) {
      const left = Math.round(x0 * w);
      const top = Math.round(y0 * h);
      patches.push({ left, top, width: Math.round(x1 * w) - left, height: Math.round(y1 * h) - top });
    }
    if (patches.length) hidden++;
    const composites = [];
    for (const box of patches) composites.push({ input: await smear(sharp, image, box), left: box.left, top: box.top });
    const flat = await image.clone().composite(composites).toBuffer();
    const out = await sharp(flat)
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 5 })
      .toBuffer({ resolveWithObject: true });
    const name = `review-${file.hash.slice(0, 12)}.webp`;
    writeFileSync(join(OUTPUT, name), out.data);
    reviews.push({ src: `${PUBLIC_PATH}/${name}`, width: out.info.width, height: out.info.height });
  }
  mkdirSync(join(ROOT, "src/lib/reviews"), { recursive: true });
  const manifest = {
    // generated by scripts/build-reviews.mjs — don't edit by hand
    key,
    reviews,
  };
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  const skipped = files.length - unique.length;
  console.log(
    `reviews: ${reviews.length} prepared${skipped ? `, ${skipped} duplicate${skipped > 1 ? "s" : ""} skipped` : ""}, customer details hidden on ${hidden}`
  );
}

// never hold up `npm run dev` / `npm run build`: on a problem, say so and keep the last gallery
main().catch((error) => {
  console.warn(`reviews: couldn't prepare the review images (${error.message}) — keeping the last prepared gallery`);
});
