"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export const ADMIN_NAV_LINKS = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/products", label: "Products", icon: "👕" },
  { href: "/admin/orders", label: "Orders", icon: "📦" },
  { href: "/admin/print-queue", label: "Print Queue", icon: "🖨️" },
  { href: "/admin/customers", label: "Customers", icon: "👤" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden w-56 flex-none flex-col gap-1 border-r border-border p-4 lg:flex">
      {ADMIN_NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "flex items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold",
            isActive(pathname, link.href)
              ? "bg-foreground text-background"
              : "text-foreground hover:bg-muted"
          )}
        >
          <span aria-hidden="true">{link.icon}</span>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background lg:hidden">
      {ADMIN_NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold uppercase",
            isActive(pathname, link.href) ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <span aria-hidden="true" className="text-base">
            {link.icon}
          </span>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
