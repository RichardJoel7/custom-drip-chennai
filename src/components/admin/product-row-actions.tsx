"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteProduct,
  duplicateProduct,
  setProductActive,
} from "@/app/admin/(dashboard)/products/actions";

export function ProductRowActions({
  productId,
  isActive,
}: {
  productId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDuplicate() {
    setError(null);
    startTransition(async () => {
      const result = await duplicateProduct(productId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleToggleActive() {
    setError(null);
    startTransition(async () => {
      const result = await setProductActive(productId, !isActive);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    if (!window.confirm("Delete this product? This can't be undone.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProduct(productId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide">
      <a href={`/admin/products/${productId}`} className="underline underline-offset-4">
        Edit
      </a>
      <button type="button" disabled={isPending} onClick={handleDuplicate} className="underline underline-offset-4">
        Duplicate
      </button>
      <button type="button" disabled={isPending} onClick={handleToggleActive} className="underline underline-offset-4">
        {isActive ? "Deactivate" : "Activate"}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={handleDelete}
        className="text-danger underline underline-offset-4"
      >
        Delete
      </button>
      {error && <p className="w-full text-danger normal-case">{error}</p>}
    </div>
  );
}
