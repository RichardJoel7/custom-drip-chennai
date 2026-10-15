"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

/** A small button that copies text (a code, an invite message) and says so. */
export function CopyText({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn("text-xs font-semibold uppercase tracking-wide underline underline-offset-4", className)}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
