"use client";

import { useSyncExternalStore } from "react";
import type { CartItem } from "@/types";

// "Buy Now" checks out one item on its own and leaves the cart as it was. The item waits in
// sessionStorage (this tab only, so it survives a sign-in round trip) until it's paid for or
// replaced by the next Buy Now. Like the cart, a tiny store read with useSyncExternalStore.
const STORAGE_KEY = "cdc_buy_now_v1";

let current: CartItem | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function read(): CartItem | null {
  if (!loaded) {
    loaded = true;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      current = raw ? (JSON.parse(raw) as CartItem) : null;
    } catch {
      current = null;
    }
  }
  return current;
}

function write(item: CartItem | null) {
  current = item;
  loaded = true;
  try {
    if (item) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(item));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked: Buy Now still works in this page, it just won't survive a reload
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Where Buy Now sends people: checkout with just this item. */
export const BUY_NOW_CHECKOUT = "/checkout?buy=now";

export function setBuyNowItem(item: CartItem) {
  write(item);
}

export function clearBuyNowItem() {
  write(null);
}

/** The item waiting to be bought on its own, if any (null until the browser has loaded it). */
export function useBuyNowItem(): CartItem | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
