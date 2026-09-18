import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "glass";
type Size = "md" | "lg" | "sm";

const variantClasses: Record<Variant, string> = {
  primary: "bg-foreground text-background shadow-md shadow-black/20 hover:opacity-90",
  secondary: "bg-accent text-accent-foreground shadow-md shadow-black/10 hover:opacity-90",
  outline: "border border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
  ghost: "bg-transparent text-foreground hover:bg-muted",
  danger: "bg-danger text-white shadow-md shadow-black/20 hover:opacity-90",
  glass: "glass-light text-foreground shadow-lg shadow-black/5 hover:bg-white/70",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-12 px-6 text-sm",
  lg: "h-14 px-9 text-base",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold uppercase tracking-wide transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 whitespace-nowrap";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export function LinkButton({
  href,
  className,
  variant = "primary",
  size = "md",
  external,
  children,
}: {
  href: string;
  className?: string;
  variant?: Variant;
  size?: Size;
  external?: boolean;
  children: React.ReactNode;
}) {
  if (external || href.startsWith("http")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(base, variantClasses[variant], sizeClasses[size], className)}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={cn(base, variantClasses[variant], sizeClasses[size], className)}>
      {children}
    </Link>
  );
}
