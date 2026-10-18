// Prepares the home page's 360° tee (the "Why Custom Drip Chennai" scroll story) from the
// rendered frames. Run it again whenever the frames change:
//
//   node scripts/build-tee-frames.mjs
//
// Reads every image in SOURCE (sorted by name) and paints out the generator's ✦ mark in the
// bottom-right corner (it sits on plain studio background). Then:
//  - backdrop.png: a small, smooth copy of the studio background (averaged over every frame),
//    carried on past the frame's edges so the light falls off naturally instead of stopping at
//    a line. The page stretches it to fill the screen behind the tee.
//  - frames: each one's edges are evened out to that backdrop (grain faded, brightness matched),
//    so frame and backdrop meet with no seam, then saved as compressed WebP for desktop and phones.
//  - src/lib/tee-360/frames.json: frame count and size, where the tee sits, where the backdrop
//    goes, and a version for cache-busting.
// The originals are not touched.
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE = join(ROOT, "public/images/3DAnimatedFrames");
const OUTPUT = join(ROOT, "public/images/tee-360");
const MANIFEST = join(ROOT, "src/lib/tee-360/frames.json");

/** Widths to write: phones get the smaller set. */
const WIDTHS = [960, 1280];
const QUALITY = { 960: 76, 1280: 80 };

/**
 * The ✦ mark, as fractions of the frame (measured at 1280×720: x 1136–1183, y 576–623), with a
 * margin. Set to null if a new render has no mark.
 */
const MARK = { x0: 1126 / 1280, y0: 566 / 720, x1: 1194 / 1280, y1: 634 / 720 };

/** Pixels darker than this are the tee (the studio background is light grey). */
const TEE_LUMA = 110;

/** The backdrop has one pixel per this many frame pixels… */
const CELL = 16;
/** …and reaches this far past the frame on each side (in frame widths / heights). */
const REACH = { x: 0.75, y: 1 };
/** How quickly the studio's light fall-off levels out past the frame's edges, in frame widths. */
const LEVEL_OUT = 0.1;

/**
 * How far in from each edge the frame's grain fades into the smooth backdrop, as fractions of its
 * size. Must stay clear of the tee (it spans about 25–74% across and 7.5–95.6% down).
 */
const FEATHER = { sides: 0.1, top: 0.05, bottom: 0.03 };

const ramp = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const files = readdirSync(SOURCE)
  .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
if (files.length === 0) throw new Error(`No frames found in ${SOURCE}`);

// a fixed grain pattern, so the painted patch matches the background's texture without flicker
let seed = 7;
const grain = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return ((seed / 0x7fffffff) * 2 - 1) * 1.6;
};
let grainTable = null;

/** Fills the mark's box from the pixels around it (blending the four edges), plus fine grain. */
function paintOutMark(data, width, height) {
  if (!MARK) return;
  const x0 = Math.round(MARK.x0 * width), x1 = Math.round(MARK.x1 * width);
  const y0 = Math.round(MARK.y0 * height), y1 = Math.round(MARK.y1 * height);
  const at = (x, y, c) => data[(y * width + x) * 3 + c];
  const edge = (xs, ys, c) => xs.reduce((s, x, i) => s + at(x, ys[i], c), 0) / xs.length;
  if (!grainTable) grainTable = Array.from({ length: (x1 - x0 + 1) * (y1 - y0 + 1) }, grain);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / (x1 - x0);
      const v = (y - y0) / (y1 - y0);
      const g = grainTable[(y - y0) * (x1 - x0 + 1) + (x - x0)];
      for (let c = 0; c < 3; c++) {
        const left = edge([x0 - 1, x0 - 2, x0 - 3], [y, y, y], c);
        const right = edge([x1 + 1, x1 + 2, x1 + 3], [y, y, y], c);
        const top = edge([x, x, x], [y0 - 1, y0 - 2, y0 - 3], c);
        const bottom = edge([x, x, x], [y1 + 1, y1 + 2, y1 + 3], c);
        const value = ((left * (1 - u) + right * u) + (top * (1 - v) + bottom * v)) / 2 + g;
        data[(y * width + x) * 3 + c] = Math.max(0, Math.min(255, Math.round(value)));
      }
    }
  }
}

let W = 0, H = 0, cols = 0, rows = 0;
let cellOf = null; // frame pixel → backdrop cell inside the frame
let cellCount = null;

async function readFrame(file) {
  const { data, info } = await sharp(join(SOURCE, file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (!W) {
    W = info.width;
    H = info.height;
    cols = Math.round(W / CELL);
    rows = Math.round(H / CELL);
    cellOf = new Int32Array(W * H);
    cellCount = new Float64Array(cols * rows);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const cell = Math.floor((y * rows) / H) * cols + Math.floor((x * cols) / W);
        cellOf[y * W + x] = cell;
        cellCount[cell]++;
      }
    }
  }
  if (info.width !== W || info.height !== H) throw new Error(`${file} is ${info.width}×${info.height}, not ${W}×${H}`);
  return data;
}

