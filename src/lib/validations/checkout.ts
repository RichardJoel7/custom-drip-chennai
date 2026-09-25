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

export const placementPayloadSchema = z.object({
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
  .refine((item) => new Set(item.placements.map((p) => `${p.side}:${p.printOptionId}`)).size === item.placements.length, {
    message: "Each print size can only be used once per side",
  });

export const placeOrderSchema = z.object({
  ...checkoutFormSchema.shape,
  upiTransactionId: z.string().trim().min(4, "Enter your UPI transaction/reference ID"),
  items: z
    .array(z.union([customItemPayloadSchema, productItemPayloadSchema]))
    .min(1, "Your cart is empty")
    .max(50, "Too many items in one order"),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
