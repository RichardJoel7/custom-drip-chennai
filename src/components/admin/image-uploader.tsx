"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImageFile } from "@/lib/utils/image";
import { cn } from "@/lib/utils/cn";

export interface UploadedImage {
  id?: string;
  imageUrl: string;
  isMain: boolean;
}

export function ImageUploader({
  storageFolder,
  images,
  onChange,
}: {
  storageFolder: string;
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    setError(null);
    setUploading(true);
    const supabase = createClient();
    const uploaded: UploadedImage[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;

        const blob = await compressImageFile(file);
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const path = `${storageFolder}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, blob, { contentType: "image/jpeg", upsert: false });

        if (uploadError) {
          setError("Some photos couldn't be uploaded. Please try again.");
          continue;
        }

        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        uploaded.push({ imageUrl: data.publicUrl, isMain: false });
      }
    } finally {
      setUploading(false);
    }

    if (uploaded.length > 0) {
      const next = [...images, ...uploaded];
      if (!next.some((i) => i.isMain)) next[0].isMain = true;
      onChange(next);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) uploadFiles(e.target.files);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  }

  function removeImage(index: number) {
    const next = images.filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((i) => i.isMain)) next[0].isMain = true;
    onChange(next);
  }

  function setMain(index: number) {
    onChange(images.map((img, i) => ({ ...img, isMain: i === index })));
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-6 text-center transition-colors",
          dragOver ? "border-foreground bg-muted" : "border-border"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
          onChange={handleFileInput}
        />
        <p className="text-sm font-semibold">
          {uploading ? "Uploading…" : "+ Upload Photos"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Tap to choose photos, or drag and drop
        </p>
      </div>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((image, index) => (
            <div key={image.imageUrl} className="group relative aspect-square bg-muted">
              <Image
                src={image.imageUrl}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-foreground text-xs font-bold text-background"
              >
                ✕
              </button>
              <button
                type="button"
                onClick={() => setMain(index)}
                className={cn(
                  "absolute inset-x-0 bottom-0 py-1 text-[10px] font-semibold uppercase tracking-wide",
                  image.isMain ? "bg-accent text-accent-foreground" : "bg-background/80 text-foreground"
                )}
              >
                {image.isMain ? "Main Photo" : "Set as Main"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