/** The average colour of each backdrop cell inside the frame. */
function cellMeans(data, out) {
  out.fill(0);
  for (let p = 0; p < W * H; p++) {
    const c = cellOf[p] * 3;
    out[c] += data[p * 3];
    out[c + 1] += data[p * 3 + 1];
    out[c + 2] += data[p * 3 + 2];
  }
  for (let i = 0; i < cols * rows; i++) for (let c = 0; c < 3; c++) out[i * 3 + c] /= cellCount[i];
}

const mirror = (i, n) => (i < 0 ? -i : i >= n ? 2 * (n - 1) - i : i);

/**
 * Fills the unknown cells of an RGB grid as smoothly as possible: no kinks where they meet the
 * known ones, and slopes that level out over 1/√alpha cells (a "thin plate under tension").
 */
function fillSmooth(u, known, w, h, alpha, iterations) {
  const cells = [];
  for (let i = 0; i < w * h; i++) if (!known[i]) cells.push(i);
  const nb = new Int32Array(cells.length * 12);
  cells.forEach((i, n) => {
    const x = i % w, y = Math.floor(i / w);
    const at = (dx, dy) => (mirror(y + dy, h) * w + mirror(x + dx, w)) * 3;
    [at(-1, 0), at(1, 0), at(0, -1), at(0, 1), at(-1, -1), at(1, -1), at(-1, 1), at(1, 1), at(-2, 0), at(2, 0), at(0, -2), at(0, 2)].forEach(
      (v, j) => (nb[n * 12 + j] = v)
    );
  });
  const a = 8 + alpha, den = 20 + 4 * alpha;
  for (let it = 0; it < iterations; it++) {
    for (let n = 0; n < cells.length; n++) {
      const o = cells[n] * 3, b = n * 12;
      for (let c = 0; c < 3; c++) {
        const near = u[nb[b] + c] + u[nb[b + 1] + c] + u[nb[b + 2] + c] + u[nb[b + 3] + c];
        const diag = u[nb[b + 4] + c] + u[nb[b + 5] + c] + u[nb[b + 6] + c] + u[nb[b + 7] + c];
        const far = u[nb[b + 8] + c] + u[nb[b + 9] + c] + u[nb[b + 10] + c] + u[nb[b + 11] + c];
        u[o + c] = (a * near - 2 * diag - far) / den;
      }
    }
  }
}

/** Fills the unknown cells of an RGB grid with a plain smooth blend of the known ones around them. */
function fillHarmonic(u, known, w, h, iterations) {
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < w * h; i++) {
      if (known[i]) continue;
      const x = i % w, y = Math.floor(i / w);
      const l = (y * w + mirror(x - 1, w)) * 3, r = (y * w + mirror(x + 1, w)) * 3;
      const t = (mirror(y - 1, h) * w + x) * 3, b = (mirror(y + 1, h) * w + x) * 3;
      for (let c = 0; c < 3; c++) u[i * 3 + c] = (u[l + c] + u[r + c] + u[t + c] + u[b + c]) / 4;
    }
  }
}

/** Samples an RGB grid between its cells (bilinear, like the browser does when it stretches it). */
function sample(grid, w, h, gx, gy, out) {
  const x = Math.max(0, Math.min(w - 1, gx)), y = Math.max(0, Math.min(h - 1, gy));
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
  const fx = x - x0, fy = y - y0;
  for (let c = 0; c < 3; c++) {
    const top = grid[(y0 * w + x0) * 3 + c] * (1 - fx) + grid[(y0 * w + x1) * 3 + c] * fx;
    const bottom = grid[(y1 * w + x0) * 3 + c] * (1 - fx) + grid[(y1 * w + x1) * 3 + c] * fx;
    out[c] = top * (1 - fy) + bottom * fy;
  }
}

const started = Date.now();

// --- pass 1: where the tee goes, and the studio background averaged over every frame -----------
const tee = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
let average = null;
let means = null;
for (const file of files) {
  const data = await readFrame(file);
  average ??= new Float64Array(cols * rows * 3);
  means ??= new Float64Array(cols * rows * 3);
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const o = (y * W + x) * 3;
      if (0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2] < TEE_LUMA) {
        if (x < tee.x0) tee.x0 = x;
        if (x > tee.x1) tee.x1 = x;
        if (y < tee.y0) tee.y0 = y;
        if (y > tee.y1) tee.y1 = y;
      }
    }
  }
  paintOutMark(data, W, H);
  cellMeans(data, means);
  for (let i = 0; i < average.length; i++) average[i] += means[i] / files.length;
}

