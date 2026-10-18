"use client";

import { useEffect, useRef } from "react";
import { LinkButton } from "@/components/ui/button";
import { CLOTH_WAVES, createCloth, type ClothWave } from "@/lib/tee-360/cloth";
import { TEE_360, TEE_BACKDROP_URL, TEE_FRAMES, teeFrameUrl, type TeeLayout } from "@/lib/tee-360/config";
import { cn } from "@/lib/utils/cn";

/**
 * The story told while the tee turns, in scroll order: each beat shows between `start` and
 * `end` (0 = the story pinned, 1 = a full turn). Quality Prints lands as the back print comes
 * round. Edit the words here.
 */
const BEATS: {
  id: string;
  start: number;
  end: number;
  /** Desktop: which side of the tee the words sit on. */
  side: "left" | "right";
  eyebrow: string;
  title: string;
  body: string;
}[] = [
  {
    id: "intro",
    start: 0,
    end: 0.15,
    side: "left",
    eyebrow: "360° view",
    title: "WHY CUSTOM DRIP CHENNAI",
    body: "Scroll to turn the tee, and see what goes into every one we make.",
  },
  { id: "designs", start: 0.15, end: 0.29, side: "right", eyebrow: "01", title: "Original Designs", body: "Every print is designed in-house." },
  { id: "made", start: 0.29, end: 0.43, side: "left", eyebrow: "02", title: "Made to Order", body: "Printed fresh for every drop." },
  { id: "prints", start: 0.43, end: 0.59, side: "right", eyebrow: "03", title: "Quality Prints", body: "Durable, wash-tested prints — front and back." },
  { id: "chennai", start: 0.59, end: 0.73, side: "left", eyebrow: "04", title: "Chennai Based", body: "Small brand, big drip." },
  { id: "shipping", start: 0.73, end: 0.87, side: "right", eyebrow: "05", title: "Pan India Shipping", body: "Delivered to your doorstep." },
  { id: "finale", start: 0.87, end: 1, side: "left", eyebrow: "Your turn", title: "FIND YOUR DRIP", body: "Shop the latest drop, or design a tee that's all yours." },
];

const { phone, desktop } = TEE_360.layout;
const FRAME_ASPECT = TEE_FRAMES.width / TEE_FRAMES.height;
const TEE = TEE_FRAMES.tee;
const TEE_CX = TEE.x + TEE.w / 2;
const TEE_CY = TEE.y + TEE.h / 2;
const BACKDROP = TEE_FRAMES.backdrop;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const smooth = (n: number) => n * n * (3 - 2 * n);

/**
 * Above and below the tee, the studio eases into one flat colour by the screen's top and bottom
 * edges, so it meets the fades into the page with no seam: opacity at 0…1 of the way from the
 * screen edge to the frame.
 */
const EDGE_EASE = Array.from({ length: 9 }, (_, i) => ({ at: i / 8, alpha: 1 - smooth(i / 8) }));
const rgba = (hex: string, alpha: number) =>
  `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${alpha.toFixed(3)})`;

