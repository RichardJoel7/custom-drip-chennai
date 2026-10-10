"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

// mobileLabel keeps all seven items on one row of a 375px phone's bottom bar; links without
// one are sidebar-only (on a phone, Shipping Labels is a tab on the Orders page and Coupons is
// linked from Settings).
export const ADMIN_NAV_LINKS: { href: string; label: string; mobileLabel?: string; icon: string }[] = [
  { href: "/admin", label: "Dashboard", mobileLabel: "Home", icon: "📊" },
  { href: "/admin/products", label: "Products", mobileLabel: "Products", icon: "👕" },
  { href: "/admin/customizer", label: "Customizer", mobileLabel: "Studio", icon: "🎨" },
  { href: "/admin/orders", label: "Orders", mobileLabel: "Orders", icon: "📦" },
  { href: "/admin/print-queue", label: "Print Queue", mobileLabel: "Print", icon: "🖨️" },
  { href: "/admin/shipping", label: "Shipping Labels", icon: "🏷️" },
  { href: "/admin/customers", label: "Customers", mobileLabel: "Buyers", icon: "👤" },
  { href: "/admin/coupons", label: "Coupons", icon: "🎟️" },
  { href: "/admin/settings", label: "Settings", mobileLabel: "Settings", icon: "⚙️" },
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
      {ADMIN_NAV_LINKS.filter((link) => link.mobileLabel).map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold uppercase",
            isActive(pathname, link.href) ||
              (link.href === "/admin/orders" && isActive(pathname, "/admin/shipping")) ||
              (link.href === "/admin/settings" && isActive(pathname, "/admin/coupons"))
              ? "text-foreground"
              : "text-muted-foreground"
          )}
        >
          <span aria-hidden="true" className="text-base">
            {link.icon}
          </span>
          {link.mobileLabel}
        </Link>
      ))}
    </nav>
  );
}
