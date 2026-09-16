import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const metadata: Metadata = { title: "Add New T-Shirt" };

export default async function NewProductPage() {
  await requireAdmin();

  return (
    <div>
      <Link href="/admin/products" className="text-sm text-muted-foreground underline underline-offset-4">
        ← Back to Products
      </Link>
      <h1 className="mt-2 font-display text-3xl tracking-wide">ADD NEW T-SHIRT</h1>
      <div className="mt-6">
        <ProductForm />
      </div>
    </div>
  );
}
