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
  city: z.string().trim().min(2, "Enter your city"),
  state: z.string().trim().min(2, "Enter your state"),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  instagramUsername: z.string().trim().optional(),
  orderNotes: z.string().trim().optional(),
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export const cartItemPayloadSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.number().int().positive().max(20),
});

export const placeOrderSchema = z.object({
  ...checkoutFormSchema.shape,
  upiTransactionId: z.string().trim().min(4, "Enter your UPI transaction/reference ID"),
  items: z.array(cartItemPayloadSchema).min(1, "Your cart is empty"),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
