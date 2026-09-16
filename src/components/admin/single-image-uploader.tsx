"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImageFile } from "@/lib/utils/image";

export function SingleImageUploader({
  storagePath,
  imageUrl,
  onChange,
  label,
}: {
  storagePath: string;
  imageUrl: string;
  onChange: (url: string) => void;
  label: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const blob = await compressImageFile(file, { maxDimension: 800, quality: 0.9 });
      const path = `${storagePath}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });

      if (uploadError) {
        setError("Upload failed. Please try again.");
        return;
      }

      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      onChange(data.publicUrl);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
          e.target.value = "";
        }}
      />
      {imageUrl && (
        <div className="relative mb-2 h-32 w-32 bg-muted">
          <Image src={imageUrl} alt={label} fill sizes="128px" className="object-contain" />
        </div>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="h-10 border border-border px-4 text-sm font-semibold"
      >
        {uploading ? "Uploading…" : imageUrl ? `Replace ${label}` : `Upload ${label}`}
      </button>
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}