// background cells: clear of the tee in every frame
const MARGIN = 8;
const clear = new Uint8Array(cols * rows);
for (let cy = 0; cy < rows; cy++) {
  for (let cx = 0; cx < cols; cx++) {
    const x0 = (cx * W) / cols, x1 = ((cx + 1) * W) / cols, y0 = (cy * H) / rows, y1 = ((cy + 1) * H) / rows;
    const hitsTee = x1 > tee.x0 - MARGIN && x0 < tee.x1 + MARGIN && y1 > tee.y0 - MARGIN && y0 < tee.y1 + MARGIN;
    clear[cy * cols + cx] = hitsTee ? 0 : 1;
  }
}

// --- the backdrop: the frame's background in the middle, carried on smoothly around it ----------
const padX = Math.round(REACH.x * cols), padY = Math.round(REACH.y * rows);
const TW = cols + 2 * padX, TH = rows + 2 * padY;
const knownFine = new Uint8Array(TW * TH);
const valueFine = new Float64Array(TW * TH * 3);
for (let cy = 0; cy < rows; cy++) {
  for (let cx = 0; cx < cols; cx++) {
    if (!clear[cy * cols + cx]) continue;
    const t = (cy + padY) * TW + cx + padX;
    knownFine[t] = 1;
    for (let c = 0; c < 3; c++) valueFine[t * 3 + c] = average[(cy * cols + cx) * 3 + c];
  }
}
let backdrop = null;
{
  // coarse to fine, so the slow, wide-reaching part settles quickly
  let prev = null;
  for (const [f, iterations] of [[4, 4000], [2, 2000], [1, 1000]]) {
    const w = Math.ceil(TW / f), h = Math.ceil(TH / f);
    const u = new Float64Array(w * h * 3);
    const k = new Uint8Array(w * h);
    const mean = [0, 0, 0];
    let n = 0;
    for (let i = 0; i < TW * TH; i++) {
      if (!knownFine[i]) continue;
      for (let c = 0; c < 3; c++) mean[c] += valueFine[i * 3 + c];
      n++;
    }
    for (let c = 0; c < 3; c++) mean[c] /= n;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let all = true, count = 0;
        const sum = [0, 0, 0];
        for (let fy = 0; fy < f && all; fy++) {
          for (let fx = 0; fx < f; fx++) {
            const X = x * f + fx, Y = y * f + fy;
            if (X >= TW || Y >= TH) continue;
            const j = Y * TW + X;
            if (!knownFine[j]) { all = false; break; }
            for (let c = 0; c < 3; c++) sum[c] += valueFine[j * 3 + c];
            count++;
          }
        }
        if (all && count) {
          k[i] = 1;
          for (let c = 0; c < 3; c++) u[i * 3 + c] = sum[c] / count;
        } else if (prev) {
          const j = Math.min(prev.h - 1, Math.floor((y * f) / prev.f)) * prev.w + Math.min(prev.w - 1, Math.floor((x * f) / prev.f));
          for (let c = 0; c < 3; c++) u[i * 3 + c] = prev.u[j * 3 + c];
        } else {
          for (let c = 0; c < 3; c++) u[i * 3 + c] = mean[c];
        }
      }
    }
    const alpha = ((f * W) / cols / (LEVEL_OUT * W)) ** 2;
    fillSmooth(u, k, w, h, alpha, iterations);
    prev = { w, h, u, f };
  }
  backdrop = new Uint8Array(TW * TH * 3);
  for (let i = 0; i < backdrop.length; i++) backdrop[i] = Math.max(0, Math.min(255, Math.round(prev.u[i])));
}

// the backdrop at every frame pixel, exactly as the browser will draw it under the frame
const under = new Float32Array(W * H * 3);
{
  const px = [0, 0, 0];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      sample(backdrop, TW, TH, ((x + 0.5) * cols) / W - 0.5 + padX, ((y + 0.5) * rows) / H - 0.5 + padY, px);
      const o = (y * W + x) * 3;
      under[o] = px[0];
      under[o + 1] = px[1];
      under[o + 2] = px[2];
    }
  }
}

// how much of each frame pixel is kept: `match` evens out each frame's brightness to the average
// near the edges (clear of the tee), `feather` fades its grain into the backdrop at the very edge
const room = { left: tee.x0 - MARGIN, right: W - 1 - tee.x1 - MARGIN, top: tee.y0 - MARGIN, bottom: H - 1 - tee.y1 - MARGIN / 2 };
for (const [side, px] of Object.entries(room)) if (px < 8) throw new Error(`The tee comes too close to the frame's ${side} edge (${px}px)`);
const reach = {
  left: Math.min(FEATHER.sides * W, room.left),
  right: Math.min(FEATHER.sides * W, room.right),
  top: Math.min(FEATHER.top * H, room.top),
  bottom: Math.min(FEATHER.bottom * H, room.bottom),
};
const keep = (x, y, r) => ramp(x / r.left) * ramp((W - 1 - x) / r.right) * ramp(y / r.top) * ramp((H - 1 - y) / r.bottom);
const match = new Float32Array(W * H);
const feather = new Float32Array(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    match[y * W + x] = keep(x, y, room);
    feather[y * W + x] = keep(x, y, reach);
  }
}