/** Where the frame sits on screen for a layout (CSS), so the picture is right before any script runs. */
function placement(l: TeeLayout) {
  const dh = `min(calc(100cqh * ${(l.teeHeight / TEE.h).toFixed(4)}), calc(100cqw * ${(l.teeWidth / TEE.w / FRAME_ASPECT).toFixed(4)}))`;
  return `--dh:${dh};--left:calc(50cqw - var(--dh) * ${(FRAME_ASPECT * TEE_CX).toFixed(4)});--top:calc(100cqh * ${l.centerY} - var(--dh) * ${TEE_CY.toFixed(4)});`;
}
// The poster (shown until the canvas takes over, and without JavaScript) on the same backdrop the
// canvas draws: the frames' edges are evened out to it (scripts/build-tee-frames.mjs), so they meet
// with no seam. With reduced motion it's a still picture on a card.
const STORY_CSS = `
.tee360{height:${((TEE_360.scrollScreens.phone + 1) * 100).toFixed(0)}svh}
.tee360-stage{container-type:size;${placement(phone)}}
.tee360-poster{position:absolute;max-width:none;height:var(--dh);width:calc(var(--dh) * ${FRAME_ASPECT.toFixed(4)});left:var(--left);top:var(--top)}
.tee360-backdrop{position:absolute;inset:0;background-color:${BACKDROP.outer};background-repeat:no-repeat;
  background-image:linear-gradient(to bottom,${EDGE_EASE.map((s) => `${rgba(BACKDROP.top, s.alpha)} calc(var(--top) * ${s.at})`).join(",")}),
    linear-gradient(to top,${EDGE_EASE.map((s) => `${rgba(BACKDROP.bottom, s.alpha)} calc((100% - var(--top) - var(--dh)) * ${s.at})`).join(",")}),
    url("${TEE_BACKDROP_URL}");
  background-size:100% 100%,100% 100%,calc(var(--dh) * ${(FRAME_ASPECT * BACKDROP.w).toFixed(4)}) calc(var(--dh) * ${BACKDROP.h});
  background-position:0 0,0 0,calc(var(--left) + var(--dh) * ${(FRAME_ASPECT * BACKDROP.x).toFixed(4)}) calc(var(--top) + var(--dh) * ${BACKDROP.y})}
@media (min-width:${TEE_360.desktopFrom}px){
  .tee360{height:${((TEE_360.scrollScreens.desktop + 1) * 100).toFixed(0)}svh}
  .tee360-stage{${placement(desktop)}}
}
@media (prefers-reduced-motion:reduce){
  .tee360{height:auto}
  .tee360-stage{container-type:normal}
  .tee360-backdrop{display:none}
  .tee360-poster{position:static;display:block;width:min(100%,56rem);height:auto;margin:0 auto;border-radius:1.5rem}
}`;

/** How visible a beat is at progress `p`: fades in and out over the edges of its window. */
function beatOpacity(p: number, i: number) {
  const beat = BEATS[i];
  const edge = (beat.end - beat.start) * 0.3;
  const fadeIn = i === 0 ? 1 : clamp01((p - beat.start) / edge);
  const fadeOut = i === BEATS.length - 1 ? 1 : clamp01((beat.end - p) / edge);
  return smooth(Math.min(fadeIn, fadeOut));
}

/**
 * Frames in the order they load: the first, then every 16th, 8th, 4th… so the whole turn is
 * roughly there early and fills in finer; `step` 2 skips every other frame (Save-Data, low memory).
 */
function loadOrder(count: number, step: number) {
  const order: number[] = [0];
  const seen = new Uint8Array(count);
  seen[0] = 1;
  for (let stride = 16; stride >= step; stride /= 2) {
    for (let i = 0; i < count; i += stride) {
      if (!seen[i]) {
        seen[i] = 1;
        order.push(i);
      }
    }
  }
  return order;
}

/**
 * "Why Custom Drip Chennai" as a pinned, scroll-driven 360° turn of the tee (Apple-style),
 * drawn frame by frame on a canvas. The tee eases towards the scroll position rather than
 * jumping, its cloth ripples like a breeze ran through it when you move the mouse over it or
 * touch it, and the story's words come and go at their points in the turn. With reduced motion
 * it's a still picture and the words in a list.
 */
