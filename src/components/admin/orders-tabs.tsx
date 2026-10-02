"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/admin/orders", label: "All Orders" },
  { href: "/admin/shipping", label: "Shipping Labels" },
];

export function OrdersTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-border" aria-label="Orders sections">
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
