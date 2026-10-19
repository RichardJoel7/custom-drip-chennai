"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/** One review picture, as prepared by scripts/build-reviews.mjs. */
export interface ReviewImage {
  src: string;
  width: number;
  height: number;
}

/**
 * The fan of cards: card size, how far the first card either side sits from the middle, the gap
 * between the rest, how many show either side, and how far a drag moves one card along (px).
 */
const FAN = {
  phone: { w: 168, h: 300, first: 136, step: 36, side: 3, drag: 110 },
  desktop: { w: 236, h: 420, first: 198, step: 66, side: 7, drag: 160 },
};
type Fan = (typeof FAN)["phone"];
/** From this width (the `md` breakpoint) the bigger fan is used. */
const WIDE = 768;
/** How far the side cards turn away, in degrees. */
const TURN = 55;
/** Springiness of the fan as it settles on a card (stiffer = quicker; damping stops the wobble). */
const SPRING = { stiffness: 220, damping: 26 };
/** The panel's grow-out and the text's arrival. */
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const OPEN_MS = 650;
const CLOSE_MS = 480;
const CARD_SIZES = `(min-width: ${WIDE}px) ${FAN.desktop.w}px, ${FAN.phone.w}px`;
/** The open review on big screens (from the `lg` breakpoint): tallest panel, words column, padding, widest picture. */
const PANEL = { from: 1024, maxH: 680, textW: 440, pad: 32, mediaMaxW: 640 };

const wrap = (n: number, count: number) => ((n % count) + count) % count;
const pad = (n: number) => String(n).padStart(2, "0");
/** Tall pictures fill their card (cropped a little); wide ones are shown whole. */
const fills = (r: ReviewImage) => r.height / r.width >= 1.25;

/** How far card `i` is from the middle (−count/2 … count/2), going round the shortest way. */
function offset(i: number, pos: number, count: number) {
  const p = wrap(i - pos, count);
  return p > count / 2 ? p - count : p;
}

/** A card's place in the fan at offset `p`: flat in the middle, turned away either side. */
function placeCard(p: number, fan: Fan, flat: boolean) {
  const near = Math.min(Math.abs(p), 1);
  const beyond = Math.max(Math.abs(p) - 1, 0);
  const side = Math.sign(p);
  const x = side * (near * fan.first + beyond * fan.step);
  const z = -near * 120 - beyond * 10;
  const turn = flat ? 0 : -side * near * TURN;
  const scale = flat ? 1 - near * 0.12 : 1;
  return {
    transform: `translate3d(${x.toFixed(2)}px, 0, ${z.toFixed(2)}px) rotateY(${turn.toFixed(2)}deg) scale(${scale.toFixed(3)})`,
    zIndex: 1000 - Math.round(Math.abs(p) * 10),
    opacity: Math.max(0, Math.min(1, fan.side + 1 - Math.abs(p))),
    shade: Math.min(Math.abs(p), 1.6) * 0.32,
    hidden: Math.abs(p) > fan.side + 1,
  };
}

