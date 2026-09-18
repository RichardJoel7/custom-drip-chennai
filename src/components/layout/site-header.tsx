"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { InstagramIcon } from "@/components/icons/social-icons";
import { cn } from "@/lib/utils/cn";

const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ instagramUrl }: { instagramUrl: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { itemCount, isHydrated } = useCart();
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return null;

  return (
    <header className="sticky top-3 z-40 px-3 sm:top-4 sm:px-6">
      <div className="glass mx-auto flex h-16 max-w-6xl items-center justify-between rounded-full px-3 text-white shadow-lg shadow-black/10 sm:px-5">
        <nav className="hidden flex-1 items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold uppercase tracking-wide transition-opacity hover:opacity-70"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          className="flex h-11 w-11 items-center justify-center md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <MenuIcon open={menuOpen} />
        </button>

        <Link href="/" className="flex flex-1 items-center justify-center md:flex-none" aria-label="Custom Drip Chennai — home">
          {logoError ? (
            <span className="font-display text-lg tracking-wide sm:text-xl">CUSTOM DRIP</span>
          ) : (
            <Image
              src="/images/logo.png"
              alt="Custom Drip Chennai"
              width={140}
              height={48}
              priority
              className="h-8 w-auto object-contain sm:h-9"
              onError={() => setLogoError(true)}
            />
          )}
        </Link>

        <div className="flex flex-1 items-center justify-end gap-1">
          <Link
            href="/track"
            aria-label="Track your order"
            className="hidden h-11 w-11 items-center justify-center sm:flex"
          >
            <ProfileIcon />
          </Link>
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative flex h-11 w-11 items-center justify-center"
          >
            <CartIcon />
            {isHydrated && itemCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div
        className={cn(
          "glass mx-auto mt-2 max-w-6xl overflow-hidden rounded-3xl text-white transition-[max-height] duration-200 md:hidden",
          menuOpen ? "max-h-72" : "max-h-0 border-none"
        )}
      >
        <nav className="flex flex-col px-5 py-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="border-b border-white/15 py-4 text-base font-semibold uppercase tracking-wide last:border-b-0"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/track"
            onClick={() => setMenuOpen(false)}
            className="border-b border-white/15 py-4 text-base font-semibold uppercase tracking-wide"
          >
            Track Order
          </Link>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-4 text-base font-semibold uppercase tracking-wide"
          >
            <InstagramIcon className="h-5 w-5" />
            Instagram
          </a>
        </nav>
      </div>
    </header>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 8h12l-1.2 10.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 8V6a3 3 0 1 1 6 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19c1.2-3.2 4-4.8 7-4.8s5.8 1.6 7 4.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}
