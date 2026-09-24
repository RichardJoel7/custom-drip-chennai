"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cartLineKey } from "@/lib/custom/pricing";
import type { CartItem } from "@/types";

const STORAGE_KEY = "cdc_cart_v1";

// Module-level store synced to localStorage. Using useSyncExternalStore (rather than an
// effect that calls setState after mount) is the hydration-safe way to read a client-only
// external store: React renders the empty server snapshot on the first pass and swaps in
// the real client snapshot without a manual "isHydrated" effect.
let cartItems: CartItem[] = [];
let storageLoaded = false;
const listeners = new Set<() => void>();

function loadFromStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistToStorage() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
  } catch {
    // storage unavailable (private browsing etc.) — cart just won't persist
  }
}

function setCartItems(next: CartItem[]) {
  cartItems = next;
  persistToStorage();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CartItem[] {
  if (!storageLoaded) {
    cartItems = loadFromStorage();
    storageLoaded = true;
  }
  return cartItems;
}

const EMPTY_CART: CartItem[] = [];

function getServerSnapshot(): CartItem[] {
  return EMPTY_CART;
}

function addItem(item: CartItem) {
  const key = cartLineKey(item);
  const existing = cartItems.find((i) => cartLineKey(i) === key);
  if (existing) {
    const nextQty = Math.min(existing.quantity + item.quantity, item.maxStock);
    setCartItems(cartItems.map((i) => (cartLineKey(i) === key ? { ...i, quantity: nextQty } : i)));
  } else {
    setCartItems([...cartItems, item]);
  }
}

function removeItem(lineKey: string) {
  setCartItems(cartItems.filter((i) => cartLineKey(i) !== lineKey));
}

function updateQuantity(lineKey: string, quantity: number) {
  setCartItems(
    cartItems
      .map((i) => (cartLineKey(i) === lineKey ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxStock)) } : i))
      .filter((i) => i.quantity > 0)
  );
}

function clearCart() {
  setCartItems([]);
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  isHydrated: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

function useIsHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isHydrated = useIsHydrated();

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  // Subtotals live in usePricedCart, which re-prices custom tees from the current price list.
  const value = useMemo(
    () => ({ items, addItem, removeItem, updateQuantity, clearCart, itemCount, isHydrated }),
    [items, itemCount, isHydrated]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
