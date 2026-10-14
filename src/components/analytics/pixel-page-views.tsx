"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Tells the Meta Pixel about each page after the first (GA counts page changes itself). */
export function PixelPageViews() {
  const pathname = usePathname();
  const counted = useRef<string | null>(null);

  useEffect(() => {
    // the Pixel's own snippet counts the first page; after that, each new page once
    const first = counted.current === null;
    if (counted.current === pathname) return;
    counted.current = pathname;
    if (!first) window.fbq?.("track", "PageView");
  }, [pathname]);

  return null;
}
