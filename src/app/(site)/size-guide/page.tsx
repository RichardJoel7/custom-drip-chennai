import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Size Guide",
  description: "Find your perfect Custom Drip Chennai T-shirt size.",
};

const SIZE_CHART = [
  { size: "S", chest: "36–38", length: "27" },
  { size: "M", chest: "38–40", length: "28" },
  { size: "L", chest: "40–42", length: "29" },
  { size: "XL", chest: "42–44", length: "30" },
  { size: "XXL", chest: "44–46", length: "31" },
];

export default function SizeGuidePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="font-display text-4xl tracking-wide sm:text-5xl">SIZE GUIDE</h1>
      <p className="mt-4 text-muted-foreground">
        Our tees run true to size with a relaxed fit. All measurements are in inches — measure a
        tee you already own and love, and compare against the chart below.
      </p>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[360px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-3 font-semibold uppercase tracking-wide">Size</th>
              <th className="py-3 font-semibold uppercase tracking-wide">Chest (in)</th>
              <th className="py-3 font-semibold uppercase tracking-wide">Length (in)</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_CHART.map((row) => (
              <tr key={row.size} className="border-b border-border">
                <td className="py-3 font-semibold">{row.size}</td>
                <td className="py-3 text-muted-foreground">{row.chest}</td>
                <td className="py-3 text-muted-foreground">{row.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Still unsure? Message us on Instagram with your usual size and we&apos;ll help you pick.
      </p>
    </div>
  );
}
