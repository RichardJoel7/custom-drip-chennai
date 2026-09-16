"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface Section {
  title: string;
  content: React.ReactNode;
}

export function ProductDetailsAccordion({ sections }: { sections: Section[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-border border-t border-border">
      {sections.map((section, i) => (
        <div key={section.title}>
          <button
            type="button"
            className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold uppercase tracking-wide"
            aria-expanded={openIndex === i}
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
          >
            {section.title}
            <span className={cn("transition-transform", openIndex === i && "rotate-45")}>+</span>
          </button>
          {openIndex === i && (
            <div className="pb-4 text-sm leading-relaxed text-muted-foreground">{section.content}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export function SizeGuideLink() {
  return (
    <Link href="/size-guide" className="underline underline-offset-4">
      View our size guide
    </Link>
  );
}
