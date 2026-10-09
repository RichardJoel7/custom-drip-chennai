import type { OrderWithItems, ShippingSettings } from "@/types";

function labelDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/** A blank to fill in by hand. */
function Blank({ width = "22mm" }: { width?: string }) {
  return <span className="inline-block border-b-[0.3mm] border-black align-baseline" style={{ width }} />;
}

/**
 * One parcel's label, sized for 4 × 6 in (A6): who it's for in large type, the courier and
 * tracking number, and the return address. Millimetres and points throughout, so
 * it prints at the same size on any printer.
 */
export function ShippingLabel({
  order,
  shipFrom,
  storeName,
  storePhone,
}: {
  order: OrderWithItems;
  shipFrom: ShippingSettings;
  storeName: string;
  storePhone: string | null;
}) {
  const tracking = order.courier_tracking_number?.trim() || null;
  const items = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
  const contents = order.order_items
    .map((item) => `${item.product_name}${item.size ? ` (${item.size})` : ""} × ${item.quantity}`)
    .join(" · ");
  const fromName = shipFrom.from_name?.trim() || storeName;
  const fromPhone = shipFrom.from_phone?.trim() || storePhone;
  const addressLines = [order.address_line1, order.address_line2, order.area].filter(Boolean);

  return (
    <article className="shipping-label flex h-full flex-col border-[0.4mm] border-black bg-white text-black">
      <header className="flex items-center justify-between gap-[2mm] border-b-[0.6mm] border-black px-[3mm] py-[1.8mm]">
        <span className="truncate font-display text-[12pt] uppercase leading-none tracking-wide">{storeName}</span>
        <span className="flex-none border-[0.5mm] border-black px-[1.8mm] py-[0.6mm] text-[8.5pt] font-bold uppercase leading-none tracking-[0.08em]">
          Prepaid
        </span>
      </header>

      <section className="min-h-0 flex-1 px-[3mm] pt-[2.5mm]">
        <p className="text-[7pt] font-bold uppercase tracking-[0.15em]">Ship to</p>
        <p className="mt-[0.8mm] text-[15pt] font-bold leading-tight">{order.full_name}</p>
        <p className="mt-[1mm] text-[10.5pt] leading-snug">
          {addressLines.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
          <span className="block">
            {order.city}, {order.state}
          </span>
        </p>
        <p className="mt-[1.2mm] text-[15pt] font-bold leading-none tracking-wider">PIN {order.pincode}</p>
        <p className="mt-[1.5mm] text-[10.5pt] font-semibold">Phone: {order.mobile_number}</p>
      </section>

      <section className="border-t-[0.4mm] border-black px-[3mm] py-[2mm]">
        <div className="flex justify-between gap-[2mm] text-[8.5pt]">
          <span className="min-w-0 truncate">
            <b>Courier:</b> {order.courier_name?.trim() || <Blank />}
          </span>
          <span className="flex-none">
            <b>Ship date:</b> {labelDate(order.shipped_at ?? new Date().toISOString())}
          </span>
        </div>
        <p className="mt-[2mm] text-[9pt]">
          <b>Tracking no.:</b>{" "}
          {tracking ? <span className="font-mono text-[12pt] font-bold tracking-wider">{tracking}</span> : <Blank width="55mm" />}
        </p>
      </section>

      <section className="grid grid-cols-3 border-t-[0.4mm] border-black text-[8.5pt]">
        <p className="border-r-[0.3mm] border-black px-[3mm] py-[1.5mm]">
          <span className="block text-[6.5pt] font-bold uppercase tracking-[0.12em]">Order</span>
          <span className="font-bold">{order.order_number}</span>
        </p>
        <p className="border-r-[0.3mm] border-black px-[3mm] py-[1.5mm]">
          <span className="block text-[6.5pt] font-bold uppercase tracking-[0.12em]">Weight</span>
          {order.package_weight_g ? <span className="font-bold">{order.package_weight_g} g</span> : <><Blank width="12mm" /> g</>}
        </p>
        <p className="px-[3mm] py-[1.5mm]">
          <span className="block text-[6.5pt] font-bold uppercase tracking-[0.12em]">Items</span>
          <span className="font-bold">{items}</span>
        </p>
      </section>
      <p className="line-clamp-2 border-t-[0.3mm] border-black px-[3mm] py-[1.2mm] text-[7pt] leading-snug">
        <b>Contents:</b> {contents}
      </p>

      <footer className="border-t-[0.4mm] border-black px-[3mm] py-[1.8mm] text-[8pt] leading-snug">
        <p className="text-[6.5pt] font-bold uppercase tracking-[0.12em]">From / return to</p>
        <p className="font-semibold">{fromName}</p>
        {shipFrom.from_address && <p className="whitespace-pre-line">{shipFrom.from_address}</p>}
        {fromPhone && <p>Phone: {fromPhone}</p>}
      </footer>
    </article>
  );
}
