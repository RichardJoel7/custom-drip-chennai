"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { ImageUploader, type UploadedImage } from "@/components/admin/image-uploader";
import { COMMON_SIZES, COMMON_COLORS, availableSizesForProduct } from "@/lib/utils/product-helpers";
import { saveProduct, type SaveProductInput } from "@/app/admin/(dashboard)/products/actions";
import type { ProductWithDetails } from "@/types";

function variantKey(color: string, size: string) {
  return `${color}::${size}`;
}

export function ProductForm({ product }: { product?: ProductWithDetails }) {
  const router = useRouter();
  const isEditing = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [compareAtPrice, setCompareAtPrice] = useState(
    product?.compare_at_price ? String(product.compare_at_price) : ""
  );
  const [category, setCategory] = useState(product?.category ?? "");
  const [gender, setGender] = useState<"" | "men" | "women">(product?.gender ?? "");
  const [collections, setCollections] = useState<string[]>(product?.collections ?? []);
  const [collectionInput, setCollectionInput] = useState("");
  const [fabric, setFabric] = useState(product?.fabric ?? "");
  const [fit, setFit] = useState(product?.fit ?? "");
  const [gsm, setGsm] = useState(product?.gsm ?? "");
  const [printType, setPrintType] = useState(product?.print_type ?? "");
  const [careInstructions, setCareInstructions] = useState(product?.care_instructions ?? "");
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [isActive, setIsActive] = useState(product?.is_active ?? true);

  const [images, setImages] = useState<UploadedImage[]>(
    () =>
      product?.product_images.map((img) => ({
        id: img.id,
        imageUrl: img.image_url,
        isMain: img.is_main,
      })) ?? []
  );

  const [selectedSizes, setSelectedSizes] = useState<string[]>(() => {
    if (!product) return [...COMMON_SIZES];
    const sizes = availableSizesForProduct(product);
    return sizes.length > 0 ? sizes : [...COMMON_SIZES];
  });

  const [selectedColors, setSelectedColors] = useState<string[]>(() =>
    Array.from(new Set(product?.product_variants.map((v) => v.color) ?? []))
  );
  const [customColor, setCustomColor] = useState("");

  const [stock, setStock] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const v of product?.product_variants ?? []) {
      initial[variantKey(v.color, v.size)] = v.stock_quantity;
    }
    return initial;
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [storageFolder] = useState(
    () => product?.id ?? `tmp-${Math.random().toString(36).slice(2, 10)}`
  );

  function toggleSize(size: string) {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  }

  function toggleColor(color: string) {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  }

  function addCustomColor() {
    const trimmed = customColor.trim();
    if (!trimmed) return;
    if (!selectedColors.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedColors((prev) => [...prev, trimmed]);
    }
    setCustomColor("");
  }

  function addCollection() {
    const trimmed = collectionInput.trim();
    if (!trimmed) return;
    if (!collections.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setCollections((prev) => [...prev, trimmed]);
    }
    setCollectionInput("");
  }

  function removeCollection(collection: string) {
    setCollections((prev) => prev.filter((c) => c !== collection));
  }

  function updateStock(color: string, size: string, value: string) {
    const qty = Math.max(0, parseInt(value, 10) || 0);
    setStock((prev) => ({ ...prev, [variantKey(color, size)]: qty }));
  }

  async function handleSubmit() {
    setError(null);

    if (!name.trim()) return setError("Enter a T-shirt name.");
    const priceNum = Number(price);
    if (!(priceNum > 0)) return setError("Enter a valid price.");
    if (images.length === 0) return setError("Upload at least one photo.");
    if (selectedSizes.length === 0) return setError("Select at least one size.");
    if (selectedColors.length === 0) return setError("Select at least one colour.");

    const variants = selectedColors.flatMap((color) =>
      selectedSizes.map((size) => ({
        color,
        size,
        stock: stock[variantKey(color, size)] ?? 0,
      }))
    );

    const input: SaveProductInput = {
      id: product?.id,
      name,
      description,
      price: priceNum,
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
      category,
      gender,
      collections,
      fabric,
      fit,
      gsm,
      printType,
      careInstructions,
      isFeatured,
      isActive,
      images: images.map((img) => ({ id: img.id, imageUrl: img.imageUrl, isMain: img.isMain })),
      variants,
    };

    setSaving(true);
    const result = await saveProduct(input);
    setSaving(false);

    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/admin/products");
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Label htmlFor="name">T-Shirt Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Messiah Oversized Tee" />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Premium oversized cotton tee featuring..."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="price">Price (₹)</Label>
          <Input id="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="799" />
        </div>
        <div>
          <Label htmlFor="compareAtPrice">Compare At Price (optional)</Label>
          <Input
            id="compareAtPrice"
            inputMode="decimal"
            value={compareAtPrice}
            onChange={(e) => setCompareAtPrice(e.target.value)}
            placeholder="999"
          />
        </div>
      </div>

      <div>
        <Label>Photos</Label>
        <ImageUploader storageFolder={`products/${storageFolder}`} images={images} onChange={setImages} />
      </div>

      <div>
        <Label>Sizes</Label>
        <div className="flex flex-wrap gap-2">
          {COMMON_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => toggleSize(size)}
              className={`h-10 min-w-14 border px-3 text-sm font-semibold ${
                selectedSizes.includes(size)
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Colours</Label>
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set([...COMMON_COLORS, ...selectedColors])).map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => toggleColor(color)}
              className={`h-10 border px-3 text-sm font-semibold ${
                selectedColors.includes(color)
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background"
              }`}
            >
              {color}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            placeholder="Add a custom colour"
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={addCustomColor}>
            Add
          </Button>
        </div>
      </div>

      {selectedColors.length > 0 && selectedSizes.length > 0 && (
        <div>
          <Label>Stock</Label>
          <div className="space-y-3">
            {selectedColors.map((color) => (
              <div key={color} className="border border-border p-3">
                <p className="mb-2 text-sm font-semibold">{color}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {selectedSizes.map((size) => (
                    <div key={size}>
                      <label className="mb-1 block text-xs text-muted-foreground">{size}</label>
                      <Input
                        inputMode="numeric"
                        value={stock[variantKey(color, size)] ?? 0}
                        onChange={(e) => updateStock(color, size, e.target.value)}
                        className="px-2 py-2 text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="category">Category</Label>
        <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Oversized T-Shirt" />
      </div>

      <div className="space-y-3 border border-border p-4">
        <div>
          <Label>Shop Menu Placement (optional)</Label>
          <p className="mb-2 text-xs text-muted-foreground">
            Choose Men&apos;s or Women&apos;s to make this tee appear under that section of the
            Shop menu on the site. Leave on &ldquo;None&rdquo; to skip that menu — it still shows
            in the main Shop grid either way.
          </p>
          <div className="flex flex-wrap gap-2">
            {(["", "men", "women"] as const).map((g) => (
              <button
                key={g || "none"}
                type="button"
                onClick={() => setGender(g)}
                className={`h-10 min-w-24 border px-3 text-sm font-semibold ${
                  gender === g ? "border-foreground bg-foreground text-background" : "border-border bg-background"
                }`}
              >
                {g === "" ? "None" : g === "men" ? "Men's" : "Women's"}
              </button>
            ))}
          </div>
        </div>

        {gender && (
          <div>
            <Label htmlFor="collection">Collections (optional)</Label>
            <p className="mb-2 text-xs text-muted-foreground">
              E.g. &ldquo;Football Collection&rdquo; or &ldquo;Gym Collection&rdquo;. A tee can be
              in more than one — add as many as apply. Customers can browse straight to any of
              them from the {gender === "men" ? "Men's" : "Women's"} menu. Use the exact same
              wording on every tee that shares a collection.
            </p>
            {collections.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {collections.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background"
                  >
                    {c}
                    <button
                      type="button"
                      aria-label={`Remove ${c}`}
                      onClick={() => removeCollection(c)}
                      className="text-background/70 hover:text-background"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                id="collection"
                value={collectionInput}
                onChange={(e) => setCollectionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCollection();
                  }
                }}
                placeholder="Football Collection"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addCollection}>
                Add
              </Button>
            </div>
          </div>
        )}
      </div>

      <details className="border border-border p-3">
        <summary className="cursor-pointer text-sm font-semibold">More details (optional)</summary>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="fabric">Fabric</Label>
            <Input id="fabric" value={fabric} onChange={(e) => setFabric(e.target.value)} placeholder="100% Cotton" />
          </div>
          <div>
            <Label htmlFor="fit">Fit</Label>
            <Input id="fit" value={fit} onChange={(e) => setFit(e.target.value)} placeholder="Oversized" />
          </div>
          <div>
            <Label htmlFor="gsm">Fabric Weight (GSM)</Label>
            <Input id="gsm" value={gsm} onChange={(e) => setGsm(e.target.value)} placeholder="240 GSM" />
          </div>
          <div>
            <Label htmlFor="printType">Print Type</Label>
            <Input id="printType" value={printType} onChange={(e) => setPrintType(e.target.value)} placeholder="DTG Print" />
          </div>
          <div>
            <Label htmlFor="careInstructions">Care Instructions</Label>
            <Textarea
              id="careInstructions"
              value={careInstructions}
              onChange={(e) => setCareInstructions(e.target.value)}
              placeholder="Machine wash cold, inside out."
            />
          </div>
        </div>
      </details>

      <div className="space-y-4 border border-border p-4">
        <Toggle checked={isFeatured} onChange={setIsFeatured} label="Featured Product" />
        <Toggle checked={isActive} onChange={setIsActive} label="Available for Sale" />
      </div>

      <FieldError>{error ?? undefined}</FieldError>

      <Button size="lg" className="w-full" disabled={saving} onClick={handleSubmit}>
        {saving ? "Saving…" : isEditing ? "Save Changes" : "Save & Publish"}
      </Button>
    </div>
  );
}
