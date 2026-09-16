export function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "warning" | "accent";
}) {
  const toneClasses =
    tone === "warning"
      ? "border-danger/40 bg-danger/5"
      : tone === "accent"
        ? "border-foreground bg-foreground text-background"
        : "border-border bg-background";

  return (
    <div className={`border p-4 sm:p-5 ${toneClasses}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 font-display text-3xl tracking-wide">{value}</p>
    </div>
  );
}
