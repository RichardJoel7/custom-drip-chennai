"use client";

import { useEffect } from "react";
import { trackPurchase, trackViewItem, type TrackedItem } from "@/lib/analytics/track";

/** Counts a product page view (for Google Analytics and the Meta Pixel). */
export function TrackProductView({ item }: { item: TrackedItem }) {
  const { id, name, price, quantity, variant } = item;
  useEffect(() => {
    trackViewItem({ id, name, price, quantity, variant });
  }, [id, name, price, quantity, variant]);
  return null;
}

/** Counts the sale on the order page, once per order. */
export function TrackPurchase({ order }: { order: Parameters<typeof trackPurchase>[0] }) {
  const { orderNumber } = order;
  useEffect(() => {
    trackPurchase(order);
    // once per order: `order` is rebuilt on every render, the order number isn't
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);
  return null;
}
