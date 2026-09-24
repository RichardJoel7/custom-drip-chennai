"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/admin/customizer", label: "Price List" },
  { href: "/admin/customizer/designs", label: "Design Hub" },
];

export function CustomizerTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-border" aria-label="Customizer sections">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "-mb-px border-b-2 px-4 py-3 text-sm font-semibold uppercase tracking-wide",
            pathname === tab.href ? "border-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
