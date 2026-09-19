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
  product_id: string;
  variant_id: string | null;
  product_name: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
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

// Client-side cart (persisted to localStorage, never trusted for pricing).
export interface CartItem {
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
