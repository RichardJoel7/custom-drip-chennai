/** Shown on every page of the staging site so nobody mistakes it for the live store. */
export function StagingBanner() {
  return (
    <div
      role="note"
      className="bg-accent px-4 py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-accent-foreground"
    >
      <span className="sm:hidden">Staging · test data · don&apos;t pay</span>
      <span className="hidden sm:inline">
        Staging site — test data only. Orders placed here aren&apos;t real, so don&apos;t make a payment.
      </span>
    </div>
  );
}
