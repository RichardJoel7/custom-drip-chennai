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
      <div className="flex aspect-[4/5] w-full items-center justify-center bg-muted text-muted-foreground">
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
    <div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
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
        <div className="mt-3 flex justify-center gap-2">
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
  );
}
