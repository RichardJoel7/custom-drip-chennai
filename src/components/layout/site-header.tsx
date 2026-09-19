"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { InstagramIcon } from "@/components/icons/social-icons";
import { cn } from "@/lib/utils/cn";

export interface ShopMenu {
  men: string[];
  women: string[];
}

export function SiteHeader({
  instagramUrl,
  shopMenu,
}: {
  instagramUrl: string;
  shopMenu: ShopMenu;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { itemCount, isHydrated } = useCart();
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return null;

  function closeMobileMenu() {
    setMenuOpen(false);
    setMobileShopOpen(false);
  }

  return (
    <header className="sticky top-3 z-40 px-3 sm:top-4 sm:px-6">
      <div className="glass mx-auto flex h-16 max-w-6xl items-center justify-between rounded-full px-3 text-white shadow-lg shadow-black/10 sm:px-5">
        <nav className="hidden flex-1 items-center gap-7 md:flex">
          <Link href="/" className="text-sm font-semibold uppercase tracking-wide transition-opacity hover:opacity-70">
            Home
          </Link>
          <ShopMenuDropdown shopMenu={shopMenu} />
          <Link href="/about" className="text-sm font-semibold uppercase tracking-wide transition-opacity hover:opacity-70">
            About
          </Link>
          <Link href="/contact" className="text-sm font-semibold uppercase tracking-wide transition-opacity hover:opacity-70">
            Contact
          </Link>
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
              width={200}
              height={72}
              priority
              className="h-16 w-auto object-contain"
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
          menuOpen ? "max-h-[32rem]" : "max-h-0 border-none"
        )}
      >
        <nav className="flex flex-col px-5 py-2">
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="border-b border-white/15 py-4 text-base font-semibold uppercase tracking-wide"
          >
            Home
          </Link>

          <button
            type="button"
            onClick={() => setMobileShopOpen((v) => !v)}
            aria-expanded={mobileShopOpen}
            className="flex items-center justify-between border-b border-white/15 py-4 text-base font-semibold uppercase tracking-wide"
          >
            Shop
            <ChevronIcon direction={mobileShopOpen ? "up" : "down"} />
          </button>
          {mobileShopOpen && (
            <div className="space-y-1 border-b border-white/15 pb-3 pl-3">
              <Link href="/shop" onClick={closeMobileMenu} className="block py-2 text-sm font-semibold uppercase tracking-wide opacity-80">
                Browse All
              </Link>
              <MobileGenderAccordion label="Men's" gender="men" collections={shopMenu.men} onNavigate={closeMobileMenu} />
              <MobileGenderAccordion label="Women's" gender="women" collections={shopMenu.women} onNavigate={closeMobileMenu} />
              <Link href="/customize" onClick={closeMobileMenu} className="block py-2 text-sm font-semibold uppercase tracking-wide opacity-80">
                Customize Yourself
              </Link>
              <Link href="/bulk-orders" onClick={closeMobileMenu} className="block py-2 text-sm font-semibold uppercase tracking-wide opacity-80">
                Bulk/Corporate Orders
              </Link>
            </div>
          )}

          <Link
            href="/about"
            onClick={closeMobileMenu}
            className="border-b border-white/15 py-4 text-base font-semibold uppercase tracking-wide"
          >
            About
          </Link>
          <Link
            href="/contact"
            onClick={closeMobileMenu}
            className="border-b border-white/15 py-4 text-base font-semibold uppercase tracking-wide"
          >
            Contact
          </Link>
          <Link
            href="/track"
            onClick={closeMobileMenu}
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

function ShopMenuDropdown({ shopMenu }: { shopMenu: ShopMenu }) {
  return (
    <div className="group relative">
      <Link href="/shop" className="text-sm font-semibold uppercase tracking-wide transition-opacity hover:opacity-70">
        Shop
      </Link>
      <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="glass w-64 rounded-2xl p-2 text-white shadow-lg shadow-black/10">
          <ShopMenuGenderRow label="Men's" gender="men" collections={shopMenu.men} />
          <ShopMenuGenderRow label="Women's" gender="women" collections={shopMenu.women} />
          <div className="my-1 border-t border-white/15" />
          <Link href="/customize" className="block rounded-xl px-3 py-2.5 text-sm font-semibold uppercase tracking-wide hover:bg-white/10">
            Customize Yourself
          </Link>
          <Link href="/bulk-orders" className="block rounded-xl px-3 py-2.5 text-sm font-semibold uppercase tracking-wide hover:bg-white/10">
            Bulk/Corporate Orders
          </Link>
        </div>
      </div>
    </div>
  );
}

function ShopMenuGenderRow({
  label,
  gender,
  collections,
}: {
  label: string;
  gender: "men" | "women";
  collections: string[];
}) {
  if (collections.length === 0) {
    return (
      <Link href={`/shop?gender=${gender}`} className="block rounded-xl px-3 py-2.5 text-sm font-semibold uppercase tracking-wide hover:bg-white/10">
        {label}
      </Link>
    );
  }

  return (
    <div className="group/sub relative">
      <Link
        href={`/shop?gender=${gender}`}
        className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold uppercase tracking-wide hover:bg-white/10"
      >
        {label}
        <ChevronIcon direction="right" />
      </Link>
      <div className="invisible absolute left-full top-0 z-50 pl-2 opacity-0 transition-opacity duration-150 group-hover/sub:visible group-hover/sub:opacity-100 group-focus-within/sub:visible group-focus-within/sub:opacity-100">
        <div className="glass w-56 rounded-2xl p-2 text-white shadow-lg shadow-black/10">
          {collections.map((c) => (
            <Link
              key={c}
              href={`/shop?gender=${gender}&collection=${encodeURIComponent(c)}`}
              className="block rounded-xl px-3 py-2.5 text-sm font-semibold uppercase tracking-wide hover:bg-white/10"
            >
              {c}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileGenderAccordion({
  label,
  gender,
  collections,
  onNavigate,
}: {
  label: string;
  gender: "men" | "women";
  collections: string[];
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (collections.length === 0) {
    return (
      <Link href={`/shop?gender=${gender}`} onClick={onNavigate} className="block py-2 text-sm font-semibold uppercase tracking-wide opacity-80">
        {label}
      </Link>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link href={`/shop?gender=${gender}`} onClick={onNavigate} className="py-2 text-sm font-semibold uppercase tracking-wide opacity-80">
          {label}
        </Link>
        <button
          type="button"
          aria-label={`Toggle ${label} collections`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center"
        >
          <ChevronIcon direction={open ? "up" : "down"} />
        </button>
      </div>
      {open && (
        <div className="space-y-1 pb-1 pl-3">
          {collections.map((c) => (
            <Link
              key={c}
              href={`/shop?gender=${gender}&collection=${encodeURIComponent(c)}`}
              onClick={onNavigate}
              className="block py-1.5 text-xs font-semibold uppercase tracking-wide opacity-70"
            >
              {c}
            </Link>
          ))}
        </div>
      )}
    </div>
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

function ChevronIcon({ direction }: { direction: "up" | "down" | "right" }) {
  const paths = {
    up: "M6 15l6-6 6 6",
    down: "M6 9l6 6 6-6",
    right: "M9 6l6 6-6 6",
  };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={paths[direction]} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
