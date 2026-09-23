"use client";

import { getImageProps, type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils/cn";

export interface HeroSlide {
  /** Shown on tablet/desktop. */
  desktopSrc: StaticImageData;
  /** Shown on phones. Falls back to desktopSrc. */
  mobileSrc?: StaticImageData;
  href: string;
  label: string;
  /** Only the primary slide shows the "DRIPPIN'" heading, tagline and Shop pill. */
  showHeading?: boolean;
}

const AUTO_ADVANCE_MS = 6000;
const HERO_QUALITY = 90;

// The box takes the artwork's own aspect ratio so edge-to-edge banner text is never cropped.
export function HeroCarousel({
  slides,
  desktopAspect,
  mobileAspect,
}: {
  slides: HeroSlide[];
  desktopAspect: number;
  mobileAspect: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [slides.length, index]);

  const active = slides[index];

  return (
    <section
      className="relative -mt-16 aspect-(--hero-mobile) w-full overflow-hidden bg-foreground text-white sm:aspect-(--hero-desktop)"
      style={{ "--hero-mobile": mobileAspect, "--hero-desktop": desktopAspect } as CSSProperties}
    >
      {slides.map((slide, i) => (
        <Link
          key={slide.href}
          href={slide.href}
          aria-label={slide.label}
          className={cn(
            "absolute inset-0 block transition-opacity duration-700",
            i === index ? "z-0 opacity-100" : "-z-10 opacity-0 pointer-events-none"
          )}
        >
          <SlideImage slide={slide} eager={i === 0} />
          {slide.showHeading && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/50" />
          )}
        </Link>
      ))}

      {active.showHeading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-end px-4 pb-10 text-center sm:px-6 sm:pb-16">
          <div className="relative">
            <span
              aria-hidden="true"
              className="text-outline-white font-sans pointer-events-none absolute inset-0 flex translate-y-2 select-none items-center justify-center text-[clamp(3.25rem,14vw,10.5rem)] font-black leading-[0.9] tracking-tight [font-stretch:85%] sm:translate-y-3"
            >
              DRIPPIN&apos;
            </span>
            <h1 className="relative font-sans text-[clamp(3.25rem,14vw,10.5rem)] font-black leading-[0.9] tracking-tight [font-stretch:85%]">
              DRIPPIN&apos;
            </h1>
          </div>
          <p className="mx-auto mt-4 max-w-md text-base text-white/85 sm:text-lg">
            Original graphic tees from Custom Drip Chennai.
          </p>
          <span className="glass-light mt-6 inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-semibold uppercase tracking-wide text-foreground shadow-lg shadow-black/5">
            {active.label}
          </span>
        </div>
      )}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
            className="glass absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white sm:left-6"
          >
            <ChevronIcon direction="left" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => setIndex((i) => (i + 1) % slides.length)}
            className="glass absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white sm:right-6"
          >
            <ChevronIcon direction="right" />
          </button>
          <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2 sm:bottom-6">
            {slides.map((slide, i) => (
              <button
                key={slide.href}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full shadow-sm shadow-black/40 transition-all",
                  i === index ? "w-6 bg-white" : "w-1.5 bg-white/60"
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// Art direction via <picture>: each device downloads only its own artwork.
function SlideImage({ slide, eager }: { slide: HeroSlide; eager: boolean }) {
  const common = {
    alt: "",
    fill: true,
    sizes: "100vw",
    quality: HERO_QUALITY,
    loading: eager ? "eager" : "lazy",
    fetchPriority: eager ? "high" : "auto",
  } as const;
  const { props: desktop } = getImageProps({ ...common, src: slide.desktopSrc });
  const mobileSrcSet = slide.mobileSrc ? getImageProps({ ...common, src: slide.mobileSrc }).props.srcSet : undefined;

  return (
    <picture>
      {mobileSrcSet && <source media="(max-width: 639px)" srcSet={mobileSrcSet} />}
      <img {...desktop} alt="" className="object-cover" />
    </picture>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
