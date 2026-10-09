"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { uploadCatalogFile } from "@/lib/storage/upload";
import { compressImageFile } from "@/lib/utils/image";

export function SingleImageUploader({
  storageFolder,
  imageUrl,
  onChange,
  label,
}: {
  storageFolder: string;
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
      const blob = await compressImageFile(file, { maxDimension: 800, quality: 0.9 });
      const { url } = await uploadCatalogFile(blob, storageFolder, "image/jpeg");
      onChange(url);
    } catch {
      setError("Upload failed. Please try again.");
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
