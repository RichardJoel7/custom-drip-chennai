import { forwardRef } from "react";
import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement> & {
    /** Adds a red asterisk after the label text. */
    required?: boolean;
  }
>(({ className, required, children, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("block text-xs font-semibold uppercase tracking-wide text-foreground mb-1.5", className)}
    {...props}
  >
    {children}
    {required && (
      <span className="text-danger" aria-hidden="true">
        {" "}
        *
      </span>
    )}
  </label>
));
Label.displayName = "Label";

const fieldBase =
  "w-full rounded-none border border-border bg-background px-3.5 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, className)} {...props} />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, "min-h-28 resize-y", className)} {...props} />
  )
);
Textarea.displayName = "Textarea";

/** Native select (the phone's own picker on mobile) styled like Input, with a chevron. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          fieldBase,
          "cursor-pointer appearance-none pr-10 invalid:text-muted-foreground disabled:cursor-not-allowed [&_option]:text-foreground",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      >
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
);
Select.displayName = "Select";

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1.5 text-sm text-danger">{children}</p>;
}
