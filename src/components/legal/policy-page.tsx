import type { ReactNode } from "react";

/** Layout shared by the policy pages: a title, an "updated" date, then sections. */
export function PolicyPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="font-display text-4xl tracking-wide sm:text-5xl">{title}</h1>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last updated {updated}</p>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

export function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
