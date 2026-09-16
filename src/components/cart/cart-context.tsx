"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
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
  const existing = cartItems.find((i) => i.variantId === item.variantId);
  if (existing) {
    const nextQty = Math.min(existing.quantity + item.quantity, item.maxStock);
    setCartItems(cartItems.map((i) => (i.variantId === item.variantId ? { ...i, quantity: nextQty } : i)));
  } else {
    setCartItems([...cartItems, item]);
  }
}

function removeItem(variantId: string) {
  setCartItems(cartItems.filter((i) => i.variantId !== variantId));
}

function updateQuantity(variantId: string, quantity: number) {
  setCartItems(
    cartItems
      .map((i) => (i.variantId === variantId ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxStock)) } : i))
      .filter((i) => i.quantity > 0)
  );
}

function clearCart() {
  setCartItems([]);
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
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

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, addItem, removeItem, updateQuantity, clearCart, subtotal, itemCount, isHydrated }),
    [items, subtotal, itemCount, isHydrated]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
