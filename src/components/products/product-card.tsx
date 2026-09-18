"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils/format";
import {
  availableColorsForProduct,
  availableSizesForProduct,
  isProductInStock,
} from "@/lib/utils/product-helpers";
import type { ProductWithDetails } from "@/types";

export function ProductCard({ product }: { product: ProductWithDetails }) {
  const images = product.product_images;
  const mainIndex = Math.max(
    images.findIndex((i) => i.is_main),
    0
  );
  const [activeIndex, setActiveIndex] = useState(mainIndex);
  const activeImage = images[activeIndex];
  const colors = availableColorsForProduct(product);
  const sizes = availableSizesForProduct(product);
  const inStock = isProductInStock(product);

  function showPrev(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex((i) => (i - 1 + images.length) % images.length);
  }

  function showNext(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex((i) => (i + 1) % images.length);
  }

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-muted">
        {activeImage ? (
          <Image
            src={activeImage.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image yet
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-col gap-1.5">
          {product.compare_at_price && product.compare_at_price > product.price && (
            <Badge tone="accent">Sale</Badge>
          )}
          {!inStock && <Badge tone="danger">Sold Out</Badge>}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={showPrev}
              className="glass absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={showNext}
              className="glass absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <ChevronIcon direction="right" />
            </button>
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
              {images.map((image, i) => (
                <span
                  key={image.id}
                  className={`h-1 rounded-full transition-all ${
                    i === activeIndex ? "w-4 bg-white" : "w-1 bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="text-sm font-semibold sm:text-base">{product.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold sm:text-base">{formatPrice(product.price)}</span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>
        {(colors.length > 0 || sizes.length > 0) && (
          <p className="text-xs text-muted-foreground">
            {colors.length > 0 && colors.join(" / ")}
            {colors.length > 0 && sizes.length > 0 && " · "}
            {sizes.length > 0 && sizes.join(", ")}
          </p>
        )}
      </div>
    </Link>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
