import Link from "next/link";
import { CustomizerTabs } from "@/components/admin/customizer-tabs";

export default function CustomizerLayout({ children }: LayoutProps<"/admin/customizer">) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-wide">CUSTOMIZER</h1>
          <p className="mt-1 text-sm text-muted-foreground">Prices and designs for the Custom Studio.</p>
        </div>
        <Link
          href="/customize"
          target="_blank"
          className="text-sm font-semibold uppercase tracking-wide underline underline-offset-4"
        >
          Open studio ↗
        </Link>
      </div>
      <div className="mt-4">
        <CustomizerTabs />
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
