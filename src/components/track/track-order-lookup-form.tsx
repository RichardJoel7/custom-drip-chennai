"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * There are no customer accounts (guest checkout only) — this is the closest thing to a
 * "profile" page. Accepts either a raw tracking token or the full email link and pulls the
 * token out of it, then hands off to /track/[token], which does the actual lookup.
 */
export function TrackOrderLookupForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Enter your tracking code or link");
      return;
    }
    const token = trimmed.includes("/track/") ? trimmed.split("/track/")[1].split(/[/?#]/)[0] : trimmed;
    router.push(`/track/${encodeURIComponent(token)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
      <Input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        placeholder="e.g. https://.../track/8f2a... or just the code"
        className="rounded-2xl"
        aria-label="Tracking code or link"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" size="lg" className="w-full">
        Track Order
      </Button>
    </form>
  );
}
