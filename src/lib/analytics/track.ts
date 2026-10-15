// Shop events for Google Analytics 4 and the Meta Pixel (Instagram/Facebook ads). Every call
// does nothing until the tags are on the page (no IDs set, or blocked by the browser), so they
// are safe to call from anywhere in the browser.
import type { CartItem } from "@/types";

type TagFunction = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: TagFunction;
    fbq?: TagFunction;
  }
}

export interface TrackedItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  /** e.g. "Black / L" */
  variant?: string;
}

const CURRENCY = "INR";

function send(ga: [string, Record<string, unknown>], meta: [string, Record<string, unknown>, { eventID: string }?]) {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", ...ga);
  } catch {
    // a tag failing must never break the shop
  }
  try {
    window.fbq?.("track", ...meta);
  } catch {
    // as above
  }
}

const total = (items: TrackedItem[]) => items.reduce((sum, i) => sum + i.price * i.quantity, 0);

const gaItems = (items: TrackedItem[]) =>
  items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity, item_variant: i.variant }));

const metaItems = (items: TrackedItem[]) => ({
  content_ids: items.map((i) => i.id),
  contents: items.map((i) => ({ id: i.id, quantity: i.quantity, item_price: i.price })),
  content_type: "product",
  num_items: items.reduce((sum, i) => sum + i.quantity, 0),
});

/** A cart line as a tracked item; custom tees are grouped by garment. */
export function trackedCartItem(item: CartItem, unitPrice?: number | null): TrackedItem {
  const price = unitPrice ?? item.price;
  if (item.kind === "custom") {
    return {
      id: `custom-${item.config.garmentId}`,
      name: item.name,
      price,
      quantity: item.quantity,
      variant: [item.colorName, item.sizeLabel].filter(Boolean).join(" / "),
    };
  }
  return { id: item.productId, name: item.name, price, quantity: item.quantity, variant: `${item.color} / ${item.size}` };
}

export function trackViewItem(item: TrackedItem) {
  send(
    ["view_item", { currency: CURRENCY, value: item.price, items: gaItems([item]) }],
    ["ViewContent", { currency: CURRENCY, value: item.price, content_name: item.name, ...metaItems([item]) }]
  );
}

export function trackAddToCart(items: TrackedItem[]) {
  send(
    ["add_to_cart", { currency: CURRENCY, value: total(items), items: gaItems(items) }],
    ["AddToCart", { currency: CURRENCY, value: total(items), ...metaItems(items) }]
  );
}

export function trackBeginCheckout(items: TrackedItem[]) {
  send(
    ["begin_checkout", { currency: CURRENCY, value: total(items), items: gaItems(items) }],
    ["InitiateCheckout", { currency: CURRENCY, value: total(items), ...metaItems(items) }]
  );
}

export function trackAddPaymentInfo(items: TrackedItem[], value: number) {
  send(
    ["add_payment_info", { currency: CURRENCY, value, items: gaItems(items) }],
    ["AddPaymentInfo", { currency: CURRENCY, value, ...metaItems(items) }]
  );
}

/**
 * The sale, once per order: reloading the order page doesn't count it again. The order number
 * is also Meta's event ID, so the same sale reported twice is counted once.
 */
export function trackPurchase(order: {
  orderNumber: string;
  value: number;
  shipping: number;
  coupon?: string | null;
  items: TrackedItem[];
}) {
  const key = `cdc_tracked_${order.orderNumber}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    // private browsing: report it anyway
  }
  send(
    [
      "purchase",
      {
        transaction_id: order.orderNumber,
        currency: CURRENCY,
        value: order.value,
        shipping: order.shipping,
        ...(order.coupon ? { coupon: order.coupon } : {}),
        items: gaItems(order.items),
      },
    ],
    ["Purchase", { currency: CURRENCY, value: order.value, ...metaItems(order.items) }, { eventID: order.orderNumber }]
  );
}

export function trackSearch(term: string) {
  send(["search", { search_term: term }], ["Search", { search_string: term }]);
}
