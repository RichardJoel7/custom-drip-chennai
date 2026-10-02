import type { Metadata } from "next";
import { LabelQueue, type LabelRow } from "@/components/admin/label-queue";
import { MigrationNotice } from "@/components/admin/migration-notice";
import { OrdersTabs } from "@/components/admin/orders-tabs";
import { ShipFromForm } from "@/components/admin/ship-from-form";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getLabelQueue, getShippingSettings } from "@/services/shipping";
import type { OrderWithItems } from "@/types";

export const metadata: Metadata = { title: "Shipping Labels" };

function toRow(order: OrderWithItems, date: string | null | undefined): LabelRow {
  return {
    id: order.id,
    orderNumber: order.order_number,
    name: order.full_name,
    place: `${order.city} · ${order.pincode}`,
    courier: order.courier_name,
    tracking: order.courier_tracking_number,
    items: order.order_items.reduce((sum, item) => sum + item.quantity, 0),
    date: date ?? null,
  };
}

export default async function ShippingLabelsPage() {
  await requireAdmin();
  const [{ shipFrom, ready }, queue] = await Promise.all([getShippingSettings(), getLabelQueue()]);

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide">ORDERS</h1>
      <div className="mt-4">
        <OrdersTabs />
      </div>

      {!ready ? (
        <div className="mt-6">
          <MigrationNotice file="0017_shipping_labels.sql" />
        </div>
      ) : (
        <div className="mt-6 max-w-4xl space-y-6">
          <p className="text-sm text-muted-foreground">
            Save an order&apos;s courier and tracking number, then print its label here: A4 sheets (4 per page) or a 4 × 6
            in label printer, or save it as a PDF.
          </p>
          <ShipFromForm shipFrom={shipFrom} />
          <LabelQueue
            rows={{
              toPrint: queue.toPrint.map((o) => toRow(o, o.shipped_at)),
              notShipped: queue.notShipped.map((o) => toRow(o, o.created_at)),
              printed: queue.printed.map((o) => toRow(o, o.label_printed_at)),
            }}
          />
        </div>
      )}
    </div>
  );
}
