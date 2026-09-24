// Shared domain types for Custom Drip Chennai.
// These mirror the Supabase schema in supabase/migrations/0001_tables.sql.

export type PaymentStatus = "pending_verification" | "paid" | "rejected";

// Deliberately kept minimal for a two-person team: New -> Payment Confirmed -> Shipped ->
// Delivered (or Cancelled). Payment confirmation and shipping each automatically email the
// customer (see src/services/notifications.ts) — there's no separate Processing/Printing/
// Packed step to remember to click through.
export type OrderStatus = "new" | "payment_confirmed" | "shipped" | "delivered" | "cancelled";

export const ORDER_STATUS_SEQUENCE: OrderStatus[] = ["new", "payment_confirmed", "shipped", "delivered"];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  payment_confirmed: "Payment Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending_verification: "Pending Verification",
  paid: "Paid",
  rejected: "Rejected",
};

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
  is_main: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  color: string;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  category: string | null;
  gender: "men" | "women" | null;
  collections: string[];
  fabric: string | null;
  fit: string | null;
  gsm: string | null;
  print_type: string | null;
  care_instructions: string | null;
  is_featured: boolean;
  is_active: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductWithDetails extends Product {
  product_images: ProductImage[];
  product_variants: ProductVariant[];
}

export interface Customer {
  id: string;
  full_name: string;
  mobile_number: string;
  email: string;
  instagram_username: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
  // Absent on databases that haven't run 0009_custom_studio.sql yet.
  is_custom?: boolean;
  custom_details?: CustomItemDetails | null;
}

export interface Order {
  id: string;
  order_number: string;
  tracking_token: string;
  customer_id: string;
  full_name: string;
  mobile_number: string;
  email: string;
  instagram_username: string | null;
  address_line1: string;
  address_line2: string | null;
  area: string | null;
  city: string;
  state: string;
  pincode: string;
  order_notes: string | null;
  subtotal: number;
  shipping_fee: number;
  total: number;
  upi_transaction_id: string;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  courier_name: string | null;
  courier_tracking_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export interface Settings {
  id: number;
  store_name: string;
  instagram_url: string;
  contact_number: string | null;
  whatsapp_number: string | null;
  upi_id: string | null;
  upi_display_name: string | null;
  upi_qr_image_url: string | null;
  standard_shipping_fee: number;
  free_shipping_threshold: number;
  updated_at: string;
}

// --- Custom Studio -----------------------------------------------------------------

export type PrintSides = "front" | "back" | "both";
export type FrontPlacement = "center" | "left_chest";

export interface CustomTeeSize {
  id: string;
  label: string;
  price: number;
  sort_order: number;
  is_active: boolean;
}

/** A fabric weight; `price` is added to the tee price. */
export interface CustomTeeGsm {
  id: string;
  gsm: number;
  description: string | null;
  price: number;
  sort_order: number;
  is_active: boolean;
}

export interface CustomTeeColor {
  id: string;
  name: string;
  hex: string;
  sort_order: number;
  is_active: boolean;
}

/** A null price means that side combination isn't offered for this print size. */
export interface CustomPrintOption {
  id: string;
  name: string;
  description: string | null;
  width_cm: number;
  height_cm: number;
  front_placement: FrontPlacement;
  price_front: number | null;
  price_back: number | null;
  price_both: number | null;
  sort_order: number;
  is_active: boolean;
}

export interface CustomCatalog {
  sizes: CustomTeeSize[];
  colors: CustomTeeColor[];
  /** Empty when the admin offers no GSM choice (or 0010 hasn't been run yet). */
  gsmOptions: CustomTeeGsm[];
  printOptions: CustomPrintOption[];
}

export interface Design {
  id: string;
  name: string;
  category: string | null;
  image_url: string;
  storage_path: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export type StudioDesign = Pick<Design, "id" | "name" | "category" | "image_url">;

/** What the customer picked — the only thing the server trusts; it re-prices from the DB. */
export interface CustomTeeConfig {
  colorId: string;
  sizeId: string;
  /** Missing on carts saved before GSM options existed. */
  gsmId?: string | null;
  printOptionId: string;
  sides: PrintSides;
  frontDesignId: string | null;
  backDesignId: string | null;
}

/** Snapshot place_order() stores on a custom order line (built server-side from DB rows). */
export interface CustomItemDetails {
  color_hex: string;
  sides: PrintSides;
  tee_price: number;
  /** Absent on orders placed before GSM options existed. */
  gsm?: { id: string; gsm: number; price: number } | null;
  print_price: number;
  print_option: {
    id: string;
    name: string;
    width_cm: number;
    height_cm: number;
    front_placement: FrontPlacement;
  };
  front_design: { id: string; name: string; image_url: string } | null;
  back_design: { id: string; name: string; image_url: string } | null;
}

// --- Cart (persisted to localStorage, never trusted for pricing) -----------------------

export interface ProductCartItem {
  // Carts saved before custom tees existed have no `kind`, so it's optional here.
  kind?: "product";
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  image: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  maxStock: number;
}

export interface CustomCartItem {
  kind: "custom";
  /** Stable id derived from the config, so identical custom tees merge into one line. */
  key: string;
  config: CustomTeeConfig;
  name: string;
  colorName: string;
  colorHex: string;
  sizeLabel: string;
  /** e.g. "240 GSM"; missing on carts saved before GSM options existed. */
  gsmLabel?: string | null;
  printOption: Pick<CustomPrintOption, "name" | "width_cm" | "height_cm" | "front_placement">;
  frontDesign: StudioDesign | null;
  backDesign: StudioDesign | null;
  price: number;
  quantity: number;
  maxStock: number;
}

export type CartItem = ProductCartItem | CustomCartItem;
