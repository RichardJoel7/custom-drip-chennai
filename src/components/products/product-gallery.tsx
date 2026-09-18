"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { ProductImage } from "@/types";

export function ProductGallery({
  images,
  productName,
}: {
  images: ProductImage[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        No image yet
      </div>
    );
  }

  function scrollToIndex(index: number) {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({ left: index * container.clientWidth, behavior: "smooth" });
    setActiveIndex(index);
  }

  function handleScroll() {
    const container = scrollRef.current;
    if (!container) return;
    const index = Math.round(container.scrollLeft / container.clientWidth);
    setActiveIndex(index);
  }

  return (
    <div className="sm:flex sm:gap-3">
      {/* Thumbnail rail — desktop only; mobile relies on swipe + dots below instead. */}
      {images.length > 1 && (
        <div className="hidden sm:flex sm:w-20 sm:flex-none sm:flex-col sm:gap-2.5">
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              aria-label={`View photo ${i + 1}`}
              aria-pressed={i === activeIndex}
              onClick={() => scrollToIndex(i)}
              className={cn(
                "relative aspect-[4/5] w-full overflow-hidden rounded-xl border-2 transition-colors",
                i === activeIndex ? "border-foreground" : "border-transparent hover:border-border"
              )}
            >
              <Image
                src={image.image_url}
                alt={`${productName} — thumbnail ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-2xl"
          >
            {images.map((image, i) => (
              <div key={image.id} className="relative aspect-[4/5] w-full flex-none snap-start bg-muted">
                <Image
                  src={image.image_url}
                  alt={`${productName} — photo ${i + 1}`}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() => scrollToIndex((activeIndex - 1 + images.length) % images.length)}
                className="glass absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white sm:flex"
              >
                <ChevronIcon direction="left" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={() => scrollToIndex((activeIndex + 1) % images.length)}
                className="glass absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white sm:flex"
              >
                <ChevronIcon direction="right" />
              </button>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="mt-3 flex justify-center gap-2 sm:hidden">
            {images.map((image, i) => (
              <button
                key={image.id}
                type="button"
                aria-label={`View photo ${i + 1}`}
                onClick={() => scrollToIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === activeIndex ? "w-6 bg-foreground" : "w-1.5 bg-border"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
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
