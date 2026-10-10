import { z } from "zod";

export const checkoutFormSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  email: z.string().trim().min(1, "Enter your email").email("Enter a valid email"),
  addressLine1: z.string().trim().min(5, "Enter your address"),
  addressLine2: z.string().trim().optional(),
  area: z.string().trim().optional(),
  city: z.string().trim().min(2, "Choose or type your city"),
  state: z.string().trim().min(2, "Choose or type your state"),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  instagramUsername: z.string().trim().optional(),
  orderNotes: z.string().trim().optional(),
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

/** What "Save these details for future orders" keeps — everything except the order notes. */
export const savedDetailsSchema = checkoutFormSchema.omit({ orderNotes: true });

export type SavedCheckoutDetails = z.infer<typeof savedDetailsSchema>;

// `type` is optional so a tab opened before custom tees shipped can still check out.
export const productItemPayloadSchema = z.object({
  type: z.literal("product").optional(),
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.number().int().positive().max(20),
});

const fixedPlacementSchema = z.object({
  kind: z.literal("fixed").optional(),
  side: z.enum(["front", "back"]),
  printOptionId: z.string().uuid(),
  designId: z.string().uuid(),
  designSource: z.enum(["hub", "upload"]),
  transform: z
    .object({
      scale: z.number().min(0.2).max(1),
      dx: z.number().min(-100).max(100),
      dy: z.number().min(-100).max(100),
    })
    .nullable(),
});

const customPlacementSchema = z.object({
  kind: z.literal("custom"),
  side: z.enum(["front", "back"]),
  designId: z.string().uuid(),
  designSource: z.enum(["hub", "upload"]),
  rect: z.object({
    x: z.number().min(-300).max(300),
    y: z.number().min(-300).max(300),
    w: z.number().min(2).max(200),
    h: z.number().min(2).max(200),
  }),
});

export const placementPayloadSchema = z.union([customPlacementSchema, fixedPlacementSchema]);

export const customItemPayloadSchema = z
  .object({
    type: z.literal("custom"),
    garmentId: z.string().uuid(),
    colorId: z.string().uuid(),
    sizeId: z.string().uuid(),
    // optional: carts saved before GSM options existed don't have it
    gsmId: z.string().uuid().nullable().optional(),
    placements: z
      .array(placementPayloadSchema, { message: "One of your custom tees is from an older version. Please design it again." })
      .min(1, "Choose at least one print")
      .max(8, "A garment can have up to 8 prints"),
    quantity: z.number().int().positive().max(20),
  })
  .refine(
    (item) =>
      new Set(item.placements.map((p) => (p.kind === "custom" ? `${p.side}:custom` : `${p.side}:${p.printOptionId}`))).size ===
      item.placements.length,
    { message: "Each print can only be used once per side" }
  );

export const placeOrderSchema = z
  .object({
    ...checkoutFormSchema.shape,
    // "cashfree": paid online after the order is created; "upi_manual": paid first, ID typed in
    paymentMethod: z.enum(["cashfree", "upi_manual"]).default("upi_manual"),
    // "buy_now": one item from a Buy Now button, so paying for it must leave the cart alone
    source: z.enum(["cart", "buy_now"]).default("cart"),
    upiTransactionId: z.string().trim().optional(),
    // a discount code (0019_coupons.sql); checked again by the database when the order is placed
    couponCode: z.string().trim().max(30).optional(),
    items: z
      .array(z.union([customItemPayloadSchema, productItemPayloadSchema]))
      .min(1, "Your cart is empty")
      .max(50, "Too many items in one order"),
  })
  .refine((order) => order.paymentMethod === "cashfree" || (order.upiTransactionId ?? "").length >= 4, {
    message: "Enter your UPI transaction/reference ID",
    path: ["upiTransactionId"],
  });

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