export function Tee360Story() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clothRef = useRef<HTMLCanvasElement>(null);
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const degreesRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const clothCanvas = clothRef.current;
    if (!section || !stage || !wrap || !canvas || !clothCanvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const count = TEE_FRAMES.count;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    const lite = nav.connection?.saveData === true || (nav.deviceMemory ?? 8) <= 2;
    const width = stage.clientWidth >= 768 ? Math.max(...TEE_FRAMES.widths) : Math.min(...TEE_FRAMES.widths);
    const breeze = TEE_360.waves;

    // the rippling cloth (WebGL); without it the frames are simply drawn on the canvas
    let cloth = createCloth(clothCanvas, FRAME_ASPECT, breeze, () => {
      cloth = null;
      clothCanvas.hidden = true;
      needsDraw = true;
      wake();
    });
    clothCanvas.hidden = !cloth;

    // --- frames: the first now, the rest once the page has loaded and the story is near -------
    const images: (HTMLImageElement | null)[] = new Array(count).fill(null);
    const order = loadOrder(count, lite ? 2 : 1);
    let nextLoad = 0;
    let loading = 0;
    let isNear = false;
    let pageLoaded = document.readyState === "complete";
    let destroyed = false;

    // the studio background: small and smooth, stretched to fill the screen behind the tee
    let backdropImg: HTMLImageElement | null = null;
    const backdropSrc = new Image();
    backdropSrc.src = TEE_BACKDROP_URL;
    backdropSrc.decode().then(
      () => {
        if (destroyed) return;
        backdropImg = backdropSrc;
        cloth?.setBackdrop(backdropSrc, BACKDROP);
        paintBackdrop();
        wake();
      },
      () => {}
    );

    function pump() {
      const all = isNear && pageLoaded;
      while (!destroyed && loading < TEE_360.parallelLoads && nextLoad < order.length && (all || nextLoad === 0)) {
        const index = order[nextLoad++];
        loading++;
        const img = new Image();
        img.decoding = "async";
        img.src = teeFrameUrl(index, width);
        const settle = () => {
          loading--;
          pump();
        };
        img.decode().then(
          () => {
            if (destroyed) return;
            images[index] = img;
            canvas!.dataset.loaded = String(Number(canvas!.dataset.loaded ?? 0) + 1);
            needsDraw = true;
            wake();
            settle();
          },
          settle
        );
      }
    }

    /** The loaded frame nearest to `index`, going round the turn (it's a loop). */
    function nearest(index: number) {
      for (let d = 0; d < count; d++) {
        const before = images[(index - d + count) % count];
        if (before) return before;
        const after = images[(index + d) % count];
        if (after) return after;
      }
      return null;
    }

    // --- drawing ---------------------------------------------------------------------------
    // The backdrop is painted once per screen size; after that each new frame is a single copy
    // over the same spot (the frames are opaque and their edges match the backdrop).
    let stageW = 0;
    let stageH = 0;
    let wrapW = 0;
    let wrapH = 0;
    let dpr = 1;
    let needsDraw = true;
    let backdropPainted = false;
    let drawn: HTMLImageElement | null = null;
    /** Where the frame goes, in canvas pixels (whole pixels, so each copy covers the last exactly). */
    const frame = { x: 0, y: 0, w: 0, h: 0 };

    function measure() {
      stageW = stage!.clientWidth;
      stageH = stage!.clientHeight;
      wrapW = wrap!.clientWidth;
      wrapH = wrap!.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(wrapW * dpr);
      canvas!.height = Math.round(wrapH * dpr);
      // the tee sized and placed by the layout settings
      const layout = stageW >= TEE_360.desktopFrom ? desktop : phone;
      const h = Math.min((stageH * layout.teeHeight) / TEE.h, (stageW * layout.teeWidth) / TEE.w / FRAME_ASPECT);
      const w = h * FRAME_ASPECT;
      const x = (wrapW - stageW) / 2 + stageW / 2 - TEE_CX * w;
      const y = (wrapH - stageH) / 2 + stageH * layout.centerY - TEE_CY * h;
      frame.x = Math.round(x * dpr);
      frame.y = Math.round(y * dpr);
      frame.w = Math.round((x + w) * dpr) - frame.x;
      frame.h = Math.round((y + h) * dpr) - frame.y;
      if (cloth) {
        // the cloth canvas covers the part of the frame that's on screen, pixel for pixel
        const x0 = Math.max(frame.x, 0);
        const y0 = Math.max(frame.y, 0);
        const x1 = Math.min(frame.x + frame.w, canvas!.width);
        const y1 = Math.min(frame.y + frame.h, canvas!.height);
        const cssX = wrapW / canvas!.width;
        const cssY = wrapH / canvas!.height;
        clothCanvas!.width = Math.max(1, x1 - x0);
        clothCanvas!.height = Math.max(1, y1 - y0);
        Object.assign(clothCanvas!.style, {
          left: `${x0 * cssX}px`,
          top: `${y0 * cssY}px`,
          width: `${(x1 - x0) * cssX}px`,
          height: `${(y1 - y0) * cssY}px`,
        });
        cloth.setRegion((x0 - frame.x) / frame.w, (y0 - frame.y) / frame.h, (x1 - frame.x) / frame.w, (y1 - frame.y) / frame.h);
      }
      paintBackdrop();
    }

    /** The studio background around the tee, easing into flat colours at the screen's top and bottom. */
    function paintBackdrop() {
      backdropPainted = false;
      needsDraw = true;
      if (!backdropImg || !frame.w) return;
      const c = ctx!;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = BACKDROP.outer;
      c.fillRect(0, 0, canvas!.width, canvas!.height);
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = "low"; // a plain stretch, as the frames' edges were matched to
      c.drawImage(backdropImg, frame.x + frame.w * BACKDROP.x, frame.y + frame.h * BACKDROP.y, frame.w * BACKDROP.w, frame.h * BACKDROP.h);
      const screenTop = ((wrapH - stageH) / 2) * dpr;
      const screenBottom = screenTop + stageH * dpr;
      const ease = (from: number, to: number, hex: string) => {
        const g = c.createLinearGradient(0, from, 0, to);
        for (const s of EDGE_EASE) g.addColorStop(s.at, rgba(hex, s.alpha));
        return g;
      };
      if (frame.y > screenTop) {
        c.fillStyle = ease(screenTop, frame.y, BACKDROP.top);
        c.fillRect(0, 0, canvas!.width, frame.y);
      }
      const frameBottom = frame.y + frame.h;
      if (frameBottom < screenBottom) {
        c.fillStyle = ease(screenBottom, frameBottom, BACKDROP.bottom);
        c.fillRect(0, frameBottom, canvas!.width, canvas!.height - frameBottom);
      }
      backdropPainted = true;
      if (drawn) draw(drawn, performance.now()); // straight away, so a resize never shows the studio without the tee
    }

    function draw(img: HTMLImageElement, now: number) {
      if (!backdropPainted) return;
      if (cloth) cloth.draw(img, liveWaves(now), push);
      else {
        const c = ctx!;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.imageSmoothingEnabled = true;
        c.imageSmoothingQuality = "high";
        c.drawImage(img, frame.x, frame.y, frame.w, frame.h);
      }
      if (!drawn) wrap!.style.opacity = "1";
      drawn = img;
      needsDraw = false;
    }

    // --- the breeze: ripples from the mouse or a finger, the cloth under it pushed along -------
    const life = breeze.fade * 4000;
    const waves = Array.from({ length: CLOTH_WAVES }, () => ({ x: 0, y: 0, born: -Infinity, strength: 0, dx: 0, dy: 0 }));
    let nextWave = 0;
    let wavesUntil = 0;
    /** The pointer, in picture heights from the frame's top-left corner, and how fast it's moving. */
    const pointer = { on: false, x: 0, y: 0, t: 0, vx: 0, vy: 0, lastX: 0, lastY: 0 };
    /** Where the cloth is pushed and by how much (a spring, so it sways back). */
    const push = { x: 0, y: 0, dx: 0, dy: 0, vx: 0, vy: 0 };
    let calm = true; // the last frame drawn was the plain picture

    function liveWaves(now: number) {
      const live: ClothWave[] = [];
      for (const w of waves) {
        const age = now - w.born;
        if (age >= 0 && age < life) live.push({ x: w.x, y: w.y, age: age / 1000, strength: w.strength, dx: w.dx, dy: w.dy });
      }
      return live;
    }

    function ripple(x: number, y: number, strength: number, dx: number, dy: number, now: number) {
      Object.assign(waves[nextWave], { x, y, born: now, strength, dx, dy });
      nextWave = (nextWave + 1) % CLOTH_WAVES;
      wavesUntil = now + life;
    }

    function pointTo(clientX: number, clientY: number, now: number) {
      if (!cloth || !frame.h) return;
      const rect = wrap!.getBoundingClientRect();
      const x = ((clientX - rect.left) * (canvas!.width / rect.width) - frame.x) / frame.h;
      const y = ((clientY - rect.top) * (canvas!.height / rect.height) - frame.y) / frame.h;
      if (pointer.on) {
        const dt = Math.max(8, now - pointer.t) / 1000;
        pointer.vx += ((x - pointer.x) / dt - pointer.vx) * 0.4;
        pointer.vy += ((y - pointer.y) / dt - pointer.vy) * 0.4;
      } else {
        pointer.vx = pointer.vy = 0;
        pointer.lastX = push.x = x;
        pointer.lastY = push.y = y;
      }
      Object.assign(pointer, { on: true, x, y, t: now });
      // a new ripple every little way, carried in the direction of travel, stronger when quicker
      if (Math.hypot(x - pointer.lastX, y - pointer.lastY) >= breeze.spacing) {
        const speed = Math.hypot(pointer.vx, pointer.vy);
        if (speed > 0.05) ripple(x, y, Math.min(1, Math.max(0.2, speed / 2.5)), pointer.vx / speed, pointer.vy / speed, now);
        pointer.lastX = x;
        pointer.lastY = y;
      }
      wake();
    }

    /** Moves the push spring on; false once it's at rest. */
    function stepPush(dt: number, now: number) {
      if (now - pointer.t > 50) {
        const slow = Math.pow(0.82, dt / 16.67); // the pointer has stopped: its speed dies away
        pointer.vx *= slow;
        pointer.vy *= slow;
      }
      let tx = pointer.on ? pointer.vx * breeze.push : 0;
      let ty = pointer.on ? pointer.vy * breeze.push : 0;
      const reach = Math.hypot(tx, ty);
      if (reach > 0.035) {
        tx *= 0.035 / reach;
        ty *= 0.035 / reach;
      }
      const s = dt / 1000;
      push.vx += (breeze.spring * (tx - push.dx) - breeze.damping * push.vx) * s;
      push.vy += (breeze.spring * (ty - push.dy) - breeze.damping * push.vy) * s;
      push.dx += push.vx * s;
      push.dy += push.vy * s;
      if (pointer.on) {
        const follow = 1 - Math.pow(0.7, dt / 16.67);
        push.x += (pointer.x - push.x) * follow;
        push.y += (pointer.y - push.y) * follow;
      }
      if (Math.abs(push.dx) + Math.abs(push.dy) < 0.0002 && Math.abs(push.vx) + Math.abs(push.vy) < 0.002 && Math.hypot(tx, ty) < 0.0002) {
        push.dx = push.dy = push.vx = push.vy = 0;
        return false;
      }
      return true;
    }

    // --- the loop: runs only while something is still moving ---------------------------------
    let target = 0;
    let current = -1;
    let raf = 0;
    let running = false;
    let inView = false;
    let last = 0;

    function readScroll() {
      const rect = section!.getBoundingClientRect();
      const travel = rect.height - stageH;
      target = travel > 0 ? clamp01(-rect.top / travel) : 0;
    }

    function tick(now: number) {
      const dt = last ? Math.min(64, now - last) : 16.7;
      last = now;
      readScroll();
      if (current < 0) current = target; // arriving mid-story (e.g. after a reload): start there
      const k = 1 - Math.pow(1 - TEE_360.smoothing, dt / 16.67);
      current += (target - current) * k;
      if (Math.abs(target - current) < 0.0002) current = target;
      const pushing = cloth ? stepPush(dt, now) : false;
      const rippling = cloth !== null && now < wavesUntil;
      const moving = pushing || rippling;

      const index = Math.round(current * (count - 1)) % count;
      const img = nearest(index);
      if (img && backdropPainted && (img !== drawn || needsDraw || moving || !calm)) {
        draw(img, now);
        calm = !moving;
        canvas!.dataset.frame = String(images.indexOf(img));
      }
      wrap!.dataset.waves = String(rippling ? liveWaves(now).length : 0);

      for (let i = 0; i < BEATS.length; i++) {
        const el = beatRefs.current[i];
        if (!el) continue;
        const o = beatOpacity(current, i);
        const middle = (BEATS[i].start + BEATS[i].end) / 2;
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translate3d(0, ${((1 - o) * 26 * (current < middle ? 1 : -1)).toFixed(2)}px, 0)`;
        el.style.pointerEvents = o > 0.5 ? "auto" : "none";
      }
      if (degreesRef.current) degreesRef.current.textContent = `${Math.round(current * 360)}°`;
      if (barRef.current) barRef.current.style.transform = `scaleX(${current.toFixed(4)})`;
      if (hintRef.current) hintRef.current.style.opacity = clamp01(1 - current * 25).toFixed(3);

      const settled = current === target && !moving && calm;
      if (settled && (!needsDraw || !backdropPainted || !img)) {
        running = false;
        last = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    function wake() {
      if (running || !inView || destroyed) return;
      running = true;
      raf = requestAnimationFrame(tick);
    }

    // --- events ----------------------------------------------------------------------------
    const onScroll = () => wake();
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "touch") pointTo(event.clientX, event.clientY, performance.now());
    };
    const onPointerLeave = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer.on = false;
      wake();
    };
    // Touches are followed without ever holding up scrolling: a tap sends a ring of ripples, a
    // drag (or scrolling with a finger on the tee) a breeze along its path.
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch || !cloth) return;
      const now = performance.now();
      pointer.on = false;
      pointTo(touch.clientX, touch.clientY, now);
      ripple(pointer.x, pointer.y, 0.85, 0, 0, now);
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) pointTo(touch.clientX, touch.clientY, performance.now());
    };
    const onTouchEnd = () => {
      pointer.on = false;
      wake();
    };
    // Tabbing to a beat's link (e.g. the closing buttons) scrolls to where that beat shows.
    const onFocusIn = (event: FocusEvent) => {
      const i = beatRefs.current.findIndex((el) => el?.contains(event.target as Node));
      if (i < 0) return;
      const rect = section.getBoundingClientRect();
      const at = i === BEATS.length - 1 ? 1 : (BEATS[i].start + BEATS[i].end) / 2;
      window.scrollTo({ top: window.scrollY + rect.top + at * (rect.height - stageH), behavior: "smooth" });
    };
    const onLoad = () => {
      pageLoaded = true;
      pump();
    };

    const resize = new ResizeObserver(() => {
      measure();
      wake();
    });
    resize.observe(stage);
    measure();

    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isNear) {
          isNear = true;
          pump();
        }
      },
      { rootMargin: `${TEE_360.preloadScreens * 100}% 0px` }
    );
    near.observe(section);

    const visible = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) wake();
    });
    visible.observe(section);

    window.addEventListener("scroll", onScroll, { passive: true });
    if (!pageLoaded) window.addEventListener("load", onLoad, { once: true });
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerleave", onPointerLeave);
    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchmove", onTouchMove, { passive: true });
    stage.addEventListener("touchend", onTouchEnd, { passive: true });
    stage.addEventListener("touchcancel", onTouchEnd, { passive: true });
    section.addEventListener("focusin", onFocusIn);
    pump();

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      near.disconnect();
      visible.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("load", onLoad);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", onPointerLeave);
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("touchend", onTouchEnd);
      stage.removeEventListener("touchcancel", onTouchEnd);
      section.removeEventListener("focusin", onFocusIn);
      cloth?.dispose();
      images.fill(null);
    };
  }, []);

  const { top, bottom } = TEE_FRAMES.backdrop;

  return (
    <>
      <style>{STORY_CSS}</style>
      {/* soft hand-over from the white page into the studio and back */}
      <div aria-hidden="true" className="h-20 sm:h-28" style={{ background: `linear-gradient(to bottom, var(--background), ${top})` }} />
      {/* (below the screen-high stage, e.g. while a phone's address bar is hidden, it's the floor colour) */}
      <section ref={sectionRef} aria-labelledby="why-title" className="tee360 relative" style={{ backgroundColor: bottom }}>
        <div
          ref={stageRef}
          className="tee360-stage sticky top-0 h-svh overflow-hidden motion-reduce:static motion-reduce:h-auto motion-reduce:px-4 motion-reduce:py-14"
          style={{ background: `linear-gradient(to bottom, ${top}, ${bottom})` }}
        >
          <div aria-hidden="true" className="tee360-backdrop" />
          {/* eslint-disable-next-line @next/next/no-img-element -- placed and sized to match the canvas exactly */}
          <img
            src={teeFrameUrl(0, Math.max(...TEE_FRAMES.widths))}
            alt="The Custom Drip oversized black tee, front and back"
            width={TEE_FRAMES.width}
            height={TEE_FRAMES.height}
            decoding="async"
            className="tee360-poster select-none"
            draggable={false}
          />
          {/* the studio (and, without WebGL, the plain frames) on one canvas; the rippling cloth on top */}
          <div ref={wrapRef} aria-hidden="true" className="absolute inset-0 opacity-0 transition-opacity duration-500 motion-reduce:hidden">
            <canvas ref={canvasRef} className="block h-full w-full" />
            <canvas ref={clothRef} hidden className="absolute" />
          </div>

          <div className="pointer-events-none absolute inset-0 motion-reduce:pointer-events-auto motion-reduce:static motion-reduce:mx-auto motion-reduce:mt-10 motion-reduce:grid motion-reduce:max-w-6xl motion-reduce:gap-8 motion-reduce:sm:grid-cols-2 motion-reduce:lg:grid-cols-3">
            {BEATS.map((beat, i) => (
              <div
                key={beat.id}
                className={cn(
                  "absolute inset-x-0 bottom-[max(5svh,1rem)] px-6 text-center",
                  "lg:inset-x-auto lg:bottom-auto lg:top-1/2 lg:w-[min(22rem,25vw)] lg:-translate-y-1/2 lg:px-0 lg:text-left",
                  beat.side === "left" ? "lg:left-[max(2.5rem,5vw)]" : "lg:right-[max(2.5rem,5vw)]",
                  "motion-reduce:static motion-reduce:w-auto motion-reduce:translate-y-0 motion-reduce:px-0 motion-reduce:text-left",
                  "motion-reduce:lg:w-auto motion-reduce:lg:translate-y-0"
                )}
              >
                <div
                  ref={(el) => {
                    beatRefs.current[i] = el;
                  }}
                  className={cn(
                    "mx-auto max-w-md will-change-[opacity,transform] lg:mx-0",
                    i === 0 ? "opacity-100" : "opacity-0",
                    "motion-reduce:opacity-100"
                  )}
                >
                  <p className="inline-flex rounded-full bg-foreground px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                    {beat.eyebrow}
                  </p>
                  {i === 0 ? (
                    <h2 id="why-title" className="mt-3 font-display text-4xl leading-[0.95] tracking-tight text-foreground sm:text-5xl lg:mt-4 lg:text-6xl">
                      {beat.title}
                    </h2>
                  ) : (
                    <h3 className="mt-3 font-display text-3xl uppercase leading-[0.95] tracking-tight text-foreground sm:text-4xl lg:mt-4 lg:text-5xl">
                      {beat.title}
                    </h3>
                  )}
                  <p className="mt-2 text-base text-foreground/75 lg:mt-3 lg:text-lg">{beat.body}</p>
                  {beat.id === "finale" && (
                    <div className="mt-5 flex flex-wrap justify-center gap-2.5 lg:mt-6 lg:justify-start lg:gap-3">
                      <LinkButton href="/shop" size="md" className="lg:h-14 lg:px-9 lg:text-base">
                        Shop the Drop
                      </LinkButton>
                      <LinkButton href="/customize" variant="outline" size="md" className="lg:h-14 lg:px-9 lg:text-base">
                        Design Your Own
                      </LinkButton>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* desktop: how far round it is, and a nudge to start */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 items-center gap-3 text-foreground/70 lg:flex motion-reduce:hidden"
          >
            <span className="relative h-px w-32 overflow-hidden bg-foreground/20">
              <span ref={barRef} className="absolute inset-0 origin-left scale-x-0 bg-foreground" />
            </span>
            <span ref={degreesRef} className="w-10 text-xs font-bold tabular-nums">
              0°
            </span>
          </div>
          <p
            ref={hintRef}
            aria-hidden="true"
            className="pointer-events-none absolute bottom-16 left-1/2 hidden -translate-x-1/2 text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/60 lg:block motion-reduce:hidden"
          >
            Scroll to turn ↓
          </p>
        </div>
      </section>
      <div aria-hidden="true" className="h-20 sm:h-28" style={{ background: `linear-gradient(to bottom, ${bottom}, var(--background))` }} />
    </>
  );
}
