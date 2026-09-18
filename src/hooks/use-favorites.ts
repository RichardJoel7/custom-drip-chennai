"use client";

import { useCallback, useSyncExternalStore } from "react";

// Purely a local, client-side "save for later" — there are no customer accounts (guest
// checkout only), so this never touches the server. Mirrors cart-context's
// useSyncExternalStore + localStorage pattern for the same hydration-safe reason.
const STORAGE_KEY = "cdc_favorites_v1";

let favoriteIds: string[] = [];
let storageLoaded = false;
const listeners = new Set<() => void>();

function loadFromStorage(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistToStorage() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteIds));
  } catch {
    // storage unavailable (private browsing etc.) — favorites just won't persist
  }
}

function setFavoriteIds(next: string[]) {
  favoriteIds = next;
  persistToStorage();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): string[] {
  if (!storageLoaded) {
    favoriteIds = loadFromStorage();
    storageLoaded = true;
  }
  return favoriteIds;
}

const EMPTY: string[] = [];
function getServerSnapshot(): string[] {
  return EMPTY;
}

export function useIsFavorited(productId: string): boolean {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return ids.includes(productId);
}

export function useToggleFavorite(productId: string) {
  return useCallback(() => {
    setFavoriteIds(
      favoriteIds.includes(productId)
        ? favoriteIds.filter((id) => id !== productId)
        : [...favoriteIds, productId]
    );
  }, [productId]);
}