/** The same chevron as the home page's banner carousel. */
function Chevron({ back }: { back?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={back ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Round arrow buttons: on the dark section like the footer's, on the lime panel like the outline button. */
const ROUND_ON_DARK =
  "grid h-11 w-11 place-items-center rounded-full border border-background/40 text-background transition-colors hover:bg-background hover:text-foreground focus-visible:outline-accent!";
const ROUND_ON_LIME =
  "grid h-11 w-11 place-items-center rounded-full border border-foreground text-foreground transition-colors hover:bg-foreground hover:text-background";

/**
 * Customer reviews as a fan of cards (cover-flow): drag, swipe, scroll sideways or use the arrows
 * to go through them — it goes round and round. Tapping the middle card grows a panel out of it
 * with the review full size ("gallery reveal"). The pictures and their order come from
 * scripts/build-reviews.mjs.
 */
export function ReviewGallery({ reviews }: { reviews: ReviewImage[] }) {
  const count = reviews.length;
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shadeRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const counterRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const controls = useRef<{ go: (delta: number) => void; goTo: (i: number) => void } | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || count === 0) return;
    const flat = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let fan = stage.clientWidth >= WIDE ? FAN.desktop : FAN.phone;
    let pos = 0;
    let velocity = 0;
    let target = 0;
    let held = false; // a finger, mouse or trackpad is moving it
    let raf = 0;
    let running = false;
    let last = 0;
    let shown = 0;
    let announce = false;

    function render() {
      for (let i = 0; i < count; i++) {
        const card = cardRefs.current[i];
        if (!card) continue;
        const place = placeCard(offset(i, pos, count), fan, flat);
        if (place.hidden) {
          if (card.style.display !== "none") card.style.display = "none";
          continue;
        }
        card.style.display = "";
        card.style.transform = place.transform;
        card.style.zIndex = String(place.zIndex);
        card.style.opacity = place.opacity.toFixed(3);
        const shade = shadeRefs.current[i];
        if (shade) shade.style.opacity = place.shade.toFixed(3);
      }
      const current = wrap(Math.round(pos), count);
      if (current !== shown) {
        shown = current;
        if (counterRef.current) counterRef.current.textContent = `${pad(current + 1)} / ${pad(count)}`;
        if (announce && liveRef.current) liveRef.current.textContent = `Review ${current + 1} of ${count}`;
      }
    }

    function tick(now: number) {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      if (!held) {
        if (flat) {
          pos = target;
          velocity = 0;
        } else {
          velocity += (SPRING.stiffness * (target - pos) - SPRING.damping * velocity) * dt;
          pos += velocity * dt;
          if (Math.abs(target - pos) < 0.0005 && Math.abs(velocity) < 0.002) {
            pos = target;
            velocity = 0;
          }
        }
      }
      render();
      if (!held && pos === target) {
        running = false;
        last = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    function wake() {
      announce = true;
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    }

    const go = (delta: number) => {
      target = Math.round(target) + delta;
      wake();
    };
    const goTo = (i: number) => {
      target = Math.round(pos + offset(i, pos, count));
      wake();
    };
    controls.current = { go, goTo };

    // --- dragging (mouse, pen or finger; up-and-down swipes still scroll the page) --------------
    let press: { id: number; x: number; y: number; from: number; lastX: number; lastT: number; speed: number; card: number | null } | null = null;
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const card = (event.target as HTMLElement).closest<HTMLElement>("[data-review]");
      press = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        from: pos,
        lastX: event.clientX,
        lastT: event.timeStamp,
        speed: 0,
        card: card ? Number(card.dataset.review) : null,
      };
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!press || event.pointerId !== press.id) return;
      const dx = event.clientX - press.x;
      const dy = event.clientY - press.y;
      if (!held) {
        if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
          held = true;
          velocity = 0;
          stage.setPointerCapture(event.pointerId);
        } else {
          if (Math.abs(dy) > 10) press = null;
          return;
        }
      }
      pos = press.from - dx / fan.drag;
      const dt = (event.timeStamp - press.lastT) / 1000;
      if (dt > 0) press.speed = press.speed * 0.6 + (-(event.clientX - press.lastX) / fan.drag / dt) * 0.4;
      press.lastX = event.clientX;
      press.lastT = event.timeStamp;
      wake();
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!press || event.pointerId !== press.id) return;
      if (held) {
        // let go: carry on with the fling, then settle on the nearest card
        held = false;
        velocity = press.speed;
        target = Math.round(pos + velocity * 0.18);
        wake();
      } else if (press.card !== null && event.type === "pointerup") {
        if (Math.abs(offset(press.card, pos, count)) < 0.5) setOpen(press.card);
        else goTo(press.card);
      }
      press = null;
    };

    // --- trackpads: sideways scrolling moves it; up and down still scrolls the page -----------
    let wheelDone = 0;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      held = true;
      pos += event.deltaX / fan.drag;
      wake();
      window.clearTimeout(wheelDone);
      wheelDone = window.setTimeout(() => {
        held = false;
        velocity = 0;
        target = Math.round(pos);
        wake();
      }, 120);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target !== stage) return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        go(event.key === "ArrowRight" ? 1 : -1);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen(wrap(Math.round(target), count));
      }
    };

    const resize = new ResizeObserver(() => {
      fan = stage.clientWidth >= WIDE ? FAN.desktop : FAN.phone;
      render();
    });
    resize.observe(stage);
    render();

    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerUp);
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(wheelDone);
      resize.disconnect();
      controls.current = null;
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerup", onPointerUp);
      stage.removeEventListener("pointercancel", onPointerUp);
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("keydown", onKeyDown);
    };
  }, [count]);

  const step = useCallback(
    (delta: number) => {
      setOpen((i) => {
        if (i === null) return i;
        const next = wrap(i + delta, count);
        controls.current?.goTo(next);
        return next;
      });
      setDirection(delta);
    },
    [count]
  );
  const closed = useCallback(() => {
    setOpen(null);
    setDirection(0);
    stageRef.current?.focus({ preventScroll: true });
  }, []);

  if (count === 0) return null;

  return (
    <section aria-labelledby="reviews-title" className="mx-2 mt-6 overflow-hidden rounded-[2rem] bg-foreground py-14 text-background sm:mx-4 sm:py-20">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-4 sm:px-6">
        <div>
          <p className="inline-flex rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-accent-foreground">
            Reviews
          </p>
          <h2 id="reviews-title" className="mt-4 font-display text-3xl tracking-wide sm:text-4xl">
            STRAIGHT FROM OUR COMMUNITY
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Previous review" onClick={() => controls.current?.go(-1)} className={ROUND_ON_DARK}>
            <Chevron back />
          </button>
          <span ref={counterRef} className="w-20 text-center text-sm font-bold tabular-nums tracking-[0.18em]">
            {`${pad(1)} / ${pad(count)}`}
          </span>
          <button type="button" aria-label="Next review" onClick={() => controls.current?.go(1)} className={ROUND_ON_DARK}>
            <Chevron />
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Customer reviews: use the left and right arrow keys to browse, Enter to open one"
        className="relative mt-10 h-[340px] cursor-grab touch-pan-y select-none outline-none! [perspective:900px] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent active:cursor-grabbing md:h-[480px] md:[perspective:1400px]"
      >
        {reviews.map((review, i) => {
          const place = placeCard(offset(i, 0, count), FAN.desktop, false);
          return (
            <div
              key={review.src}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              data-review={i}
              data-fit={fills(review) ? "cover" : "contain"}
              className="absolute left-1/2 top-1/2 -ml-[84px] -mt-[150px] h-[300px] w-[168px] overflow-hidden rounded-2xl bg-background/5 shadow-2xl shadow-black/60 ring-1 ring-background/10 will-change-transform md:-ml-[118px] md:-mt-[210px] md:h-[420px] md:w-[236px]"
              style={{ transform: place.transform, zIndex: place.zIndex, opacity: place.opacity, display: place.hidden ? "none" : undefined }}
            >
              <Image
                src={review.src}
                alt=""
                fill
                sizes={CARD_SIZES}
                draggable={false}
                className={cn("pointer-events-none", fills(review) ? "object-cover" : "object-contain")}
              />
              <span
                ref={(el) => {
                  shadeRefs.current[i] = el;
                }}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-foreground"
                style={{ opacity: place.shade }}
              />
            </div>
          );
        })}
      </div>
      <p className="mt-6 px-4 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-background/50">
        Drag or swipe · Tap the middle card to read it
      </p>
      <p ref={liveRef} className="sr-only" aria-live="polite" />

      {open !== null && (
        <ReviewPanel
          reviews={reviews}
          index={open}
          direction={direction}
          card={(i) => cardRefs.current[i] ?? null}
          onStep={step}
          onClosed={closed}
        />
      )}
    </section>
  );
}

