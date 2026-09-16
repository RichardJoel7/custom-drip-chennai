import { z } from "zod";

export const variantInputSchema = z.object({
  size: z.string().trim().min(1),
  color: z.string().trim().min(1),
  stock_quantity: z.coerce.number().int().min(0),
});

export const productFormSchema = z.object({
  name: z.string().trim().min(2, "Enter a T-shirt name"),
  description: z.string().trim().optional(),
  price: z.coerce.number().positive("Enter a valid price"),
  compare_at_price: z
    .union([z.coerce.number().positive(), z.nan(), z.literal("")])
    .optional()
    .transform((v) => (v === undefined || v === "" || Number.isNaN(v) ? null : v)),
  category: z.string().trim().optional(),
  fabric: z.string().trim().optional(),
  fit: z.string().trim().optional(),
  gsm: z.string().trim().optional(),
  print_type: z.string().trim().optional(),
  care_instructions: z.string().trim().optional(),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sizes: z.array(z.string()).min(1, "Select at least one size"),
  colors: z.array(z.string()).min(1, "Select at least one colour"),
  variants: z.array(variantInputSchema).default([]),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
