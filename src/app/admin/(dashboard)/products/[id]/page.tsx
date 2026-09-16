import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getProductByIdForAdmin } from "@/services/products";

export const metadata: Metadata = { title: "Edit T-Shirt" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const product = await getProductByIdForAdmin(id);

  if (!product) notFound();

  return (
    <div>
      <Link href="/admin/products" className="text-sm text-muted-foreground underline underline-offset-4">
        ← Back to Products
      </Link>
      <h1 className="mt-2 font-display text-3xl tracking-wide">EDIT T-SHIRT</h1>
      <div className="mt-6">
        <ProductForm product={product} />
      </div>
    </div>
  );
}
