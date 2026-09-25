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

/** One side of a garment. */
export type PrintSide = "front" | "back";
/** Which sides an order line prints on (kept on every order for labels). */
export type PrintSides = PrintSide | "both";
export type FrontPlacement = "center" | "left_chest";
export type GarmentGender = "men" | "women" | "unisex";

/** A box on a garment photo, as 0–1 fractions of the photo's width (x, w) and height (y, h). */
export interface PrintBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A point on a garment photo, as 0–1 fractions. */
export interface PhotoPoint {
  x: number;
  y: number;
}

/** A garment type in the studio, shown from its front and back photos. */
export interface CustomGarment {
  id: string;
  name: string;
  slug: string;
  gender: GarmentGender;
  description: string | null;
  front_image_url: string | null;
  front_storage_path: string | null;
  /** Photo width ÷ height. */
  front_aspect: number | null;
  back_image_url: string | null;
  back_storage_path: string | null;
  back_aspect: number | null;
  front_area: PrintBox | null;
  back_area: PrintBox | null;
  /** Real-life width of the print-area boxes, which sets the true scale of prints. */
  area_width_cm: number | null;
  logo_spot: PhotoPoint | null;
  sort_order: number;
  is_active: boolean;
}

export interface MockupSide {
  imageUrl: string;
  aspect: number;
  area: PrintBox;
}

/** Everything needed to draw a garment mockup from its photos. */
export interface MockupSpec {
  front: MockupSide;
  back: MockupSide;
  areaWidthCm: number;
  logoSpot: PhotoPoint | null;
}

/** Real photos of one colour, shown as-is instead of auto-colouring the blank photo. */
export interface ColorPhotos {
  front: string | null;
  back: string | null;
}

export interface CustomTeeSize {
  id: string;
  garment_id: string;
  label: string;
  price: number;
  sort_order: number;
  is_active: boolean;
}

/** A fabric weight; `price` is added to the tee price. */
export interface CustomTeeGsm {
  id: string;
  garment_id: string;
  gsm: number;
  description: string | null;
  price: number;
  sort_order: number;
  is_active: boolean;
}

export interface CustomTeeColor {
  id: string;
  garment_id: string;
  name: string;
  hex: string;
  front_image_url: string | null;
  front_storage_path: string | null;
  back_image_url: string | null;
  back_storage_path: string | null;
  sort_order: number;
  is_active: boolean;
}

/**
 * A print size. price_front / price_back are per side (null = not offered on that side);
 * price_both, when set, is charged instead of both when the size is on the front and back.
 */
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

/** Sizes, colours and GSM carry their garment_id; print options are shared across garments. */
export interface CustomCatalog {
  garments: CustomGarment[];
  sizes: CustomTeeSize[];
  colors: CustomTeeColor[];
  gsmOptions: CustomTeeGsm[];
  printOptions: CustomPrintOption[];
  /** Which print options each garment allows, by garment id. */
  garmentPrintOptionIds: Record<string, string[]>;
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

export type DesignSource = "hub" | "upload";

/** Artwork the customer can print: a Design Hub design, or a file they uploaded. */
export type StudioDesign = Pick<Design, "id" | "name" | "category" | "image_url"> & {
  /** "upload" = the customer's own file (customer_designs); absent means a hub design. */
  source?: DesignSource;
  /** Pixel size of an upload, to warn when it's too small to print sharply. */
  width?: number | null;
  height?: number | null;
};

/** A design a customer uploaded (0012_print_placements.sql). */
export interface CustomerDesign {
  id: string;
  user_id: string;
  name: string;
  image_url: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  created_at: string;
}

/**
 * Where the customer moved or resized a print: its box scaled to 20–100% of the print size,
 * and its centre moved dx (right) / dy (down) cm from where that print size normally sits.
 */
export interface PrintTransform {
  scale: number;
  dx: number;
  dy: number;
}

export type PrintOptionSummary = Pick<CustomPrintOption, "id" | "name" | "width_cm" | "height_cm" | "front_placement">;

/** One print the customer placed: which side, which print size, which artwork. */
export interface PlacementConfig {
  side: PrintSide;
  printOptionId: string;
  designId: string;
  designSource: DesignSource;
  transform: PrintTransform | null;
}

/** What the customer picked — the only thing the server trusts; it re-prices from the DB. */
export interface CustomTeeConfig {
  /** Missing on carts saved before garments existed — those lines must be designed again. */
  garmentId?: string;
  colorId: string;
  sizeId: string;
  /** Missing on carts saved before GSM options existed. */
  gsmId?: string | null;
  /** Missing on carts saved before several prints per garment — designed again. */
  placements?: PlacementConfig[];
}

/** One print on an order line, as ordered (see place_order() in 0012_print_placements.sql). */
export interface PlacementSnapshot {
  side: PrintSide;
  print_option: PrintOptionSummary;
  design: { id: string; name: string; image_url: string; source?: DesignSource; width?: number | null; height?: number | null } | null;
  transform: PrintTransform | null;
}

/** Snapshot place_order() stores on a custom order line (built server-side from DB rows). */
export interface CustomItemDetails {
  color_hex: string;
  sides: PrintSides;
  tee_price: number;
  /** Absent on orders placed before GSM options existed. */
  gsm?: { id: string; gsm: number; price: number } | null;
  /** All the prints together, after any front & back rate. */
  print_price: number;
  /** Absent on orders placed before garments existed. */
  garment?: GarmentSnapshot | null;
  /** Present from 0012 on; older orders have one print size and a front/back design instead. */
  placements?: PlacementSnapshot[];
  print_option?: PrintOptionSummary;
  front_design?: { id: string; name: string; image_url: string } | null;
  back_design?: { id: string; name: string; image_url: string } | null;
}

/** The garment and mockup exactly as ordered (see place_order() in 0011_garments.sql). */
export interface GarmentSnapshot {
  id: string;
  name: string;
  gender: GarmentGender;
  front_image_url: string | null;
  front_aspect: number | null;
  back_image_url: string | null;
  back_aspect: number | null;
  front_area: PrintBox | null;
  back_area: PrintBox | null;
  area_width_cm: number | null;
  logo_spot: PhotoPoint | null;
  color_front_image_url: string | null;
  color_back_image_url: string | null;
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
  /** How to draw the thumbnail; missing on carts saved before garments existed. */
  mockup?: { spec: MockupSpec | null; colorPhotos: ColorPhotos | null };
  colorName: string;
  colorHex: string;
  sizeLabel: string;
  /** e.g. "240 GSM"; missing on carts saved before GSM options existed. */
  gsmLabel?: string | null;
  /** What's printed where, for display; missing on carts saved before several prints. */
  prints?: CartPrint[];
  price: number;
  quantity: number;
  maxStock: number;
}

export interface CartPrint {
  side: PrintSide;
  printOption: PrintOptionSummary;
  design: StudioDesign;
  transform: PrintTransform | null;
}

export type CartItem = ProductCartItem | CustomCartItem;