/**
 * The open review: a lime panel grows out of the middle card, the picture lifts out of the card
 * to full size and the words fade in; closing plays it back into the card.
 */
function ReviewPanel({
  reviews,
  index,
  direction,
  card,
  onStep,
  onClosed,
}: {
  reviews: ReviewImage[];
  index: number;
  direction: number;
  card: (i: number) => HTMLDivElement | null;
  onStep: (delta: number) => void;
  onClosed: () => void;
}) {
  const review = reviews[index];
  const count = reviews.length;
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [box, setBox] = useState<{ w: number; h: number; panel: { w: number; h: number } | null } | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const sharp = loaded === review.src;
  const opened = useRef(false);
  const closing = useRef(false);
  const running = useRef<Animation[]>([]);
  const hiddenCard = useRef<HTMLDivElement | null>(null);

  // Sizes: on big screens the panel wraps the picture (as big as fits) and the words; on phones
  // the picture is as wide as the panel, so chats stay readable, and a tall one scrolls inside it.
  useLayoutEffect(() => {
    const fit = () => {
      const aspect = review.width / review.height;
      if (window.innerWidth >= PANEL.from) {
        const h = Math.min(PANEL.maxH, window.innerHeight - 48);
        let mw = Math.min(PANEL.mediaMaxW, window.innerWidth - 48 - PANEL.textW - PANEL.pad * 2);
        let mh = mw / aspect;
        if (mh > h - PANEL.pad * 2) {
          mh = h - PANEL.pad * 2;
          mw = mh * aspect;
        }
        setBox({ w: Math.floor(mw), h: Math.floor(mh), panel: { w: Math.round(mw + PANEL.pad * 2 + PANEL.textW), h } });
      } else {
        const area = areaRef.current;
        if (!area) return;
        const w = Math.min(area.clientWidth, 520);
        setBox({ w: Math.floor(w), h: Math.floor(w / aspect), panel: null });
      }
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [review]);

  /** From the card to the panel: where the panel and picture start, so they look like the card. */
  const fromCard = useCallback(
    (from: HTMLElement) => {
      const c = from.getBoundingClientRect();
      const p = panelRef.current!.getBoundingClientRect();
      const m = mediaRef.current!.getBoundingClientRect();
      const cover = from.dataset.fit === "cover";
      const s = cover ? Math.max(c.width / m.width, c.height / m.height) : Math.min(c.width / m.width, c.height / m.height);
      const ix = Math.max(0, (m.width - c.width / s) / 2);
      const iy = Math.max(0, (m.height - c.height / s) / 2);
      return {
        panel: `inset(${c.top - p.top}px ${p.right - c.right}px ${p.bottom - c.bottom}px ${c.left - p.left}px round 16px)`,
        media: {
          transform: `translate(${c.left + c.width / 2 - (m.left + m.width / 2)}px, ${c.top + c.height / 2 - (m.top + m.height / 2)}px) scale(${s})`,
          clipPath: `inset(${iy}px ${ix}px ${iy}px ${ix}px round ${16 / s}px)`,
        },
      };
    },
    []
  );

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // keep the review's own card hidden while it's out
  useLayoutEffect(() => {
    const el = card(index);
    if (hiddenCard.current && hiddenCard.current !== el) hiddenCard.current.style.visibility = "";
    if (el) el.style.visibility = "hidden";
    hiddenCard.current = el;
  }, [card, index]);
  useEffect(
    () => () => {
      if (hiddenCard.current) hiddenCard.current.style.visibility = "";
    },
    []
  );

  // open: grow out of the card (once the picture's size is known); later reviews slide in
  useLayoutEffect(() => {
    if (!box || closing.current) return;
    if (!opened.current) {
      opened.current = true;
      const from = card(index);
      if (reduced() || !from) {
        running.current = [dialogRef.current!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: "both" })];
      } else {
        const start = fromCard(from);
        const timing = { duration: OPEN_MS, easing: EASE, fill: "both" as const };
        running.current = [
          backdropRef.current!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: "both" }),
          panelRef.current!.animate([{ clipPath: start.panel }, { clipPath: "inset(0px 0px 0px 0px round 28px)" }], timing),
          mediaRef.current!.animate(
            [start.media, { transform: "translate(0px, 0px) scale(1)", clipPath: "inset(0px 0px 0px 0px round 16px)" }],
            timing
          ),
          textRef.current!.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], {
            duration: 420,
            delay: 220,
            easing: EASE,
            fill: "both",
          }),
        ];
      }
      closeRef.current?.focus({ preventScroll: true });
    } else if (direction !== 0 && !reduced()) {
      mediaRef.current!.animate([{ opacity: 0, transform: `translateX(${direction * 48}px)` }, { opacity: 1, transform: "none" }], {
        duration: 420,
        easing: EASE,
      });
    }
  }, [box, card, direction, fromCard, index]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    running.current.forEach((a) => a.finish());
    const to = card(index);
    let anims: Animation[];
    if (reduced() || !to || to.style.display === "none") {
      anims = [dialogRef.current!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "both" })];
    } else {
      const end = fromCard(to);
      const timing = { duration: CLOSE_MS, easing: "cubic-bezier(0.5, 0, 0.2, 1)", fill: "both" as const };
      anims = [
        textRef.current!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "both" }),
        panelRef.current!.animate([{ clipPath: "inset(0px 0px 0px 0px round 28px)" }, { clipPath: end.panel }], timing),
        mediaRef.current!.animate(
          [{ transform: "translate(0px, 0px) scale(1)", clipPath: "inset(0px 0px 0px 0px round 16px)" }, end.media],
          timing
        ),
        backdropRef.current!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CLOSE_MS, fill: "both" }),
      ];
    }
    Promise.all(anims.map((a) => a.finished)).then(() => {
      if (hiddenCard.current) hiddenCard.current.style.visibility = "";
      onClosed();
    });
  }, [card, fromCard, index, onClosed]);

  // the page stays put underneath; keys: Esc closes, arrows go to the next or previous review
  useEffect(() => {
    const html = document.documentElement;
    const gap = window.innerWidth - html.clientWidth;
    const before = { overflow: html.style.overflow, padding: document.body.style.paddingRight };
    html.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    return () => {
      html.style.overflow = before.overflow;
      document.body.style.paddingRight = before.padding;
    };
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight" && count > 1) onStep(1);
      else if (event.key === "ArrowLeft" && count > 1) onStep(-1);
      else if (event.key === "Tab") {
        // keep Tab inside the panel
        const focusable = [...dialogRef.current!.querySelectorAll<HTMLElement>("a[href], button:not([disabled]):not([tabindex='-1'])")];
        const first = focusable[0];
        const lastOne = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          lastOne.focus();
        } else if (!event.shiftKey && document.activeElement === lastOne) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, count, onStep]);

  // swipe the picture sideways for the next one
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onSwipeStart = (event: React.PointerEvent) => {
    swipe.current = { x: event.clientX, y: event.clientY };
  };
  const onSwipeEnd = (event: React.PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || count < 2) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(event.clientY - start.y)) onStep(dx < 0 ? 1 : -1);
  };

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="review-panel-title" className="fixed inset-0 z-50 text-accent-foreground">
      <button
        ref={backdropRef}
        type="button"
        aria-label="Close review"
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
        onClick={close}
      />
      <div
        ref={panelRef}
        className="absolute inset-3 flex flex-col overflow-hidden rounded-[28px] bg-accent sm:inset-6 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:flex-row lg:transition-[width] lg:duration-500"
        style={box?.panel ? { width: box.panel.w, height: box.panel.h } : undefined}
      >
        <div
          className="min-h-0 flex-1 px-4 pb-3 pt-16 sm:px-6 lg:flex-none lg:p-8"
          style={box?.panel ? { width: box.w + PANEL.pad * 2 } : undefined}
        >
          <div ref={areaRef} className="flex h-full w-full overflow-y-auto overscroll-contain rounded-2xl lg:overflow-visible">
            <div
              ref={mediaRef}
              className="relative m-auto shrink-0 overflow-hidden rounded-2xl bg-foreground shadow-2xl shadow-black/40 touch-pan-y"
              style={box ? { width: box.w, height: box.h } : { visibility: "hidden" }}
              onPointerDown={onSwipeStart}
              onPointerUp={onSwipeEnd}
            >
              {/* the card's copy (already loaded) shows at once; the sharp one fades in over it */}
              <Image key={`${review.src}-card`} src={review.src} alt="" width={review.width} height={review.height} sizes={CARD_SIZES} draggable={false} className="absolute inset-0 h-full w-full object-contain" />
              <Image
                key={review.src}
                src={review.src}
                alt={`Customer review ${index + 1} of ${count}: a message or photo a customer sent us`}
                width={review.width}
                height={review.height}
                sizes="(min-width: 1024px) 620px, 100vw"
                loading="eager"
                draggable={false}
                onLoad={() => setLoaded(review.src)}
                className={cn("absolute inset-0 h-full w-full object-contain transition-opacity duration-300", sharp ? "opacity-100" : "opacity-0")}
              />
            </div>
          </div>
        </div>
        <div ref={textRef} className="flex shrink-0 flex-col gap-2 px-5 pb-5 sm:gap-3 sm:px-8 sm:pb-8 lg:w-[440px] lg:justify-center lg:py-12 lg:pl-4 lg:pr-12">
          <p className="text-xs font-bold tabular-nums tracking-[0.2em]">
            {pad(index + 1)} / {pad(count)}
          </p>
          <h3 id="review-panel-title" className="font-display text-2xl uppercase leading-[0.95] tracking-tight sm:text-4xl lg:text-5xl">
            Real drip, real people
          </h3>
          <p className="hidden max-w-sm text-sm text-accent-foreground/70 sm:block sm:text-base">
            Sent to us on WhatsApp and Instagram after their order arrived. Names and numbers are blurred to keep our
            customers&apos; details private.
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 lg:mt-3">
            {count > 1 && (
              <>
                <button type="button" aria-label="Previous review" onClick={() => onStep(-1)} className={ROUND_ON_LIME}>
                  <Chevron back />
                </button>
                <button type="button" aria-label="Next review" onClick={() => onStep(1)} className={ROUND_ON_LIME}>
                  <Chevron />
                </button>
              </>
            )}
            <LinkButton href="/shop" size="md" className="ml-1">
              Shop the Drop
            </LinkButton>
          </div>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          className="absolute right-3 top-3 rounded-full bg-foreground px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-accent transition-opacity hover:opacity-85 sm:right-4 sm:top-4"
        >
          Close
        </button>
      </div>
    </div>
  );
}