// --- pass 2: even out each frame's edges and write them ---------------------------------------
rmSync(OUTPUT, { recursive: true, force: true });
for (const w of WIDTHS) mkdirSync(join(OUTPUT, String(w)), { recursive: true });
const backdropPng = await sharp(Buffer.from(backdrop), { raw: { width: TW, height: TH, channels: 3 } }).png({ compressionLevel: 9 }).toBuffer();
writeFileSync(join(OUTPUT, "backdrop.png"), backdropPng);
const hash = createHash("sha1");
hash.update(backdropPng);

let bytes = 0;
const drift = new Float64Array(cols * rows * 3);
const d = [0, 0, 0];
for (const [i, file] of files.entries()) {
  const data = await readFrame(file);
  paintOutMark(data, W, H);
  cellMeans(data, means);
  for (let j = 0; j < cols * rows; j++) for (let c = 0; c < 3; c++) drift[j * 3 + c] = clear[j] ? means[j * 3 + c] - average[j * 3 + c] : 0;
  fillHarmonic(drift, clear, cols, rows, 300);
  for (let p = 0; p < W * H; p++) {
    const m = match[p], f = feather[p];
    if (m === 1 && f === 1) continue;
    const x = p % W, y = Math.floor(p / W);
    sample(drift, cols, rows, ((x + 0.5) * cols) / W - 0.5, ((y + 0.5) * rows) / H - 0.5, d);
    for (let c = 0; c < 3; c++) {
      const o = p * 3 + c;
      const evened = data[o] - (1 - m) * d[c];
      data[o] = Math.max(0, Math.min(255, Math.round(under[o] + (evened - under[o]) * f)));
    }
  }
  const name = `frame-${String(i + 1).padStart(4, "0")}.webp`;
  for (const w of WIDTHS) {
    const out = await sharp(data, { raw: { width: W, height: H, channels: 3 } })
      .resize({ width: Math.min(w, W) })
      .webp({ quality: QUALITY[w], effort: 5 })
      .toBuffer();
    writeFileSync(join(OUTPUT, String(w), name), out);
    hash.update(out);
    bytes += out.length;
  }
  if ((i + 1) % 32 === 0) console.log(`  ${i + 1}/${files.length}`);
}

const round = (n) => Math.round(n * 10000) / 10000;
const hex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const rowAverage = (cy) => {
  const sum = [0, 0, 0];
  for (let cx = 0; cx < cols; cx++) for (let c = 0; c < 3; c++) sum[c] += backdrop[((cy + padY) * TW + cx + padX) * 3 + c] / cols;
  return sum;
};
const ring = [0, 0, 0];
let ringCount = 0;
for (let y = 0; y < TH; y++) {
  for (let x = 0; x < TW; x++) {
    if (x > 0 && y > 0 && x < TW - 1 && y < TH - 1) continue;
    for (let c = 0; c < 3; c++) ring[c] += backdrop[(y * TW + x) * 3 + c];
    ringCount++;
  }
}
const manifest = {
  // generated by scripts/build-tee-frames.mjs — don't edit by hand
  count: files.length,
  width: W,
  height: H,
  widths: WIDTHS,
  /** The tee's box across all frames, as fractions of the frame. */
  tee: {
    x: round(tee.x0 / W),
    y: round(tee.y0 / H),
    w: round((tee.x1 - tee.x0) / W),
    h: round((tee.y1 - tee.y0) / H),
  },
  backdrop: {
    /** Where backdrop.png goes, in frame widths / heights from the frame's top-left corner. */
    x: round(-padX / cols),
    y: round(-padY / rows),
    w: round(TW / cols),
    h: round(TH / rows),
    /** Flat colours the backdrop eases into at the top and bottom of the screen (and around it). */
    top: hex(rowAverage(0)),
    bottom: hex(rowAverage(rows - 1)),
    outer: hex(ring.map((s) => s / ringCount)),
  },
  version: hash.digest("hex").slice(0, 10),
};
mkdirSync(join(ROOT, "src/lib/tee-360"), { recursive: true });
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${files.length} frames → ${OUTPUT} (${(bytes / 1048576).toFixed(1)} MB for ${WIDTHS.join(" + ")} px, backdrop ${TW}×${TH} ${(backdropPng.length / 1024).toFixed(0)} KB) in ${((Date.now() - started) / 1000).toFixed(0)} s`);
console.log(manifest);
